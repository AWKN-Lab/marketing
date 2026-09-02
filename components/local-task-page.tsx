"use client";

import Link from "next/link";
import { EntityReconcilePanel } from "@/components/entity-reconcile-panel";
import { TaskWorkbench } from "@/components/task-workbench";
import type { MarketingTask } from "@/lib/types";
import { LOCAL_TASKS_KEY } from "@/lib/task-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function LocalTaskPage({ taskId }: { taskId: string }) {
  const [tasks, setTasks, hydrated] = usePersistedState<MarketingTask[]>(LOCAL_TASKS_KEY, []);
  if (!hydrated) return <main className="page"><div className="panel"><p className="muted">正在读取任务…</p></div></main>;
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return <main className="page"><div className="panel stack-md"><h1>Task 未找到</h1><p className="muted">这条本地任务可能已被清理。</p><Link className="button secondary" href="/workspaces">返回 Workspace</Link></div></main>;
  const reconcilePanel = <EntityReconcilePanel<MarketingTask> entityLabel="Task" entityKey={`task:${task.id}`} entityId={task.id} workspaceId={task.workspaceId} taskId={task.id} getOperation="task.get" updateOperation="task.update" localEntity={task} buildUpdatePayload={(entity, baseRevision) => ({ task: entity, base_revision: baseRevision })} onApplyPlatform={(remote) => setTasks((current) => current.map((item) => item.id === task.id ? { ...remote, id: item.id } : item))} />;
  return <TaskWorkbench task={task} reconcilePanel={reconcilePanel} />;
}
