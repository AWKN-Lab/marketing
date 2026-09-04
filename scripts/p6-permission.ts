import assert from "node:assert/strict";
import { canMarketingAction, canReadWorkspace, filterReadableWorkspaceItems, normalizeMarketingSession } from "../lib/product-session.ts";
import { runP6Case } from "./p6-test-support.ts";

const session = normalizeMarketingSession({
  tenant_id: "tenant-p6",
  actor_id: "actor-p6",
  capabilities: ["workspace.read", "workspace.write", "task.create", "task.run"],
  workspace_grants: [
    { workspace_id: "w-write", access: "write" },
    { workspace_id: "w-read", access: "read" },
  ],
});
assert.ok(session);

await runP6Case("write grant permits task create", () => {
  assert.equal(canMarketingAction(session!, "task.create", "w-write", "write"), true);
}, { operation: "task.create", entityId: "w-write" });

await runP6Case("read grant rejects write side effect", () => {
  assert.equal(canMarketingAction(session!, "task.create", "w-read", "write"), false);
}, { operation: "task.create", entityId: "w-read" });

await runP6Case("revoked workspace is excluded from readable projection", () => {
  assert.equal(canReadWorkspace(session!, "w-revoked"), false);
  const visible = filterReadableWorkspaceItems(session!, [
    { workspaceId: "w-write" },
    { workspaceId: "w-revoked" },
  ], (item) => item.workspaceId);
  assert.deepEqual(visible, [{ workspaceId: "w-write" }]);
}, { entityId: "w-revoked" });
