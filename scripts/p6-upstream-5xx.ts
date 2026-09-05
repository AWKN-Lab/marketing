import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { snapshotFingerprint } from "../lib/reconcile.ts";
import { workspaceUpdateIdempotencyKey } from "../lib/workspace-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T08:15:00.000Z";
const WORKSPACE_ID = "w-p6-5xx";
const BASE_REVISION = 4;
const UPDATED_WORKSPACE = {
  id: WORKSPACE_ID,
  name: "P6 5xx Recovery",
  type: "营销项目",
  goal: "验证 upstream 5xx",
  successCriteria: "stable error / trace / retry",
  status: "进行中",
  updatedAt: "刚刚",
  taskCount: 1,
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

function updateBody(requestId: string, idempotencyKey: string) {
  return {
    product: "awkn-marketing" as const,
    operation: "workspace.update" as const,
    request_id: requestId,
    idempotency_key: idempotencyKey,
    workspace_id: WORKSPACE_ID,
    payload: {
      workspace: UPDATED_WORKSPACE,
      base_revision: BASE_REVISION,
    },
  };
}

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": String(payload.request_id ?? "req-5xx"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

function errorOf(body: Record<string, unknown>) {
  return body.error as Record<string, unknown>;
}

async function main() {
  const fingerprint = snapshotFingerprint(UPDATED_WORKSPACE);
  const key = workspaceUpdateIdempotencyKey(WORKSPACE_ID, BASE_REVISION, fingerprint);

  await runP6Case("W7-07 malformed upstream 503 maps to retryable UPSTREAM_UNAVAILABLE and preserves header trace", async () => {
    await withProductUpstream(async () => new Response("gateway down", {
      status: 503,
      headers: { "content-type": "text/plain", "x-trace-id": "trace-w7-07-malformed-503" },
    }), async () => {
      const result = await routeJson(updateBody("req-w7-07-malformed-503", key));
      assert.equal(result.status, 503);
      assert.equal(result.body.ok, false);
      assert.equal(errorOf(result.body).code, "UPSTREAM_UNAVAILABLE");
      assert.equal(errorOf(result.body).retryable, true);
      assert.equal(result.body.trace_id, "trace-w7-07-malformed-503");
      assert.equal("data" in result.body, false);
      assertP6FaultMatrixRecord({
        operation: "workspace.update",
        expectedState: "retryable-upstream-unavailable",
        actualState: String(errorOf(result.body).code),
        errorCode: String(errorOf(result.body).code),
        retryable: Boolean(errorOf(result.body).retryable),
        requestId: "req-w7-07-malformed-503",
        idempotencyKey: key,
        traceId: String(result.body.trace_id),
        sideEffectCount: 0,
        finalRevision: BASE_REVISION,
        finalConsistency: "malformed-5xx-cannot-fabricate-success",
      });
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-07-malformed-503" });

  await runP6Case("W7-07 HTTP 5xx rejects an upstream ok=true success envelope", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: WORKSPACE_ID, revision: 5, updated_at: NOW },
      trace_id: "trace-w7-07-false-success",
    }), { status: 502, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(updateBody("req-w7-07-false-success", key));
      assert.equal(result.status, 502);
      assert.equal(result.body.ok, false);
      assert.equal(errorOf(result.body).code, "UPSTREAM_UNAVAILABLE");
      assert.equal(errorOf(result.body).retryable, true);
      assert.equal(result.body.trace_id, "trace-w7-07-false-success");
      assert.equal("data" in result.body, false);
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-07-false-success" });

  await runP6Case("W7-07 unknown vendor 500 code is normalized into the stable product taxonomy", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: false,
      error: { code: "VENDOR_INTERNAL_FAILURE", message: "database proxy failed" },
      trace_id: "trace-w7-07-vendor-500",
    }), { status: 500, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(updateBody("req-w7-07-vendor-500", key));
      assert.equal(result.status, 500);
      assert.equal(result.body.ok, false);
      assert.equal(errorOf(result.body).code, "UPSTREAM_UNAVAILABLE");
      assert.equal(errorOf(result.body).retryable, true);
      assert.equal(result.body.trace_id, "trace-w7-07-vendor-500");
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-07-vendor-500" });

  await runP6Case("W7-07 commit-before-500 same-key retry recovers one logical write", async () => {
    const receipts = new Map<string, { entity_id: string; revision: number; updated_at: string }>();
    let logicalSideEffects = 0;
    let firstAttempt = true;

    await withProductUpstream(async (_input, init) => {
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const idempotencyKey = String(upstreamBody.idempotency_key ?? "");
      const existing = receipts.get(idempotencyKey);
      if (existing) {
        return new Response(JSON.stringify({
          ok: true,
          data: existing,
          trace_id: "trace-w7-07-replay",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      logicalSideEffects += 1;
      const ack = { entity_id: WORKSPACE_ID, revision: 5, updated_at: NOW };
      receipts.set(idempotencyKey, ack);
      if (firstAttempt) {
        firstAttempt = false;
        return new Response(JSON.stringify({
          ok: false,
          error: { code: "VENDOR_INTERNAL_FAILURE", message: "ack path failed" },
          trace_id: "trace-w7-07-first-500",
        }), { status: 500, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, data: ack }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }, async () => {
      const first = await routeJson(updateBody("req-w7-07-first", key));
      assert.equal(first.status, 500);
      assert.equal(first.body.ok, false);
      assert.equal(errorOf(first.body).code, "UPSTREAM_UNAVAILABLE");
      assert.equal(errorOf(first.body).retryable, true);
      assert.equal("data" in first.body, false);

      const retry = await routeJson(updateBody("req-w7-07-retry", key));
      assert.equal(retry.status, 200);
      assert.equal(retry.body.ok, true);
      assert.equal((retry.body.data as Record<string, unknown>).entity_id, WORKSPACE_ID);
      assert.equal((retry.body.data as Record<string, unknown>).revision, 5);
      assert.equal(retry.body.trace_id, "trace-w7-07-replay");
    });

    assert.equal(logicalSideEffects, 1);
    assertP6FaultMatrixRecord({
      operation: "workspace.update",
      expectedState: "same-key-retry-recovers-existing-ack",
      actualState: "recovered-r5",
      errorCode: "UPSTREAM_UNAVAILABLE",
      retryable: true,
      requestId: "req-w7-07-retry",
      idempotencyKey: key,
      traceId: "trace-w7-07-replay",
      sideEffectCount: logicalSideEffects,
      finalRevision: 5,
      finalConsistency: "one-logical-write-after-upstream-5xx",
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-07-replay" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
