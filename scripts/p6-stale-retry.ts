import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { workspaceUpdateIdempotencyKey } from "../lib/workspace-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const WORKSPACE_ID = "w-p6-stale-retry";
const NOW = "2026-09-05T08:10:00.000Z";

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

function updateBody(input: { requestId: string; baseRevision: number; name: string; fingerprint: string; idempotencyKey?: string }) {
  return {
    product: "awkn-marketing" as const,
    operation: "workspace.update" as const,
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey ?? workspaceUpdateIdempotencyKey(WORKSPACE_ID, input.baseRevision, input.fingerprint),
    workspace_id: WORKSPACE_ID,
    payload: {
      workspace: {
        id: WORKSPACE_ID,
        name: input.name,
        type: "营销项目",
        goal: "验证 stale retry",
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
      "x-request-id": String(payload.request_id ?? "req-stale-retry"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main() {
  await runP6Case("W7-05 same-key retry recovers an already committed write without a second side effect", async () => {
    let currentRevision = 4;
    let currentName = "Baseline r4";
    let logicalSideEffects = 0;
    let firstAckLost = false;
    const idempotentResults = new Map<string, { entity_id: string; revision: number; updated_at: string }>();

    await withProductUpstream(async (_input, init) => {
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      assert.equal(upstreamBody.operation, "workspace.update");
      const key = String(upstreamBody.idempotency_key ?? "");
      const requestId = String(upstreamBody.request_id ?? "unknown");
      const payload = upstreamBody.payload as Record<string, unknown>;
      const workspace = payload.workspace as Record<string, unknown>;
      const baseRevision = Number(payload.base_revision);

      const existing = idempotentResults.get(key);
      if (existing) {
        return new Response(JSON.stringify({
          ok: true,
          data: existing,
          trace_id: `trace-${requestId}-idempotent-replay`,
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
      currentName = String(workspace.name ?? currentName);
      logicalSideEffects += 1;
      const ack = { entity_id: WORKSPACE_ID, revision: currentRevision, updated_at: NOW };
      idempotentResults.set(key, ack);

      if (!firstAckLost) {
        firstAckLost = true;
        throw new Error("connection dropped after commit before response acknowledgement");
      }

      return new Response(JSON.stringify({ ok: true, data: ack, trace_id: `trace-${requestId}-success` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }, async () => {
      const logicalKey = workspaceUpdateIdempotencyKey(WORKSPACE_ID, 4, "fp-same-logical-action");
      const first = updateBody({
        requestId: "w7-05-first-attempt",
        baseRevision: 4,
        name: "Committed but ack lost",
        fingerprint: "fp-same-logical-action",
        idempotencyKey: logicalKey,
      });
      const retry = updateBody({
        requestId: "w7-05-retry-same-key",
        baseRevision: 4,
        name: "Committed but ack lost",
        fingerprint: "fp-same-logical-action",
        idempotencyKey: logicalKey,
      });

      const firstResult = await routeJson(first);
      assert.equal(firstResult.status, 502);
      assert.equal((firstResult.body.error as Record<string, unknown>).code, "UPSTREAM_UNAVAILABLE");
      assert.equal((firstResult.body.error as Record<string, unknown>).retryable, true);
      assert.equal(currentRevision, 5);
      assert.equal(logicalSideEffects, 1);

      const retryResult = await routeJson(retry);
      assert.equal(retryResult.status, 200);
      assert.equal(((retryResult.body.data as Record<string, unknown>).entity_id), WORKSPACE_ID);
      assert.equal(((retryResult.body.data as Record<string, unknown>).revision), 5);
      assert.equal(logicalSideEffects, 1);
      assert.equal(currentRevision, 5);
      assert.match(String(retryResult.body.trace_id ?? ""), /idempotent-replay$/);

      assertP6FaultMatrixRecord({
        operation: "workspace.update",
        expectedState: "same-key-retry-replays-existing-commit",
        actualState: "retry-success-r5",
        errorCode: "UPSTREAM_UNAVAILABLE",
        retryable: true,
        requestId: "w7-05-same-key-retry",
        idempotencyKey: logicalKey,
        traceId: String(retryResult.body.trace_id ?? ""),
        sideEffectCount: logicalSideEffects,
        finalRevision: currentRevision,
        finalConsistency: "one-logical-write-after-unknown-first-result",
      });

      const staleNewKey = updateBody({
        requestId: "w7-05-stale-new-key",
        baseRevision: 4,
        name: "Accidental regenerated retry key",
        fingerprint: "fp-regenerated-key",
      });
      const staleResult = await routeJson(staleNewKey);
      assert.equal(staleResult.status, 409);
      assert.equal((staleResult.body.error as Record<string, unknown>).code, "REVISION_CONFLICT");
      assert.equal((staleResult.body.error as Record<string, unknown>).retryable, false);
      assert.equal(logicalSideEffects, 1);
      assert.equal(currentRevision, 5);
      assert.equal(currentName, "Committed but ack lost");

      assertP6FaultMatrixRecord({
        operation: "workspace.update",
        expectedState: "stale-regenerated-key-rejected",
        actualState: "REVISION_CONFLICT",
        errorCode: "REVISION_CONFLICT",
        retryable: false,
        requestId: "w7-05-stale-new-key",
        idempotencyKey: String(staleNewKey.idempotency_key),
        traceId: String(staleResult.body.trace_id ?? ""),
        sideEffectCount: logicalSideEffects,
        finalRevision: currentRevision,
        finalConsistency: "stale-retry-cannot-create-second-write",
      });
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-05" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
