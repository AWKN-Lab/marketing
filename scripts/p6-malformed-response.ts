import assert from "node:assert/strict";
import { POST as productRoute } from "../app/api/product/route.ts";
import { materialParseRetryIdempotencyKey } from "../lib/material-contract.ts";
import { workspaceUpdateIdempotencyKey } from "../lib/workspace-contract.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T08:30:00.000Z";
const WORKSPACE_ID = "w-p6-malformed";
const MATERIAL_ID = "material-p6-malformed";
const WORKSPACE = {
  id: WORKSPACE_ID,
  name: "P6 Malformed Response",
  type: "营销项目",
  goal: "验证 malformed response",
  successCriteria: "fake success = 0",
  status: "进行中",
  updatedAt: "刚刚",
  taskCount: 0,
  materialCount: 1,
  experienceCount: 0,
};

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

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": String(payload.request_id) },
    body: JSON.stringify(payload),
  });
}

async function call(payload: Record<string, unknown>) {
  const response = await productRoute(request(payload));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

function errorCode(body: Record<string, unknown>) {
  return String((body.error as Record<string, unknown>)?.code ?? "");
}

function workspaceUpdate(requestId: string) {
  return {
    product: "awkn-marketing" as const,
    operation: "workspace.update" as const,
    request_id: requestId,
    idempotency_key: workspaceUpdateIdempotencyKey(WORKSPACE_ID, 4, "fp-malformed"),
    workspace_id: WORKSPACE_ID,
    payload: { workspace: WORKSPACE, base_revision: 4 },
  };
}

function materialGet(requestId: string) {
  return {
    product: "awkn-marketing" as const,
    operation: "material.parse.get" as const,
    request_id: requestId,
    workspace_id: WORKSPACE_ID,
    payload: { material_id: MATERIAL_ID },
  };
}

function materialRetry(requestId: string) {
  return {
    product: "awkn-marketing" as const,
    operation: "material.parse.retry" as const,
    request_id: requestId,
    idempotency_key: materialParseRetryIdempotencyKey(MATERIAL_ID, 2),
    workspace_id: WORKSPACE_ID,
    payload: { material_id: MATERIAL_ID, base_revision: 2 },
  };
}

async function main() {
  await runP6Case("W7-09 non-JSON 200 cannot enter success projection", async () => {
    await withUpstream(async () => new Response("not-json", {
      status: 200,
      headers: { "x-trace-id": "trace-malformed-json" },
    }), async () => {
      const result = await call(workspaceUpdate("req-malformed-json"));
      assert.equal(result.status, 502);
      assert.equal(result.body.ok, false);
      assert.equal(errorCode(result.body), "UNKNOWN_UPSTREAM_ERROR");
      assert.equal(result.body.trace_id, "trace-malformed-json");
      assert.equal("data" in result.body, false);
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-malformed-json" });

  const ackCases = [
    [{ revision: 5, updated_at: NOW }, "MISSING_ENTITY_ACK"],
    [{ entity_id: "w-other", revision: 5, updated_at: NOW }, "IDENTITY_MISMATCH"],
    [{ entity_id: WORKSPACE_ID, revision: 0, updated_at: NOW }, "INVALID_REVISION"],
    [{ entity_id: WORKSPACE_ID, revision: 5, updated_at: "bad-date" }, "VALIDATION_ERROR"],
  ] as const;

  for (const [index, [data, expectedCode]] of ackCases.entries()) {
    await runP6Case(`W7-09 malformed entity Ack ${index + 1}`, async () => {
      await withUpstream(async () => new Response(JSON.stringify({
        ok: true,
        data,
        trace_id: `trace-malformed-ack-${index}`,
      }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
        const result = await call(workspaceUpdate(`req-malformed-ack-${index}`));
        assert.equal(result.status, 502);
        assert.equal(result.body.ok, false);
        assert.equal(errorCode(result.body), expectedCode);
        assert.equal("data" in result.body, false);
      });
    }, { operation: "workspace.update", entityId: WORKSPACE_ID });
  }

  for (const parseStatus of [undefined, "teleported"]) {
    await runP6Case(`W7-09 material parse status ${String(parseStatus ?? "missing")}`, async () => {
      const data: Record<string, unknown> = { entity_id: MATERIAL_ID, revision: 3, updated_at: NOW };
      if (parseStatus) data.parse_status = parseStatus;
      await withUpstream(async () => new Response(JSON.stringify({
        ok: true,
        data,
        trace_id: "trace-malformed-material",
      }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
        const result = await call(materialGet(`req-material-${String(parseStatus ?? "missing")}`));
        assert.equal(result.status, 502);
        assert.equal(result.body.ok, false);
        assert.equal(errorCode(result.body), "VALIDATION_ERROR");
        assert.equal("data" in result.body, false);
      });
    }, { operation: "material.parse.get", entityId: MATERIAL_ID, traceId: "trace-malformed-material" });
  }

  await runP6Case("W7-09 invalid async status cannot enter success projection", async () => {
    await withUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: {
        entity_id: MATERIAL_ID,
        revision: 3,
        updated_at: NOW,
        run_id: "parse-run-malformed",
        status: "mystery",
      },
      trace_id: "trace-malformed-async",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await call(materialRetry("req-malformed-async"));
      assert.equal(result.status, 502);
      assert.equal(result.body.ok, false);
      assert.equal(errorCode(result.body), "VALIDATION_ERROR");
      assert.equal("data" in result.body, false);
    });
  }, { operation: "material.parse.retry", entityId: MATERIAL_ID, traceId: "trace-malformed-async" });

  await runP6Case("W7-09 unknown vendor 200 error remains stable", async () => {
    await withUpstream(async () => new Response(JSON.stringify({
      ok: false,
      error: { code: "VENDOR_ODD_RESPONSE", message: "unexpected protocol state" },
      trace_id: "trace-malformed-vendor",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await call(workspaceUpdate("req-malformed-vendor"));
      assert.equal(result.status, 502);
      assert.equal(result.body.ok, false);
      assert.equal(errorCode(result.body), "UNKNOWN_UPSTREAM_ERROR");
      assert.equal(result.body.trace_id, "trace-malformed-vendor");
      assert.equal("data" in result.body, false);
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-malformed-vendor" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
