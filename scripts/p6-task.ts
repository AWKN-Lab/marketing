import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  taskCreateIdempotencyKey,
  taskUpdateIdempotencyKey,
  validateTaskProductRequest,
} from "../lib/task-contract.ts";
import { isMarketingTaskStatus } from "../lib/types.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T03:30:00.000Z";
const WORKSPACE_ID = "w-p6-task";
const TASK = {
  id: "task-p6-contract",
  workspaceId: WORKSPACE_ID,
  workspaceName: "P6 Task Workspace",
  type: "策略判断",
  title: "验证 Task 契约",
  goal: "验证 stable task identity / revision / status",
  status: "ready" as const,
  userPrompt: "检查 P6 Task Contract",
  judgment: "待真实 Agent 执行。",
  appliedExperiences: [],
  artifact: { title: "Task Contract", aiDraft: "", userFinal: "" },
};

type TaskOperation = "task.create" | "task.update" | "task.get";
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
  operation: TaskOperation;
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
    task_id: TASK.id,
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
      "x-request-id": String(payload.request_id ?? "req-task"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main() {
  await runP6Case("task status is a stable product enum", () => {
    for (const status of ["ready", "running", "completed", "failed"]) assert.equal(isMarketingTaskStatus(status), true);
    for (const status of ["", "queued", "success", "cancelled", undefined]) assert.equal(isMarketingTaskStatus(status), false);
  }, { operation: "task.create", entityId: TASK.id });

  await runP6Case("task create binds task identity, workspace scope and stable status", () => {
    assert.equal(validateTaskProductRequest(body({
      operation: "task.create",
      requestId: "req-task-create-ok",
      idempotencyKey: taskCreateIdempotencyKey(TASK.id),
      payload: { task: TASK },
    })), null);

    const taskMismatch = validateTaskProductRequest(body({
      operation: "task.create",
      requestId: "req-task-create-id-bad",
      idempotencyKey: taskCreateIdempotencyKey(TASK.id),
      payload: { task: { ...TASK, id: "task-other" } },
    }));
    assert.equal(taskMismatch?.code, "IDENTITY_MISMATCH");

    const workspaceMismatch = validateTaskProductRequest(body({
      operation: "task.create",
      requestId: "req-task-create-workspace-bad",
      idempotencyKey: taskCreateIdempotencyKey(TASK.id),
      payload: { task: { ...TASK, workspaceId: "w-other" } },
    }));
    assert.equal(workspaceMismatch?.code, "IDENTITY_MISMATCH");

    const statusViolation = validateTaskProductRequest(body({
      operation: "task.create",
      requestId: "req-task-create-status-bad",
      idempotencyKey: taskCreateIdempotencyKey(TASK.id),
      payload: { task: { ...TASK, status: "success" } },
    }));
    assert.equal(statusViolation?.code, "VALIDATION_ERROR");
  }, { operation: "task.create", entityId: TASK.id });

  await runP6Case("task update requires positive base revision", () => {
    assert.equal(validateTaskProductRequest(body({
      operation: "task.update",
      requestId: "req-task-update-ok",
      idempotencyKey: taskUpdateIdempotencyKey(TASK.id, 3, "fp-task"),
      payload: { task: { ...TASK, status: "running" }, base_revision: 3 },
    })), null);

    for (const baseRevision of [undefined, 0, -1, 1.5]) {
      const violation = validateTaskProductRequest(body({
        operation: "task.update",
        requestId: `req-task-update-${String(baseRevision)}`,
        idempotencyKey: taskUpdateIdempotencyKey(TASK.id, 1, "fp-task"),
        payload: { task: TASK, base_revision: baseRevision },
      }));
      assert.equal(violation?.code, "INVALID_REVISION");
    }
  }, { operation: "task.update", entityId: TASK.id });

  await runP6Case("task get requires the same stable task identity", () => {
    assert.equal(validateTaskProductRequest(body({
      operation: "task.get",
      requestId: "req-task-get-ok",
      payload: { entity_id: TASK.id },
    })), null);
    const mismatch = validateTaskProductRequest(body({
      operation: "task.get",
      requestId: "req-task-get-bad",
      payload: { entity_id: "task-other" },
    }));
    assert.equal(mismatch?.code, "IDENTITY_MISMATCH");
  }, { operation: "task.get", entityId: TASK.id });

  await runP6Case("same task create idempotency key yields one logical upstream side effect", async () => {
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
        data: { entity_id: TASK.id, revision: 1, updated_at: NOW },
        trace_id: "trace-task-create",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const key = taskCreateIdempotencyKey(TASK.id);
      for (const requestId of ["req-task-create-1", "req-task-create-2"]) {
        const result = await routeJson(body({
          operation: "task.create",
          requestId,
          idempotencyKey: key,
          payload: { task: TASK },
        }));
        assert.equal(result.status, 200);
        assert.equal((result.body.data as Record<string, unknown>).entity_id, TASK.id);
      }
    });
    assert.equal(logicalSideEffects, 1);
  }, { operation: "task.create", entityId: TASK.id, traceId: "trace-task-create" });

  await runP6Case("task update preserves stale revision conflict and trace", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: false,
      error: { code: "REVISION_CONFLICT", message: "task base revision is stale", retryable: false },
      trace_id: "trace-task-conflict",
    }), { status: 409, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body({
        operation: "task.update",
        requestId: "req-task-update-conflict",
        idempotencyKey: taskUpdateIdempotencyKey(TASK.id, 2, "fp-stale"),
        payload: { task: TASK, base_revision: 2 },
      }));
      assert.equal(result.status, 409);
      assert.equal((result.body.error as Record<string, unknown>).code, "REVISION_CONFLICT");
      assert.equal(result.body.trace_id, "trace-task-conflict");
    });
  }, { operation: "task.update", entityId: TASK.id, traceId: "trace-task-conflict" });

  await runP6Case("task get validates remote workspace scope and status before projection", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: TASK.id, revision: 4, updated_at: NOW, entity: { ...TASK, status: "running" } },
      trace_id: "trace-task-get",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body({
        operation: "task.get",
        requestId: "req-task-get-live",
        payload: { entity_id: TASK.id },
      }));
      assert.equal(result.status, 200);
      assert.equal(((result.body.data as Record<string, unknown>).revision), 4);
    });

    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: TASK.id, revision: 5, updated_at: NOW, entity: { ...TASK, status: "success" } },
      trace_id: "trace-task-status-invalid",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body({
        operation: "task.get",
        requestId: "req-task-get-status-invalid",
        payload: { entity_id: TASK.id },
      }));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "VALIDATION_ERROR");
      assert.equal(result.body.trace_id, "trace-task-status-invalid");
    });

    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: TASK.id, revision: 6, updated_at: NOW, entity: { ...TASK, workspaceId: "w-revoked" } },
      trace_id: "trace-task-workspace-invalid",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body({
        operation: "task.get",
        requestId: "req-task-get-workspace-invalid",
        payload: { entity_id: TASK.id },
      }));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "IDENTITY_MISMATCH");
    });
  }, { operation: "task.get", entityId: TASK.id, traceId: "trace-task-get" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
