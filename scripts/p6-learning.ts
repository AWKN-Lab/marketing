import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  learningRunIdempotencyKey,
  learningRunRetryIdempotencyKey,
  learningWatchEntityId,
  learningWatchUpsertIdempotencyKey,
  validateLearningProductRequest,
} from "../lib/learning-contract.ts";
import { normalizeLearningRun } from "../lib/learning-run-store.ts";
import { createLearningWatch } from "../lib/learning-store.ts";
import { canMarketingAction, filterReadableWorkspaceItems, type MarketingSession } from "../lib/product-session.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T06:00:00.000Z";
const WORKSPACE_ID = "w-p6-learning";
const WATCH_ID = learningWatchEntityId(WORKSPACE_ID);
const RUN_ID = "learning-run-p6-1";
const TOPICS = ["Q4 文旅促消费政策"];
const SOURCES = ["政策", "行业"];

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

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": String(payload.request_id ?? "req-learning"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

function watch() {
  return createLearningWatch({
    workspaceId: WORKSPACE_ID,
    workspaceName: "P6 Learning Workspace",
    topics: TOPICS,
    sourceTypes: SOURCES,
    enabled: true,
  });
}

function watchBody(requestId = "req-learning-watch-1") {
  const entity = watch();
  entity.updatedAt = NOW;
  return {
    product: "awkn-marketing" as const,
    operation: "learning.watch.upsert" as const,
    request_id: requestId,
    idempotency_key: learningWatchUpsertIdempotencyKey(entity),
    workspace_id: WORKSPACE_ID,
    payload: { watch: entity },
  };
}

function runBody(requestId = "req-learning-run-1", logicalActionId = "logical-learning-1") {
  return {
    product: "awkn-marketing" as const,
    operation: "learning.run" as const,
    request_id: requestId,
    idempotency_key: learningRunIdempotencyKey(WATCH_ID, logicalActionId),
    workspace_id: WORKSPACE_ID,
    payload: {
      watch_id: WATCH_ID,
      topics: TOPICS,
      source_types: SOURCES,
      logical_action_id: logicalActionId,
    },
  };
}

function getBody(requestId = "req-learning-get-1") {
  return {
    product: "awkn-marketing" as const,
    operation: "learning.run.get" as const,
    request_id: requestId,
    workspace_id: WORKSPACE_ID,
    payload: { run_id: RUN_ID, watch_id: WATCH_ID },
  };
}

function retryBody(attempt = 2, requestId = "req-learning-retry-1") {
  return {
    product: "awkn-marketing" as const,
    operation: "learning.run.retry" as const,
    request_id: requestId,
    idempotency_key: learningRunRetryIdempotencyKey(RUN_ID, attempt),
    workspace_id: WORKSPACE_ID,
    payload: {
      run_id: RUN_ID,
      watch_id: WATCH_ID,
      attempt,
      topics: TOPICS,
      source_types: SOURCES,
    },
  };
}

function asyncSuccess(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    data: {
      entity_id: RUN_ID,
      run_id: RUN_ID,
      watch_id: WATCH_ID,
      status: "queued",
      attempt: 1,
      revision: 1,
      updated_at: NOW,
      ...overrides,
    },
    trace_id: "trace-learning-p6",
  };
}

