import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { workspaceUpdateIdempotencyKey } from "../lib/workspace-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const WORKSPACE_ID = "w-p6-timeout";
const NOW = "2026-09-05T08:20:00.000Z";

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

function updateBody(input: { requestId: string; baseRevision: number; name: string; idempotencyKey: string }) {
  return {
    product: "awkn-marketing" as const,
    operation: "workspace.update" as const,
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    workspace_id: WORKSPACE_ID,
    payload: {
      workspace: {
        id: WORKSPACE_ID,
        name: input.name,
        type: "营销项目",
        goal: "验证 request timeout",
      },
      base_revision: input.baseRevision,
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
      "x-request-id": String(payload.request_id ?? "req-timeout"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

function abortError(message: string) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

async function main() {
  await runP6Case("W7-06 timeout before commit stays retryable with zero side effects", async () => {
    let logicalSideEffects = 0;
    await withProductUpstream(async () => {
      throw abortError("request timed out before upstream commit");
    }, async () => {
      const key = workspaceUpdateIdempotencyKey(WORKSPACE_ID, 4, "fp-timeout-before-commit");
      const result = await routeJson(updateBody({
        requestId: "w7-06-timeout-before-commit",
        baseRevision: 4,
        name: "Timeout before commit",
        idempotencyKey: key,
      }));

      assert.equal(result.status, 504);
      assert.equal((result.body.error as Record<string, unknown>).code, "UPSTREAM_TIMEOUT");
      assert.equal((result.body.error as Record<string, unknown>).retryable, true);
      assert.equal(result.body.data, undefined);
      assert.equal(logicalSideEffects, 0);

      assertP6FaultMatrixRecord({
        operation: "workspace.update",
        expectedState: "timeout-with-unknown-upstream-outcome",
        actualState: "UPSTREAM_TIMEOUT",
        errorCode: "UPSTREAM_TIMEOUT",
        retryable: true,
        requestId: "w7-06-timeout-before-commit",
        idempotencyKey: key,
        traceId: null,
        sideEffectCount: logicalSideEffects,
        finalRevision: 4,
        finalConsistency: "no-success-or-failure-ack-fabricated",
      });
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID });

  await runP6Case("W7-06 timeout after commit recovers with same idempotency key and one logical side effect", async () => {
    let currentRevision = 4;
    let logicalSideEffects = 0;
    let firstAckTimedOut = false;
    const receipts = new Map<string, { entity_id: string; revision: number; updated_at: string }>();

    await withProductUpstream(async (_input, init) => {
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const key = String(upstreamBody.idempotency_key ?? "");
      const requestId = String(upstreamBody.request_id ?? "unknown");
      const payload = upstreamBody.payload as Record<string, unknown>;
      const baseRevision = Number(payload.base_revision);

      const existing = receipts.get(key);
      if (existing) {
        return new Response(JSON.stringify({
          ok: true,
          data: existing,
          trace_id: `trace-${requestId}-timeout-replay`,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      if (baseRevision !== currentRevision) {
        return new Response(JSON.stringify({
          ok: false,
          error: { code: "REVISION_CONFLICT", message: `expected r${currentRevision}, received r${baseRevision}`, retryable: false },
          trace_id: `trace-${requestId}-conflict`,
        }), { status: 409, headers: { "content-type": "application/json" } });
      }

      currentRevision += 1;
      logicalSideEffects += 1;
      const ack = { entity_id: WORKSPACE_ID, revision: currentRevision, updated_at: NOW };
      receipts.set(key, ack);

      if (!firstAckTimedOut) {
        firstAckTimedOut = true;
        throw abortError("deadline exceeded after commit before acknowledgement");
      }

      return new Response(JSON.stringify({ ok: true, data: ack, trace_id: `trace-${requestId}-success` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }, async () => {
      const key = workspaceUpdateIdempotencyKey(WORKSPACE_ID, 4, "fp-timeout-after-commit");
      const firstPayload = updateBody({
        requestId: "w7-06-timeout-after-commit",
        baseRevision: 4,
        name: "Committed during timeout",
        idempotencyKey: key,
      });
      const retryPayload = updateBody({
        requestId: "w7-06-timeout-retry-same-key",
        baseRevision: 4,
        name: "Committed during timeout",
        idempotencyKey: key,
      });

      const first = await routeJson(firstPayload);
      assert.equal(first.status, 504);
      assert.equal((first.body.error as Record<string, unknown>).code, "UPSTREAM_TIMEOUT");
      assert.equal((first.body.error as Record<string, unknown>).retryable, true);
      assert.equal(first.body.data, undefined);
      assert.equal(currentRevision, 5);
      assert.equal(logicalSideEffects, 1);

      const retry = await routeJson(retryPayload);
      assert.equal(retry.status, 200);
      assert.equal(((retry.body.data as Record<string, unknown>).entity_id), WORKSPACE_ID);
      assert.equal(((retry.body.data as Record<string, unknown>).revision), 5);
      assert.equal(currentRevision, 5);
      assert.equal(logicalSideEffects, 1);
      assert.match(String(retry.body.trace_id ?? ""), /timeout-replay$/);

      assertP6FaultMatrixRecord({
        operation: "workspace.update",
        expectedState: "same-key-retry-recovers-timeout-commit",
        actualState: "retry-success-r5",
        errorCode: "UPSTREAM_TIMEOUT",
        retryable: true,
        requestId: "w7-06-timeout-retry-same-key",
        idempotencyKey: key,
        traceId: String(retry.body.trace_id ?? ""),
        sideEffectCount: logicalSideEffects,
        finalRevision: currentRevision,
        finalConsistency: "one-logical-write-after-timeout-unknown-result",
      });
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-06" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
