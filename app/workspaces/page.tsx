import Link from "next/link";
import { workspaces } from "@/lib/mock-data";

export default function WorkspacesPage() {
  return (
    <main className="page stack-lg">
      <header className="page-header">
        <div><p className="eyebrow">WORKSPACES</p><h1>工作空间</h1><p className="muted">围绕目标组织资料、任务、产出、判断和结果。</p></div>
        <button className="button primary">新建 Workspace</button>
      </header>
      <section className="workspace-grid">
        {workspaces.map((workspace) => (
          <Link className="workspace-card" href={`/workspaces/${workspace.id}`} key={workspace.id}>
            <div className="row between"><span className="badge">{workspace.type}</span><span className="muted small">{workspace.updatedAt}</span></div>
            <h2>{workspace.name}</h2>
            <p>{workspace.goal}</p>
            <div className="metric-row"><span>任务 {workspace.taskCount}</span><span>资料 {workspace.materialCount}</span><span>经验 {workspace.experienceCount}</span></div>
          </Link>
        ))}
      </section>
    </main>
  );
}
