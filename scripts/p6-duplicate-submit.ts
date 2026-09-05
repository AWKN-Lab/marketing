import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { buildFeedbackEvent, feedbackRecordIdempotencyKey } from "../lib/feedback-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T09:32:00.000+08:00";
const WORKSPACE_ID = "w-p6-duplicate-submit";
const TASK_ID = "task-p6-duplicate-submit";

const EVENT = buildFeedbackEvent({
  workspaceId: WORKSPACE_ID,
  taskId: TASK_ID,
  feedback: "采用",
  artifactTitle: "P6 Duplicate Submit Artifact",
  aiDraft: "初稿",
  userFinal: "最终稿",
  runId: "run-p6-duplicate-submit",
  traceId: "trace-p6-duplicate-submit-source",
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
      "x-request-id": String(payload.request_id ?? "req-w7-13"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main() {
  await runP6Case("W7-13 concurrent duplicate submit keeps one logical append", async () => {
    const receipts = new Map<string, { entity_id: string; revision: number; updated_at: string }>();
    const seenRequestIds = new Set<string>();
    const seenIdempotencyKeys = new Set<string>();
    let logicalSideEffects = 0;

    await withProductUpstream(async (_input, init) => {
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const requestId = String(upstreamBody.request_id ?? "");
      const key = String(upstreamBody.idempotency_key ?? "");
      seenRequestIds.add(requestId);
      seenIdempotencyKeys.add(key);

      let ack = receipts.get(key);
      if (!ack) {
        logicalSideEffects += 1;
        ack = { entity_id: EVENT.id, revision: 1, updated_at: NOW };
        receipts.set(key, ack);
      }

      return new Response(JSON.stringify({
        ok: true,
        data: ack,
        trace_id: "trace-w7-13-duplicate-submit",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const [first, second] = await Promise.all([
        routeJson(body("req-w7-13-submit-a")),
        routeJson(body("req-w7-13-submit-b")),
      ]);

      for (const result of [first, second]) {
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        const data = result.body.data as Record<string, unknown>;
        assert.equal(data.entity_id, EVENT.id);
        assert.equal(data.revision, 1);
        assert.equal(result.body.trace_id, "trace-w7-13-duplicate-submit");
      }
    });

    assert.equal(seenRequestIds.size, 2);
    assert.equal(seenIdempotencyKeys.size, 1);
    assert.equal([...seenIdempotencyKeys][0], IDEMPOTENCY_KEY);
    assert.equal(logicalSideEffects, 1);
    assert.equal(receipts.size, 1);

    assertP6FaultMatrixRecord({
      operation: "feedback.record",
      expectedState: "duplicate-submit-one-logical-append",
      actualState: "one-event-r1",
      errorCode: null,
      retryable: null,
      requestId: "req-w7-13-submit-a|req-w7-13-submit-b",
      idempotencyKey: IDEMPOTENCY_KEY,
      traceId: "trace-w7-13-duplicate-submit",
      sideEffectCount: logicalSideEffects,
      finalRevision: 1,
      finalConsistency: "two-requests-one-stable-feedback-event",
    });
  }, { operation: "feedback.record", entityId: EVENT.id, traceId: "trace-w7-13-duplicate-submit" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
