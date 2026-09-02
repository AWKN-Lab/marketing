"use client";

import Link from "next/link";
import { NewTaskButton } from "@/components/new-task-button";
import type { MarketingTask } from "@/lib/types";
import { LOCAL_TASKS_KEY } from "@/lib/task-store";
import { usePersistedState } from "@/lib/use-persisted-state";

type BaseTask = { id: string; title: string; type: string; status: string };

export function WorkspaceTaskList({ workspaceId, workspaceName, baseTasks = [] }: { workspaceId: string; workspaceName: string; baseTasks?: BaseTask[] }) {
  const [localTasks] = usePersistedState<MarketingTask[]>(LOCAL_TASKS_KEY, []);
  const scoped = localTasks.filter((task) => task.workspaceId === workspaceId);
  const tasks = [...scoped, ...baseTasks];

  return <section className="panel stack-md">
    <div className="section-title"><div><p className="eyebrow">TASKS</p><h2>任务</h2></div><NewTaskButton workspaceId={workspaceId} workspaceName={workspaceName}/></div>
    {!tasks.length && <div className="empty-list"><strong>还没有任务</strong><p>先从一个真实问题开始，系统才有机会形成 Feedback、Outcome 和 Experience。</p></div>}
    {tasks.map((task) => <Link href={`/tasks/${task.id}`} className="task-row" key={task.id}><div><strong>{task.title}</strong><p className="muted small">{task.type} · {task.status}</p></div><span>→</span></Link>)}
  </section>;
}
