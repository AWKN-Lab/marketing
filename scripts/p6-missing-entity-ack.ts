import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  normalizeProductResponseContract,
  validateStableEntityAck,
} from "../lib/product-contract.ts";
import { workspaceUpdateIdempotencyKey } from "../lib/workspace-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T09:05:00.000Z";
const WORKSPACE_ID = "w-p6-missing-ack";
const BASE_REVISION = 4;
const WORKSPACE = {
  id: WORKSPACE_ID,
  name: "P6 Missing Entity Ack",
  type: "营销项目",
  goal: "验证持久化成功响应 Ack 完整性",
  successCriteria: "invalid Ack cannot project success",
  status: "进行中",
  updatedAt: "刚刚",
  taskCount: 0,
  materialCount: 0,
  experienceCount: 0,
};
const KEY = workspaceUpdateIdempotencyKey(WORKSPACE_ID, BASE_REVISION, "fp-missing-ack");

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

async function callRoute(requestId: string, upstreamBody: Record<string, unknown>, traceId: string) {
  return withUpstream(async () => new Response(JSON.stringify(upstreamBody), {
    status: 200,
    headers: { "content-type": "application/json", "x-trace-id": traceId },
  }), async () => {
    const response = await productRoute(new Request("http://localhost/api/product", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": requestId },
      body: JSON.stringify(requestBody(requestId)),
    }));
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  });
}

function errorOf(body: Record<string, unknown>) {
  return body.error as Record<string, unknown>;
}

async function main() {
  await runP6Case("W7-11 missing entity_id is a stable MISSING_ENTITY_ACK", () => {
    const response = normalizeProductResponseContract("workspace.update", {
      ok: true,
      data: { revision: 5, updated_at: NOW },
      trace_id: "trace-w7-11-missing-id",
    }, { expectedEntityId: WORKSPACE_ID, httpStatus: 200 });
    assert.equal(response.ok, false);
    assert.equal(response.error?.code, "MISSING_ENTITY_ACK");
    assert.equal(response.trace_id, "trace-w7-11-missing-id");
    assert.equal("data" in response, false);
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-11-missing-id" });

  await runP6Case("W7-11 missing data envelope is a stable MISSING_ENTITY_ACK", () => {
    const response = normalizeProductResponseContract("workspace.update", {
      ok: true,
      trace_id: "trace-w7-11-missing-data",
    }, { expectedEntityId: WORKSPACE_ID, httpStatus: 200 });
    assert.equal(response.ok, false);
    assert.equal(response.error?.code, "MISSING_ENTITY_ACK");
    assert.equal(response.trace_id, "trace-w7-11-missing-data");
    assert.equal("data" in response, false);
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-11-missing-data" });

  await runP6Case("W7-11 incomplete Ack fields remain fail-closed", () => {
    const missingRevision = validateStableEntityAck(
      { ok: true, data: { entity_id: WORKSPACE_ID, updated_at: NOW }, trace_id: "trace-w7-11-revision" },
      WORKSPACE_ID,
    );
    assert.equal(missingRevision.ok, false);
    assert.equal(missingRevision.error?.code, "INVALID_REVISION");
    assert.equal("data" in missingRevision, false);

    const missingUpdatedAt = validateStableEntityAck(
      { ok: true, data: { entity_id: WORKSPACE_ID, revision: 5 }, trace_id: "trace-w7-11-time" },
      WORKSPACE_ID,
    );
    assert.equal(missingUpdatedAt.ok, false);
    assert.equal(missingUpdatedAt.error?.code, "VALIDATION_ERROR");
    assert.equal("data" in missingUpdatedAt, false);
  }, { operation: "workspace.update", entityId: WORKSPACE_ID });

  await runP6Case("W7-11 HTTP 200 with missing entity Ack becomes product-boundary 502", async () => {
    const traceId = "trace-w7-11-route";
    const requestId = "req-w7-11-route";
    const result = await callRoute(requestId, {
      ok: true,
      data: { revision: 5, updated_at: NOW },
    }, traceId);
    assert.equal(result.status, 502);
    assert.equal(result.body.ok, false);
    assert.equal(errorOf(result.body).code, "MISSING_ENTITY_ACK");
    assert.equal(result.body.trace_id, traceId);
    assert.equal("data" in result.body, false);
    assertP6FaultMatrixRecord({
      operation: "workspace.update",
      expectedState: "missing-entity-ack-rejected",
      actualState: String(errorOf(result.body).code),
      errorCode: String(errorOf(result.body).code),
      retryable: Boolean(errorOf(result.body).retryable),
      requestId,
      idempotencyKey: KEY,
      traceId,
      sideEffectCount: 0,
      finalRevision: BASE_REVISION,
      finalConsistency: "missing-ack-cannot-project-success",
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-11-route" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
