"use client";

import { useState } from "react";
import { evidence } from "@/lib/mock-data";

export function EvidenceDrawer({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className={`button ${compact ? "ghost" : "secondary"}`} onClick={() => setOpen(true)}>查看依据</button>
    {open && <div className="drawer-layer" onClick={() => setOpen(false)}><aside className="drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow">EVIDENCE</p><h2>判断依据</h2></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div><div className="stack-md">{evidence.map((item, index) => <article className="evidence-card" key={item.title}><div className="row between"><span className="badge">{item.type}</span><span className="muted small">#{index + 1}</span></div><h3>{item.title}</h3><p>{item.snippet}</p><small>{item.source} · {item.time}</small></article>)}</div></aside></div>}
  </>;
}
