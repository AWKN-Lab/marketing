import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  buildEvolutionReview,
  evolutionReviewId,
  evolutionReviewIdempotencyKey,
  validateEvolutionProductRequest,
} from "../lib/evolution-contract.ts";
import {
  candidateFingerprint,
  candidateRevision,
  createExperienceCandidate,
  evolutionCandidateReadyForReview,
  matchReviewedExperience,
  type EvolutionReviewState,
  type LocalEvolutionCandidate,
} from "../lib/evolution-store.ts";
import { filterReadableWorkspaceItems, type MarketingSession } from "../lib/product-session.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T06:45:00.000Z";
const WORKSPACE_ID = "w-p6-evolution";
const TASK_ID = "task-p6-evolution";

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

function candidate(overrides: {
  taskId?: string;
  workspaceId?: string;
  finalText?: string;
  outcome?: string;
  outcomeNote?: string;
  previousCandidate?: LocalEvolutionCandidate;
} = {}) {
  const taskId = overrides.taskId ?? TASK_ID;
  const workspaceId = overrides.workspaceId ?? WORKSPACE_ID;
  const aiDraft = "AI 初稿";
  const finalText = overrides.finalText ?? "用户最终稿";
  const outcome = overrides.outcome ?? "项目推进";
  const outcomeNote = overrides.outcomeNote ?? "客户进入下一轮";
  const evidenceRefs = ["ev-2", "ev-1"];
  const fingerprint = candidateFingerprint({
    aiDraft,
    finalText,
    feedback: "采用",
    outcome,
    outcomeNote,
    evidenceRefs,
    runId: "run-evolution-1",
  });
  return createExperienceCandidate({
    taskId,
    workspaceId,
    taskType: "策略判断",
    taskGoal: "推进下一轮",
    artifactTitle: "P6 Evolution Artifact",
    aiDraft,
    finalText,
    feedback: "采用",
    outcome,
    outcomeNote,
    editCount: 2,
    fingerprint,
    feedbackEventId: `feedback-event:${taskId}:fp-feedback`,
    outcomeEventId: `outcome-event:${taskId}:fp-outcome`,
    evidenceRefs,
    runId: "run-evolution-1",
    traceId: "trace-agent-evolution-1",
    previousCandidate: overrides.previousCandidate,
  });
}

function reviewFor(item: LocalEvolutionCandidate, decision: "accepted" | "scoped" | "rejected" = "accepted") {
  assert.ok(item.workspaceId);
  return buildEvolutionReview({
    candidateId: item.id,
    candidateRevision: candidateRevision(item),
    workspaceId: item.workspaceId,
    taskId: item.taskId,
    decision,
    reviewerActorId: "actor-evolution-1",
  });
}

function body(item: LocalEvolutionCandidate, decision: "accepted" | "scoped" | "rejected" = "accepted", baseRevision?: number, requestId = "req-evolution-1") {
  const review = reviewFor(item, decision);
  return {
    product: "awkn-marketing" as const,
    operation: "evolution.review" as const,
    request_id: requestId,
    idempotency_key: evolutionReviewIdempotencyKey(review, baseRevision),
    workspace_id: item.workspaceId,
    task_id: item.taskId,
    payload: { candidate: item, review, base_revision: baseRevision },
  };
}

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": String(payload.request_id ?? "req-evolution"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

function reviewState(item: LocalEvolutionCandidate, decision: "accepted" | "scoped" | "rejected", scopeWorkspaceId?: string): EvolutionReviewState {
  return {
    reviewId: evolutionReviewId(item.id),
    decision,
    candidateRevision: candidateRevision(item),
    scopeWorkspaceId,
    platformRevision: 1,
    traceId: "trace-review",
  };
}

