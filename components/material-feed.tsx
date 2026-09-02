"use client";

import { useEffect, useRef, useState } from "react";
import {
  isLocalTextFile,
  kindFromMaterialName,
  localMaterialsKey,
  MAX_LOCAL_TEXT_CHARS,
  type LocalMaterial,
} from "@/lib/material-store";
import { normalizeMaterialUploadAck, type MaterialPlatformResult } from "@/lib/material-upload";
import { refreshMaterialParse, retryMaterialParse, uploadMaterialFile } from "@/lib/material-upload-client";
import { syncMarketingProduct } from "@/lib/sync-store";
import { usePersistedState } from "@/lib/use-persisted-state";

type MaterialItem = { title: string; kind: string; source: string; status?: string };

export function MaterialFeed({ workspaceId, initialMaterials = [] }: { workspaceId: string; initialMaterials?: MaterialItem[] }) {
  const [added, setAdded] = usePersistedState<LocalMaterial[]>(localMaterialsKey(workspaceId), []);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"none" | "url" | "text">("none");
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const refreshing = useRef(new Set<string>());
  const materials: LocalMaterial[] = [
    ...added,
    ...initialMaterials.map((item, index): LocalMaterial => ({ ...item, id: `demo-${index}`, parseMode: "reference_only", createdAt: "", status: item.status ?? "DEMO" })),
  ];
  const pendingKey = added.filter((material) => material.platformStatus === "queued" || material.platformStatus === "parsing").map((material) => material.id).sort().join("|");

  useEffect(() => {
    if (!pendingKey) return;
    const ids = pendingKey.split("|").filter(Boolean);
    const timer = window.setInterval(() => { for (const materialId of ids) void refreshParse(materialId, false); }, 8_000);
    return () => window.clearInterval(timer);
  }, [pendingKey, workspaceId]);

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

  async function syncMaterial(material: LocalMaterial) {
    const response = await syncMarketingProduct({
      entityKey: `material:${material.id}`,
      operation: "material.feed",
      workspaceId,
      expectedEntityId: material.id,
      idempotencyKey: `material.feed:${material.id}`,
      payload: {
        entity_id: material.id,
        material_id: material.id,
        title: material.title,
        kind: material.kind,
        source: material.source,
        parse_mode: material.parseMode,
        content: material.content,
        url: material.url,
        created_at: material.createdAt,
      },
    });
    const syncLabel = response.ok ? "AWKN 已同步" : response.error?.code === "PLATFORM_NOT_CONFIGURED" ? "仅本地" : "同步失败";
    setAdded((current) => current.map((item) => item.id === material.id ? { ...item, status: `${material.status} · ${syncLabel}` } : item));
  }

  async function uploadBinary(file: File, materialId: string) {
    const response = await uploadMaterialFile({ workspaceId, materialId, file });
    applyPlatformResult(materialId, normalizeMaterialUploadAck(response, materialId));
  }

  async function refreshParse(materialId: string, announce = true) {
    if (refreshing.current.has(materialId)) return;
    refreshing.current.add(materialId);
    if (announce) setAdded((current) => current.map((material) => material.id === materialId ? { ...material, status: "正在刷新解析状态…" } : material));
    try {
      const response = await refreshMaterialParse({ workspaceId, materialId });
      applyPlatformResult(materialId, normalizeMaterialUploadAck(response, materialId));
    } finally {
      refreshing.current.delete(materialId);
    }
  }

  async function retryParse(materialId: string) {
    if (refreshing.current.has(materialId)) return;
    refreshing.current.add(materialId);
    setAdded((current) => current.map((material) => material.id === materialId ? { ...material, status: "正在重新提交解析…", platformStatus: "queued", platformError: undefined } : material));
    try {
      const response = await retryMaterialParse({ workspaceId, materialId });
      applyPlatformResult(materialId, normalizeMaterialUploadAck(response, materialId));
    } finally {
      refreshing.current.delete(materialId);
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: LocalMaterial[] = [];
    const pendingUploads: Array<{ file: File; materialId: string }> = [];
    const pendingFeeds: LocalMaterial[] = [];
    for (const file of Array.from(files)) {
      const kind = kindFromMaterialName(file.name);
      const materialId = `material-${Date.now()}-${next.length}`;
      if (isLocalTextFile({ name: file.name, type: file.type })) {
        const raw = await file.text();
        const content = raw.slice(0, MAX_LOCAL_TEXT_CHARS);
        const item: LocalMaterial = {
          id: materialId,
          title: file.name,
          kind,
          source: "本地文件",
          status: raw.length > content.length ? "Ready · 已截断" : "Ready · Local text",
          parseMode: "local_text",
          content,
          createdAt: new Date().toISOString(),
        };
        next.push(item);
        pendingFeeds.push(item);
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
    setMessage(`已加入 ${next.length} 份资料；所有资料统一使用稳定 material_id，文本同步 AWKN，二进制文件上传后解析。`);
    await Promise.all([
      ...pendingFeeds.map((material) => syncMaterial(material)),
      ...pendingUploads.map((pending) => uploadBinary(pending.file, pending.materialId)),
    ]);
  }

  async function addUrl() {
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
    await syncMaterial(item);
  }

  async function addText() {
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
    await syncMaterial(item);
  }

  return (
    <div className="stack-md">
      <div className="material-actions row wrap gap-sm">
        <button className="button secondary" onClick={() => fileInput.current?.click()}>上传文件</button>
        <button className="button ghost" onClick={() => setMode(mode === "url" ? "none" : "url")}>添加链接</button>
        <button className="button ghost" onClick={() => setMode(mode === "text" ? "none" : "text")}>粘贴文本</button>
        <input ref={fileInput} hidden multiple type="file" onChange={(event) => void addFiles(event.target.files)} />
      </div>
      {mode === "url" && <div className="inline-feed"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"/><button className="button primary" onClick={() => void addUrl()}>加入</button></div>}
      {mode === "text" && <div className="inline-feed"><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴会议记录、聊天记录或历史方案片段…"/><button className="button primary" onClick={() => void addText()}>加入</button></div>}
      {message && <p className="muted small">{message}</p>}
      {!materials.length && <div className="dropzone" onClick={() => fileInput.current?.click()}><strong>先喂第一批资料</strong><span>TXT / MD / CSV / JSON 本地读取并同步；PDF / PPT / DOC / XLS 上传 AWKN 后解析</span></div>}
      {materials.map((material) => <div className="material-row" key={material.id}><div><strong>{material.title}</strong><p className="muted small">{material.kind} · {material.source} · {material.parseMode}{material.platformTraceId ? ` · trace ${material.platformTraceId}` : ""}</p></div><div className="row gap-sm"><span className={material.parseMode === "local_text" || material.parseMode === "platform_parsed" ? "status-ok" : "muted small"}>{material.status}</span>{!material.id.startsWith("demo-") && (material.platformStatus === "queued" || material.platformStatus === "parsing") && <button className="button ghost" onClick={() => void refreshParse(material.id)}>刷新解析</button>}{!material.id.startsWith("demo-") && material.platformStatus === "failed" && <button className="button ghost" onClick={() => void retryParse(material.id)}>重试解析</button>}</div></div>)}
    </div>
  );
}
