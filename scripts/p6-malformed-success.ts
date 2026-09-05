import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T08:40:00.000Z";
const WORKSPACE_ID = "w-p6-malformed-success";
const MATERIAL_ID = "material-p6-malformed-success";

type Responder = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function withUpstream<T>(responder: Responder, run: () => Promise<T>) {
  const previousEndpoint = process.env.AWKN_MARKETING_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_API_URL = "https://integration.invalid";
  globalThis.fetch = responder as typeof fetch;
  try {
    return await run();
  } finally {
    if (typeof previousEndpoint === "undefined") delete process.env.AWKN_MARKETING_API_URL;
    else process.env.AWKN_MARKETING_API_URL = previousEndpoint;
    globalThis.fetch = previousFetch;
  }
}

function request(requestId: string) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": requestId },
    body: JSON.stringify({
      product: "awkn-marketing",
      operation: "material.parse.get",
      request_id: requestId,
      workspace_id: WORKSPACE_ID,
      payload: { material_id: MATERIAL_ID },
    }),
  });
}

async function call(requestId: string) {
  const response = await productRoute(request(requestId));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

function error(body: Record<string, unknown>) {
  return body.error as Record<string, unknown>;
}

async function main() {
  const invalidCases: Array<{ name: string; data: Record<string, unknown> }> = [
    {
      name: "missing parse status",
      data: { entity_id: MATERIAL_ID, revision: 3, updated_at: NOW },
    },
    {
      name: "unknown parse status",
      data: { entity_id: MATERIAL_ID, revision: 3, updated_at: NOW, parse_status: "teleported" },
    },
    {
      name: "non-text parse status",
      data: { entity_id: MATERIAL_ID, revision: 3, updated_at: NOW, status: 42 },
    },
  ];

  for (const [index, testCase] of invalidCases.entries()) {
    await runP6Case(`W7-10 ${testCase.name} cannot enter product projection`, async () => {
      const traceId = `trace-w7-10-invalid-${index}`;
      await withUpstream(async () => new Response(JSON.stringify({
        ok: true,
        data: testCase.data,
        trace_id: traceId,
      }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
        const requestId = `req-w7-10-invalid-${index}`;
        const result = await call(requestId);
        assert.equal(result.status, 502);
        assert.equal(result.body.ok, false);
        assert.equal(error(result.body).code, "VALIDATION_ERROR");
        assert.equal(error(result.body).retryable, false);
        assert.equal(result.body.trace_id, traceId);
        assert.equal("data" in result.body, false);
        assertP6FaultMatrixRecord({
          operation: "material.parse.get",
          expectedState: "malformed-success-payload-rejected",
          actualState: String(error(result.body).code),
          errorCode: String(error(result.body).code),
          retryable: Boolean(error(result.body).retryable),
          requestId,
          idempotencyKey: null,
          traceId,
          sideEffectCount: 0,
          finalRevision: 3,
          finalConsistency: "invalid-material-state-cannot-project-success",
        });
      });
    }, { operation: "material.parse.get", entityId: MATERIAL_ID });
  }

  const validCases: Array<Record<string, unknown>> = [
    { parse_status: "queued" },
    { status: "processing" },
    { parse_status: "ready" },
    { status: "completed" },
    { parse_status: "failed" },
  ];

  for (const [index, state] of validCases.entries()) {
    await runP6Case(`W7-10 supported material parse state ${index + 1} remains valid`, async () => {
      await withUpstream(async () => new Response(JSON.stringify({
        ok: true,
        data: {
          entity_id: MATERIAL_ID,
          revision: 3,
          updated_at: NOW,
          ...state,
        },
        trace_id: `trace-w7-10-valid-${index}`,
      }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
        const result = await call(`req-w7-10-valid-${index}`);
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        const data = result.body.data as Record<string, unknown>;
        assert.equal(data.entity_id, MATERIAL_ID);
        assert.equal(data.revision, 3);
      });
    }, { operation: "material.parse.get", entityId: MATERIAL_ID });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
