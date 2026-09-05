import assert from "node:assert/strict";
import { GET as sessionRoute } from "../app/api/session/route.ts";
import { matchReviewedExperience, type LocalEvolutionCandidate } from "../lib/evolution-store.ts";
import {
  MARKETING_CAPABILITIES,
  canMarketingAction,
  canReadWorkspace,
  filterReadableWorkspaceItems,
  normalizeMarketingSession,
  sessionErrorCodeForStatus,
  type MarketingCapability,
  type WorkspaceAccess,
} from "../lib/product-session.ts";
import { upstreamIdentityHeaders } from "../lib/server-upstream-auth.ts";
import { logicalStorageKeyForScope, scopedStorageKeyForScope, storageScopeForSession } from "../lib/storage-scope.ts";
import { runP6Case } from "./p6-test-support.ts";

function platformSession(input: {
  capabilities?: MarketingCapability[];
  grants?: Array<{ workspace_id: string; access: WorkspaceAccess }>;
  tenantId?: string;
  actorId?: string;
} = {}) {
  const session = normalizeMarketingSession({
    tenant_id: input.tenantId ?? "tenant-p6",
    actor_id: input.actorId ?? "actor-p6",
    capabilities: input.capabilities ?? MARKETING_CAPABILITIES,
    workspace_grants: input.grants ?? [
      { workspace_id: "w-admin", access: "admin" },
      { workspace_id: "w-write", access: "write" },
      { workspace_id: "w-read", access: "read" },
    ],
  });
  assert.ok(session);
  assert.equal(session.mode, "platform");
  return session;
}

async function withSessionUpstream<T>(
  responseFactory: () => Promise<Response>,
  run: () => Promise<T>,
): Promise<T> {
  const previousEndpoint = process.env.AWKN_MARKETING_SESSION_URL;
  const previousToken = process.env.AWKN_MARKETING_SESSION_TOKEN;
  const previousFallback = process.env.AWKN_MARKETING_ALLOW_LOCAL_SESSION;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_SESSION_URL = "https://session.integration.invalid";
  process.env.AWKN_MARKETING_SESSION_TOKEN = "service-secret";
  process.env.AWKN_MARKETING_ALLOW_LOCAL_SESSION = "true";
  globalThis.fetch = (async () => responseFactory()) as typeof fetch;
  try {
    return await run();
  } finally {
    if (typeof previousEndpoint === "undefined") delete process.env.AWKN_MARKETING_SESSION_URL;
    else process.env.AWKN_MARKETING_SESSION_URL = previousEndpoint;
    if (typeof previousToken === "undefined") delete process.env.AWKN_MARKETING_SESSION_TOKEN;
    else process.env.AWKN_MARKETING_SESSION_TOKEN = previousToken;
    if (typeof previousFallback === "undefined") delete process.env.AWKN_MARKETING_ALLOW_LOCAL_SESSION;
    else process.env.AWKN_MARKETING_ALLOW_LOCAL_SESSION = previousFallback;
    globalThis.fetch = previousFetch;
  }
}

async function sessionResponse(responseFactory: () => Promise<Response>) {
  return withSessionUpstream(responseFactory, async () => {
    const response = await sessionRoute(new Request("http://localhost/api/session", {
      headers: {
        authorization: "Bearer actor-token",
        cookie: "awkn_session=actor-cookie",
        "x-request-id": "req-session-p6",
      },
    }));
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  });
}

