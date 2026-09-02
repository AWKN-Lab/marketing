import Link from "next/link";
import { todayItems, signals, recentEvolution } from "@/lib/mock-data";

export function TodayDashboard() {
  return (
    <main className="page stack-xl">
      <header className="hero"><div><p className="eyebrow">WED · 02 SEP</p><h1>今天值得推进什么</h1><p className="muted">聚合任务、变化、待确认与最近学会的方法。</p></div><Link className="button primary" href="/tasks/task-001">开始新任务</Link></header>
      <section className="priority-list">
        {todayItems.map((item, index) => <Link className="priority-card" href={item.href} key={item.title}><span className="priority-index">0{index + 1}</span><div className="grow"><p className="eyebrow">{item.workspace}</p><h2>{item.title}</h2><p>{item.reason}</p></div><span className={`priority ${item.level}`}>{item.label}</span></Link>)}
      </section>
      <section className="two-col">
        <div className="panel stack-md"><div className="section-title"><div><p className="eyebrow">SIGNALS</p><h2>新变化</h2></div><span className="count">{signals.length}</span></div>{signals.map(s => <article className="signal-row" key={s.title}><span className="signal-time">{s.time}</span><div><strong>{s.title}</strong><p>{s.impact}</p><small>{s.source}</small></div></article>)}</div>
        <div className="panel evolution-card"><p className="eyebrow">RECENT EVOLUTION</p><h2>最近学会</h2><p className="evolution-quote">“{recentEvolution.lesson}”</p><p>{recentEvolution.evidence}</p><div className="row gap-sm"><Link className="button secondary" href="/evolution">查看依据</Link><button className="button ghost">接受</button></div></div>
      </section>
    </main>
  );
}
