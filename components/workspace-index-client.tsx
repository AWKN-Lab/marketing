"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { syncMarketingProduct } from "@/lib/sync-store";
import { usePersistedState } from "@/lib/use-persisted-state";
import { createLocalWorkspace, LOCAL_WORKSPACES_KEY, type LocalWorkspace } from "@/lib/workspace-store";

type WorkspaceCard = LocalWorkspace & { isDemo?: boolean };

export function WorkspaceIndexClient({ baseWorkspaces }: { baseWorkspaces: WorkspaceCard[] }) {
  const router = useRouter();
  const [localWorkspaces, setLocalWorkspaces] = usePersistedState<LocalWorkspace[]>(LOCAL_WORKSPACES_KEY, []);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("营销项目");
  const [goal, setGoal] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const all: WorkspaceCard[] = [...localWorkspaces.map((workspace) => ({ ...workspace, isDemo: false })), ...baseWorkspaces];

  function submit() {
    if (!name.trim() || !goal.trim()) return;
    const workspace = createLocalWorkspace({ name: name.trim(), type, goal: goal.trim(), successCriteria: successCriteria.trim() || "完成第一个可验证业务动作" });
    setLocalWorkspaces([workspace, ...localWorkspaces]);
    void syncMarketingProduct({ entityKey: `workspace:${workspace.id}`, operation: "workspace.create", workspaceId: workspace.id, payload: { workspace } });
    router.push(`/workspaces/${workspace.id}`);
  }

  return <main className="page stack-lg">
    <header className="page-header"><div><p className="eyebrow">WORKSPACES</p><h1>工作空间</h1><p className="muted">真实 Workspace 优先显示；内置 Demo 只用于首次理解产品。</p></div><button className="button primary" onClick={() => setCreating((value) => !value)}>{creating ? "收起" : "新建 Workspace"}</button></header>
    {creating && <section className="create-workspace panel stack-md"><div className="section-title"><div><p className="eyebrow">NEW WORKSPACE</p><h2>三步开始</h2></div><span className="muted small">名称 → 目标 → 成功标准</span></div><div className="form-grid"><label><span>名称</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：厦门文旅 Q4 项目" /></label><label><span>类型</span><select value={type} onChange={(e) => setType(e.target.value)}><option>营销项目</option><option>政企项目</option><option>品牌</option><option>长期课题</option><option>关系经营</option></select></label><label className="span-2"><span>当前目标</span><textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="这段时间最需要推动什么结果？" /></label><label className="span-2"><span>成功标准</span><input value={successCriteria} onChange={(e) => setSuccessCriteria(e.target.value)} placeholder="例如：确认下一轮正式汇报时间和参与人" /></label></div><div className="row gap-sm"><button className="button primary" onClick={submit} disabled={!name.trim() || !goal.trim()}>创建并投喂资料</button><button className="button ghost" onClick={() => setCreating(false)}>取消</button></div></section>}
    <section className="workspace-grid">{all.map((workspace) => <Link className={`workspace-card ${workspace.isDemo ? "demo-card" : ""}`} href={`/workspaces/${workspace.id}`} key={workspace.id}><div className="row between"><span className={`badge ${workspace.isDemo ? "demo-badge" : ""}`}>{workspace.isDemo ? `DEMO · ${workspace.type}` : workspace.type}</span>{workspace.isDemo ? <span className="muted small">{workspace.updatedAt}</span> : <SyncStatusBadge entityKey={`workspace:${workspace.id}`} />}</div><h2>{workspace.name}</h2><p>{workspace.goal}</p><div className="metric-row"><span>任务 {workspace.taskCount}</span><span>资料 {workspace.materialCount}</span><span>经验 {workspace.experienceCount}</span></div></Link>)}</section>
  </main>;
}