async function main() {
  await runP6Case("learning watch uses stable identity and state-derived idempotency", () => {
    const first = watch();
    const duplicate = watch();
    first.updatedAt = NOW;
    duplicate.updatedAt = "2026-09-05T06:01:00.000Z";
    assert.equal(first.id, WATCH_ID);
    assert.equal(duplicate.id, WATCH_ID);
    assert.equal(learningWatchUpsertIdempotencyKey(first), learningWatchUpsertIdempotencyKey(duplicate));
    assert.equal(validateLearningProductRequest(watchBody()), null);

    const drifted = watchBody();
    const payload = drifted.payload as { watch: ReturnType<typeof watch> };
    payload.watch.id = "watch-other";
    assert.equal(validateLearningProductRequest(drifted)?.code, "IDENTITY_MISMATCH");

    assert.equal(validateLearningProductRequest({ ...watchBody(), idempotency_key: "learning.watch.upsert:random" })?.code, "VALIDATION_ERROR");
  }, { operation: "learning.watch.upsert", entityId: WATCH_ID });

  await runP6Case("duplicate learning watch upsert produces one logical side effect", async () => {
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
        data: { entity_id: WATCH_ID, revision: 1, updated_at: NOW },
        trace_id: "trace-learning-watch",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      for (const requestId of ["req-learning-watch-a", "req-learning-watch-b"]) {
        const result = await routeJson(watchBody(requestId));
        assert.equal(result.status, 200);
        assert.equal((result.body.data as Record<string, unknown>).entity_id, WATCH_ID);
      }
    });
    assert.equal(logicalSideEffects, 1);
  }, { operation: "learning.watch.upsert", entityId: WATCH_ID, traceId: "trace-learning-watch" });

  await runP6Case("learning run requires stable logical action idempotency and preserves run identity", async () => {
    const first = runBody("req-learning-run-a", "same-logical-action");
    const second = runBody("req-learning-run-b", "same-logical-action");
    assert.equal(first.idempotency_key, second.idempotency_key);
    assert.equal(validateLearningProductRequest(first), null);
    assert.equal(validateLearningProductRequest({ ...first, idempotency_key: "learning.run:random" })?.code, "VALIDATION_ERROR");

    const seen = new Set<string>();
    let logicalSideEffects = 0;
    await withProductUpstream(async (_input, init) => {
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const key = String(upstreamBody.idempotency_key ?? "");
      if (!seen.has(key)) {
        seen.add(key);
        logicalSideEffects += 1;
      }
      return new Response(JSON.stringify(asyncSuccess()), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const resultA = await routeJson(first);
      const resultB = await routeJson(second);
      assert.equal(resultA.status, 200);
      assert.equal(resultB.status, 200);
      assert.equal((resultA.body.data as Record<string, unknown>).run_id, RUN_ID);
      assert.equal((resultB.body.data as Record<string, unknown>).run_id, RUN_ID);
    });
    assert.equal(logicalSideEffects, 1);
  }, { operation: "learning.run", entityId: RUN_ID, traceId: "trace-learning-p6" });

  await runP6Case("learning retry keeps logical run id and increments physical attempt", async () => {
    const payload = retryBody(2);
    assert.equal(validateLearningProductRequest(payload), null);
    assert.equal(validateLearningProductRequest({ ...payload, idempotency_key: learningRunRetryIdempotencyKey(RUN_ID, 3) })?.code, "VALIDATION_ERROR");
    assert.equal(validateLearningProductRequest(retryBody(1))?.code, "VALIDATION_ERROR");

    await withProductUpstream(async () => new Response(JSON.stringify(asyncSuccess({ status: "running", attempt: 2 })), {
      status: 200,
      headers: { "content-type": "application/json" },
    }), async () => {
      const result = await routeJson(payload);
      assert.equal(result.status, 200);
      const data = result.body.data as Record<string, unknown>;
      assert.equal(data.run_id, RUN_ID);
      assert.equal(data.entity_id, RUN_ID);
      assert.equal(data.attempt, 2);
      assert.equal(data.status, "running");
    });

    await withProductUpstream(async () => new Response(JSON.stringify(asyncSuccess({ run_id: "learning-run-other", entity_id: "learning-run-other", attempt: 2 })), {
      status: 200,
      headers: { "content-type": "application/json" },
    }), async () => {
      const result = await routeJson(payload);
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "IDENTITY_MISMATCH");
    });
  }, { operation: "learning.run.retry", entityId: RUN_ID });

  await runP6Case("learning state rejects unknown status and preserves signal source and trace", async () => {
    assert.equal(normalizeLearningRun({
      data: { run_id: RUN_ID, status: "mystery", attempt: 1 },
      workspaceId: WORKSPACE_ID,
      watchId: WATCH_ID,
    }), null);

    const signal = {
      id: "signal-1",
      workspace_id: WORKSPACE_ID,
      watch_id: WATCH_ID,
      title: "政策更新",
      summary: "新的公开政策信号",
      source: "https://example.invalid/policy",
      trace_id: "trace-signal-1",
    };
    await withProductUpstream(async () => new Response(JSON.stringify(asyncSuccess({
      status: "completed",
      signals: [signal],
    })), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(getBody());
      assert.equal(result.status, 200);
      const normalized = normalizeLearningRun({
        data: result.body.data,
        workspaceId: WORKSPACE_ID,
        watchId: WATCH_ID,
        traceId: String(result.body.trace_id),
      });
      assert.ok(normalized);
      assert.equal(normalized.status, "completed");
      assert.equal(normalized.attempt, 1);
      assert.equal(normalized.signals[0]?.source, signal.source);
      assert.equal(normalized.signals[0]?.traceId, "trace-signal-1");
    });

    await withProductUpstream(async () => new Response(JSON.stringify(asyncSuccess({ status: "mystery" })), {
      status: 200,
      headers: { "content-type": "application/json" },
    }), async () => {
      const result = await routeJson(getBody("req-learning-invalid-status"));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "VALIDATION_ERROR");
    });

    await withProductUpstream(async () => new Response(JSON.stringify(asyncSuccess({
      status: "completed",
      signals: [{ ...signal, source: "" }],
    })), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(getBody("req-learning-invalid-source"));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "VALIDATION_ERROR");
    });
  }, { operation: "learning.run.get", entityId: RUN_ID, traceId: "trace-learning-p6" });

  await runP6Case("revoked workspace removes learning visibility and action eligibility", () => {
    const session: MarketingSession = {
      mode: "platform",
      tenant: { id: "tenant-p6", name: "Tenant P6" },
      actor: { id: "actor-p6", name: "Actor P6" },
      roles: ["marketer"],
      capabilities: ["workspace.read", "learning.manage"],
      workspaceGrants: [],
      teamEnabled: true,
    };
    assert.equal(canMarketingAction(session, "learning.manage", WORKSPACE_ID, "write"), false);
    assert.deepEqual(filterReadableWorkspaceItems(session, [{ workspaceId: WORKSPACE_ID, runId: RUN_ID }], (item) => item.workspaceId), []);

    const granted: MarketingSession = {
      ...session,
      workspaceGrants: [{ workspaceId: WORKSPACE_ID, access: "write" }],
    };
    assert.equal(canMarketingAction(granted, "learning.manage", WORKSPACE_ID, "write"), true);
    assert.equal(filterReadableWorkspaceItems(granted, [{ workspaceId: WORKSPACE_ID, runId: RUN_ID }], (item) => item.workspaceId).length, 1);
  }, { operation: "learning.run.get", entityId: RUN_ID });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
