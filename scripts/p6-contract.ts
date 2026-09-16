import assert from "node:assert/strict";
import {
  PRODUCT_ERROR_CODES,
  PRODUCT_OPERATION_METADATA,
  PRODUCT_OPERATIONS,
  isProductErrorCode,
  isProductOperation,
  normalizeProductResponseContract,
  productOperationMetadata,
  validateProductRequestContract,
  validateStableEntityAck,
  type ProductOperation,
  type ProductOperationMetadata,
} from "../lib/product-contract.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T00:00:00.000Z";

function validRequest(operation: ProductOperation) {
  const metadata = productOperationMetadata(operation);
  return {
    product: "awkn-marketing",
    operation,
    request_id: `req:${operation}`,
    idempotency_key: metadata.idempotency === "required" ? `idem:${operation}` : undefined,
    workspace_id: metadata.workspaceId === "required" ? "w-contract" : undefined,
    task_id: metadata.taskId === "required" ? "t-contract" : undefined,
    payload: {},
  };
}

function validResponse(metadata: ProductOperationMetadata) {
  const data: Record<string, unknown> = {
    entity_id: "entity-contract",
    revision: 1,
    updated_at: NOW,
  };
  if (metadata.response === "entity-read") data.entity = { id: "entity-contract" };
  if (metadata.response === "async-ack" || metadata.response === "async-read") {
    data.run_id = "run-contract";
    data.status = "queued";
  }
  return { ok: true, data, trace_id: "trace-contract" };
}

