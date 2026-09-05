import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { buildFeedbackEvent, feedbackRecordIdempotencyKey } from "../lib/feedback-contract.ts";
import { matchReviewedExperience, type LocalEvolutionCandidate } from "../lib/evolution-store.ts";
import type { LearningWatch } from "../lib/learning-store.ts";
import {
  MARKETING_CAPABILITIES,
  MARKETING_SESSION_REFRESH_EVENT,
  canMarketingAction,
  filterReadableWorkspaceItems,
  normalizeMarketingSession,
  shouldRefreshMarketingSessionForProductError,
  signalMarketingSessionRefresh,
} from "../lib/product-session.ts";
import { runP6Case } from "./p6-test-support.ts";

const WORKSPACE_REVOKED = "w-w7-active-revoked";
const WORKSPACE_VISIBLE = "w-w7-visible";
const TASK_ID = "task-w7-active-revoke";

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

function session(grants: Array<{ workspace_id: string; access: "read" | "write" | "admin" }>) {
  const value = normalizeMarketingSession({
    tenant_id: "tenant-w7",
    actor_id: "actor-w7",
    capabilities: MARKETING_CAPABILITIES,
    workspace_grants: grants,
  });
  assert.ok(value);
  return value;
}

function feedbackRequestBody() {
  const event = buildFeedbackEvent({
    workspaceId: WORKSPACE_REVOKED,
    taskId: TASK_ID,
    feedback: "采用",
    artifactTitle: "W7 revoke artifact",
    aiDraft: "draft",
    userFinal: "final",
    runId: "run-w7-revoke",
    traceId: "trace-agent-w7-revoke",
  });
  return {
    product: "awkn-marketing" as const,
    operation: "feedback.record" as const,
    request_id: "req-w7-active-revoke",
    idempotency_key: feedbackRecordIdempotencyKey(event.id),
    workspace_id: WORKSPACE_REVOKED,
    task_id: TASK_ID,
    payload: { feedback_event: event },
  };
}

function productRequest() {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": "req-w7-active-revoke",
    },
    body: JSON.stringify(feedbackRequestBody()),
  });
}

function candidate(input: { id: string; workspaceId: string; taskId: string; fingerprint: string }): LocalEvolutionCandidate {
  return {
    id: input.id,
    type: "Experience Candidate",
    lesson: `lesson-${input.workspaceId}`,
    why: "verified",
    source: input.taskId,
    scope: "strategy",
    counterexample: "different context",
    confidence: 0.8,
    createdAt: "2026-09-05T02:25:00.000Z",
    taskId: input.taskId,
    workspaceId: input.workspaceId,
    sourceTaskType: "strategy",
    polarity: "positive",
    fingerprint: input.fingerprint,
    revision: 1,
    evidence: {
      ai_draft: "draft",
      user_final: "final",
      feedback_event_id: `feedback-event:${input.taskId}:${input.fingerprint}`,
      outcome_event_id: `outcome-event:${input.taskId}:${input.fingerprint}`,
      evidence_refs: [],
    },
  };
}

