"use client";

import { useRef, useState } from "react";
import { usePersistedState } from "@/lib/use-persisted-state";

type MaterialItem = { title: string; kind: string; source: string; status?: string };

function kindFromName(name: string) {
  const extension = name.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : "FILE";
}

export function MaterialFeed({ workspaceId, initialMaterials = [] }: { workspaceId: string; initialMaterials?: MaterialItem[] }) {
  const [added, setAdded] = usePersistedState<MaterialItem[]>(`marketing:${workspaceId}:materials`, []);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"none" | "url" | "text">("none");
  const fileInput = useRef<HTMLInputElement>(null);
  const materials = [...added, ...initialMaterials];

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({ title: file.name, kind: kindFromName(file.name), source: "本地文件", status: "Ready" }));
    setAdded([...next, ...added]);
  }

  function addUrl() {
    if (!url.trim()) return;
    setAdded([{ title: url.trim(), kind: "WEB", source: "链接投喂", status: "Ready" }, ...added]);
    setUrl(""); setMode("none");
  }

  function addText() {
    if (!text.trim()) return;
    const title = text.trim().slice(0, 28) + (text.trim().length > 28 ? "…" : "");
    setAdded([{ title, kind: "TEXT", source: "文本投喂", status: "Ready" }, ...added]);
    setText(""); setMode("none");
  }

  return (
    <div className="stack-md">
      <div className="material-actions row wrap gap-sm">
        <button className="button secondary" onClick={() => fileInput.current?.click()}>上传文件</button>
        <button className="button ghost" onClick={() => setMode(mode === "url" ? "none" : "url")}>添加链接</button>
        <button className="button ghost" onClick={() => setMode(mode === "text" ? "none" : "text")}>粘贴文本</button>
        <input ref={fileInput} hidden multiple type="file" onChange={(e) => addFiles(e.target.files)} />
      </div>
      {mode === "url" && <div className="inline-feed"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"/><button className="button primary" onClick={addUrl}>加入</button></div>}
      {mode === "text" && <div className="inline-feed"><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴会议记录、聊天记录或历史方案片段…"/><button className="button primary" onClick={addText}>加入</button></div>}
      {!materials.length && <div className="dropzone" onClick={() => fileInput.current?.click()}><strong>先喂第一批资料</strong><span>PDF / PPT / DOC / XLS / 图片 / 链接 / 会议记录</span></div>}
      {materials.map((material, index) => <div className="material-row" key={`${material.title}-${index}`}><div><strong>{material.title}</strong><p className="muted small">{material.kind} · {material.source}</p></div><span className="status-ok">{material.status ?? "已理解"}</span></div>)}
    </div>
  );
}
