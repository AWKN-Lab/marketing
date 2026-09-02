"use client";

import type { EvolutionCandidate } from "@/lib/types";
import { EVOLUTION_REVIEWS_KEY, LOCAL_CANDIDATES_KEY, type LocalEvolutionCandidate } from "@/lib/evolution-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function EvolutionReview({ candidates }: { candidates: EvolutionCandidate[] }) {
  const [states, setStates] = usePersistedState<Record<string,string>>(EVOLUTION_REVIEWS_KEY, {});
  const [localCandidates] = usePersistedState<LocalEvolutionCandidate[]>(LOCAL_CANDIDATES_KEY, []);
  const allCandidates: EvolutionCandidate[] = [...localCandidates, ...candidates];

  return <main className="page stack-lg">
    <header className="page-header"><div><p className="eyebrow">EVOLUTION</p><h1>它最近学会了什么</h1><p className="muted">接受后的经验会进入后续任务匹配；限定范围只在原 Workspace 生效。</p></div><span className="pill">{allCandidates.length} 条候选</span></header>
    {localCandidates.length > 0 && <div className="evolution-notice"><span className="pulse"/><div><strong>刚从真实任务产生 {localCandidates.length} 条本地候选</strong><p>审核后，下一次创建相似任务时会显示并应用已确认经验。</p></div></div>}
    <section className="stack-md">{allCandidates.map((candidate) => <article className="candidate-card" key={candidate.id}><div className="candidate-top"><div><span className="badge">{candidate.type}</span><h2>{candidate.lesson}</h2></div><span className="confidence">{Math.round(candidate.confidence*100)}%</span></div><p>{candidate.why}</p><div className="candidate-grid"><div><span className="label">来源</span><strong>{candidate.source}</strong></div><div><span className="label">适用范围</span><strong>{candidate.scope}</strong></div><div><span className="label">反例</span><strong>{candidate.counterexample}</strong></div></div><div className="row gap-sm"><button className={`button ${states[candidate.id] === "accepted" ? "primary" : "secondary"}`} onClick={() => setStates({...states,[candidate.id]:"accepted"})}>接受并用于后续任务</button><button className={`button ${states[candidate.id] === "scoped" ? "secondary" : "ghost"}`} onClick={() => setStates({...states,[candidate.id]:"scoped"})}>仅当前 Workspace</button><button className="button ghost danger" onClick={() => setStates({...states,[candidate.id]:"rejected"})}>拒绝</button><span className="muted small">{states[candidate.id] ? `已记录：${states[candidate.id]}` : "等待判断"}</span></div></article>)}</section>
  </main>;
}
