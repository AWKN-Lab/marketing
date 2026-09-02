import { notFound } from "next/navigation";
import Link from "next/link";
import { getWorkspace } from "@/lib/mock-data";
import { EvidenceDrawer } from "@/components/evidence-drawer";
import { LocalWorkspacePage } from "@/components/local-workspace-page";
import { MaterialFeed } from "@/components/material-feed";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id.startsWith("local-")) return <LocalWorkspacePage workspaceId={id} />;
  const workspace = getWorkspace(id);
  if (!workspace) notFound();

  return (
    <main className="page stack-lg">
      <header className="page-header"><div><p className="eyebrow">WORKSPACE / {workspace.type}</p><h1>{workspace.name}</h1><p className="muted">{workspace.goal}</p></div><Link className="button primary" href={`/tasks/${workspace.activeTaskId}`}>继续当前任务</Link></header>
      <section className="summary-strip"><div><span className="label">目标</span><strong>{workspace.successCriteria}</strong></div><div><span className="label">状态</span><strong>{workspace.status}</strong></div><div><span className="label">最近更新</span><strong>{workspace.updatedAt}</strong></div></section>
      <section className="two-col">
        <div className="panel stack-md"><div className="section-title"><div><p className="eyebrow">CONTEXT</p><h2>当前上下文</h2></div><EvidenceDrawer compact /></div>{workspace.context.map((item) => <article className="context-item" key={item.title}><span className="dot"/><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}</div>
        <div className="panel stack-md"><div className="section-title"><div><p className="eyebrow">MATERIALS</p><h2>资料投喂</h2></div></div><MaterialFeed workspaceId={workspace.id} initialMaterials={workspace.materials}/></div>
      </section>
      <section className="panel stack-md"><div className="section-title"><div><p className="eyebrow">TASKS</p><h2>最近任务</h2></div><button className="button secondary">新任务</button></div>{workspace.tasks.map((task) => <Link href={`/tasks/${task.id}`} className="task-row" key={task.id}><div><strong>{task.title}</strong><p className="muted small">{task.type} · {task.status}</p></div><span>→</span></Link>)}</section>
    </main>
  );
}
