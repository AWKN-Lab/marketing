import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  taskExecutionRetryIdempotencyKey,
  taskExecutionUpsertIdempotencyKey,
  validateTaskExecutionProductRequest,
} from "../lib/task-execution-contract.ts";
import {
  buildTaskExecutionState,
  isTaskExecutionStatus,
  nextTaskExecutionAttempt,
  queueLatestTaskExecution,
  taskExecutionId,
} from "../lib/task-execution.ts";
import { snapshotFingerprint } from "../lib/reconcile.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T04:00:00.000Z";
const WORKSPACE_ID = "w-p6-execution";
const TASK_ID = "task-p6-execution";
const EXECUTION_ID = taskExecutionId(TASK_ID);
const EXECUTION = buildTaskExecutionState({
  taskId: TASK_ID,
  workspaceId: WORKSPACE_ID,
  artifactTitle: "Execution Contract",
  finalText: "first final",
  feedback: null,
  outcome: null,
  outcomeNote: "",
});

type ExecutionOperation = "task.execution.get" | "task.execution.upsert";
type UpstreamResponder = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function withProductUpstream<T>(responder: UpstreamResponder, run: () => Promise<T>): Promise<T> {
  const previousEndpoint = process.env.AWKN_MARKETING_API_URL;
  const previousToken = process.env.AWKN_MARKETING_API_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_API_URL = "https://product.integration.invalid";
  process.env.AWKN_MARKETING_API_TOKEN = "service-secret";
  globalThis.fetch = responder as typeof fetch;
  try {
    return await run();
  } finally {
    if (typeof previousEndpoint === "undefined") delete process.env.AWKN_MARKETING_API_URL;
    else process.env.AWKN_MARKETING_API_URL = previousEndpoint;
    if (typeof previousToken === "undefined") delete process.env.AWKN_MARKETING_API_TOKEN;
    else process.env.AWKN_MARKETING_API_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
}

function body(input: {
  operation: ExecutionOperation;
  requestId: string;
  idempotencyKey?: string;
  payload: unknown;
}) {
  return {
    product: "awkn-marketing" as const,
    operation: input.operation,
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    workspace_id: WORKSPACE_ID,
    task_id: TASK_ID,
    payload: input.payload,
  };
}

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": String(payload.request_id ?? "req-execution"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main() {
  await runP6Case("task execution has stable identity, status and physical attempt", () => {
    assert.equal(EXECUTION.id, EXECUTION_ID);
    assert.equal(EXECUTION.status, "succeeded");
    assert.equal(EXECUTION.attempt, 1);
    for (const status of ["queued", "running", "succeeded", "failed", "cancelled"]) {
      assert.equal(isTaskExecutionStatus(status), true);
    }
    assert.equal(isTaskExecutionStatus("completed"), false);

    const retry = nextTaskExecutionAttempt({ ...EXECUTION, status: "failed", retryable: true, errorCode: "UPSTREAM_TIMEOUT" });
    assert.equal(retry.id, EXECUTION_ID);
    assert.equal(retry.taskId, TASK_ID);
    assert.equal(retry.attempt, 2);
    assert.equal(retry.status, "queued");
    assert.equal(retry.errorCode, undefined);
    assert.equal(taskExecutionRetryIdempotencyKey(retry), `${"task.execution.retry"}:${EXECUTION_ID}:attempt:2`);
  }, { operation: "task.execution.upsert", entityId: EXECUTION_ID });

  await runP6Case("task execution get and upsert bind task/workspace/execution identity", () => {
    assert.equal(validateTaskExecutionProductRequest(body({
      operation: "task.execution.get",
      requestId: "req-execution-get-ok",
      payload: { entity_id: EXECUTION_ID },
    })), null);

    const getMismatch = validateTaskExecutionProductRequest(body({
      operation: "task.execution.get",
      requestId: "req-execution-get-bad",
      payload: { entity_id: "task-execution:other" },
    }));
    assert.equal(getMismatch?.code, "IDENTITY_MISMATCH");

    const validUpsert = validateTaskExecutionProductRequest(body({
      operation: "task.execution.upsert",
      requestId: "req-execution-upsert-ok",
      idempotencyKey: taskExecutionUpsertIdempotencyKey({ executionId: EXECUTION_ID, fingerprint: snapshotFingerprint(EXECUTION) }),
      payload: { execution: EXECUTION },
    }));
    assert.equal(validUpsert, null);

    const taskMismatch = validateTaskExecutionProductRequest(body({
      operation: "task.execution.upsert",
      requestId: "req-execution-task-bad",
      idempotencyKey: "idem-execution-task-bad",
      payload: { execution: { ...EXECUTION, taskId: "task-other" } },
    }));
    assert.equal(taskMismatch?.code, "IDENTITY_MISMATCH");

    const workspaceMismatch = validateTaskExecutionProductRequest(body({
      operation: "task.execution.upsert",
      requestId: "req-execution-workspace-bad",
      idempotencyKey: "idem-execution-workspace-bad",
      payload: { execution: { ...EXECUTION, workspaceId: "w-other" } },
    }));
    assert.equal(workspaceMismatch?.code, "IDENTITY_MISMATCH");

    const invalidAttempt = validateTaskExecutionProductRequest(body({
      operation: "task.execution.upsert",
      requestId: "req-execution-attempt-bad",
      idempotencyKey: "idem-execution-attempt-bad",
      payload: { execution: { ...EXECUTION, attempt: 0 } },
    }));
    assert.equal(invalidAttempt?.code, "VALIDATION_ERROR");
  }, { operation: "task.execution.upsert", entityId: EXECUTION_ID });

  await runP6Case("task execution upsert is revision-aware while allowing first create", () => {
    assert.equal(validateTaskExecutionProductRequest(body({
      operation: "task.execution.upsert",
      requestId: "req-execution-new",
      idempotencyKey: "idem-execution-new",
      payload: { execution: EXECUTION },
    })), null);
    assert.equal(validateTaskExecutionProductRequest(body({
      operation: "task.execution.upsert",
      requestId: "req-execution-r4",
      idempotencyKey: "idem-execution-r4",
      payload: { execution: EXECUTION, base_revision: 4 },
    })), null);
    for (const baseRevision of [0, -1, 1.5]) {
      assert.equal(validateTaskExecutionProductRequest(body({
        operation: "task.execution.upsert",
        requestId: `req-execution-r-${String(baseRevision)}`,
        idempotencyKey: "idem-execution-invalid-revision",
        payload: { execution: EXECUTION, base_revision: baseRevision },
      }))?.code, "INVALID_REVISION");
    }
  }, { operation: "task.execution.upsert", entityId: EXECUTION_ID });

  await runP6Case("queued snapshot ordering keeps only the latest local edit", () => {
    const first = { ...EXECUTION, finalText: "edit-1" };
    const second = { ...EXECUTION, finalText: "edit-2" };
    const third = { ...EXECUTION, finalText: "edit-3" };
    let queued = queueLatestTaskExecution(null, first);
    queued = queueLatestTaskExecution(queued, second);
    queued = queueLatestTaskExecution(queued, third);
    assert.equal(queued.finalText, "edit-3");
  }, { operation: "task.execution.upsert", entityId: EXECUTION_ID });

  await runP6Case("same execution upsert key produces one logical upstream side effect", async () => {
    const seen = new Set<string>();
    let logicalSideEffects = 0;
    await withProductUpstream(async (_input, init) => {
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const key = String(upstreamBody.idempotency_key ?? "");
      if (!seen.has(key)) {
        seen.add(key);
        logicalSideEffects += 1;
      }
      return new Response(JSON.stringify({
        ok: true,
        data: { entity_id: EXECUTION_ID, revision: 2, updated_at: NOW },
        trace_id: "trace-execution-upsert",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const key = taskExecutionUpsertIdempotencyKey({ executionId: EXECUTION_ID, baseRevision: 1, fingerprint: snapshotFingerprint(EXECUTION) });
      for (const requestId of ["req-execution-upsert-1", "req-execution-upsert-2"]) {
        const result = await routeJson(body({
          operation: "task.execution.upsert",
          requestId,
          idempotencyKey: key,
          payload: { execution: EXECUTION, base_revision: 1 },
        }));
        assert.equal(result.status, 200);
        assert.equal((result.body.data as Record<string, unknown>).entity_id, EXECUTION_ID);
      }
    });
    assert.equal(logicalSideEffects, 1);
  }, { operation: "task.execution.upsert", entityId: EXECUTION_ID, traceId: "trace-execution-upsert" });

  await runP6Case("task execution preserves revision conflict and trace", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: false,
      error: { code: "REVISION_CONFLICT", message: "execution base revision is stale", retryable: false },
      trace_id: "trace-execution-conflict",
    }), { status: 409, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body({
        operation: "task.execution.upsert",
        requestId: "req-execution-conflict",
        idempotencyKey: taskExecutionUpsertIdempotencyKey({ executionId: EXECUTION_ID, baseRevision: 2, fingerprint: "fp-stale" }),
        payload: { execution: EXECUTION, base_revision: 2 },
      }));
      assert.equal(result.status, 409);
      assert.equal((result.body.error as Record<string, unknown>).code, "REVISION_CONFLICT");
      assert.equal(result.body.trace_id, "trace-execution-conflict");
    });
  }, { operation: "task.execution.upsert", entityId: EXECUTION_ID, traceId: "trace-execution-conflict" });

  await runP6Case("task execution get validates remote identity, scope, status and attempt", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: EXECUTION_ID, revision: 3, updated_at: NOW, entity: { ...EXECUTION, status: "running", attempt: 2 } },
      trace_id: "trace-execution-get",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body({
        operation: "task.execution.get",
        requestId: "req-execution-get-live",
        payload: { entity_id: EXECUTION_ID },
      }));
      assert.equal(result.status, 200);
      assert.equal(((result.body.data as Record<string, unknown>).revision), 3);
    });

    for (const [label, remoteExecution] of [
      ["status", { ...EXECUTION, status: "completed" }],
      ["attempt", { ...EXECUTION, attempt: 0 }],
      ["workspace", { ...EXECUTION, workspaceId: "w-revoked" }],
      ["task", { ...EXECUTION, taskId: "task-other" }],
      ["execution", { ...EXECUTION, id: "task-execution:other" }],
    ] as const) {
      await withProductUpstream(async () => new Response(JSON.stringify({
        ok: true,
        data: { entity_id: EXECUTION_ID, revision: 4, updated_at: NOW, entity: remoteExecution },
        trace_id: `trace-execution-${label}`,
      }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
        const result = await routeJson(body({
          operation: "task.execution.get",
          requestId: `req-execution-${label}-bad`,
          payload: { entity_id: EXECUTION_ID },
        }));
        assert.equal(result.status, 502);
        assert.ok(["VALIDATION_ERROR", "IDENTITY_MISMATCH"].includes(String((result.body.error as Record<string, unknown>).code)));
        assert.equal(result.body.trace_id, `trace-execution-${label}`);
      });
    }
  }, { operation: "task.execution.get", entityId: EXECUTION_ID, traceId: "trace-execution-get" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
