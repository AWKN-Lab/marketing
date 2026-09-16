export const TASK_EXECUTION_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export type TaskExecutionStatus = (typeof TASK_EXECUTION_STATUSES)[number];

export type TaskExecutionState = {
  id: string;
  taskId: string;
  workspaceId: string;
  status: TaskExecutionStatus;
  attempt: number;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
  retryable?: boolean;
  artifactTitle: string;
  finalText: string;
  feedback: string | null;
  outcome: string | null;
  outcomeNote: string;
};

type TaskExecutionInput = Omit<TaskExecutionState, "id" | "status" | "attempt"> & {
  status?: TaskExecutionStatus;
  attempt?: number;
};

export type TaskExecutionEditableProjection = Pick<
  TaskExecutionState,
  "artifactTitle" | "finalText" | "feedback" | "outcome" | "outcomeNote"
>;

export function isTaskExecutionStatus(value: unknown): value is TaskExecutionStatus {
  return typeof value === "string" && (TASK_EXECUTION_STATUSES as readonly string[]).includes(value);
}

export function taskExecutionId(taskId: string) {
  return `task-execution:${taskId}`;
}

export function buildTaskExecutionState(input: TaskExecutionInput): TaskExecutionState {
  const { status, attempt, ...rest } = input;
  return {
    id: taskExecutionId(input.taskId),
    ...rest,
    status: status ?? "succeeded",
    attempt: attempt ?? 1,
  };
}

export function mergeTaskExecutionEditableProjection(
  previous: TaskExecutionState,
  editable: TaskExecutionEditableProjection,
): TaskExecutionState {
  return {
    ...previous,
    ...editable,
    id: taskExecutionId(previous.taskId),
  };
}

export function nextTaskExecutionAttempt(previous: TaskExecutionState): TaskExecutionState {
  return {
    ...previous,
    id: taskExecutionId(previous.taskId),
    status: "queued",
    attempt: previous.attempt + 1,
    startedAt: undefined,
    finishedAt: undefined,
    errorCode: undefined,
    retryable: undefined,
  };
}

export function queueLatestTaskExecution(_queued: TaskExecutionState | null, next: TaskExecutionState) {
  return next;
}
