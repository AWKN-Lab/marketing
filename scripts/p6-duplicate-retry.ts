import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { buildFeedbackEvent, feedbackRecordIdempotencyKey } from "../lib/feedback-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T09:38:00.000+08:00";
const WORKSPACE_ID = "w-p6-duplicate-retry";
const TASK_ID = "task-p6-duplicate-retry";

const EVENT = buildFeedbackEvent({
  workspaceId: WORKSPACE_ID,
  taskId: TASK_ID,
  feedback: "部分采用",
  artifactTitle: "P6 Duplicate Retry Artifact",
  aiDraft: "初稿内容",
  userFinal: "最终稿内容",
  runId: "run-p6-duplicate-retry",
  traceId: "trace-p6-duplicate-retry-source",
});

const IDEMPOTENCY_KEY = feedbackRecordIdempotencyKey(EVENT.id);

type UpstreamResponder = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function withProductUpstream<T>(responder: UpstreamResponder, run: () => Promise<T>): Promise<T> {
  const previousEndpoint = process.env.AWKN_MARKETING_API_URL;
  const previousToken = process.env.AWKN_MARKETING_API_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_API_URL = "https://product.integration.invalid";
  delete process.env.AWKN_MARKETING_API_TOKEN;
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

function body(requestId: string) {
  return {
    product: "awkn-marketing" as const,
    operation: "feedback.record" as const,
    request_id: requestId,
    idempotency_key: IDEMPOTENCY_KEY,
    workspace_id: WORKSPACE_ID,
    task_id: TASK_ID,
    payload: { feedback_event: EVENT },
  };
}

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": String(payload.request_id ?? "req-w7-14"),
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
  await runP6Case("W7-14 retry after uncertain commit reuses one logical feedback append", async () => {
    const receipts = new Map<string, { entity_id: string; revision: number; updated_at: string }>();
    const seenRequestIds: string[] = [];
    const seenIdempotencyKeys: string[] = [];
    let logicalSideEffects = 0;
    let firstAckLost = false;

    await withProductUpstream(async (_input, init) => {
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const requestId = String(upstreamBody.request_id ?? "");
      const key = String(upstreamBody.idempotency_key ?? "");
      seenRequestIds.push(requestId);
      seenIdempotencyKeys.push(key);

      const existing = receipts.get(key);
      if (existing) {
        return new Response(JSON.stringify({
          ok: true,
          data: existing,
          trace_id: "trace-w7-14-replay",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      logicalSideEffects += 1;
      const ack = { entity_id: EVENT.id, revision: 1, updated_at: NOW };
      receipts.set(key, ack);

      if (!firstAckLost) {
        firstAckLost = true;
        throw abortError("deadline exceeded after feedback commit before acknowledgement");
      }

      return new Response(JSON.stringify({
        ok: true,
        data: ack,
        trace_id: "trace-w7-14-first-success",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const first = await routeJson(body("req-w7-14-first"));
      assert.equal(first.status, 504);
      assert.equal(first.body.ok, false);
      const firstError = first.body.error as Record<string, unknown>;
      assert.equal(firstError.code, "UPSTREAM_TIMEOUT");
      assert.equal(firstError.retryable, true);
      assert.equal(first.body.data, undefined);
      assert.equal(logicalSideEffects, 1);
      assert.equal(receipts.size, 1);

      const retry = await routeJson(body("req-w7-14-retry"));
      assert.equal(retry.status, 200);
      assert.equal(retry.body.ok, true);
      const data = retry.body.data as Record<string, unknown>;
      assert.equal(data.entity_id, EVENT.id);
      assert.equal(data.revision, 1);
      assert.equal(retry.body.trace_id, "trace-w7-14-replay");
      assert.equal(logicalSideEffects, 1);
      assert.equal(receipts.size, 1);
    });

    assert.deepEqual(seenRequestIds, ["req-w7-14-first", "req-w7-14-retry"]);
    assert.equal(new Set(seenIdempotencyKeys).size, 1);
    assert.equal(seenIdempotencyKeys[0], IDEMPOTENCY_KEY);
    assert.equal(seenIdempotencyKeys[1], IDEMPOTENCY_KEY);

    assertP6FaultMatrixRecord({
      operation: "feedback.record",
      expectedState: "same-key-retry-recovers-uncertain-append",
      actualState: "retry-recovers-event-r1",
      errorCode: "UPSTREAM_TIMEOUT",
      retryable: true,
      requestId: "req-w7-14-first|req-w7-14-retry",
      idempotencyKey: IDEMPOTENCY_KEY,
      traceId: "trace-w7-14-replay",
      sideEffectCount: logicalSideEffects,
      finalRevision: 1,
      finalConsistency: "timeout-retry-one-stable-feedback-event",
    });
  }, { operation: "feedback.record", entityId: EVENT.id, traceId: "trace-w7-14-replay" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