async function main() {
  const session = platformSession();

  await runP6Case("session requires tenant and actor identity", () => {
    assert.equal(normalizeMarketingSession({ actor_id: "actor", capabilities: [], workspace_grants: [] }), null);
    assert.equal(normalizeMarketingSession({ tenant_id: "tenant", capabilities: [], workspace_grants: [] }), null);
  });

  await runP6Case("session rejects capability values outside the whitelist", () => {
    assert.equal(normalizeMarketingSession({
      tenant_id: "tenant",
      actor_id: "actor",
      capabilities: ["workspace.read", "root.superuser"],
      workspace_grants: [],
    }), null);
  });

  await runP6Case("session rejects invalid or ambiguous workspace grants", () => {
    assert.equal(normalizeMarketingSession({
      tenant_id: "tenant",
      actor_id: "actor",
      capabilities: ["workspace.read"],
      workspace_grants: [{ workspace_id: "w1", access: "owner" }],
    }), null);
    assert.equal(normalizeMarketingSession({
      tenant_id: "tenant",
      actor_id: "actor",
      capabilities: ["workspace.read"],
      workspace_grants: [{ workspace_id: "w1", access: "read" }, { workspace_id: "w1", access: "write" }],
    }), null);
  });

  await runP6Case("session rejects unknown mode and malformed team flag", () => {
    assert.equal(normalizeMarketingSession({
      mode: "elevated",
      tenant_id: "tenant",
      actor_id: "actor",
      capabilities: ["workspace.read"],
      workspace_grants: [],
    }), null);
    assert.equal(normalizeMarketingSession({
      mode: "platform",
      tenant_id: "tenant",
      actor_id: "actor",
      capabilities: ["workspace.read"],
      workspace_grants: [],
      team_enabled: "false",
    }), null);
    assert.equal(normalizeMarketingSession({
      mode: "platform",
      tenant_id: "tenant",
      actor_id: "actor",
      capabilities: ["workspace.read"],
      workspace_grants: [],
      team_enabled: false,
    })?.teamEnabled, false);
  });

  const actionMatrix: Array<{ capability: MarketingCapability; workspaceId?: string; required?: WorkspaceAccess; allowed: boolean }> = [
    { capability: "workspace.read", workspaceId: "w-read", required: "read", allowed: true },
    { capability: "workspace.write", workspaceId: "w-write", required: "write", allowed: true },
    { capability: "workspace.write", workspaceId: "w-read", required: "write", allowed: false },
    { capability: "material.write", workspaceId: "w-write", required: "write", allowed: true },
    { capability: "task.create", workspaceId: "w-write", required: "write", allowed: true },
    { capability: "task.run", workspaceId: "w-write", required: "write", allowed: true },
    { capability: "feedback.write", workspaceId: "w-write", required: "write", allowed: true },
    { capability: "outcome.write", workspaceId: "w-write", required: "write", allowed: true },
    { capability: "evolution.review", workspaceId: "w-write", required: "write", allowed: true },
    { capability: "learning.manage", workspaceId: "w-write", required: "write", allowed: true },
    { capability: "workspace.create", allowed: true },
    { capability: "team.manage", allowed: true },
  ];

  for (const row of actionMatrix) {
    await runP6Case(`permission matrix ${row.capability} ${row.workspaceId ?? "tenant"}`, () => {
      assert.equal(canMarketingAction(session, row.capability, row.workspaceId, row.required), row.allowed);
    }, { operation: row.capability, entityId: row.workspaceId });
  }

  await runP6Case("missing capability prevents side effects even with write grant", () => {
    const restricted = platformSession({ capabilities: ["workspace.read"], grants: [{ workspace_id: "w-write", access: "write" }] });
    let sideEffectCount = 0;
    if (canMarketingAction(restricted, "task.run", "w-write", "write")) sideEffectCount += 1;
    assert.equal(sideEffectCount, 0);
  }, { operation: "task.run", entityId: "w-write" });

  await runP6Case("revoked workspace is removed from visible cached projection", () => {
    assert.equal(canReadWorkspace(session, "w-revoked"), false);
    const cached = [
      { workspaceId: "w-write", value: "visible" },
      { workspaceId: "w-revoked", value: "stale-cache" },
    ];
    assert.deepEqual(filterReadableWorkspaceItems(session, cached, (item) => item.workspaceId), [cached[0]]);
  }, { entityId: "w-revoked" });

  await runP6Case("revoked workspace candidate cannot enter experience matching", () => {
    const base: LocalEvolutionCandidate = {
      id: "ev-visible",
      type: "Experience Candidate",
      lesson: "use verified path",
      why: "verified",
      source: "task-visible",
      scope: "strategy",
      counterexample: "different stage",
      confidence: 0.8,
      createdAt: "2026-09-05T00:00:00.000Z",
      taskId: "t-visible",
      workspaceId: "w-write",
      sourceTaskType: "strategy",
      polarity: "positive",
      fingerprint: "fp-visible",
      revision: 1,
      evidence: {
        ai_draft: "draft-visible",
        user_final: "final-visible",
        feedback_event_id: "feedback-event:t-visible:fp-visible",
        outcome_event_id: "outcome-event:t-visible:fp-visible",
        evidence_refs: [],
      },
    };
    const revoked: LocalEvolutionCandidate = {
      ...base,
      id: "ev-revoked",
      taskId: "t-revoked",
      workspaceId: "w-revoked",
      fingerprint: "fp-revoked",
      evidence: {
        ...base.evidence!,
        feedback_event_id: "feedback-event:t-revoked:fp-revoked",
        outcome_event_id: "outcome-event:t-revoked:fp-revoked",
      },
    };
    const readable = filterReadableWorkspaceItems(session, [base, revoked], (item) => item.workspaceId ?? "");
    const matched = matchReviewedExperience({
      candidates: readable,
      reviews: { "ev-visible": "accepted", "ev-revoked": "accepted" },
      workspaceId: "w-write",
      taskType: "strategy",
    });
    assert.equal(matched.experiences.length, 1);
    assert.equal(matched.experiences[0].source.includes("task-visible"), true);
  }, { entityId: "w-revoked" });

  await runP6Case("tenant and actor storage scopes cannot read each other cache", () => {
    const first = storageScopeForSession(session);
    const second = storageScopeForSession(platformSession({ tenantId: "tenant-other", actorId: "actor-other" }));
    const firstKey = scopedStorageKeyForScope("marketing:tasks", first);
    assert.notEqual(firstKey, scopedStorageKeyForScope("marketing:tasks", second));
    assert.equal(logicalStorageKeyForScope(firstKey, second), null);
    assert.equal(logicalStorageKeyForScope(firstKey, first), "marketing:tasks");
  });

  await runP6Case("server upstream preserves actor identity while using service auth", () => {
    const headers = upstreamIdentityHeaders(new Request("http://localhost", {
      headers: {
        authorization: "Bearer actor-token",
        cookie: "awkn_session=actor-cookie",
        "x-request-id": "req-auth-p6",
      },
    }), "service-secret");
    assert.equal(headers.authorization, "Bearer service-secret");
    assert.equal(headers["x-awkn-user-authorization"], "Bearer actor-token");
    assert.equal(headers.cookie, "awkn_session=actor-cookie");
    assert.equal(headers["x-request-id"], "req-auth-p6");
  });

  await runP6Case("session HTTP statuses map to stable errors", () => {
    assert.equal(sessionErrorCodeForStatus(401), "AUTH_REQUIRED");
    assert.equal(sessionErrorCodeForStatus(403), "FORBIDDEN");
    assert.equal(sessionErrorCodeForStatus(503), "SESSION_UNAVAILABLE");
  });

  await runP6Case("session route returns a validated platform session", async () => {
    const result = await sessionResponse(async () => new Response(JSON.stringify({
      tenant_id: "tenant-live",
      actor_id: "actor-live",
      capabilities: ["workspace.read", "task.run"],
      workspace_grants: [{ workspace_id: "w-live", access: "write" }],
      trace_id: "trace-session-ok",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    assert.equal(result.status, 200);
    assert.equal(result.body.mode, "platform");
    assert.equal((result.body.tenant as Record<string, unknown>).id, "tenant-live");
  }, { operation: "session.get", entityId: "tenant-live" });

  await runP6Case("session route normalizes 401 and preserves trace", async () => {
    const result = await sessionResponse(async () => new Response(JSON.stringify({ trace_id: "trace-auth" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    }));
    assert.equal(result.status, 401);
    assert.equal(result.body.error, "AUTH_REQUIRED");
    assert.equal(result.body.trace_id, "trace-auth");
  }, { operation: "session.get", traceId: "trace-auth" });

  await runP6Case("session route normalizes 403", async () => {
    const result = await sessionResponse(async () => new Response(JSON.stringify({}), {
      status: 403,
      headers: { "content-type": "application/json" },
    }));
    assert.equal(result.body.error, "FORBIDDEN");
  }, { operation: "session.get" });

  await runP6Case("configured platform session never falls back to local owner", async () => {
    const result = await sessionResponse(async () => { throw new Error("upstream offline"); });
    assert.equal(result.body.error, "SESSION_UNAVAILABLE");
    assert.notEqual(result.body.mode, "local");
  }, { operation: "session.get" });

  await runP6Case("invalid upstream capability and local-mode identities fail closed", async () => {
    const invalidCapability = await sessionResponse(async () => new Response(JSON.stringify({
      tenant_id: "tenant-live",
      actor_id: "actor-live",
      capabilities: ["workspace.read", "root.superuser"],
      workspace_grants: [],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    assert.equal(invalidCapability.status, 502);
    assert.equal(invalidCapability.body.error, "INVALID_SESSION_RESPONSE");

    const localMode = await sessionResponse(async () => new Response(JSON.stringify({
      mode: "local",
      tenant_id: "tenant-live",
      actor_id: "actor-live",
      capabilities: ["workspace.read"],
      workspace_grants: [],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    assert.equal(localMode.status, 502);
    assert.equal(localMode.body.error, "INVALID_SESSION_RESPONSE");

    const unknownMode = await sessionResponse(async () => new Response(JSON.stringify({
      mode: "elevated",
      tenant_id: "tenant-live",
      actor_id: "actor-live",
      capabilities: ["workspace.read"],
      workspace_grants: [],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    assert.equal(unknownMode.status, 502);
    assert.equal(unknownMode.body.error, "INVALID_SESSION_RESPONSE");
  }, { operation: "session.get" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
