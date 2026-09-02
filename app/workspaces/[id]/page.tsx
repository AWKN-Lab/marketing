import { notFound } from "next/navigation";
import Link from "next/link";
import { getWorkspace } from "@/lib/mock-data";
import { EvidenceDrawer } from "@/components/evidence-drawer";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = getWorkspace(id);
  if (!workspace) notFound();

  return (
    <main className="page stack-lg">
      <header className="page-header">
        <div><p className="eyebrow">WORKSPACE / {workspace.type}</p><h1>{workspace.name}</h1><p className="muted">{workspace.goal}</p></div>
        <Link className="button primary" href={`/tasks/${workspace.activeTaskId}`}>继续当前任务</Link>
      </header>

      <section className="summary-strip">
        <div><span className="label">目标</span><strong>{workspace.successCriteria}</strong></div>
        <div><span className="label">状态</span><strong>{workspace.status}</strong></div>
        <div><span className="label">最近更新</span><strong>{workspace.updatedAt}</strong></div>
      </section>

      <section className="two-col">
        <div className="panel stack-md">
          <div className="section-title"><div><p className="eyebrow">CONTEXT</p><h2>当前上下文</h2></div><EvidenceDrawer compact /></div>
          {workspace.context.map((item) => <article className="context-item" key={item.title}><span className="dot"/><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}
        </div>
        <div className="panel stack-md">
          <div className="section-title"><div><p className="eyebrow">MATERIALS</p><h2>资料投喂</h2></div><button className="button ghost">上传资料</button></div>
          <div className="dropzone"><strong>拖入 PDF / PPT / 文档 / 链接 / 会议记录</strong><span>进入 Workspace 后保留来源、时间和归属。</span></div>
          {workspace.materials.map((material) => <div className="material-row" key={material.title}><div><strong>{material.title}</strong><p className="muted small">{material.kind} · {material.source}</p></div><span className="status-ok">已理解</span></div>)}
        </div>
      </section>

      <section className="panel stack-md">
        <div className="section-title"><div><p className="eyebrow">TASKS</p><h2>最近任务</h2></div><button className="button secondary">新任务</button></div>
        {workspace.tasks.map((task) => <Link href={`/tasks/${task.id}`} className="task-row" key={task.id}><div><strong>{task.title}</strong><p className="muted small">{task.type} · {task.status}</p></div><span>→</span></Link>)}
      </section>
    </main>
  );
}