async function main() {
  const staleSession = session([
    { workspace_id: WORKSPACE_REVOKED, access: "write" },
    { workspace_id: WORKSPACE_VISIBLE, access: "write" },
  ]);
  const refreshedSession = session([
    { workspace_id: WORKSPACE_VISIBLE, access: "write" },
  ]);

  await runP6Case("active session grant can become stale before the next product action", () => {
    assert.equal(canMarketingAction(staleSession, "feedback.write", WORKSPACE_REVOKED, "write"), true);
    assert.equal(canMarketingAction(refreshedSession, "feedback.write", WORKSPACE_REVOKED, "write"), false);
  }, { operation: "feedback.record", entityId: WORKSPACE_REVOKED });

  await runP6Case("server-side revoke denies stale-session write with zero side effect", async () => {
    let sideEffects = 0;
    let upstreamAttempts = 0;
    const result = await withProductUpstream(async (_input, init) => {
      upstreamAttempts += 1;
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("authorization"), "Bearer service-secret");
      assert.equal(headers.get("x-awkn-user-authorization"), "Bearer actor-token");
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      assert.equal(body.workspace_id, WORKSPACE_REVOKED);

      const revokedAtAuthorizationSource = true;
      if (revokedAtAuthorizationSource) {
        return new Response(JSON.stringify({
          ok: false,
          error: {
            code: "WORKSPACE_REVOKED",
            message: "Workspace grant was revoked before commit.",
            retryable: false,
          },
          trace_id: "trace-w7-active-revoke-denied",
        }), { status: 403, headers: { "content-type": "application/json" } });
      }

      sideEffects += 1;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }, async () => {
      const response = await productRoute(productRequest());
      return { status: response.status, body: await response.json() as Record<string, unknown> };
    });

    assert.equal(upstreamAttempts, 1);
    assert.equal(sideEffects, 0);
    assert.equal(result.status, 403);
    assert.equal(result.body.ok, false);
    assert.equal((result.body.error as Record<string, unknown>).code, "WORKSPACE_REVOKED");
    assert.equal(result.body.trace_id, "trace-w7-active-revoke-denied");
  }, { operation: "feedback.record", entityId: WORKSPACE_REVOKED, traceId: "trace-w7-active-revoke-denied" });

  await runP6Case("authorization denial invalidates the browser session immediately", () => {
    assert.equal(shouldRefreshMarketingSessionForProductError("WORKSPACE_REVOKED"), true);
    assert.equal(shouldRefreshMarketingSessionForProductError("FORBIDDEN"), true);
    assert.equal(shouldRefreshMarketingSessionForProductError("AUTH_REQUIRED"), true);
    assert.equal(shouldRefreshMarketingSessionForProductError("RATE_LIMITED"), false);

    const target = new EventTarget();
    let refreshSignals = 0;
    target.addEventListener(MARKETING_SESSION_REFRESH_EVENT, () => { refreshSignals += 1; });
    assert.equal(signalMarketingSessionRefresh(target), true);
    assert.equal(refreshSignals, 1);
  }, { operation: "session.refresh", entityId: WORKSPACE_REVOKED });

  await runP6Case("refreshed session removes revoked visible projection", () => {
    const cached = [
      { workspaceId: WORKSPACE_REVOKED, value: "stale-private-projection" },
      { workspaceId: WORKSPACE_VISIBLE, value: "visible-projection" },
    ];
    assert.deepEqual(
      filterReadableWorkspaceItems(refreshedSession, cached, (item) => item.workspaceId),
      [cached[1]],
    );
  }, { entityId: WORKSPACE_REVOKED });

  await runP6Case("refreshed session removes revoked Experience from matching", () => {
    const revoked = candidate({ id: "ev-w7-revoked", workspaceId: WORKSPACE_REVOKED, taskId: "task-w7-revoked", fingerprint: "fp-revoked" });
    const visible = candidate({ id: "ev-w7-visible", workspaceId: WORKSPACE_VISIBLE, taskId: "task-w7-visible", fingerprint: "fp-visible" });
    const readable = filterReadableWorkspaceItems(refreshedSession, [revoked, visible], (item) => item.workspaceId ?? "");
    const matched = matchReviewedExperience({
      candidates: readable,
      reviews: { [revoked.id]: "accepted", [visible.id]: "accepted" },
      workspaceId: WORKSPACE_VISIBLE,
      taskType: "strategy",
    });
    assert.equal(readable.some((item) => item.workspaceId === WORKSPACE_REVOKED), false);
    assert.equal(matched.experiences.length, 1);
    assert.equal(matched.experiences[0].id, visible.id);
  }, { operation: "experience.match", entityId: WORKSPACE_REVOKED });

  await runP6Case("refreshed session removes revoked Learning watch and run projections", () => {
    const watches: LearningWatch[] = [
      {
        id: "watch-revoked",
        workspaceId: WORKSPACE_REVOKED,
        workspaceName: "Revoked",
        topics: ["policy"],
        sourceTypes: ["政策"],
        cadence: "daily",
        enabled: true,
        updatedAt: "2026-09-05T02:25:00.000Z",
      },
      {
        id: "watch-visible",
        workspaceId: WORKSPACE_VISIBLE,
        workspaceName: "Visible",
        topics: ["policy"],
        sourceTypes: ["政策"],
        cadence: "daily",
        enabled: true,
        updatedAt: "2026-09-05T02:25:00.000Z",
      },
    ];
    const runs = [
      { runId: "run-revoked", workspaceId: WORKSPACE_REVOKED },
      { runId: "run-visible", workspaceId: WORKSPACE_VISIBLE },
    ];
    assert.deepEqual(
      filterReadableWorkspaceItems(refreshedSession, watches, (item) => item.workspaceId).map((item) => item.id),
      ["watch-visible"],
    );
    assert.deepEqual(
      filterReadableWorkspaceItems(refreshedSession, runs, (item) => item.workspaceId).map((item) => item.runId),
      ["run-visible"],
    );
  }, { operation: "learning.visibility", entityId: WORKSPACE_REVOKED });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