async function main() {
  await runP6Case("product operation registry remains 19 unique operations with complete metadata", () => {
    assert.equal(PRODUCT_OPERATIONS.length, 19);
    assert.equal(new Set(PRODUCT_OPERATIONS).size, 19);
    assert.deepEqual(Object.keys(PRODUCT_OPERATION_METADATA).sort(), [...PRODUCT_OPERATIONS].sort());
    for (const operation of PRODUCT_OPERATIONS) {
      assert.equal(isProductOperation(operation), true);
      const metadata = productOperationMetadata(operation);
      assert.ok(["read", "write", "append", "async"].includes(metadata.kind));
      assert.ok(["required", "none"].includes(metadata.idempotency));
      assert.ok(["required", "optional"].includes(metadata.workspaceId));
      assert.ok(["required", "optional"].includes(metadata.taskId));
    }
  });

  await runP6Case("all 19 operations accept their valid request contract", () => {
    for (const operation of PRODUCT_OPERATIONS) {
      assert.equal(validateProductRequestContract(validRequest(operation)), null, operation);
    }
  });

  await runP6Case("metadata-required ids and idempotency are enforced table-wide", () => {
    for (const operation of PRODUCT_OPERATIONS) {
      const metadata = productOperationMetadata(operation);
      const request = validRequest(operation);
      if (metadata.workspaceId === "required") {
        const violation = validateProductRequestContract({ ...request, workspace_id: undefined });
        assert.equal(violation?.code, "VALIDATION_ERROR", `${operation}: workspace_id`);
      }
      if (metadata.taskId === "required") {
        const violation = validateProductRequestContract({ ...request, task_id: undefined });
        assert.equal(violation?.code, "VALIDATION_ERROR", `${operation}: task_id`);
      }
      if (metadata.idempotency === "required") {
        const violation = validateProductRequestContract({ ...request, idempotency_key: undefined });
        assert.equal(violation?.code, "VALIDATION_ERROR", `${operation}: idempotency_key`);
      } else {
        assert.equal(validateProductRequestContract({ ...request, idempotency_key: undefined }), null, `${operation}: read idempotency`);
      }
    }
  });

  await runP6Case("all 19 operations accept their declared response contract", () => {
    for (const operation of PRODUCT_OPERATIONS) {
      const response = normalizeProductResponseContract(operation, validResponse(productOperationMetadata(operation)));
      assert.equal(response.ok, true, operation);
      assert.equal(response.trace_id, "trace-contract", operation);
    }
  });

  await runP6Case("persistent entity ack requires stable identity, revision and updated_at", () => {
    const accepted = validateStableEntityAck(
      { ok: true, data: { entity_id: "w1", revision: 2, updated_at: NOW }, trace_id: "trace-contract-ok" },
      "w1",
    );
    assert.equal(accepted.ok, true);

    const mismatch = validateStableEntityAck(
      { ok: true, data: { entity_id: "other", revision: 2, updated_at: NOW }, trace_id: "trace-contract-mismatch" },
      "w1",
    );
    assert.equal(mismatch.error?.code, "IDENTITY_MISMATCH");
    assert.equal(mismatch.trace_id, "trace-contract-mismatch");

    const invalidRevision = validateStableEntityAck(
      { ok: true, data: { entity_id: "w1", revision: 0, updated_at: NOW }, trace_id: "trace-contract-revision" },
      "w1",
    );
    assert.equal(invalidRevision.error?.code, "INVALID_REVISION");

    const missingUpdatedAt = validateStableEntityAck(
      { ok: true, data: { entity_id: "w1", revision: 2 }, trace_id: "trace-contract-time" },
      "w1",
    );
    assert.equal(missingUpdatedAt.error?.code, "VALIDATION_ERROR");
  }, { operation: "workspace.update", entityId: "w1", traceId: "trace-contract-ok" });

  await runP6Case("unknown operation is a stable UNSUPPORTED_OPERATION violation", () => {
    const violation = validateProductRequestContract({
      product: "awkn-marketing",
      operation: "unknown.operation",
      request_id: "req-unknown",
      payload: {},
    });
    assert.equal(violation?.code, "UNSUPPORTED_OPERATION");
  }, { operation: "unknown.operation" });

  await runP6Case("error taxonomy is stable, unique and preserved from upstream", () => {
    assert.equal(PRODUCT_ERROR_CODES.length, 16);
    assert.equal(new Set(PRODUCT_ERROR_CODES).size, 16);
    for (const code of PRODUCT_ERROR_CODES) {
      assert.equal(isProductErrorCode(code), true);
      const response = normalizeProductResponseContract(
        "workspace.get",
        { ok: false, error: { code, message: `error:${code}` }, trace_id: `trace:${code}` },
        { httpStatus: code === "AUTH_REQUIRED" ? 401 : 400 },
      );
      assert.equal(response.ok, false, code);
      assert.equal(response.error?.code, code, code);
      assert.equal(response.trace_id, `trace:${code}`, code);
    }
  });

  await runP6Case("malformed upstream envelopes normalize without losing fallback trace", () => {
    const malformed = normalizeProductResponseContract(
      "workspace.get",
      null,
      { fallbackTraceId: "trace-fallback", httpStatus: 502 },
    );
    assert.equal(malformed.error?.code, "UNKNOWN_UPSTREAM_ERROR");
    assert.equal(malformed.trace_id, "trace-fallback");

    const unknownError = normalizeProductResponseContract(
      "workspace.get",
      { ok: false, error: { code: "SOMETHING_NEW", message: "unknown" } },
      { fallbackTraceId: "trace-unknown", httpStatus: 500 },
    );
    assert.equal(unknownError.error?.code, "UPSTREAM_UNAVAILABLE");
    assert.equal(unknownError.trace_id, "trace-unknown");
  }, { operation: "workspace.get", traceId: "trace-fallback" });

  await runP6Case("async response contract requires run identity and stable status", () => {
    const missingRun = normalizeProductResponseContract(
      "task.run",
      { ok: true, data: { entity_id: "run-entity", revision: 1, updated_at: NOW, status: "queued" } },
    );
    assert.equal(missingRun.error?.code, "VALIDATION_ERROR");

    const invalidStatus = normalizeProductResponseContract(
      "learning.run",
      { ok: true, data: { entity_id: "run-entity", revision: 1, updated_at: NOW, run_id: "run-1", status: "mystery" } },
    );
    assert.equal(invalidStatus.error?.code, "VALIDATION_ERROR");
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
