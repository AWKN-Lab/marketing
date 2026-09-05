import assert from "node:assert/strict";
import { validateMaterialProductResponse } from "../lib/material-contract.ts";
import { normalizeProductResponseContract } from "../lib/product-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T08:30:00.000Z";
const WORKSPACE_ID = "w-p6-malformed";
const MATERIAL_ID = "material-p6-malformed";

function errorCode(response: ReturnType<typeof normalizeProductResponseContract>) {
  return response.error?.code;
}

async function main() {
  await runP6Case("W7-09 malformed 2xx envelope becomes stable UNKNOWN_UPSTREAM_ERROR", () => {
    const response = normalizeProductResponseContract("workspace.update", null, {
      expectedEntityId: WORKSPACE_ID,
      fallbackTraceId: "trace-w7-09-malformed-envelope",
      httpStatus: 200,
    });
    assert.equal(response.ok, false);
    assert.equal(errorCode(response), "UNKNOWN_UPSTREAM_ERROR");
    assert.equal(response.error?.retryable, true);
    assert.equal(response.trace_id, "trace-w7-09-malformed-envelope");
    assert.equal("data" in response, false);
    assertP6FaultMatrixRecord({
      operation: "workspace.update",
      expectedState: "malformed-envelope-rejected",
      actualState: String(errorCode(response)),
      errorCode: String(errorCode(response)),
      retryable: Boolean(response.error?.retryable),
      requestId: "req-w7-09-malformed-envelope",
      idempotencyKey: "workspace.update:w-p6-malformed:4:fp",
      traceId: response.trace_id ?? null,
      sideEffectCount: 0,
      finalRevision: 4,
      finalConsistency: "no-fake-success-from-malformed-2xx",
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-09-malformed-envelope" });

  const malformedAcks: Array<{ name: string; data: Record<string, unknown>; expectedCode: string }> = [
    {
      name: "missing entity id",
      data: { revision: 5, updated_at: NOW },
      expectedCode: "MISSING_ENTITY_ACK",
    },
    {
      name: "wrong entity id",
      data: { entity_id: "w-other", revision: 5, updated_at: NOW },
      expectedCode: "IDENTITY_MISMATCH",
    },
    {
      name: "invalid revision",
      data: { entity_id: WORKSPACE_ID, revision: 0, updated_at: NOW },
      expectedCode: "INVALID_REVISION",
    },
    {
      name: "missing updated_at",
      data: { entity_id: WORKSPACE_ID, revision: 5 },
      expectedCode: "VALIDATION_ERROR",
    },
  ];

  for (const testCase of malformedAcks) {
    await runP6Case(`W7-09 ${testCase.name} success Ack is rejected`, () => {
      const response = normalizeProductResponseContract("workspace.update", {
        ok: true,
        data: testCase.data,
        trace_id: `trace-w7-09-${testCase.expectedCode.toLowerCase()}`,
      }, {
        expectedEntityId: WORKSPACE_ID,
        httpStatus: 200,
      });
      assert.equal(response.ok, false);
      assert.equal(errorCode(response), testCase.expectedCode);
      assert.equal("data" in response, false);
    }, { operation: "workspace.update", entityId: WORKSPACE_ID });
  }

  await runP6Case("W7-09 entity-read without entity snapshot is rejected", () => {
    const response = normalizeProductResponseContract("workspace.get", {
      ok: true,
      data: { entity_id: WORKSPACE_ID, revision: 5, updated_at: NOW },
      trace_id: "trace-w7-09-read-missing-entity",
    }, {
      expectedEntityId: WORKSPACE_ID,
      httpStatus: 200,
    });
    assert.equal(response.ok, false);
    assert.equal(errorCode(response), "VALIDATION_ERROR");
    assert.equal(response.trace_id, "trace-w7-09-read-missing-entity");
  }, { operation: "workspace.get", entityId: WORKSPACE_ID, traceId: "trace-w7-09-read-missing-entity" });

  await runP6Case("W7-09 material parse read rejects missing or invalid parse state", () => {
    for (const status of [undefined, "teleporting"]) {
      const base = normalizeProductResponseContract("material.parse.get", {
        ok: true,
        data: {
          entity_id: MATERIAL_ID,
          revision: 3,
          updated_at: NOW,
          ...(typeof status === "undefined" ? {} : { parse_status: status }),
        },
        trace_id: "trace-w7-09-material-state",
      }, {
        expectedEntityId: MATERIAL_ID,
        httpStatus: 200,
      });
      assert.equal(base.ok, true);
      const response = validateMaterialProductResponse("material.parse.get", base);
      assert.equal(response.ok, false);
      assert.equal(response.error?.code, "VALIDATION_ERROR");
      assert.equal(response.error?.retryable, false);
      assert.equal(response.trace_id, "trace-w7-09-material-state");
      assert.equal("data" in response, false);
    }
  }, { operation: "material.parse.get", entityId: MATERIAL_ID, traceId: "trace-w7-09-material-state" });

  await runP6Case("W7-09 material parse read accepts canonical and supported upstream states", () => {
    for (const status of ["queued", "processing", "ready", "completed", "failed"]) {
      const base = normalizeProductResponseContract("material.parse.get", {
        ok: true,
        data: {
          entity_id: MATERIAL_ID,
          revision: 3,
          updated_at: NOW,
          parse_status: status,
        },
        trace_id: "trace-w7-09-material-state-valid",
      }, {
        expectedEntityId: MATERIAL_ID,
        httpStatus: 200,
      });
      const response = validateMaterialProductResponse("material.parse.get", base);
      assert.equal(response.ok, true);
    }
  }, { operation: "material.parse.get", entityId: MATERIAL_ID, traceId: "trace-w7-09-material-state-valid" });

  await runP6Case("W7-09 async Ack with invalid status is rejected", () => {
    const response = normalizeProductResponseContract("material.parse.retry", {
      ok: true,
      data: {
        entity_id: MATERIAL_ID,
        revision: 3,
        updated_at: NOW,
        run_id: "parse-run-malformed",
        status: "mystery",
      },
      trace_id: "trace-w7-09-invalid-async-status",
    }, {
      expectedEntityId: MATERIAL_ID,
      httpStatus: 200,
    });
    assert.equal(response.ok, false);
    assert.equal(errorCode(response), "VALIDATION_ERROR");
    assert.equal(response.trace_id, "trace-w7-09-invalid-async-status");
  }, { operation: "material.parse.retry", entityId: MATERIAL_ID, traceId: "trace-w7-09-invalid-async-status" });

  await runP6Case("W7-09 async Ack without run_id is rejected", () => {
    const response = normalizeProductResponseContract("material.parse.retry", {
      ok: true,
      data: {
        entity_id: MATERIAL_ID,
        revision: 3,
        updated_at: NOW,
        status: "queued",
      },
      trace_id: "trace-w7-09-missing-run-id",
    }, {
      expectedEntityId: MATERIAL_ID,
      httpStatus: 200,
    });
    assert.equal(response.ok, false);
    assert.equal(errorCode(response), "VALIDATION_ERROR");
    assert.equal(response.trace_id, "trace-w7-09-missing-run-id");
  }, { operation: "material.parse.retry", entityId: MATERIAL_ID, traceId: "trace-w7-09-missing-run-id" });

  await runP6Case("W7-09 unknown vendor code on HTTP 200 cannot escape product taxonomy", () => {
    const response = normalizeProductResponseContract("workspace.update", {
      ok: false,
      error: { code: "VENDOR_PROTOCOL_FAILURE", message: "unexpected protocol response" },
      trace_id: "trace-w7-09-vendor-code",
    }, {
      expectedEntityId: WORKSPACE_ID,
      httpStatus: 200,
    });
    assert.equal(response.ok, false);
    assert.equal(errorCode(response), "UNKNOWN_UPSTREAM_ERROR");
    assert.equal(response.trace_id, "trace-w7-09-vendor-code");
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-09-vendor-code" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
