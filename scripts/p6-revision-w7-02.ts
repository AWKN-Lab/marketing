import assert from "node:assert/strict";
import { reconcileSnapshots, snapshotFingerprint } from "../lib/reconcile.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

async function main() {
  const baseline = { id: "w1", name: "Same content" };
  const baselineFingerprint = snapshotFingerprint(baseline);

  await runP6Case("W7-02 higher server revision alone is enough to mark platform-newer", () => {
    const result = reconcileSnapshots({
      localSnapshot: baseline,
      platformSnapshot: baseline,
      platformRevision: 4,
      baselineFingerprint,
      baselineRevision: 3,
    });

    assert.equal(result.state, "platform-newer");
    assert.equal(result.localFingerprint, baselineFingerprint);
    assert.equal(result.platformFingerprint, baselineFingerprint);
    assert.equal(result.platformRevision, 4);

    assertP6FaultMatrixRecord({
      operation: "workspace.get",
      expectedState: "platform-newer",
      actualState: result.state,
      errorCode: null,
      retryable: null,
      requestId: "w7-02-revision-only-platform-newer",
      idempotencyKey: null,
      traceId: "trace-w7-02-revision-only",
      sideEffectCount: 0,
      finalRevision: result.platformRevision,
      finalConsistency: "higher-server-revision-is-visible-even-when-content-matches",
    });
  }, { operation: "workspace.get", entityId: "w1", traceId: "trace-w7-02-revision-only" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
