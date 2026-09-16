import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  validateWorkspaceProductRequest,
  workspaceCreateIdempotencyKey,
  workspaceUpdateIdempotencyKey,
} from "../lib/workspace-contract.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T02:30:00.000Z";
const WORKSPACE = {
  id: "w-p6-workspace",
  name: "P6 Workspace",
  type: "营销项目",
  goal: "验证真实 Workspace 契约",
  successCriteria: "稳定 ID / revision / idempotency",
  status: "新建",
  updatedAt: "刚刚",
  taskCount: 0,
  materialCount: 0,
  experienceCount: 0,
};

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
  operation: "workspace.create" | "workspace.update" | "workspace.get";
  requestId: string;
  idempotencyKey?: string;
  payload: unknown;
}) {
  return {
    product: "awkn-marketing" as const,
    operation: input.operation,
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    workspace_id: WORKSPACE.id,
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
      "x-request-id": String(payload.request_id ?? "req-workspace"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main() {
  await runP6Case("workspace create payload identity must match top-level workspace_id", () => {
    const accepted = validateWorkspaceProductRequest(body({
      operation: "workspace.create",
      requestId: "req-create-ok",
      idempotencyKey: workspaceCreateIdempotencyKey(WORKSPACE.id),
      payload: { workspace: WORKSPACE },
    }));
    assert.equal(accepted, null);

    const mismatch = validateWorkspaceProductRequest(body({
      operation: "workspace.create",
      requestId: "req-create-bad",
      idempotencyKey: workspaceCreateIdempotencyKey(WORKSPACE.id),
      payload: { workspace: { ...WORKSPACE, id: "w-other" } },
    }));
    assert.equal(mismatch?.code, "IDENTITY_MISMATCH");
  }, { operation: "workspace.create", entityId: WORKSPACE.id });

  await runP6Case("workspace update requires a positive base revision and stable identity", () => {
    const valid = validateWorkspaceProductRequest(body({
      operation: "workspace.update",
      requestId: "req-update-ok",
      idempotencyKey: workspaceUpdateIdempotencyKey(WORKSPACE.id, 3, "fp-123"),
      payload: { workspace: WORKSPACE, base_revision: 3 },
    }));
    assert.equal(valid, null);

    for (const baseRevision of [undefined, 0, -1, 1.5]) {
      const violation = validateWorkspaceProductRequest(body({
        operation: "workspace.update",
        requestId: `req-update-${String(baseRevision)}`,
        idempotencyKey: workspaceUpdateIdempotencyKey(WORKSPACE.id, 1, "fp-123"),
        payload: { workspace: WORKSPACE, base_revision: baseRevision },
      }));
      assert.equal(violation?.code, "INVALID_REVISION");
    }
  }, { operation: "workspace.update", entityId: WORKSPACE.id });

  await runP6Case("workspace get reads the same stable entity identity", () => {
    assert.equal(validateWorkspaceProductRequest(body({
      operation: "workspace.get",
      requestId: "req-get-ok",
      payload: { entity_id: WORKSPACE.id },
    })), null);

    const mismatch = validateWorkspaceProductRequest(body({
      operation: "workspace.get",
      requestId: "req-get-bad",
      payload: { entity_id: "w-other" },
    }));
    assert.equal(mismatch?.code, "IDENTITY_MISMATCH");
  }, { operation: "workspace.get", entityId: WORKSPACE.id });

  await runP6Case("same workspace create idempotency key yields one logical upstream side effect", async () => {
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
        data: { entity_id: WORKSPACE.id, revision: 1, updated_at: NOW },
        trace_id: "trace-workspace-create",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const key = workspaceCreateIdempotencyKey(WORKSPACE.id);
      for (const requestId of ["req-create-1", "req-create-2"]) {
        const result = await routeJson(body({
          operation: "workspace.create",
          requestId,
          idempotencyKey: key,
          payload: { workspace: WORKSPACE },
        }));
        assert.equal(result.status, 200);
        assert.equal(((result.body.data as Record<string, unknown>).entity_id), WORKSPACE.id);
      }
    });
    assert.equal(logicalSideEffects, 1);
  }, { operation: "workspace.create", entityId: WORKSPACE.id, traceId: "trace-workspace-create" });

  await runP6Case("workspace create rejects an upstream identity mismatch before UI projection", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: "w-other", revision: 1, updated_at: NOW },
      trace_id: "trace-workspace-mismatch",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body({
        operation: "workspace.create",
        requestId: "req-create-mismatch",
        idempotencyKey: workspaceCreateIdempotencyKey(WORKSPACE.id),
        payload: { workspace: WORKSPACE },
      }));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "IDENTITY_MISMATCH");
      assert.equal(result.body.trace_id, "trace-workspace-mismatch");
    });
  }, { operation: "workspace.create", entityId: WORKSPACE.id, traceId: "trace-workspace-mismatch" });

  await runP6Case("workspace update preserves upstream stale revision conflict", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: false,
      error: { code: "REVISION_CONFLICT", message: "base revision is stale", retryable: false },
      trace_id: "trace-workspace-conflict",
    }), { status: 409, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body({
        operation: "workspace.update",
        requestId: "req-update-conflict",
        idempotencyKey: workspaceUpdateIdempotencyKey(WORKSPACE.id, 2, "fp-stale"),
        payload: { workspace: WORKSPACE, base_revision: 2 },
      }));
      assert.equal(result.status, 409);
      assert.equal((result.body.error as Record<string, unknown>).code, "REVISION_CONFLICT");
      assert.equal(result.body.trace_id, "trace-workspace-conflict");
    });
  }, { operation: "workspace.update", entityId: WORKSPACE.id, traceId: "trace-workspace-conflict" });

  await runP6Case("workspace get accepts real read shape and blocks wrong server entity id", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: WORKSPACE.id, revision: 4, updated_at: NOW, entity: WORKSPACE },
      trace_id: "trace-workspace-get",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body({
        operation: "workspace.get",
        requestId: "req-get-live",
        payload: { entity_id: WORKSPACE.id },
      }));
      assert.equal(result.status, 200);
      assert.equal(((result.body.data as Record<string, unknown>).revision), 4);
    });

    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: "w-other", revision: 5, updated_at: NOW, entity: { ...WORKSPACE, id: "w-other" } },
      trace_id: "trace-workspace-get-mismatch",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body({
        operation: "workspace.get",
        requestId: "req-get-mismatch",
        payload: { entity_id: WORKSPACE.id },
      }));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "IDENTITY_MISMATCH");
    });
  }, { operation: "workspace.get", entityId: WORKSPACE.id, traceId: "trace-workspace-get" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
