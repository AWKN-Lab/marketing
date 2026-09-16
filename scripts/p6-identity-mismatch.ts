import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  normalizeProductResponseContract,
  validateStableEntityAck,
} from "../lib/product-contract.ts";
import { workspaceUpdateIdempotencyKey } from "../lib/workspace-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T09:31:00.000Z";
const WORKSPACE_ID = "w-p6-identity";
const WRONG_WORKSPACE_ID = "w-p6-identity-wrong";
const BASE_REVISION = 7;
const WORKSPACE = {
  id: WORKSPACE_ID,
  name: "P6 Identity Mismatch",
  type: "营销项目",
  goal: "验证平台成功响应不能替换产品 stable entity ID",
  successCriteria: "identity mismatch cannot project success",
  status: "进行中",
  updatedAt: "刚刚",
  taskCount: 0,
  materialCount: 0,
  experienceCount: 0,
};
const KEY = workspaceUpdateIdempotencyKey(WORKSPACE_ID, BASE_REVISION, "fp-identity-mismatch");

type Responder = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function withUpstream<T>(responder: Responder, run: () => Promise<T>) {
  const previousEndpoint = process.env.AWKN_MARKETING_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_API_URL = "https://integration.invalid";
  globalThis.fetch = responder as typeof fetch;
  try {
    return await run();
  } finally {
    if (typeof previousEndpoint === "undefined") delete process.env.AWKN_MARKETING_API_URL;
    else process.env.AWKN_MARKETING_API_URL = previousEndpoint;
    globalThis.fetch = previousFetch;
  }
}

function requestBody(requestId: string) {
  return {
    product: "awkn-marketing" as const,
    operation: "workspace.update" as const,
    request_id: requestId,
    idempotency_key: KEY,
    workspace_id: WORKSPACE_ID,
    payload: { workspace: WORKSPACE, base_revision: BASE_REVISION },
  };
}

function errorOf(body: Record<string, unknown>) {
  return body.error as Record<string, unknown>;
}

async function main() {
  await runP6Case("W7-12 persistent Ack identity mismatch fails closed", () => {
    const response = validateStableEntityAck(
      {
        ok: true,
        data: { entity_id: WRONG_WORKSPACE_ID, revision: BASE_REVISION + 1, updated_at: NOW },
        trace_id: "trace-w7-12-ack",
      },
      WORKSPACE_ID,
    );
    assert.equal(response.ok, false);
    assert.equal(response.error?.code, "IDENTITY_MISMATCH");
    assert.equal(response.trace_id, "trace-w7-12-ack");
    assert.equal("data" in response, false);
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-12-ack" });

  await runP6Case("W7-12 entity-read snapshot identity mismatch fails closed", () => {
    const response = normalizeProductResponseContract("workspace.get", {
      ok: true,
      data: {
        entity_id: WORKSPACE_ID,
        revision: BASE_REVISION,
        updated_at: NOW,
        entity: { id: WRONG_WORKSPACE_ID, name: "wrong workspace" },
      },
      trace_id: "trace-w7-12-read",
    }, { expectedEntityId: WORKSPACE_ID, httpStatus: 200 });
    assert.equal(response.ok, false);
    assert.equal(response.error?.code, "IDENTITY_MISMATCH");
    assert.equal(response.trace_id, "trace-w7-12-read");
    assert.equal("data" in response, false);
  }, { operation: "workspace.get", entityId: WORKSPACE_ID, traceId: "trace-w7-12-read" });

  await runP6Case("W7-12 HTTP 200 wrong entity becomes product-boundary 502", async () => {
    const traceId = "trace-w7-12-route";
    const requestId = "req-w7-12-route";
    let upstreamCalls = 0;
    const result = await withUpstream(async (_input, init) => {
      upstreamCalls += 1;
      const sent = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      assert.equal(sent.workspace_id, WORKSPACE_ID);
      assert.equal(sent.idempotency_key, KEY);
      return new Response(JSON.stringify({
        ok: true,
        data: { entity_id: WRONG_WORKSPACE_ID, revision: BASE_REVISION + 1, updated_at: NOW },
      }), {
        status: 200,
        headers: { "content-type": "application/json", "x-trace-id": traceId },
      });
    }, async () => {
      const response = await productRoute(new Request("http://localhost/api/product", {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": requestId },
        body: JSON.stringify(requestBody(requestId)),
      }));
      return { status: response.status, body: await response.json() as Record<string, unknown> };
    });

    assert.equal(upstreamCalls, 1);
    assert.equal(result.status, 502);
    assert.equal(result.body.ok, false);
    assert.equal(errorOf(result.body).code, "IDENTITY_MISMATCH");
    assert.equal(result.body.trace_id, traceId);
    assert.equal("data" in result.body, false);
    assertP6FaultMatrixRecord({
      operation: "workspace.update",
      expectedState: "identity-mismatch-rejected",
      actualState: String(errorOf(result.body).code),
      errorCode: String(errorOf(result.body).code),
      retryable: Boolean(errorOf(result.body).retryable),
      requestId,
      idempotencyKey: KEY,
      traceId,
      sideEffectCount: 0,
      finalRevision: BASE_REVISION,
      finalConsistency: "wrong-entity-cannot-project-success",
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-12-route" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
