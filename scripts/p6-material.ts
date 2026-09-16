import assert from "node:assert/strict";
import { POST as materialUploadRoute } from "../app/api/material-upload/route.ts";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  materialFeedIdempotencyKey,
  materialParseRetryIdempotencyKey,
  validateMaterialProductRequest,
} from "../lib/material-contract.ts";
import { normalizeMaterialUploadAck, type MaterialUploadAck } from "../lib/material-upload.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T03:00:00.000Z";
const WORKSPACE_ID = "w-p6-material";
const MATERIAL_ID = "material-p6-contract";

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

async function withMaterialUpstream<T>(responder: UpstreamResponder, run: () => Promise<T>): Promise<T> {
  const previousEndpoint = process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL;
  const previousToken = process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL = "https://material.integration.invalid";
  process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN = "material-secret";
  globalThis.fetch = responder as typeof fetch;
  try {
    return await run();
  } finally {
    if (typeof previousEndpoint === "undefined") delete process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL;
    else process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL = previousEndpoint;
    if (typeof previousToken === "undefined") delete process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN;
    else process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
}

function productBody(input: {
  operation: "material.feed" | "material.parse.get" | "material.parse.retry";
  requestId: string;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
}) {
  return {
    product: "awkn-marketing" as const,
    operation: input.operation,
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    workspace_id: WORKSPACE_ID,
    payload: input.payload,
  };
}

function productRequest(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": String(payload.request_id ?? "req-material"),
    },
    body: JSON.stringify(payload),
  });
}

async function productJson(payload: Record<string, unknown>) {
  const response = await productRoute(productRequest(payload));
  return { status: response.status, body: await response.json() as MaterialUploadAck };
}

function uploadRequest(file: File, requestId: string) {
  const form = new FormData();
  form.set("workspace_id", WORKSPACE_ID);
  form.set("material_id", MATERIAL_ID);
  form.set("file", file, file.name);
  return new Request("http://localhost/api/material-upload", {
    method: "POST",
    headers: {
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": requestId,
    },
    body: form,
  });
}

async function uploadJson(file: File, requestId: string) {
  const response = await materialUploadRoute(uploadRequest(file, requestId));
  return { status: response.status, body: await response.json() as MaterialUploadAck };
}

