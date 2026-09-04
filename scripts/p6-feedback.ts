import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  artifactEditCount,
  buildFeedbackEvent,
  feedbackRecordIdempotencyKey,
  isFeedbackDisposition,
  validateFeedbackProductRequest,
} from "../lib/feedback-contract.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T04:30:00.000Z";
const WORKSPACE_ID = "w-p6-feedback";
const TASK_ID = "task-p6-feedback";

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

function feedbackEvent(overrides: Partial<Parameters<typeof buildFeedbackEvent>[0]> = {}) {
  return buildFeedbackEvent({
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    feedback: "部分采用",
    artifactTitle: "P6 Feedback Artifact",
    aiDraft: "第一行\n第二行",
    userFinal: "第一行\n用户修改后的第二行",
    runId: "run-feedback-1",
    traceId: "trace-agent-feedback-1",
    ...overrides,
  });
}

function body(event = feedbackEvent(), requestId = "req-feedback-1") {
  return {
    product: "awkn-marketing" as const,
    operation: "feedback.record" as const,
    request_id: requestId,
    idempotency_key: feedbackRecordIdempotencyKey(event.id),
    workspace_id: WORKSPACE_ID,
    task_id: TASK_ID,
    payload: { feedback_event: event },
  };
}

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": String(payload.request_id ?? "req-feedback"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main() {
  await runP6Case("feedback disposition stays within the product enum", () => {
    for (const value of ["采用", "部分采用", "需要修改", "放弃"]) assert.equal(isFeedbackDisposition(value), true);
    for (const value of ["", "unknown", "pending", undefined]) assert.equal(isFeedbackDisposition(value), false);
  }, { operation: "feedback.record", entityId: TASK_ID });

  await runP6Case("feedback event keeps stable identity and AI Draft/User Final association", () => {
    const first = feedbackEvent();
    const duplicate = feedbackEvent();
    const changedFinal = feedbackEvent({ userFinal: "完全不同的 User Final" });

    assert.equal(first.id, duplicate.id);
    assert.equal(feedbackRecordIdempotencyKey(first.id), feedbackRecordIdempotencyKey(duplicate.id));
    assert.notEqual(first.id, changedFinal.id);
    assert.equal(first.task_execution_id, `task-execution:${TASK_ID}`);
    assert.equal(first.ai_draft, "第一行\n第二行");
    assert.equal(first.user_final, "第一行\n用户修改后的第二行");
    assert.equal(first.edit_count, artifactEditCount(first.ai_draft, first.user_final));
    assert.equal(first.run_id, "run-feedback-1");
    assert.equal(first.trace_id, "trace-agent-feedback-1");
  }, { operation: "feedback.record", entityId: feedbackEvent().id, traceId: "trace-agent-feedback-1" });

  await runP6Case("feedback request rejects identity, edit count and idempotency drift", () => {
    const event = feedbackEvent();
    assert.equal(validateFeedbackProductRequest(body(event)), null);

    const workspaceMismatch = validateFeedbackProductRequest({
      ...body(event),
      workspace_id: "w-other",
    });
    assert.equal(workspaceMismatch?.code, "IDENTITY_MISMATCH");

    const executionMismatch = validateFeedbackProductRequest({
      ...body(event),
      payload: { feedback_event: { ...event, task_execution_id: "task-execution:other" } },
    });
    assert.equal(executionMismatch?.code, "IDENTITY_MISMATCH");

    const editCountMismatch = validateFeedbackProductRequest({
      ...body(event),
      payload: { feedback_event: { ...event, edit_count: event.edit_count + 1 } },
    });
    assert.equal(editCountMismatch?.code, "VALIDATION_ERROR");

    const eventIdentityMismatch = validateFeedbackProductRequest({
      ...body(event),
      payload: { feedback_event: { ...event, id: "feedback-event:tampered" } },
    });
    assert.equal(eventIdentityMismatch?.code, "IDENTITY_MISMATCH");

    const keyMismatch = validateFeedbackProductRequest({
      ...body(event),
      idempotency_key: "feedback.record:random",
    });
    assert.equal(keyMismatch?.code, "VALIDATION_ERROR");
  }, { operation: "feedback.record", entityId: feedbackEvent().id });

  await runP6Case("duplicate feedback submit uses one logical append side effect", async () => {
    const event = feedbackEvent();
    const seen = new Set<string>();
    let logicalSideEffects = 0;
    let forwardedEvent: Record<string, unknown> = {};

    await withProductUpstream(async (_input, init) => {
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const key = String(upstreamBody.idempotency_key ?? "");
      if (!seen.has(key)) {
        seen.add(key);
        logicalSideEffects += 1;
      }
      const payload = upstreamBody.payload as Record<string, unknown>;
      forwardedEvent = payload.feedback_event as Record<string, unknown>;
      return new Response(JSON.stringify({
        ok: true,
        data: { entity_id: event.id, revision: 1, updated_at: NOW },
        trace_id: "trace-feedback-append",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      for (const requestId of ["req-feedback-append-1", "req-feedback-append-2"]) {
        const result = await routeJson(body(event, requestId));
        assert.equal(result.status, 200);
        assert.equal((result.body.data as Record<string, unknown>).entity_id, event.id);
        assert.equal(result.body.trace_id, "trace-feedback-append");
      }
    });

    assert.equal(logicalSideEffects, 1);
    assert.equal(forwardedEvent.id, event.id);
    assert.equal(forwardedEvent.task_id, TASK_ID);
    assert.equal(forwardedEvent.workspace_id, WORKSPACE_ID);
    assert.equal(forwardedEvent.ai_draft, event.ai_draft);
    assert.equal(forwardedEvent.user_final, event.user_final);
    assert.equal(forwardedEvent.edit_count, event.edit_count);
  }, { operation: "feedback.record", entityId: feedbackEvent().id, traceId: "trace-feedback-append" });

  await runP6Case("feedback ack enforces stable event identity and preserves trace", async () => {
    const event = feedbackEvent();
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: "feedback-event:other", revision: 1, updated_at: NOW },
      trace_id: "trace-feedback-identity-mismatch",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body(event, "req-feedback-id-mismatch"));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "IDENTITY_MISMATCH");
      assert.equal(result.body.trace_id, "trace-feedback-identity-mismatch");
    });
  }, { operation: "feedback.record", entityId: feedbackEvent().id, traceId: "trace-feedback-identity-mismatch" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