async function main() {
  await runP6Case("candidate keeps stable id, evidence chain and monotonic revision", () => {
    const first = candidate();
    const duplicate = candidate({ previousCandidate: first });
    const changed = candidate({ previousCandidate: duplicate, finalText: "用户更新后的最终稿" });
    assert.equal(first.id, `local-ev-${TASK_ID}`);
    assert.equal(first.revision, 1);
    assert.equal(duplicate.revision, 1);
    assert.equal(duplicate.createdAt, first.createdAt);
    assert.equal(changed.id, first.id);
    assert.equal(changed.revision, 2);
    assert.deepEqual(first.evidence?.evidence_refs, ["ev-1", "ev-2"]);
    assert.equal(first.evidence?.feedback_event_id.startsWith(`feedback-event:${TASK_ID}:`), true);
    assert.equal(first.evidence?.outcome_event_id.startsWith(`outcome-event:${TASK_ID}:`), true);
    assert.equal(evolutionCandidateReadyForReview(first), true);
  }, { operation: "evolution.review", entityId: `local-ev-${TASK_ID}` });

  await runP6Case("negative candidate preserves Counterexample semantics", () => {
    const failed = candidate({ outcome: "失败", outcomeNote: "过早进入报价导致失败" });
    assert.equal(failed.polarity, "negative");
    assert.equal(failed.type, "Counterexample Candidate");
  }, { operation: "evolution.review", entityId: `local-ev-${TASK_ID}` });

  await runP6Case("evolution review validates candidate evidence, scope, revision and idempotency", () => {
    const item = candidate();
    const valid = body(item, "scoped", 3);
    assert.equal(validateEvolutionProductRequest(valid), null);
    assert.equal(validateEvolutionProductRequest({ ...valid, task_id: "task-other" })?.code, "IDENTITY_MISMATCH");
    assert.equal(validateEvolutionProductRequest({
      ...valid,
      payload: { ...valid.payload, candidate: { ...item, revision: 0 } },
    })?.code, "INVALID_REVISION");
    assert.equal(validateEvolutionProductRequest({
      ...valid,
      payload: { ...valid.payload, candidate: { ...item, evidence: undefined } },
    })?.code, "VALIDATION_ERROR");
    assert.equal(validateEvolutionProductRequest({
      ...valid,
      payload: { ...valid.payload, review: { ...valid.payload.review, candidate_revision: 2 } },
    })?.code, "INVALID_REVISION");
    assert.equal(validateEvolutionProductRequest({
      ...valid,
      payload: { ...valid.payload, review: { ...valid.payload.review, scope: { type: "workspace", workspace_id: "w-other" } } },
    })?.code, "IDENTITY_MISMATCH");
    assert.equal(validateEvolutionProductRequest({ ...valid, idempotency_key: "evolution.review:random" })?.code, "VALIDATION_ERROR");
  }, { operation: "evolution.review", entityId: evolutionReviewId(`local-ev-${TASK_ID}`) });

  await runP6Case("duplicate evolution review uses one logical side effect and stable review identity", async () => {
    const item = candidate();
    const payload = body(item, "accepted", undefined);
    const review = payload.payload.review;
    const seen = new Set<string>();
    let logicalSideEffects = 0;

    await withProductUpstream(async (_input, init) => {
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const key = String(upstreamBody.idempotency_key ?? "");
      if (!seen.has(key)) {
        seen.add(key);
        logicalSideEffects += 1;
      }
      return new Response(JSON.stringify({
        ok: true,
        data: { entity_id: review.id, revision: 1, updated_at: NOW },
        trace_id: "trace-evolution-review",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      for (const requestId of ["req-evolution-dup-1", "req-evolution-dup-2"]) {
        const result = await routeJson({ ...payload, request_id: requestId });
        assert.equal(result.status, 200);
        assert.equal((result.body.data as Record<string, unknown>).entity_id, review.id);
        assert.equal(result.body.trace_id, "trace-evolution-review");
      }
    });
    assert.equal(logicalSideEffects, 1);
  }, { operation: "evolution.review", entityId: evolutionReviewId(`local-ev-${TASK_ID}`), traceId: "trace-evolution-review" });

  await runP6Case("stale review conflict is preserved and success ack must advance revision", async () => {
    const item = candidate();
    const conflictPayload = body(item, "accepted", 4, "req-evolution-conflict");
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: false,
      error: { code: "REVISION_CONFLICT", message: "stale review", retryable: false },
      trace_id: "trace-evolution-conflict",
    }), { status: 409, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(conflictPayload);
      assert.equal(result.status, 409);
      assert.equal((result.body.error as Record<string, unknown>).code, "REVISION_CONFLICT");
      assert.equal(result.body.trace_id, "trace-evolution-conflict");
    });

    const staleAckPayload = body(item, "accepted", 4, "req-evolution-stale-ack");
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: staleAckPayload.payload.review.id, revision: 4, updated_at: NOW },
      trace_id: "trace-evolution-stale-ack",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(staleAckPayload);
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "INVALID_REVISION");
      assert.equal(result.body.trace_id, "trace-evolution-stale-ack");
    });
  }, { operation: "evolution.review", entityId: evolutionReviewId(`local-ev-${TASK_ID}`) });

  await runP6Case("only reviewed current candidate revision enters next task matching", () => {
    const first = candidate();
    const accepted = reviewState(first, "accepted");
    assert.equal(matchReviewedExperience({ candidates: [first], reviews: { [first.id]: accepted }, workspaceId: WORKSPACE_ID, taskType: "策略判断" }).experiences.length, 1);

    const changed = candidate({ previousCandidate: first, finalText: "新的用户最终稿" });
    assert.equal(candidateRevision(changed), 2);
    assert.equal(matchReviewedExperience({ candidates: [changed], reviews: { [changed.id]: accepted }, workspaceId: WORKSPACE_ID, taskType: "策略判断" }).experiences.length, 0);

    const scoped = reviewState(first, "scoped", WORKSPACE_ID);
    assert.equal(matchReviewedExperience({ candidates: [first], reviews: { [first.id]: scoped }, workspaceId: WORKSPACE_ID, taskType: "策略判断" }).experiences.length, 1);
    assert.equal(matchReviewedExperience({ candidates: [first], reviews: { [first.id]: scoped }, workspaceId: "w-other", taskType: "策略判断" }).experiences.length, 0);

    const rejected = reviewState(first, "rejected");
    assert.equal(matchReviewedExperience({ candidates: [first], reviews: { [first.id]: rejected }, workspaceId: WORKSPACE_ID, taskType: "策略判断" }).experiences.length, 0);

    const failed = candidate({ taskId: "task-negative", outcome: "失败", outcomeNote: "方案未推进" });
    const failedAccepted = reviewState(failed, "accepted");
    const matched = matchReviewedExperience({ candidates: [failed], reviews: { [failed.id]: failedAccepted }, workspaceId: WORKSPACE_ID, taskType: "策略判断" });
    assert.equal(matched.experiences.length, 0);
    assert.equal(matched.counterexamples.length, 1);
  }, { operation: "evolution.review", entityId: `local-ev-${TASK_ID}` });

  await runP6Case("revoked workspace candidate cannot be reused", () => {
    const item = candidate();
    const session: MarketingSession = {
      mode: "platform",
      tenant: { id: "tenant-1", name: "Tenant" },
      actor: { id: "actor-1", name: "Actor" },
      roles: [],
      capabilities: ["workspace.read", "evolution.review"],
      workspaceGrants: [],
      teamEnabled: true,
    };
    const visible = filterReadableWorkspaceItems(session, [item], (candidateItem) => candidateItem.workspaceId ?? "");
    assert.equal(visible.length, 0);
    const accepted = reviewState(item, "accepted");
    const matched = matchReviewedExperience({ candidates: visible, reviews: { [item.id]: accepted }, workspaceId: "w-active", taskType: "策略判断" });
    assert.equal(matched.experiences.length, 0);
    assert.equal(matched.counterexamples.length, 0);
  }, { operation: "evolution.review", entityId: `local-ev-${TASK_ID}` });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
