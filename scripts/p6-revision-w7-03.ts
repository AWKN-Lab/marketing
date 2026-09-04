import assert from "node:assert/strict";
import { reconcileResolutionPolicy, reconcileSnapshots, snapshotFingerprint } from "../lib/reconcile.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

async function main() {
  const baseline = { id: "w1", name: "Baseline r4" };
  const baselineFingerprint = snapshotFingerprint(baseline);
  const baselineRevision = 4;
  const stalePlatformRevision = 3;

  await runP6Case("W7-03 lower server revision is a stale-platform anomaly even when content matches", () => {
    const result = reconcileSnapshots({
      localSnapshot: baseline,
      platformSnapshot: baseline,
      platformRevision: stalePlatformRevision,
      baselineFingerprint,
      baselineRevision,
    });
    const policy = reconcileResolutionPolicy(result);

    assert.equal(result.state, "stale-platform");
    assert.equal(result.baselineRevision, baselineRevision);
    assert.equal(result.platformRevision, stalePlatformRevision);
    assert.equal(policy.canAcceptPlatform, false);
    assert.equal(policy.canKeepLocalAndWrite, false);
    assert.equal(policy.errorCode, "INVALID_REVISION");

    assertP6FaultMatrixRecord({
      operation: "workspace.get",
      expectedState: "stale-platform",
      actualState: result.state,
      errorCode: policy.errorCode,
      retryable: false,
      requestId: "w7-03-stale-platform-same-content",
      idempotencyKey: null,
      traceId: "trace-w7-03-stale-same",
      sideEffectCount: 0,
      finalRevision: result.baselineRevision ?? null,
      finalConsistency: "known-baseline-revision-preserved",
    });
  }, { operation: "workspace.get", entityId: "w1", traceId: "trace-w7-03-stale-same" });

  await runP6Case("W7-03 lower server revision stays stale even when stale content differs", () => {
    const result = reconcileSnapshots({
      localSnapshot: baseline,
      platformSnapshot: { id: "w1", name: "Stale server snapshot" },
      platformRevision: stalePlatformRevision,
      baselineFingerprint,
      baselineRevision,
    });
    const policy = reconcileResolutionPolicy(result);

    assert.equal(result.state, "stale-platform");
    assert.equal(policy.canAcceptPlatform, false);
    assert.equal(policy.canKeepLocalAndWrite, false);
    assert.equal(policy.errorCode, "INVALID_REVISION");

    assertP6FaultMatrixRecord({
      operation: "workspace.get",
      expectedState: "stale-platform",
      actualState: result.state,
      errorCode: policy.errorCode,
      retryable: false,
      requestId: "w7-03-stale-platform-different-content",
      idempotencyKey: null,
      traceId: "trace-w7-03-stale-different",
      sideEffectCount: 0,
      finalRevision: result.baselineRevision ?? null,
      finalConsistency: "stale-platform-content-cannot-be-accepted-or-written",
    });
  }, { operation: "workspace.get", entityId: "w1", traceId: "trace-w7-03-stale-different" });

  await runP6Case("W7-03 current or newer server revisions retain normal resolution paths", () => {
    const result = reconcileSnapshots({
      localSnapshot: { id: "w1", name: "Local edit" },
      platformSnapshot: baseline,
      platformRevision: baselineRevision,
      baselineFingerprint,
      baselineRevision,
    });
    const policy = reconcileResolutionPolicy(result);

    assert.equal(result.state, "local-newer");
    assert.equal(policy.canAcceptPlatform, true);
    assert.equal(policy.canKeepLocalAndWrite, true);
    assert.equal(policy.errorCode, null);
  }, { operation: "workspace.get", entityId: "w1" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