async function main() {
  await runP6Case("material product requests preserve one stable material identity", () => {
    assert.equal(validateMaterialProductRequest(productBody({
      operation: "material.feed",
      requestId: "req-feed-ok",
      idempotencyKey: materialFeedIdempotencyKey(MATERIAL_ID),
      payload: { entity_id: MATERIAL_ID, material_id: MATERIAL_ID, title: "brief.md" },
    })), null);

    const mismatch = validateMaterialProductRequest(productBody({
      operation: "material.feed",
      requestId: "req-feed-mismatch",
      idempotencyKey: materialFeedIdempotencyKey(MATERIAL_ID),
      payload: { entity_id: "material-other", material_id: MATERIAL_ID },
    }));
    assert.equal(mismatch?.code, "IDENTITY_MISMATCH");

    const invalidRevision = validateMaterialProductRequest(productBody({
      operation: "material.parse.retry",
      requestId: "req-retry-invalid-revision",
      idempotencyKey: materialParseRetryIdempotencyKey(MATERIAL_ID, 1),
      payload: { material_id: MATERIAL_ID, base_revision: 0 },
    }));
    assert.equal(invalidRevision?.code, "INVALID_REVISION");
    assert.notEqual(materialParseRetryIdempotencyKey(MATERIAL_ID, 3), materialParseRetryIdempotencyKey(MATERIAL_ID, 4));
  }, { operation: "material.feed", entityId: MATERIAL_ID });

  await runP6Case("material.feed blocks upstream identity mismatch before projection", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: "material-other", revision: 1, updated_at: NOW },
      trace_id: "trace-material-feed-mismatch",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await productJson(productBody({
        operation: "material.feed",
        requestId: "req-feed-upstream-mismatch",
        idempotencyKey: materialFeedIdempotencyKey(MATERIAL_ID),
        payload: { entity_id: MATERIAL_ID, material_id: MATERIAL_ID, title: "brief.md" },
      }));
      assert.equal(result.status, 502);
      assert.equal(result.body.error?.code, "IDENTITY_MISMATCH");
      assert.equal(result.body.trace_id, "trace-material-feed-mismatch");
    });
  }, { operation: "material.feed", entityId: MATERIAL_ID, traceId: "trace-material-feed-mismatch" });

  await runP6Case("material.parse.get projects parsed text evidence revision and trace", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: {
        entity_id: MATERIAL_ID,
        revision: 3,
        updated_at: NOW,
        parse_status: "ready",
        parsed_text: "关键客户反馈",
        evidence: [{ type: "PDF", title: "第 1 页", snippet: "客户关注交付速度", source: "brief.pdf" }],
      },
      trace_id: "trace-material-parse-ready",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const response = await productJson(productBody({
        operation: "material.parse.get",
        requestId: "req-parse-get-ready",
        payload: { material_id: MATERIAL_ID },
      }));
      assert.equal(response.status, 200);
      const normalized = normalizeMaterialUploadAck(response.body, MATERIAL_ID, { strict: true });
      assert.equal(normalized.ok, true);
      assert.equal(normalized.state, "ready");
      assert.equal(normalized.parsedText, "关键客户反馈");
      assert.equal(normalized.evidence.length, 1);
      assert.equal(normalized.revision, 3);
      assert.equal(normalized.traceId, "trace-material-parse-ready");
    });
  }, { operation: "material.parse.get", entityId: MATERIAL_ID, traceId: "trace-material-parse-ready" });

  await runP6Case("material parse failure remains visible and recoverable after successful status read", async () => {
    await withProductUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { entity_id: MATERIAL_ID, revision: 4, updated_at: NOW, parse_status: "failed" },
      trace_id: "trace-material-parse-failed",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const response = await productJson(productBody({
        operation: "material.parse.get",
        requestId: "req-parse-get-failed",
        payload: { material_id: MATERIAL_ID },
      }));
      assert.equal(response.status, 200);
      const normalized = normalizeMaterialUploadAck(response.body, MATERIAL_ID, { strict: true });
      assert.equal(normalized.ok, true);
      assert.equal(normalized.state, "failed");
      assert.equal(normalized.error?.code, "MATERIAL_PARSE_FAILED");
      assert.equal(normalized.error?.retryable, true);
    });
  }, { operation: "material.parse.get", entityId: MATERIAL_ID, traceId: "trace-material-parse-failed" });

  await runP6Case("material.parse.retry reuses the logical material and same-key retry yields one logical run", async () => {
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
        data: { entity_id: MATERIAL_ID, revision: 5, updated_at: NOW, run_id: "parse-run-1", status: "queued", attempt: 2 },
        trace_id: "trace-material-retry",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const key = materialParseRetryIdempotencyKey(MATERIAL_ID, 4);
      for (const requestId of ["req-retry-1", "req-retry-2"]) {
        const response = await productJson(productBody({
          operation: "material.parse.retry",
          requestId,
          idempotencyKey: key,
          payload: { material_id: MATERIAL_ID, base_revision: 4 },
        }));
        assert.equal(response.status, 200);
        const normalized = normalizeMaterialUploadAck(response.body, MATERIAL_ID, { strict: true });
        assert.equal(normalized.state, "queued");
        assert.equal(normalized.runId, "parse-run-1");
        assert.equal(normalized.revision, 5);
      }
    });
    assert.equal(logicalSideEffects, 1);
  }, { operation: "material.parse.retry", entityId: MATERIAL_ID, traceId: "trace-material-retry" });

  await runP6Case("binary upload forwards stable material id request id and deterministic idempotency key", async () => {
    const seen = new Set<string>();
    let logicalSideEffects = 0;
    await withMaterialUpstream(async (_input, init) => {
      const outgoing = init?.body as FormData;
      assert.equal(outgoing.get("operation"), "material.upload");
      assert.equal(outgoing.get("material_id"), MATERIAL_ID);
      assert.ok(String(outgoing.get("request_id") ?? "").length > 0);
      const key = String(outgoing.get("idempotency_key") ?? "");
      if (!seen.has(key)) {
        seen.add(key);
        logicalSideEffects += 1;
      }
      return new Response(JSON.stringify({
        ok: true,
        data: { material_id: MATERIAL_ID, revision: 1, updated_at: NOW, parse_status: "queued" },
        trace_id: "trace-material-upload",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      for (const requestId of ["req-upload-1", "req-upload-2"]) {
        const response = await uploadJson(new File(["binary-payload"], "proposal.pdf", { type: "application/pdf" }), requestId);
        assert.equal(response.status, 200);
        const normalized = normalizeMaterialUploadAck(response.body, MATERIAL_ID, { strict: true });
        assert.equal(normalized.state, "queued");
        assert.equal(normalized.revision, 1);
      }
    });
    assert.equal(logicalSideEffects, 1);
  }, { operation: "material.upload", entityId: MATERIAL_ID, traceId: "trace-material-upload" });

  await runP6Case("upload success and parse failure remain separate states", async () => {
    await withMaterialUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { material_id: MATERIAL_ID, revision: 2, updated_at: NOW, parse_status: "failed" },
      trace_id: "trace-upload-parse-failed",
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const response = await uploadJson(new File(["binary"], "failed.pdf", { type: "application/pdf" }), "req-upload-parse-failed");
      assert.equal(response.status, 200);
      assert.equal(response.body.ok, true);
      const normalized = normalizeMaterialUploadAck(response.body, MATERIAL_ID, { strict: true });
      assert.equal(normalized.ok, true);
      assert.equal(normalized.state, "failed");
      assert.equal(normalized.error?.code, "MATERIAL_PARSE_FAILED");
    });
  }, { operation: "material.upload", entityId: MATERIAL_ID, traceId: "trace-upload-parse-failed" });

  await runP6Case("binary upload rejects missing id identity mismatch and missing revision", async () => {
    const cases: Array<{ data: Record<string, unknown>; expectedCode: string }> = [
      { data: { revision: 1, updated_at: NOW, parse_status: "queued" }, expectedCode: "MISSING_MATERIAL_ACK" },
      { data: { material_id: "material-other", revision: 1, updated_at: NOW, parse_status: "queued" }, expectedCode: "MATERIAL_IDENTITY_MISMATCH" },
      { data: { material_id: MATERIAL_ID, updated_at: NOW, parse_status: "queued" }, expectedCode: "INVALID_REVISION" },
    ];
    for (const [index, testCase] of cases.entries()) {
      await withMaterialUpstream(async () => new Response(JSON.stringify({ ok: true, data: testCase.data, trace_id: `trace-upload-contract-${index}` }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
        const response = await uploadJson(new File(["binary"], `contract-${index}.pdf`, { type: "application/pdf" }), `req-upload-contract-${index}`);
        assert.equal(response.status, 502);
        assert.equal(response.body.error?.code, testCase.expectedCode);
      });
    }
  }, { operation: "material.upload", entityId: MATERIAL_ID });

  await runP6Case("revoked workspace binary upload is denied without success projection", async () => {
    await withMaterialUpstream(async () => new Response(JSON.stringify({
      ok: false,
      error: { code: "WORKSPACE_REVOKED", message: "workspace grant revoked", retryable: false },
      trace_id: "trace-material-revoked",
    }), { status: 403, headers: { "content-type": "application/json" } }), async () => {
      const response = await uploadJson(new File(["binary"], "revoked.pdf", { type: "application/pdf" }), "req-upload-revoked");
      assert.equal(response.status, 403);
      assert.equal(response.body.ok, false);
      assert.equal(response.body.error?.code, "WORKSPACE_REVOKED");
      assert.equal(response.body.trace_id, "trace-material-revoked");
    });
  }, { operation: "material.upload", entityId: MATERIAL_ID, traceId: "trace-material-revoked" });

  await runP6Case("binary upload maps abort to retryable timeout", async () => {
    await withMaterialUpstream(async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }, async () => {
      const response = await uploadJson(new File(["binary"], "timeout.pdf", { type: "application/pdf" }), "req-upload-timeout");
      assert.equal(response.status, 504);
      assert.equal(response.body.error?.code, "MATERIAL_UPLOAD_TIMEOUT");
      assert.equal(response.body.error?.retryable, true);
    });
  }, { operation: "material.upload", entityId: MATERIAL_ID });

  await runP6Case("binary upload enforces configured file-size limit before upstream side effect", async () => {
    const previousLimit = process.env.AWKN_MARKETING_MATERIAL_MAX_MB;
    process.env.AWKN_MARKETING_MATERIAL_MAX_MB = "0.000001";
    try {
      await withMaterialUpstream(async () => {
        throw new Error("upstream should not be called for oversized file");
      }, async () => {
        const response = await uploadJson(new File(["0123456789"], "large.pdf", { type: "application/pdf" }), "req-upload-large");
        assert.equal(response.status, 413);
        assert.equal(response.body.error?.code, "FILE_TOO_LARGE");
      });
    } finally {
      if (typeof previousLimit === "undefined") delete process.env.AWKN_MARKETING_MATERIAL_MAX_MB;
      else process.env.AWKN_MARKETING_MATERIAL_MAX_MB = previousLimit;
    }
  }, { operation: "material.upload", entityId: MATERIAL_ID });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
