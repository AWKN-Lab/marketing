"use client";

import { useState } from "react";
import { evidence } from "@/lib/mock-data";
import { usePersistedState } from "@/lib/use-persisted-state";

type LocalMaterial = { title: string; kind: string; source: string; status?: string };

export function EvidenceDrawer({ compact = false, scopeId }: { compact?: boolean; scopeId?: string }) {
  const [open, setOpen] = useState(false);
  const [materials] = usePersistedState<LocalMaterial[]>(scopeId ? `marketing:${scopeId}:materials` : "marketing:evidence:none", []);
  const scopedEvidence = materials.map((material) => ({ type: material.kind, title: material.title, snippet: "该资料已进入当前 Workspace，可作为后续任务的上下文与证据来源。", source: material.source, time: "P0 Local" }));
  const items = [...scopedEvidence, ...evidence];

  return <>
    <button className={`button ${compact ? "ghost" : "secondary"}`} onClick={() => setOpen(true)}>查看依据{scopedEvidence.length ? ` · ${scopedEvidence.length}` : ""}</button>
    {open && <div className="drawer-layer" onClick={() => setOpen(false)}><aside className="drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow">EVIDENCE</p><h2>判断依据</h2></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div><div className="stack-md">{items.map((item, index) => <article className="evidence-card" key={`${item.title}-${index}`}><div className="row between"><span className="badge">{item.type}</span><span className="muted small">#{index + 1}</span></div><h3>{item.title}</h3><p>{item.snippet}</p><small>{item.source} · {item.time}</small></article>)}</div></aside></div>}
  </>;
}
