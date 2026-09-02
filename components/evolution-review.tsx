"use client";

import { useState } from "react";
import type { EvolutionCandidate } from "@/lib/types";

export function EvolutionReview({ candidates }: { candidates: EvolutionCandidate[] }) {
  const [states, setStates] = useState<Record<string,string>>({});
  return <main className="page stack-lg"><header className="page-header"><div><p className="eyebrow">EVOLUTION</p><h1>它最近学会了什么</h1><p className="muted">每条变化都能追溯来源、限定范围、拒绝或回退。</p></div><span className="pill">{candidates.length} 待审核</span></header><section className="stack-md">{candidates.map(c => <article className="candidate-card" key={c.id}><div className="candidate-top"><div><span className="badge">{c.type}</span><h2>{c.lesson}</h2></div><span className="confidence">{Math.round(c.confidence*100)}%</span></div><p>{c.why}</p><div className="candidate-grid"><div><span className="label">来源</span><strong>{c.source}</strong></div><div><span className="label">适用范围</span><strong>{c.scope}</strong></div><div><span className="label">反例</span><strong>{c.counterexample}</strong></div></div><div className="row gap-sm"><button className={`button ${states[c.id]==="accepted"?"primary":"secondary"}`} onClick={()=>setStates({...states,[c.id]:"accepted"})}>接受</button><button className="button ghost" onClick={()=>setStates({...states,[c.id]:"scoped"})}>限定范围</button><button className="button ghost danger" onClick={()=>setStates({...states,[c.id]:"rejected"})}>拒绝</button><span className="muted small">{states[c.id] ? `当前：${states[c.id]}` : "等待判断"}</span></div></article>)}</section></main>;
}
