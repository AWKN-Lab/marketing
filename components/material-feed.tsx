"use client";

import { useRef, useState } from "react";
import {
  isLocalTextFile,
  kindFromMaterialName,
  localMaterialsKey,
  MAX_LOCAL_TEXT_CHARS,
  type LocalMaterial,
} from "@/lib/material-store";
import { normalizeMaterialUploadAck, type MaterialPlatformResult } from "@/lib/material-upload";
import { refreshMaterialParse, uploadMaterialFile } from "@/lib/material-upload-client";
import { usePersistedState } from "@/lib/use-persisted-state";

type MaterialItem = { title: string; kind: string; source: string; status?: string };

export function MaterialFeed({ workspaceId, initialMaterials = [] }: { workspaceId: string; initialMaterials?: MaterialItem[] }) {
  const [added, setAdded] = usePersistedState<LocalMaterial[]>(localMaterialsKey(workspaceId), []);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"none" | "url" | "text">("none");
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const materials: LocalMaterial[] = [
    ...added,
    ...initialMaterials.map((item, index): LocalMaterial => ({ ...item, id: `demo-${index}`, parseMode: "reference_only", createdAt: "", status: item.status ?? "DEMO" })),
  ];

  function applyPlatformResult(materialId: string, result: MaterialPlatformResult) {
    setAdded((current) => current.map((material) => material.id !== materialId ? material : {
      ...material,
      status: result.error ? `${result.label} · ${result.error.message}` : result.label,
      parseMode: result.state === "ready" ? "platform_parsed" : material.parseMode,
      content: result.parsedText ?? material.content,
      evidence: result.evidence.length ? result.evidence : material.evidence,
      platformStatus: result.state,
      platformTraceId: result.traceId,
      platformRevision: result.revision,
      platformError: result.error?.message,
    }));
  }

  async function uploadBinary(file: File, materialId: string) {
    const response = await uploadMaterialFile({ workspaceId, materialId, file });
    const result = normalizeMaterialUploadAck(response, materialId);
    applyPlatformResult(materialId, result);
  }

  async function refreshParse(materialId: string) {
    setAdded((current) => current.map((material) => material.id === materialId ? { ...material, status: "正在刷新解析状态…" } : material));
    const response = await refreshMaterialParse({ workspaceId, materialId });
    applyPlatformResult(materialId, normalizeMaterialUploadAck(response, materialId));
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: LocalMaterial[] = [];
    const pendingUploads: Array<{ file: File; materialId: string }> = [];
    for (const file of Array.from(files)) {
      const kind = kindFromMaterialName(file.name);
      const materialId = `material-${Date.now()}-${next.length}`;
      if (isLocalTextFile({ name: file.name, type: file.type })) {
        const raw = await file.text();
        const content = raw.slice(0, MAX_LOCAL_TEXT_CHARS);
        next.push({
          id: materialId,
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
          id: materialId,
          title: file.name,
          kind,
          source: "本地文件",
          status: "上传中…",
          parseMode: "platform_required",
          platformStatus: "uploading",
          createdAt: new Date().toISOString(),
        });
        pendingUploads.push({ file, materialId });
      }
    }
    setAdded([...next, ...added]);
    setMessage(`已加入 ${next.length} 份资料；文本文件直接进入上下文，二进制文件通过 AWKN 产品上传接口解析。`);
    for (const pending of pendingUploads) await uploadBinary(pending.file, pending.materialId);
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
      {!materials.length && <div className="dropzone" onClick={() => fileInput.current?.click()}><strong>先喂第一批资料</strong><span>TXT / MD / CSV / JSON 本地读取；PDF / PPT / DOC / XLS 等上传 AWKN 后解析</span></div>}
      {materials.map((material) => <div className="material-row" key={material.id}><div><strong>{material.title}</strong><p className="muted small">{material.kind} · {material.source} · {material.parseMode}{material.platformTraceId ? ` · trace ${material.platformTraceId}` : ""}</p></div><div className="row gap-sm"><span className={material.parseMode === "local_text" || material.parseMode === "platform_parsed" ? "status-ok" : "muted small"}>{material.status}</span>{!material.id.startsWith("demo-") && (material.platformStatus === "queued" || material.platformStatus === "parsing") && <button className="button ghost" onClick={() => void refreshParse(material.id)}>刷新解析</button>}</div></div>)}
    </div>
  );
}
