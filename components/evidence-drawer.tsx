"use client";

import { useState } from "react";
import { evidence } from "@/lib/mock-data";
import { usePersistedState } from "@/lib/use-persisted-state";

type LocalMaterial = { title: string; kind: string; source: string; status?: string };

type EvidenceItem = { type: string; title: string; snippet: string; source: string; time: string };

export function EvidenceDrawer({ compact = false, scopeId, includeDemo = true }: { compact?: boolean; scopeId?: string; includeDemo?: boolean }) {
  const [open, setOpen] = useState(false);
  const [materials] = usePersistedState<LocalMaterial[]>(scopeId ? `marketing:${scopeId}:materials` : "marketing:evidence:none", []);
  const scopedEvidence: EvidenceItem[] = materials.map((material) => ({ type: material.kind, title: material.title, snippet: "该资料已进入当前 Workspace；P0 仅保存资料元数据，接入平台后由真实解析结果提供引用片段。", source: material.source, time: "P0 Local" }));
  const items: EvidenceItem[] = [...scopedEvidence, ...(includeDemo ? evidence : [])];

  return <>
    <button className={`button ${compact ? "ghost" : "secondary"}`} onClick={() => setOpen(true)}>查看依据{scopedEvidence.length ? ` · ${scopedEvidence.length}` : ""}</button>
    {open && <div className="drawer-layer" onClick={() => setOpen(false)}><aside className="drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow">EVIDENCE</p><h2>判断依据</h2></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div>{!items.length ? <div className="empty-list"><strong>当前还没有可引用证据</strong><p>先向 Workspace 投喂真实资料；接入平台后，这里显示解析片段与外部来源。</p></div> : <div className="stack-md">{items.map((item, index) => <article className="evidence-card" key={`${item.title}-${index}`}><div className="row between"><span className={`badge ${includeDemo && index >= scopedEvidence.length ? "demo-badge" : ""}`}>{includeDemo && index >= scopedEvidence.length ? `DEMO · ${item.type}` : item.type}</span><span className="muted small">#{index + 1}</span></div><h3>{item.title}</h3><p>{item.snippet}</p><small>{item.source} · {item.time}</small></article>)}</div>}</aside></div>}
  </>;
}
