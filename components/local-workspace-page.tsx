"use client";

import Link from "next/link";
import { LearningWatchPanel } from "@/components/learning-watch";
import { MaterialFeed } from "@/components/material-feed";
import { NewTaskButton } from "@/components/new-task-button";
import { WorkspaceTaskList } from "@/components/workspace-task-list";
import { LOCAL_WORKSPACES_KEY, type LocalWorkspace } from "@/lib/workspace-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function LocalWorkspacePage({ workspaceId }: { workspaceId: string }) {
  const [workspaces, , hydrated] = usePersistedState<LocalWorkspace[]>(LOCAL_WORKSPACES_KEY, []);
  if (!hydrated) return <main className="page"><div className="panel"><p className="muted">正在读取 Workspace…</p></div></main>;
  const workspace = workspaces.find((item) => item.id === workspaceId);
  if (!workspace) return <main className="page"><div className="panel stack-md"><h1>Workspace 未找到</h1><Link className="button secondary" href="/workspaces">返回列表</Link></div></main>;

  return <main className="page stack-lg">
    <header className="page-header"><div><p className="eyebrow">WORKSPACE / {workspace.type}</p><h1>{workspace.name}</h1><p className="muted">{workspace.goal}</p></div><NewTaskButton workspaceId={workspace.id} workspaceName={workspace.name} label="开始新任务" /></header>
    <section className="summary-strip"><div><span className="label">成功标准</span><strong>{workspace.successCriteria}</strong></div><div><span className="label">状态</span><strong>{workspace.status}</strong></div><div><span className="label">最近更新</span><strong>{workspace.updatedAt}</strong></div></section>
    <section className="two-col"><div className="panel stack-md"><div className="section-title"><div><p className="eyebrow">START HERE</p><h2>当前工作状态</h2></div></div><div className="empty-steps"><span>01 目标已建立 ✓</span><span>02 持续补充资料与新变化</span><span>03 用真实任务产生 Feedback 与 Outcome</span></div></div><div className="panel stack-md"><div className="section-title"><div><p className="eyebrow">MATERIALS</p><h2>资料投喂</h2></div></div><MaterialFeed workspaceId={workspace.id}/></div></section>
    <LearningWatchPanel workspaceId={workspace.id} workspaceName={workspace.name}/>
    <WorkspaceTaskList workspaceId={workspace.id} workspaceName={workspace.name}/>
  </main>;
}
