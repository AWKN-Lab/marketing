"use client";

import { useRef, useState } from "react";
import {
  isLocalTextFile,
  kindFromMaterialName,
  localMaterialsKey,
  MAX_LOCAL_TEXT_CHARS,
  type LocalMaterial,
} from "@/lib/material-store";
import { usePersistedState } from "@/lib/use-persisted-state";

type MaterialItem = { title: string; kind: string; source: string; status?: string };

export function MaterialFeed({ workspaceId, initialMaterials = [] }: { workspaceId: string; initialMaterials?: MaterialItem[] }) {
  const [added, setAdded] = usePersistedState<LocalMaterial[]>(localMaterialsKey(workspaceId), []);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"none" | "url" | "text">("none");
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const materials = [
    ...added,
    ...initialMaterials.map((item, index) => ({ ...item, id: `demo-${index}`, parseMode: "reference_only" as const, createdAt: "", status: item.status ?? "DEMO" })),
  ];

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: LocalMaterial[] = [];
    for (const file of Array.from(files)) {
      const kind = kindFromMaterialName(file.name);
      if (isLocalTextFile({ name: file.name, type: file.type })) {
        const raw = await file.text();
        const content = raw.slice(0, MAX_LOCAL_TEXT_CHARS);
        next.push({
          id: `material-${Date.now()}-${next.length}`,
          title: file.name,
          kind,
          source: "本地文件",
          status: raw.length > content.length ? "Ready · 已截断" : "Ready · Local text",
          parseMode: "local_text",
          content,
          createdAt: new Date().toISOString(),
        });
      } else {
        next.push({
          id: `material-${Date.now()}-${next.length}`,
          title: file.name,
          kind,
          source: "本地文件",
          status: "等待 AWKN 解析",
          parseMode: "platform_required",
          createdAt: new Date().toISOString(),
        });
      }
    }
    setAdded([...next, ...added]);
    setMessage(`已加入 ${next.length} 份资料；文本文件可直接进入 P0 上下文，二进制文件等待 AWKN 解析。`);
  }

  function addUrl() {
    if (!url.trim()) return;
    const item: LocalMaterial = {
      id: `material-${Date.now()}`,
      title: url.trim(),
      kind: "WEB",
      source: "链接投喂",
      status: "Reference · 等待 AWKN 获取",
      parseMode: "reference_only",
      url: url.trim(),
      createdAt: new Date().toISOString(),
    };
    setAdded([item, ...added]);
    setUrl(""); setMode("none");
  }

  function addText() {
    if (!text.trim()) return;
    const content = text.trim().slice(0, MAX_LOCAL_TEXT_CHARS);
    const title = content.slice(0, 28) + (content.length > 28 ? "…" : "");
    const item: LocalMaterial = {
      id: `material-${Date.now()}`,
      title,
      kind: "TEXT",
      source: "文本投喂",
      status: "Ready · Local text",
      parseMode: "local_text",
      content,
      createdAt: new Date().toISOString(),
    };
    setAdded([item, ...added]);
    setText(""); setMode("none");
  }

  return (
    <div className="stack-md">
      <div className="material-actions row wrap gap-sm">
        <button className="button secondary" onClick={() => fileInput.current?.click()}>上传文件</button>
        <button className="button ghost" onClick={() => setMode(mode === "url" ? "none" : "url")}>添加链接</button>
        <button className="button ghost" onClick={() => setMode(mode === "text" ? "none" : "text")}>粘贴文本</button>
        <input ref={fileInput} hidden multiple type="file" onChange={(event) => void addFiles(event.target.files)} />
      </div>
      {mode === "url" && <div className="inline-feed"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"/><button className="button primary" onClick={addUrl}>加入</button></div>}
      {mode === "text" && <div className="inline-feed"><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴会议记录、聊天记录或历史方案片段…"/><button className="button primary" onClick={addText}>加入</button></div>}
      {message && <p className="muted small">{message}</p>}
      {!materials.length && <div className="dropzone" onClick={() => fileInput.current?.click()}><strong>先喂第一批资料</strong><span>TXT / MD / CSV / JSON 可本地读取；PDF / PPT / DOC / XLS 等等待 AWKN 解析</span></div>}
      {materials.map((material) => <div className="material-row" key={material.id}><div><strong>{material.title}</strong><p className="muted small">{material.kind} · {material.source} · {material.parseMode}</p></div><span className={material.parseMode === "local_text" ? "status-ok" : "muted small"}>{material.status}</span></div>)}
    </div>
  );
}
