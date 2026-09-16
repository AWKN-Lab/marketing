import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { buildFeedbackEvent, isFeedbackDisposition } from "../lib/feedback-contract.ts";
import {
  OUTCOME_TAXONOMY_VERSION,
  OUTCOME_UNKNOWN,
  OUTCOME_VALUES,
  buildOutcomeEvent,
  isOutcomeInput,
  isOutcomeValue,
  outcomeEventMatchesExecution,
  outcomeProjectionState,
  outcomeRecordIdempotencyKey,
  requiresOutcomeReason,
  validateOutcomeProductRequest,
} from "../lib/outcome-contract.ts";
import { buildTaskExecutionState, type TaskExecutionState } from "../lib/task-execution.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T05:30:00.000Z";
const WORKSPACE_ID = "w-p6-outcome";
const TASK_ID = "task-p6-outcome";

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

function execution(overrides: Partial<TaskExecutionState> = {}) {
  const base = buildTaskExecutionState({
    taskId: TASK_ID,
    workspaceId: WORKSPACE_ID,
    artifactTitle: "P6 Outcome Artifact",
    finalText: "用户最终稿",
    feedback: "部分采用",
    outcome: "项目推进",
    outcomeNote: "客户进入下一轮",
  });
  return { ...base, ...overrides };
}

function feedbackEventFor(state = execution()) {
  assert.equal(isFeedbackDisposition(state.feedback), true);
  if (!isFeedbackDisposition(state.feedback)) throw new Error("feedback must be valid");
  return buildFeedbackEvent({
    workspaceId: state.workspaceId,
    taskId: state.taskId,
    feedback: state.feedback,
    artifactTitle: state.artifactTitle,
    aiDraft: "AI 初稿",
    userFinal: state.finalText,
    runId: "run-outcome-1",
    traceId: "trace-agent-outcome-1",
  });
}

function outcomeEvent(state = execution(), options: { traceId?: string; evidenceRefs?: string[] } = {}) {
  const event = buildOutcomeEvent({
    execution: state,
    feedbackEventId: feedbackEventFor(state).id,
    evidenceRefs: options.evidenceRefs ?? ["ev-2", "ev-1"],
    runId: "run-outcome-1",
    traceId: options.traceId ?? "trace-agent-outcome-1",
  });
  assert.ok(event);
  return event;
}

