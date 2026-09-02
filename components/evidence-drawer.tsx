"use client";

import { useState } from "react";
import { evidence } from "@/lib/mock-data";
import { localMaterialsKey, type LocalMaterial } from "@/lib/material-store";
import { useAgentTaskResult } from "@/lib/use-agent-task-result";
import { usePersistedState } from "@/lib/use-persisted-state";

type EvidenceItem = { type: string; title: string; snippet: string; source: string; time: string; origin: "agent" | "material" | "demo" };

export function EvidenceDrawer({ compact = false, scopeId, taskId, includeDemo = true }: { compact?: boolean; scopeId?: string; taskId?: string; includeDemo?: boolean }) {
  const [open, setOpen] = useState(false);
  const [materials] = usePersistedState<LocalMaterial[]>(scopeId ? localMaterialsKey(scopeId) : "marketing:evidence:none", []);
  const agentResult = useAgentTaskResult(taskId ?? "");
  const agentEvidence: EvidenceItem[] = (agentResult?.evidence ?? []).map((item) => ({
    type: item.type,
    title: item.title,
    snippet: item.snippet,
    source: item.source,
    time: item.time ?? "Agent result",
    origin: "agent",
  }));
  const materialEvidence: EvidenceItem[] = materials.flatMap((material) => {
    if (material.evidence?.length) return material.evidence.map((item) => ({
      type: item.type,
      title: `${material.title} · ${item.title}`,
      snippet: item.snippet,
      source: item.source,
      time: item.time ?? material.createdAt || "AWKN parser",
      origin: "material" as const,
    }));
    const snippet = material.parseMode === "local_text" && material.content
      ? material.content.slice(0, 220)
      : material.parseMode === "platform_parsed"
        ? material.content?.slice(0, 220) ?? "AWKN 已完成解析；当前结果没有返回可展示的证据片段。"
        : material.parseMode === "platform_required"
          ? `${material.status}；解析完成前不生成引用片段。`
          : "该来源已进入当前 Workspace，等待 AWKN 获取或验证。";
    return [{ type: material.kind, title: material.title, snippet, source: material.source, time: material.createdAt || "P0 Local", origin: "material" as const }];
  });
  const demoEvidence: EvidenceItem[] = includeDemo ? evidence.map((item) => ({ ...item, origin: "demo" as const })) : [];
  const items = [...agentEvidence, ...materialEvidence, ...demoEvidence];

  return <>
    <button className={`button ${compact ? "ghost" : "secondary"}`} onClick={() => setOpen(true)}>查看依据{items.length ? ` · ${items.length}` : ""}</button>
    {open && <div className="drawer-layer" onClick={() => setOpen(false)}><aside className="drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow">EVIDENCE</p><h2>判断依据</h2>{agentResult?.traceId && <p className="muted small">Trace · {agentResult.traceId}</p>}</div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div>{!items.length ? <div className="empty-list"><strong>当前还没有可引用证据</strong><p>先向 Workspace 投喂真实资料，或让 AWKN Agent 返回结构化 evidence。</p></div> : <div className="stack-md">{items.map((item, index) => <article className="evidence-card" key={`${item.origin}-${item.title}-${index}`}><div className="row between"><span className={`badge ${item.origin === "demo" ? "demo-badge" : ""}`}>{item.origin === "agent" ? `AGENT · ${item.type}` : item.origin === "demo" ? `DEMO · ${item.type}` : `MATERIAL · ${item.type}`}</span><span className="muted small">#{index + 1}</span></div><h3>{item.title}</h3><p>{item.snippet}</p><small>{item.source} · {item.time}</small></article>)}</div>}</aside></div>}
  </>;
}
