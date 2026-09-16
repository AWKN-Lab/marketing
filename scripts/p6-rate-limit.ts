import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { snapshotFingerprint } from "../lib/reconcile.ts";
import { workspaceUpdateIdempotencyKey } from "../lib/workspace-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T08:30:00.000Z";
const WORKSPACE_ID = "w-p6-rate-limit";
const BASE_REVISION = 4;
const UPDATED_WORKSPACE = {
  id: WORKSPACE_ID,
  name: "P6 Rate Limit Recovery",
  type: "营销项目",
  goal: "验证 upstream rate limit",
  successCriteria: "stable RATE_LIMITED / Retry-After / idempotent retry",
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
      "x-request-id": String(payload.request_id ?? "req-rate-limit"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeResult(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return {
    status: response.status,
    retryAfter: response.headers.get("retry-after"),
    body: await response.json() as Record<string, unknown>,
  };
}

function errorOf(body: Record<string, unknown>) {
  return body.error as Record<string, unknown>;
}

async function main() {
  const key = workspaceUpdateIdempotencyKey(
    WORKSPACE_ID,
    BASE_REVISION,
    snapshotFingerprint(UPDATED_WORKSPACE),
  );

  await runP6Case("W7-08 HTTP 429 maps to retryable RATE_LIMITED and preserves trace plus Retry-After", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: false,
      error: { code: "VENDOR_THROTTLED", message: "too many requests", retryable: false },
      trace_id: "trace-w7-08-rate-limit",
    }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "30" },
    }), async () => {
      const result = await routeResult(updateBody("req-w7-08-rate-limit", key));
      assert.equal(result.status, 429);
      assert.equal(result.body.ok, false);
      assert.equal(errorOf(result.body).code, "RATE_LIMITED");
      assert.equal(errorOf(result.body).retryable, true);
      assert.equal(result.body.trace_id, "trace-w7-08-rate-limit");
      assert.equal(result.retryAfter, "30");
      assert.equal("data" in result.body, false);
      assertP6FaultMatrixRecord({
        operation: "workspace.update",
        expectedState: "retryable-rate-limited",
        actualState: String(errorOf(result.body).code),
        errorCode: "RATE_LIMITED",
        retryable: true,
        requestId: "req-w7-08-rate-limit",
        idempotencyKey: key,
        traceId: "trace-w7-08-rate-limit",
        sideEffectCount: 0,
        finalRevision: BASE_REVISION,
        finalConsistency: "rate-limit-does-not-create-local-success",
      });
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-08-rate-limit" });

  await runP6Case("W7-08 malformed 429 and false-success 429 cannot escape RATE_LIMITED semantics", async () => {
    const responses = [
      new Response("throttled", {
        status: 429,
        headers: { "content-type": "text/plain", "x-trace-id": "trace-w7-08-malformed", "retry-after": "15" },
      }),
      new Response(JSON.stringify({
        ok: true,
        data: { entity_id: WORKSPACE_ID, revision: 5, updated_at: NOW },
        trace_id: "trace-w7-08-false-success",
      }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "60" },
      }),
    ];
    let index = 0;
    await withProductUpstream(async () => responses[index++]!, async () => {
      for (const requestId of ["req-w7-08-malformed", "req-w7-08-false-success"]) {
        const result = await routeResult(updateBody(requestId, key));
        assert.equal(result.status, 429);
        assert.equal(result.body.ok, false);
        assert.equal(errorOf(result.body).code, "RATE_LIMITED");
        assert.equal(errorOf(result.body).retryable, true);
        assert.equal("data" in result.body, false);
      }
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID });

  await runP6Case("W7-08 unsafe Retry-After values are not relayed", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: false,
      error: { code: "RATE_LIMITED", message: "throttled" },
    }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "not-a-valid-retry-after" },
    }), async () => {
      const result = await routeResult(updateBody("req-w7-08-invalid-retry-after", key));
      assert.equal(errorOf(result.body).code, "RATE_LIMITED");
      assert.equal(result.retryAfter, null);
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID });

  await runP6Case("W7-08 same logical retry preserves idempotency key and produces one logical write after rate limit", async () => {
    let attempts = 0;
    let logicalSideEffects = 0;
    const seenKeys: string[] = [];
    await withProductUpstream(async (_input, init) => {
      attempts += 1;
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const idempotencyKey = String(upstreamBody.idempotency_key ?? "");
      seenKeys.push(idempotencyKey);
      if (attempts === 1) {
        return new Response(JSON.stringify({
          ok: false,
          error: { code: "RATE_LIMITED", message: "try again later" },
          trace_id: "trace-w7-08-first",
        }), {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": "1" },
        });
      }
      logicalSideEffects += 1;
      return new Response(JSON.stringify({
        ok: true,
        data: { entity_id: WORKSPACE_ID, revision: 5, updated_at: NOW },
        trace_id: "trace-w7-08-retry",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const first = await routeResult(updateBody("req-w7-08-first", key));
      assert.equal(first.status, 429);
      assert.equal(errorOf(first.body).code, "RATE_LIMITED");
      assert.equal(logicalSideEffects, 0);

      const retry = await routeResult(updateBody("req-w7-08-retry", key));
      assert.equal(retry.status, 200);
      assert.equal(retry.body.ok, true);
      assert.equal((retry.body.data as Record<string, unknown>).revision, 5);
      assert.equal(retry.body.trace_id, "trace-w7-08-retry");
    });

    assert.deepEqual(seenKeys, [key, key]);
    assert.equal(logicalSideEffects, 1);
    assertP6FaultMatrixRecord({
      operation: "workspace.update",
      expectedState: "same-key-retry-after-rate-limit",
      actualState: "recovered-r5",
      errorCode: "RATE_LIMITED",
      retryable: true,
      requestId: "req-w7-08-retry",
      idempotencyKey: key,
      traceId: "trace-w7-08-retry",
      sideEffectCount: logicalSideEffects,
      finalRevision: 5,
      finalConsistency: "one-logical-write-after-rate-limit",
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-08-retry" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
