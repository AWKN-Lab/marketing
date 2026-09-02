export type LearningSignal = {
  id: string;
  workspaceId: string;
  watchId: string;
  title: string;
  summary: string;
  whyItMatters: string;
  action?: string;
  source: string;
  time?: string;
};

export type LearningRun = {
  runId: string;
  workspaceId: string;
  watchId: string;
  status: "queued" | "running" | "completed" | "failed";
  signals: LearningSignal[];
  traceId?: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
};

export const LEARNING_RUNS_KEY = "marketing:learning:runs";

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function statusValue(value: unknown): LearningRun["status"] {
  const status = str(value).toLowerCase();
  if (status === "completed" || status === "done" || status === "success") return "completed";
  if (status === "failed" || status === "error") return "failed";
  if (status === "running" || status === "in_progress") return "running";
  return "queued";
}

export function shouldPollLearningRun(run: LearningRun) {
  return run.status === "queued" || run.status === "running";
}

export function mergeLearningRun(previous: LearningRun, next: LearningRun): LearningRun {
  if (previous.runId !== next.runId) return next;
  return {
    ...previous,
    ...next,
    signals: next.signals.length ? next.signals : previous.signals,
    traceId: next.traceId ?? previous.traceId,
    startedAt: previous.startedAt || next.startedAt,
    finishedAt: next.finishedAt ?? previous.finishedAt,
    error: next.error,
  };
}

export function normalizeLearningRun(input: {
  data: unknown;
  workspaceId: string;
  watchId: string;
  traceId?: string;
  startedAt?: string;
}): LearningRun | null {
  if (!input.data || typeof input.data !== "object") return null;
  const row = input.data as Record<string, unknown>;
  const runId = str(row.run_id ?? row.runId);
  if (!runId) return null;

  const signals = Array.isArray(row.signals)
    ? row.signals.flatMap((item, index): LearningSignal[] => {
        if (!item || typeof item !== "object") return [];
        const signal = item as Record<string, unknown>;
        const title = str(signal.title);
        const summary = str(signal.summary ?? signal.impact ?? signal.content);
        const source = str(signal.source ?? signal.url);
        if (!title || !summary || !source) return [];
        return [{
          id: str(signal.id) || `${runId}-signal-${index}`,
          workspaceId: input.workspaceId,
          watchId: input.watchId,
          title,
          summary,
          whyItMatters: str(signal.why_it_matters ?? signal.whyItMatters) || summary,
          action: str(signal.action ?? signal.next_action) || undefined,
          source,
          time: str(signal.time ?? signal.occurred_at ?? signal.published_at) || undefined,
        }];
      })
    : [];

  return {
    runId,
    workspaceId: input.workspaceId,
    watchId: input.watchId,
    status: statusValue(row.status),
    signals,
    traceId: str(row.trace_id ?? row.traceId) || input.traceId,
    startedAt: str(row.started_at ?? row.startedAt) || input.startedAt || new Date().toISOString(),
    finishedAt: str(row.finished_at ?? row.finishedAt) || undefined,
    error: str(row.error) || undefined,
  };
}
