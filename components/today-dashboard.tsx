"use client";

import Link from "next/link";
import { EVOLUTION_REVIEWS_KEY, LOCAL_CANDIDATES_KEY, type LocalEvolutionCandidate } from "@/lib/evolution-store";
import { LEARNING_WATCHES_KEY, type LearningWatch } from "@/lib/learning-store";
import { LEARNING_RUNS_KEY, type LearningRun } from "@/lib/learning-run-store";
import { recentEvolution, signals, todayItems } from "@/lib/mock-data";
import { LOCAL_TASKS_KEY } from "@/lib/task-store";
import type { MarketingTask } from "@/lib/types";
import { usePersistedState } from "@/lib/use-persisted-state";
import { LOCAL_WORKSPACES_KEY, type LocalWorkspace } from "@/lib/workspace-store";

export function TodayDashboard() {
  const [localTasks] = usePersistedState<MarketingTask[]>(LOCAL_TASKS_KEY, []);
  const [localWorkspaces] = usePersistedState<LocalWorkspace[]>(LOCAL_WORKSPACES_KEY, []);
  const [localCandidates] = usePersistedState<LocalEvolutionCandidate[]>(LOCAL_CANDIDATES_KEY, []);
  const [reviews] = usePersistedState<Record<string,string>>(EVOLUTION_REVIEWS_KEY, {});
  const [watches] = usePersistedState<LearningWatch[]>(LEARNING_WATCHES_KEY, []);
  const [learningRuns] = usePersistedState<LearningRun[]>(LEARNING_RUNS_KEY, []);
  const enabledWatches = watches.filter((watch) => watch.enabled);
  const pendingCandidates = localCandidates.filter((candidate) => !reviews[candidate.id]);
  const latestAccepted = localCandidates.find((candidate) => reviews[candidate.id] === "accepted" || reviews[candidate.id] === "scoped");
  const localPriorities = localTasks.slice(0, 5).map((task) => ({ workspace: task.workspaceName, title: task.title, reason: `目标：${task.goal}`, level: "high", label: "继续任务", href: `/tasks/${task.id}` }));
  const priorities = localPriorities.length ? localPriorities : todayItems.map((item) => ({ ...item, label: `DEMO · ${item.label}` }));
  const realSignals = learningRuns.flatMap((run) => run.signals.map((signal) => ({ ...signal, runId: run.runId, status: run.status, traceId: run.traceId }))).slice(0, 12);
  const hasRealLearningRuns = learningRuns.length > 0;

  return <main className="page stack-xl">
    <header className="hero"><div><p className="eyebrow">TODAY</p><h1>今天值得推进什么</h1><p className="muted">真实 Workspace、任务、待审核经验与学习结果会回流到这里。</p></div><Link className="button primary" href="/workspaces">进入 Workspace</Link></header>
    <section className="today-stats"><div><span className="label">本地 Workspace</span><strong>{localWorkspaces.length}</strong></div><div><span className="label">已创建任务</span><strong>{localTasks.length}</strong></div><div><span className="label">待审核经验</span><strong>{pendingCandidates.length}</strong></div></section>
    {pendingCandidates.length > 0 && <Link className="attention-card" href="/evolution"><span className="pulse"/><div><strong>{pendingCandidates.length} 条经验等待你确认</strong><p>确认以后，后续新任务才会真正应用这些方法。</p></div><span>→</span></Link>}
    {!localPriorities.length && <div className="demo-notice"><strong>下面的“今日重点”是 Demo</strong><p>创建第一条真实任务后，这些示例会退出，Today 只展示你的本地任务。</p></div>}
    <section className="priority-list">{priorities.map((item, index) => <Link className={`priority-card ${localPriorities.length ? "" : "demo-card"}`} href={item.href} key={`${item.href}-${index}`}><span className="priority-index">0{index + 1}</span><div className="grow"><p className="eyebrow">{item.workspace}</p><h2>{item.title}</h2><p>{item.reason}</p></div><span className={`priority ${item.level}`}>{item.label}</span></Link>)}</section>
    <section className="two-col"><div className="panel stack-md"><div className="section-title"><div><p className="eyebrow">DAILY LEARNING</p><h2>学习关注</h2></div><span className="count">{enabledWatches.length}</span></div>{enabledWatches.length ? enabledWatches.map((watch) => { const latestRun = learningRuns.find((run) => run.watchId === watch.id); return <Link href={`/workspaces/${watch.workspaceId}`} className="watch-row" key={watch.id}><div><strong>{watch.workspaceName}</strong><p>{watch.topics.join(" · ")}</p><small>{watch.sourceTypes.join(" / ")}</small></div><span className={`watch-status ${latestRun?.status ?? "waiting"}`}>{latestRun ? `${latestRun.status} · ${latestRun.signals.length} Signal` : "等待首次运行"}</span></Link>; }) : <div className="empty-list"><strong>还没有启用每日学习</strong><p>进入某个 Workspace，设定真正需要持续关注的对象与变化。</p></div>}</div><div className={`panel evolution-card ${latestAccepted ? "" : "demo-card"}`}><p className="eyebrow">{latestAccepted ? "RECENT EVOLUTION" : "DEMO EVOLUTION"}</p><h2>{latestAccepted ? "最近确认的方法" : "示例：系统学会的方法"}</h2><p className="evolution-quote">“{latestAccepted?.lesson ?? recentEvolution.lesson}”</p><p>{latestAccepted?.why ?? recentEvolution.evidence}</p><div className="row gap-sm"><Link className="button secondary" href="/evolution">查看进化记录</Link></div></div></section>
    {realSignals.length > 0 ? <section className="panel stack-md"><div className="section-title"><div><p className="eyebrow">REAL SIGNALS</p><h2>真实学习结果</h2></div><span className="pill">{realSignals.length} 条</span></div>{realSignals.map((signal) => <article className="signal-row" key={`${signal.runId}-${signal.id}`}><span className="signal-time">{signal.time ?? "NEW"}</span><div><strong>{signal.title}</strong><p>{signal.whyItMatters}</p>{signal.action && <p className="status-ok">建议：{signal.action}</p>}<small>{signal.source}{signal.traceId ? ` · Trace ${signal.traceId}` : ""}</small></div></article>)}</section> : hasRealLearningRuns ? <section className="panel"><p className="eyebrow">LEARNING RUNS</p><h2>已有真实学习运行，暂未产出 Signal</h2><p className="muted">当前状态：{learningRuns[0].status}。不使用 Demo Signal 填充。</p></section> : <section className="panel stack-md demo-card"><div className="section-title"><div><p className="eyebrow">DEMO SIGNALS</p><h2>示例 Signal</h2></div><span className="pill demo-badge">未执行真实 Learning Run</span></div><p className="muted small">以下只用于界面验证；执行真实 Learning Run 后自动退出。</p>{signals.map((signal) => <article className="signal-row" key={signal.title}><span className="signal-time">{signal.time}</span><div><strong>{signal.title}</strong><p>{signal.impact}</p><small>{signal.source}</small></div></article>)}</section>}
  </main>;
}
