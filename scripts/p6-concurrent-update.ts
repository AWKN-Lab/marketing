import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { workspaceUpdateIdempotencyKey } from "../lib/workspace-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const WORKSPACE_ID = "w-p6-concurrent";
const NOW = "2026-09-05T07:45:00.000Z";

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

function updateBody(input: { requestId: string; baseRevision: number; name: string; fingerprint: string }) {
  return {
    product: "awkn-marketing" as const,
    operation: "workspace.update" as const,
    request_id: input.requestId,
    idempotency_key: workspaceUpdateIdempotencyKey(WORKSPACE_ID, input.baseRevision, input.fingerprint),
    workspace_id: WORKSPACE_ID,
    payload: {
      workspace: {
        id: WORKSPACE_ID,
        name: input.name,
        type: "营销项目",
        goal: "验证并发 revision CAS",
      },
      base_revision: input.baseRevision,
    },
  };
}

function getBody(requestId: string) {
  return {
    product: "awkn-marketing" as const,
    operation: "workspace.get" as const,
    request_id: requestId,
    workspace_id: WORKSPACE_ID,
    payload: { entity_id: WORKSPACE_ID },
  };
}

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": String(payload.request_id ?? "req-concurrent"),
    },
    body: JSON.stringify(payload),
  });
}

async function routeJson(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main() {
  await runP6Case("W7-04 concurrent updates from the same base revision produce one winner and one conflict", async () => {
    let currentRevision = 4;
    let currentName = "Baseline r4";
    let logicalSideEffects = 0;
    let updateArrivals = 0;
    let releaseUpdates!: () => void;
    const bothUpdatesArrived = new Promise<void>((resolve) => { releaseUpdates = resolve; });

    await withProductUpstream(async (_input, init) => {
      const upstreamBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const operation = String(upstreamBody.operation ?? "");
      const requestId = String(upstreamBody.request_id ?? "unknown");

      if (operation === "workspace.get") {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            entity_id: WORKSPACE_ID,
            revision: currentRevision,
            updated_at: NOW,
            entity: { id: WORKSPACE_ID, name: currentName, type: "营销项目", goal: "验证并发 revision CAS" },
          },
          trace_id: `trace-${requestId}`,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      assert.equal(operation, "workspace.update");
      updateArrivals += 1;
      if (updateArrivals === 2) releaseUpdates();
      if (updateArrivals <= 2) await bothUpdatesArrived;

      const payload = upstreamBody.payload as Record<string, unknown>;
      const workspace = payload.workspace as Record<string, unknown>;
      const baseRevision = Number(payload.base_revision);

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
      return new Response(JSON.stringify({
        ok: true,
        data: { entity_id: WORKSPACE_ID, revision: currentRevision, updated_at: NOW },
        trace_id: `trace-${requestId}-success`,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const first = updateBody({ requestId: "w7-04-update-a", baseRevision: 4, name: "Concurrent A", fingerprint: "fp-a" });
      const second = updateBody({ requestId: "w7-04-update-b", baseRevision: 4, name: "Concurrent B", fingerprint: "fp-b" });

      const race = await Promise.all([routeJson(first), routeJson(second)]);
      const successes = race.filter((result) => result.status === 200);
      const conflicts = race.filter((result) => result.status === 409);

      assert.equal(successes.length, 1);
      assert.equal(conflicts.length, 1);
      assert.equal(logicalSideEffects, 1);
      assert.equal(currentRevision, 5);
      assert.equal(((successes[0].body.data as Record<string, unknown>).entity_id), WORKSPACE_ID);
      assert.equal(((successes[0].body.data as Record<string, unknown>).revision), 5);
      assert.equal(((conflicts[0].body.error as Record<string, unknown>).code), "REVISION_CONFLICT");
      assert.equal(((conflicts[0].body.error as Record<string, unknown>).retryable), false);
      assert.match(String(conflicts[0].body.trace_id ?? ""), /^trace-w7-04-update-[ab]-conflict$/);

      const readAfterRace = await routeJson(getBody("w7-04-read-after-race"));
      assert.equal(readAfterRace.status, 200);
      assert.equal(((readAfterRace.body.data as Record<string, unknown>).revision), 5);
      assert.equal(logicalSideEffects, 1);

      assertP6FaultMatrixRecord({
        operation: "workspace.update",
        expectedState: "one-success-one-revision-conflict",
        actualState: `${successes.length}-success-${conflicts.length}-conflict`,
        errorCode: "REVISION_CONFLICT",
        retryable: false,
        requestId: "w7-04-concurrent-r4",
        idempotencyKey: null,
        traceId: String(conflicts[0].body.trace_id ?? ""),
        sideEffectCount: logicalSideEffects,
        finalRevision: currentRevision,
        finalConsistency: "one-winner-no-silent-overwrite",
      });

      const conflictedRequest = conflicts[0] === race[0] ? first : second;
      const conflictedPayload = conflictedRequest.payload as Record<string, unknown>;
      const conflictedWorkspace = conflictedPayload.workspace as Record<string, unknown>;
      const recovery = updateBody({
        requestId: "w7-04-recovery",
        baseRevision: 5,
        name: String(conflictedWorkspace.name),
        fingerprint: "fp-recovery-after-r5-read",
      });
      const recovered = await routeJson(recovery);
      assert.equal(recovered.status, 200);
      assert.equal(((recovered.body.data as Record<string, unknown>).revision), 6);
      assert.equal(logicalSideEffects, 2);
      assert.equal(currentRevision, 6);

      const finalRead = await routeJson(getBody("w7-04-final-read"));
      assert.equal(finalRead.status, 200);
      const finalData = finalRead.body.data as Record<string, unknown>;
      assert.equal(finalData.entity_id, WORKSPACE_ID);
      assert.equal(finalData.revision, 6);
      assert.equal(((finalData.entity as Record<string, unknown>).name), conflictedWorkspace.name);
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-04" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
