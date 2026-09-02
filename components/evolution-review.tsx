"use client";

import type { EvolutionCandidate } from "@/lib/types";
import { EVOLUTION_REVIEWS_KEY, LOCAL_CANDIDATES_KEY, type LocalEvolutionCandidate } from "@/lib/evolution-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function EvolutionReview({ candidates }: { candidates: EvolutionCandidate[] }) {
  const [states, setStates] = usePersistedState<Record<string,string>>(EVOLUTION_REVIEWS_KEY, {});
  const [localCandidates] = usePersistedState<LocalEvolutionCandidate[]>(LOCAL_CANDIDATES_KEY, []);
  const hasRealCandidates = localCandidates.length > 0;
  const allCandidates: EvolutionCandidate[] = hasRealCandidates ? localCandidates : candidates;

  return <main className="page stack-lg">
    <header className="page-header"><div><p className="eyebrow">EVOLUTION</p><h1>它最近学会了什么</h1><p className="muted">真实 Candidate 一旦出现，Demo Candidate 自动退出主审核列表。</p></div><span className={`pill ${hasRealCandidates ? "" : "demo-badge"}`}>{hasRealCandidates ? `${allCandidates.length} 条真实候选` : "DEMO 候选"}</span></header>
    {hasRealCandidates ? <div className="evolution-notice"><span className="pulse"/><div><strong>这些候选来自你的真实任务</strong><p>审核后，下一次创建同类型任务时会匹配已确认经验。</p></div></div> : <div className="demo-notice"><strong>当前展示的是 Demo Candidate</strong><p>它们只用于理解界面，不会进入你的后续任务。完成真实 Task → Feedback → Outcome 后自动替换。</p></div>}
    <section className="stack-md">{allCandidates.map((candidate) => {
      const isReal = candidate.id.startsWith("local-ev-");
      return <article className={`candidate-card ${isReal ? "" : "demo-card"}`} key={candidate.id}><div className="candidate-top"><div><span className={`badge ${isReal ? "" : "demo-badge"}`}>{isReal ? candidate.type : `DEMO · ${candidate.type}`}</span><h2>{candidate.lesson}</h2></div><span className="confidence">{Math.round(candidate.confidence*100)}%</span></div><p>{candidate.why}</p><div className="candidate-grid"><div><span className="label">来源</span><strong>{candidate.source}</strong></div><div><span className="label">适用范围</span><strong>{candidate.scope}</strong></div><div><span className="label">反例</span><strong>{candidate.counterexample}</strong></div></div>{isReal ? <div className="row gap-sm"><button className={`button ${states[candidate.id] === "accepted" ? "primary" : "secondary"}`} onClick={() => setStates({...states,[candidate.id]:"accepted"})}>接受并用于后续任务</button><button className={`button ${states[candidate.id] === "scoped" ? "secondary" : "ghost"}`} onClick={() => setStates({...states,[candidate.id]:"scoped"})}>仅当前 Workspace</button><button className="button ghost danger" onClick={() => setStates({...states,[candidate.id]:"rejected"})}>拒绝</button><span className="muted small">{states[candidate.id] ? `已记录：${states[candidate.id]}` : "等待判断"}</span></div> : <span className="muted small">示例数据，不参与审核与经验匹配。</span>}</article>;
    })}</section>
  </main>;
}
