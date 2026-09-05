import assert from "node:assert/strict";
import {
  buildTaskExecutionState,
  mergeTaskExecutionEditableProjection,
} from "../lib/task-execution.ts";
import { runP6Case } from "./p6-test-support.ts";

async function main() {
  await runP6Case("artifact edits preserve accepted execution lifecycle fields", () => {
    const remote = buildTaskExecutionState({
      taskId: "task-lifecycle",
      workspaceId: "workspace-lifecycle",
      status: "running",
      attempt: 3,
      startedAt: "2026-09-05T04:20:00.000Z",
      artifactTitle: "Remote artifact",
      finalText: "remote text",
      feedback: null,
      outcome: null,
      outcomeNote: "",
    });

    const edited = mergeTaskExecutionEditableProjection(remote, {
      artifactTitle: "Remote artifact",
      finalText: "user edit",
      feedback: "修改后采用",
      outcome: null,
      outcomeNote: "",
    });

    assert.equal(edited.id, remote.id);
    assert.equal(edited.taskId, remote.taskId);
    assert.equal(edited.workspaceId, remote.workspaceId);
    assert.equal(edited.status, "running");
    assert.equal(edited.attempt, 3);
    assert.equal(edited.startedAt, "2026-09-05T04:20:00.000Z");
    assert.equal(edited.finishedAt, undefined);
    assert.equal(edited.finalText, "user edit");
    assert.equal(edited.feedback, "修改后采用");
  }, { operation: "task.execution.upsert", entityId: "task-execution:task-lifecycle" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
