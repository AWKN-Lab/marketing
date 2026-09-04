import assert from "node:assert/strict";
import { reconcileSnapshots, snapshotFingerprint, validateEntityReadResponse } from "../lib/reconcile.ts";
import { runP6Case } from "./p6-test-support.ts";

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
