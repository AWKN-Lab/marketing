import assert from "node:assert/strict";
import { reconcileSnapshots, snapshotFingerprint, validateEntityReadResponse } from "../lib/reconcile.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

async function main() {
  const baseline = { id: "w1", name: "Baseline" };
  const baselineFingerprint = snapshotFingerprint(baseline);

  await runP6Case("newer platform revision is detected", () => {
    const result = reconcileSnapshots({
      localSnapshot: baseline,
      platformSnapshot: { id: "w1", name: "Platform v2" },
      platformRevision: 2,
      baselineFingerprint,
      baselineRevision: 1,
    });
    assert.equal(result.state, "platform-newer");
  }, { operation: "workspace.get", entityId: "w1" });

  await runP6Case("stale platform revision is never treated as clean", () => {
    const result = reconcileSnapshots({
      localSnapshot: baseline,
      platformSnapshot: baseline,
      platformRevision: 0,
      baselineFingerprint,
      baselineRevision: 1,
    });
    assert.equal(result.state, "stale-platform");
  }, { operation: "workspace.get", entityId: "w1" });

  await runP6Case("entity read rejects cross-identity snapshot", () => {
    const response = validateEntityReadResponse({
      ok: true,
      data: { entity_id: "other", revision: 2, entity: { id: "other", name: "Wrong" } },
      trace_id: "trace-revision-id",
    }, "w1");
    assert.equal(response.ok, false);
    assert.equal(response.error?.code, "ENTITY_READ_IDENTITY_MISMATCH");
  }, { operation: "workspace.get", entityId: "w1", traceId: "trace-revision-id" });

  const equalRevision = 3;

  await runP6Case("W7-01 equal local/server revision is clean when snapshots match", () => {
    const result = reconcileSnapshots({
      localSnapshot: baseline,
      platformSnapshot: baseline,
      platformRevision: equalRevision,
      baselineFingerprint,
      baselineRevision: equalRevision,
    });
    assert.equal(result.state, "clean");
    assertP6FaultMatrixRecord({
      operation: "workspace.get",
      expectedState: "clean",
      actualState: result.state,
      errorCode: null,
      retryable: null,
      requestId: "w7-01-equal-clean",
      idempotencyKey: null,
      traceId: null,
      sideEffectCount: 0,
      finalRevision: result.platformRevision,
      finalConsistency: "local-platform-baseline-match",
    });
  }, { operation: "workspace.get", entityId: "w1" });

  await runP6Case("W7-01 equal revision preserves local-newer fingerprint state", () => {
    const result = reconcileSnapshots({
      localSnapshot: { id: "w1", name: "Local edit" },
      platformSnapshot: baseline,
      platformRevision: equalRevision,
      baselineFingerprint,
      baselineRevision: equalRevision,
    });
    assert.equal(result.state, "local-newer");
    assertP6FaultMatrixRecord({
      operation: "workspace.get",
      expectedState: "local-newer",
      actualState: result.state,
      errorCode: null,
      retryable: null,
      requestId: "w7-01-equal-local-newer",
      idempotencyKey: null,
      traceId: null,
      sideEffectCount: 0,
      finalRevision: result.platformRevision,
      finalConsistency: "local-change-preserved",
    });
  }, { operation: "workspace.get", entityId: "w1" });

  await runP6Case("W7-01 equal revision preserves platform fingerprint drift", () => {
    const result = reconcileSnapshots({
      localSnapshot: baseline,
      platformSnapshot: { id: "w1", name: "Platform drift" },
      platformRevision: equalRevision,
      baselineFingerprint,
      baselineRevision: equalRevision,
    });
    assert.equal(result.state, "platform-newer");
    assertP6FaultMatrixRecord({
      operation: "workspace.get",
      expectedState: "platform-newer",
      actualState: result.state,
      errorCode: null,
      retryable: null,
      requestId: "w7-01-equal-platform-drift",
      idempotencyKey: null,
      traceId: null,
      sideEffectCount: 0,
      finalRevision: result.platformRevision,
      finalConsistency: "platform-drift-visible",
    });
  }, { operation: "workspace.get", entityId: "w1" });

  await runP6Case("W7-01 equal revision preserves conflict when both snapshots changed", () => {
    const result = reconcileSnapshots({
      localSnapshot: { id: "w1", name: "Local edit" },
      platformSnapshot: { id: "w1", name: "Platform edit" },
      platformRevision: equalRevision,
      baselineFingerprint,
      baselineRevision: equalRevision,
    });
    assert.equal(result.state, "conflict");
    assertP6FaultMatrixRecord({
      operation: "workspace.get",
      expectedState: "conflict",
      actualState: result.state,
      errorCode: null,
      retryable: null,
      requestId: "w7-01-equal-conflict",
      idempotencyKey: null,
      traceId: null,
      sideEffectCount: 0,
      finalRevision: result.platformRevision,
      finalConsistency: "manual-reconcile-required",
    });
  }, { operation: "workspace.get", entityId: "w1" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
