import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  learningRunRetryIdempotencyKey,
  learningWatchEntityId,
} from "../lib/learning-contract.ts";
import {
  mergeLearningRun,
  normalizeLearningRun,
  type LearningRun,
} from "../lib/learning-run-store.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T10:32:00.000Z";
const WORKSPACE_ID = "w-p6-dependency-learning";
const WATCH_ID = learningWatchEntityId(WORKSPACE_ID);
const RUN_ID = "learning-run-w7-16";
const RETRY_ATTEMPT = 2;
const KEY = learningRunRetryIdempotencyKey(RUN_ID, RETRY_ATTEMPT);

type Responder = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function withProductUpstream<T>(responder: Responder, run: () => Promise<T>) {
  const previousEndpoint = process.env.AWKN_MARKETING_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_API_URL = "https://product.integration.invalid";
  globalThis.fetch = responder as typeof fetch;
  try {
    return await run();
  } finally {
    if (typeof previousEndpoint === "undefined") delete process.env.AWKN_MARKETING_API_URL;
    else process.env.AWKN_MARKETING_API_URL = previousEndpoint;
    globalThis.fetch = previousFetch;
  }
}

function body(requestId: string) {
  return {
    product: "awkn-marketing" as const,
    operation: "learning.run.retry" as const,
    request_id: requestId,
    idempotency_key: KEY,
    workspace_id: WORKSPACE_ID,
    payload: {
      run_id: RUN_ID,
      watch_id: WATCH_ID,
      attempt: RETRY_ATTEMPT,
      topics: ["policy"],
      source_types: ["政策"],
    },
  };
}

function request(requestId: string) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
    },
    body: JSON.stringify(body(requestId)),
  });
}

async function main() {
  await runP6Case("W7-16 learning UI retry starts a fresh physical-attempt lifecycle", () => {
    const source = readFileSync(new URL("../components/learning-watch.tsx", import.meta.url), "utf8");
    assert.ok(source.includes("const retryStartedAt = new Date().toISOString();"));
    assert.ok(source.includes("startedAt: retryStartedAt"));
    assert.equal(source.includes("startedAt: latestRun.startedAt"), false);
  }, { operation: "learning.run.retry", entityId: RUN_ID });

  await runP6Case("W7-16 newer learning attempt cannot inherit prior signals or trace", () => {
    const previous: LearningRun = {
      runId: RUN_ID,
      workspaceId: WORKSPACE_ID,
      watchId: WATCH_ID,
      status: "failed",
      attempt: 1,
      signals: [{
        id: "signal-attempt-1",
        workspaceId: WORKSPACE_ID,
        watchId: WATCH_ID,
        title: "stale signal",
        summary: "partial output from failed attempt",
        whyItMatters: "must not leak into retry attempt",
        source: "attempt-1-source",
        traceId: "trace-signal-attempt-1",
      }],
      traceId: "trace-learning-attempt-1",
      startedAt: "2026-09-05T10:20:00.000Z",
      finishedAt: "2026-09-05T10:21:00.000Z",
      error: "temporary dependency failure",
    };
    const next: LearningRun = {
      runId: RUN_ID,
      workspaceId: WORKSPACE_ID,
      watchId: WATCH_ID,
      status: "running",
      attempt: 2,
      signals: [],
      startedAt: "2026-09-05T10:32:00.000Z",
    };

    const merged = mergeLearningRun(previous, next);
    assert.equal(merged.attempt, 2);
    assert.equal(merged.status, "running");
    assert.deepEqual(merged.signals, []);
    assert.equal(merged.traceId, undefined);
    assert.equal(merged.startedAt, next.startedAt);
    assert.equal(merged.finishedAt, undefined);
    assert.equal(merged.error, undefined);
  }, { operation: "learning.run.retry", entityId: RUN_ID });

  await runP6Case("W7-16 learning retry preserves attempt and state truth across temporary dependency outage", async () => {
    let attempts = 0;
    let logicalSideEffects = 0;
    const observedKeys: string[] = [];
    const previous: LearningRun = {
      runId: RUN_ID,
      workspaceId: WORKSPACE_ID,
      watchId: WATCH_ID,
      status: "failed",
      attempt: 1,
      signals: [],
      traceId: "trace-learning-attempt-1",
      startedAt: "2026-09-05T10:20:00.000Z",
      finishedAt: "2026-09-05T10:21:00.000Z",
      error: "temporary dependency failure",
    };
    let projected = previous;

    await withProductUpstream(async (_input, init) => {
      attempts += 1;
      const outgoing = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      observedKeys.push(String(outgoing.idempotency_key ?? ""));
      if (attempts === 1) throw new TypeError("connect ECONNREFUSED learning dependency");

      logicalSideEffects += 1;
      return new Response(JSON.stringify({
        ok: true,
        data: {
          entity_id: RUN_ID,
          revision: 2,
          updated_at: NOW,
          run_id: RUN_ID,
          watch_id: WATCH_ID,
          status: "running",
          attempt: RETRY_ATTEMPT,
          signals: [],
        },
        trace_id: "trace-w7-16-learning-recovered",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const first = await productRoute(request("req-w7-16-learning-first"));
      const firstBody = await first.json() as Record<string, unknown>;
      const firstError = firstBody.error as Record<string, unknown>;
      assert.equal(first.status, 502);
      assert.equal(firstBody.ok, false);
      assert.equal(firstError.code, "UPSTREAM_UNAVAILABLE");
      assert.equal(firstError.retryable, true);
      assert.equal("data" in firstBody, false);
      assert.equal(projected.attempt, 1);
      assert.equal(projected.status, "failed");

      const retry = await productRoute(request("req-w7-16-learning-retry"));
      const retryBody = await retry.json() as Record<string, unknown>;
      assert.equal(retry.status, 200);
      assert.equal(retryBody.ok, true);
      assert.equal(retryBody.trace_id, "trace-w7-16-learning-recovered");

      const normalized = normalizeLearningRun({
        data: retryBody.data,
        workspaceId: WORKSPACE_ID,
        watchId: WATCH_ID,
        traceId: String(retryBody.trace_id),
        startedAt: NOW,
      });
      assert.ok(normalized);
      projected = mergeLearningRun(projected, normalized);
      assert.equal(projected.runId, RUN_ID);
      assert.equal(projected.attempt, RETRY_ATTEMPT);
      assert.equal(projected.status, "running");
      assert.equal(projected.traceId, "trace-w7-16-learning-recovered");
      assert.equal(projected.startedAt, NOW);
      assert.equal(projected.finishedAt, undefined);
      assert.equal(projected.error, undefined);
    });

    assert.equal(attempts, 2);
    assert.equal(logicalSideEffects, 1);
    assert.deepEqual(observedKeys, [KEY, KEY]);
    assertP6FaultMatrixRecord({
      operation: "learning.run.retry",
      expectedState: "temporary-learning-outage-preserves-state-until-same-attempt-retry-recovers",
      actualState: "attempt-2-running",
      errorCode: "UPSTREAM_UNAVAILABLE",
      retryable: true,
      requestId: "req-w7-16-learning-retry",
      idempotencyKey: KEY,
      traceId: "trace-w7-16-learning-recovered",
      sideEffectCount: logicalSideEffects,
      finalRevision: 2,
      finalConsistency: "learning-retry-keeps-run-id-attempt-status-and-lifecycle-truth",
    });
  }, { operation: "learning.run.retry", entityId: RUN_ID, traceId: "trace-w7-16-learning-recovered" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
