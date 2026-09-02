"use client";

import Link from "next/link";
import { TaskWorkbench } from "@/components/task-workbench";
import type { MarketingTask } from "@/lib/types";
import { LOCAL_TASKS_KEY } from "@/lib/task-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function LocalTaskPage({ taskId }: { taskId: string }) {
  const [tasks, , hydrated] = usePersistedState<MarketingTask[]>(LOCAL_TASKS_KEY, []);
  if (!hydrated) return <main className="page"><div className="panel"><p className="muted">正在读取任务…</p></div></main>;
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return <main className="page"><div className="panel stack-md"><h1>Task 未找到</h1><p className="muted">这条本地任务可能已被清理。</p><Link className="button secondary" href="/workspaces">返回 Workspace</Link></div></main>;
  return <TaskWorkbench task={task} />;
}
