import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { workspaceUpdateIdempotencyKey } from "../lib/workspace-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const WORKSPACE_ID = "w-p6-malformed-json";
const WORKSPACE = {
  id: WORKSPACE_ID,
  name: "P6 Malformed JSON",
  type: "营销项目",
  goal: "验证 malformed JSON",
  successCriteria: "invalid JSON cannot project success",
  status: "进行中",
  updatedAt: "刚刚",
  taskCount: 0,
  materialCount: 0,
  experienceCount: 0,
};
const KEY = workspaceUpdateIdempotencyKey(WORKSPACE_ID, 4, "fp-malformed-json");

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

function body(requestId: string) {
  return {
    product: "awkn-marketing" as const,
    operation: "workspace.update" as const,
    request_id: requestId,
    idempotency_key: KEY,
    workspace_id: WORKSPACE_ID,
    payload: { workspace: WORKSPACE, base_revision: 4 },
  };
}

async function call(requestId: string) {
  const payload = body(requestId);
  const response = await productRoute(new Request("http://localhost/api/product", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": requestId },
    body: JSON.stringify(payload),
  }));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main() {
  const cases = [
    { name: "truncated JSON", payload: "{\"ok\":true", status: 200 },
    { name: "HTML error page with 200", payload: "<html>bad gateway</html>", status: 200 },
    { name: "empty body", payload: "", status: 200 },
  ];

  for (const [index, testCase] of cases.entries()) {
    await runP6Case(`W7-09 ${testCase.name} maps to stable malformed JSON failure`, async () => {
      const traceId = `trace-w7-09-json-${index}`;
      await withUpstream(async () => new Response(testCase.payload, {
        status: testCase.status,
        headers: { "content-type": "application/json", "x-trace-id": traceId },
      }), async () => {
        const requestId = `req-w7-09-json-${index}`;
        const result = await call(requestId);
        const error = result.body.error as Record<string, unknown>;
        assert.equal(result.status, 502);
        assert.equal(result.body.ok, false);
        assert.equal(error.code, "UNKNOWN_UPSTREAM_ERROR");
        assert.equal(error.retryable, true);
        assert.equal(result.body.trace_id, traceId);
        assert.equal("data" in result.body, false);
        assertP6FaultMatrixRecord({
          operation: "workspace.update",
          expectedState: "malformed-json-failure",
          actualState: String(error.code),
          errorCode: String(error.code),
          retryable: Boolean(error.retryable),
          requestId,
          idempotencyKey: KEY,
          traceId,
          sideEffectCount: 0,
          finalRevision: 4,
          finalConsistency: "malformed-json-cannot-project-success",
        });
      });
    }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: `trace-w7-09-json-${index}` });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
