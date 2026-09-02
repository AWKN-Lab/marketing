"use client";

import Link from "next/link";
import { MaterialFeed } from "@/components/material-feed";
import { LOCAL_WORKSPACES_KEY, type LocalWorkspace } from "@/lib/workspace-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function LocalWorkspacePage({ workspaceId }: { workspaceId: string }) {
  const [workspaces] = usePersistedState<LocalWorkspace[]>(LOCAL_WORKSPACES_KEY, []);
  const workspace = workspaces.find((item) => item.id === workspaceId);
  if (!workspace) return <main className="page"><div className="panel"><h1>Workspace 未找到</h1><Link className="button secondary" href="/workspaces">返回列表</Link></div></main>;

  return <main className="page stack-lg">
    <header className="page-header"><div><p className="eyebrow">WORKSPACE / {workspace.type}</p><h1>{workspace.name}</h1><p className="muted">{workspace.goal}</p></div><button className="button primary">开始第一个任务</button></header>
    <section className="summary-strip"><div><span className="label">成功标准</span><strong>{workspace.successCriteria}</strong></div><div><span className="label">状态</span><strong>{workspace.status}</strong></div><div><span className="label">最近更新</span><strong>{workspace.updatedAt}</strong></div></section>
    <section className="two-col">
      <div className="panel stack-md"><div className="section-title"><div><p className="eyebrow">START HERE</p><h2>先让助理理解这个 Workspace</h2></div></div><div className="empty-steps"><span>01 输入目标 ✓</span><span>02 投喂首批资料</span><span>03 开始第一个任务</span></div></div>
      <div className="panel stack-md"><div className="section-title"><div><p className="eyebrow">MATERIALS</p><h2>资料投喂</h2></div></div><MaterialFeed workspaceId={workspace.id}/></div>
    </section>
  </main>;
}
