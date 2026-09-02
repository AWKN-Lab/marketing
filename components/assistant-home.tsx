"use client";

import Link from "next/link";
import { NewTaskButton } from "@/components/new-task-button";
import { LOCAL_TASKS_KEY } from "@/lib/task-store";
import type { MarketingTask } from "@/lib/types";
import { usePersistedState } from "@/lib/use-persisted-state";
import { LOCAL_WORKSPACES_KEY, type LocalWorkspace } from "@/lib/workspace-store";

export function AssistantHome() {
  const [tasks] = usePersistedState<MarketingTask[]>(LOCAL_TASKS_KEY, []);
  const [workspaces] = usePersistedState<LocalWorkspace[]>(LOCAL_WORKSPACES_KEY, []);
  const recentTasks = tasks.slice(0, 6);

  return <main className="page stack-xl">
    <header className="hero"><div><p className="eyebrow">MARKETING ASSISTANT</p><h1>直接开始一件营销任务</h1><p className="muted">从 Workspace 上下文出发；有已审核经验时自动匹配并明确展示。</p></div></header>

    {workspaces.length === 0 ? <section className="panel assistant-empty"><strong>先建立一个真实 Workspace</strong><p className="muted">给出目标、喂入资料，再从这里开始任务。Demo Task 不再作为营销助理默认入口。</p><Link href="/workspaces" className="button primary">创建 Workspace</Link></section> : <section className="stack-md"><div className="section-title"><div><p className="eyebrow">START FROM WORKSPACE</p><h2>选择上下文开始任务</h2></div></div><div className="workspace-grid">{workspaces.map((workspace) => <article className="workspace-card assistant-workspace" key={workspace.id}><span className="badge">{workspace.type}</span><h2>{workspace.name}</h2><p>{workspace.goal}</p><div className="row gap-sm wrap"><NewTaskButton workspaceId={workspace.id} workspaceName={workspace.name} label="开始新任务"/><Link className="button ghost" href={`/workspaces/${workspace.id}`}>查看 Workspace</Link></div></article>)}</div></section>}

    <section className="stack-md"><div className="section-title"><div><p className="eyebrow">RECENT TASKS</p><h2>继续最近任务</h2></div><span className="count">{recentTasks.length}</span></div>{recentTasks.length ? <div className="priority-list">{recentTasks.map((task) => <Link className="priority-card" href={`/tasks/${task.id}`} key={task.id}><span className="priority-index">{task.type}</span><div className="grow"><h2>{task.title}</h2><p>{task.goal}</p><small className="muted">{task.workspaceName} · 已应用经验 {task.appliedExperiences.length} 条</small></div><span>→</span></Link>)}</div> : <div className="panel"><p className="muted">还没有真实 Task。创建第一个 Workspace 后开始。</p></div>}</section>
  </main>;
}
