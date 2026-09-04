import assert from "node:assert/strict";
import { PRODUCT_OPERATIONS, isProductOperation, validateStableEntityAck } from "../lib/product-contract.ts";
import { runP6Case } from "./p6-test-support.ts";

await runP6Case("product operation registry remains 19 unique operations", () => {
  assert.equal(PRODUCT_OPERATIONS.length, 19);
  assert.equal(new Set(PRODUCT_OPERATIONS).size, 19);
  for (const operation of PRODUCT_OPERATIONS) assert.equal(isProductOperation(operation), true);
});

await runP6Case("stable entity ack accepts matching identity", () => {
  const response = validateStableEntityAck({ ok: true, data: { entity_id: "w1" }, trace_id: "trace-contract-ok" }, "w1");
  assert.equal(response.ok, true);
}, { operation: "workspace.create", entityId: "w1", traceId: "trace-contract-ok" });

await runP6Case("stable entity ack rejects identity mismatch", () => {
  const response = validateStableEntityAck({ ok: true, data: { entity_id: "other" }, trace_id: "trace-contract-mismatch" }, "w1");
  assert.equal(response.ok, false);
  assert.equal(response.error?.code, "IDENTITY_MISMATCH");
  assert.equal(response.trace_id, "trace-contract-mismatch");
}, { operation: "workspace.update", entityId: "w1", traceId: "trace-contract-mismatch" });