function body(event = outcomeEvent(), requestId = "req-outcome-1") {
  return {
    product: "awkn-marketing" as const,
    operation: "outcome.record" as const,
    request_id: requestId,
    idempotency_key: outcomeRecordIdempotencyKey(event.id),
    workspace_id: WORKSPACE_ID,
    task_id: TASK_ID,
    payload: { outcome_event: event },
  };
}

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": String(payload.request_id ?? "req-outcome"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main() {
  await runP6Case("outcome taxonomy is versioned and preserves pending/unknown/observed truth", () => {
    assert.equal(OUTCOME_TAXONOMY_VERSION, "outcome.v1");
    for (const value of OUTCOME_VALUES) {
      assert.equal(isOutcomeValue(value), true);
      assert.equal(isOutcomeInput(value), true);
      assert.equal(outcomeProjectionState(value), "observed");
    }
    assert.equal(isOutcomeInput(OUTCOME_UNKNOWN), true);
    assert.equal(outcomeProjectionState(OUTCOME_UNKNOWN), "unknown");
    assert.equal(outcomeProjectionState(null), "pending");
    assert.equal(requiresOutcomeReason("失败"), true);
    assert.equal(requiresOutcomeReason("暂时搁置"), true);
    assert.equal(requiresOutcomeReason("项目推进"), false);
  }, { operation: "outcome.record", entityId: TASK_ID });

  await runP6Case("outcome event keeps stable identity and execution projection consistency", () => {
    const state = execution();
    const first = outcomeEvent(state);
    const duplicate = outcomeEvent(state, { traceId: "trace-network-retry" });
    const changedFinal = outcomeEvent(execution({ finalText: "用户更新后的最终稿" }));
    const changedEvidence = outcomeEvent(state, { evidenceRefs: ["ev-3", "ev-1"] });

    assert.equal(first.id, duplicate.id);
    assert.equal(outcomeRecordIdempotencyKey(first.id), outcomeRecordIdempotencyKey(duplicate.id));
    assert.notEqual(first.id, changedFinal.id);
    assert.notEqual(first.id, changedEvidence.id);
    assert.deepEqual(first.evidence_refs, ["ev-1", "ev-2"]);
    assert.equal(first.task_execution_id, `task-execution:${TASK_ID}`);
    assert.equal(first.feedback_event_id.startsWith(`feedback-event:${TASK_ID}:`), true);
    assert.equal(first.run_id, "run-outcome-1");
    assert.equal(first.trace_id, "trace-agent-outcome-1");
    assert.equal(outcomeEventMatchesExecution(first, state), true);
    assert.equal(outcomeEventMatchesExecution(first, execution({ outcomeNote: "后来发生变化" })), false);
  }, { operation: "outcome.record", entityId: outcomeEvent().id, traceId: "trace-agent-outcome-1" });

  await runP6Case("explicit unknown outcome remains unknown and creates no fake observed state", () => {
    const state = execution({ outcome: OUTCOME_UNKNOWN, outcomeNote: "客户尚未回复" });
    const event = outcomeEvent(state);
    assert.equal(event.state, "unknown");
    assert.equal(event.outcome, OUTCOME_UNKNOWN);
    assert.equal(outcomeEventMatchesExecution(event, state), true);
  }, { operation: "outcome.record", entityId: TASK_ID });

  await runP6Case("outcome request rejects identity, taxonomy, state, reason, evidence and idempotency drift", () => {
    const event = outcomeEvent();
    assert.equal(validateOutcomeProductRequest(body(event)), null);

    assert.equal(validateOutcomeProductRequest({ ...body(event), workspace_id: "w-other" })?.code, "IDENTITY_MISMATCH");
    assert.equal(validateOutcomeProductRequest({
      ...body(event),
      payload: { outcome_event: { ...event, task_execution_id: "task-execution:other" } },
    })?.code, "IDENTITY_MISMATCH");
    assert.equal(validateOutcomeProductRequest({
      ...body(event),
      payload: { outcome_event: { ...event, feedback_event_id: "feedback-event:other:fp-1" } },
    })?.code, "IDENTITY_MISMATCH");
    assert.equal(validateOutcomeProductRequest({
      ...body(event),
      payload: { outcome_event: { ...event, taxonomy_version: "outcome.v2" } },
    })?.code, "VALIDATION_ERROR");
    assert.equal(validateOutcomeProductRequest({
      ...body(event),
      payload: { outcome_event: { ...event, state: "unknown" } },
    })?.code, "VALIDATION_ERROR");

    const failedWithoutReason = outcomeEvent(execution({ outcome: "失败", outcomeNote: "失败原因充分" }));
    assert.equal(validateOutcomeProductRequest({
      ...body(failedWithoutReason),
      payload: { outcome_event: { ...failedWithoutReason, reason: "x" } },
    })?.code, "VALIDATION_ERROR");
    assert.equal(validateOutcomeProductRequest({
      ...body(event),
      payload: { outcome_event: { ...event, evidence_refs: ["ev-2", "ev-1"] } },
    })?.code, "VALIDATION_ERROR");
    assert.equal(validateOutcomeProductRequest({
      ...body(event),
      payload: { outcome_event: { ...event, id: "outcome-event:tampered" } },
    })?.code, "IDENTITY_MISMATCH");
    assert.equal(validateOutcomeProductRequest({
      ...body(event),
      idempotency_key: "outcome.record:random",
    })?.code, "VALIDATION_ERROR");
  }, { operation: "outcome.record", entityId: outcomeEvent().id });

  await runP6Case("duplicate outcome submit uses one logical append side effect", async () => {
    const event = outcomeEvent();
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
      forwardedEvent = payload.outcome_event as Record<string, unknown>;
      return new Response(JSON.stringify({
        ok: true,
        data: { entity_id: event.id, revision: 1, updated_at: NOW },
        trace_id: "trace-outcome-append",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      for (const requestId of ["req-outcome-append-1", "req-outcome-append-2"]) {
        const result = await routeJson(body(event, requestId));
        assert.equal(result.status, 200);
        assert.equal((result.body.data as Record<string, unknown>).entity_id, event.id);
        assert.equal(result.body.trace_id, "trace-outcome-append");
      }
    });

    assert.equal(logicalSideEffects, 1);
    assert.equal(forwardedEvent.id, event.id);
    assert.equal(forwardedEvent.task_id, TASK_ID);
    assert.equal(forwardedEvent.workspace_id, WORKSPACE_ID);
    assert.equal(forwardedEvent.task_execution_id, `task-execution:${TASK_ID}`);
    assert.equal(forwardedEvent.feedback_event_id, event.feedback_event_id);
    assert.equal(forwardedEvent.state, "observed");
  }, { operation: "outcome.record", entityId: outcomeEvent().id, traceId: "trace-outcome-append" });

  await runP6Case("outcome ack enforces stable event identity and preserves trace", async () => {
    const event = outcomeEvent();
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: "outcome-event:other", revision: 1, updated_at: NOW },
      trace_id: "trace-outcome-identity-mismatch",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(body(event, "req-outcome-id-mismatch"));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "IDENTITY_MISMATCH");
      assert.equal(result.body.trace_id, "trace-outcome-identity-mismatch");
    });
  }, { operation: "outcome.record", entityId: outcomeEvent().id, traceId: "trace-outcome-identity-mismatch" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
