"use client";

import { useEffect, useMemo, useRef } from "react";
import { getLearningRun } from "@/lib/learning-run-client";
import { LEARNING_RUNS_KEY, mergeLearningRun, normalizeLearningRun, shouldPollLearningRun, type LearningRun } from "@/lib/learning-run-store";
import { usePersistedState } from "@/lib/use-persisted-state";

const POLL_MS = 10_000;

export function LearningRunPoller() {
  const [runs, setRuns, hydrated] = usePersistedState<LearningRun[]>(LEARNING_RUNS_KEY, []);
  const polling = useRef(false);
  const pendingKey = useMemo(() => runs.filter(shouldPollLearningRun).map((run) => run.runId).sort().join("|"), [runs]);

  useEffect(() => {
    if (!hydrated || !pendingKey) return;
    let cancelled = false;
    const refresh = async () => {
      if (polling.current || cancelled) return;
      polling.current = true;
      try {
        const pending = runs.filter(shouldPollLearningRun);
        const updates = await Promise.all(pending.map(async (run) => {
          const response = await getLearningRun({ workspaceId: run.workspaceId, watchId: run.watchId, runId: run.runId });
          if (!response.ok) return null;
          return normalizeLearningRun({ data: response.data, workspaceId: run.workspaceId, watchId: run.watchId, traceId: response.trace_id, startedAt: run.startedAt });
        }));
        if (cancelled) return;
        const valid = updates.filter((run): run is LearningRun => Boolean(run));
        if (!valid.length) return;
        setRuns((current) => current.map((run) => {
          const next = valid.find((item) => item.runId === run.runId);
          return next ? mergeLearningRun(run, next) : run;
        }));
      } finally {
        polling.current = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [hydrated, pendingKey]);

  return null;
}
