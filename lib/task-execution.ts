export type TaskExecutionState = {
  id: string;
  taskId: string;
  workspaceId: string;
  artifactTitle: string;
  finalText: string;
  feedback: string | null;
  outcome: string | null;
  outcomeNote: string;
};

export function taskExecutionId(taskId: string) {
  return `task-execution:${taskId}`;
}

export function buildTaskExecutionState(input: Omit<TaskExecutionState, "id">): TaskExecutionState {
  return { id: taskExecutionId(input.taskId), ...input };
}
