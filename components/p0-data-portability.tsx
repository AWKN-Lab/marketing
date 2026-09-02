"use client";

import { useState } from "react";
import { buildP0Bundle, parseP0Bundle } from "@/lib/p0-bundle";

function collectEntries() {
  const entries: Record<string, string> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith("marketing:")) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return entries;
}

export function P0DataPortability() {
  const [message, setMessage] = useState("");

  function exportData() {
    const bundle = buildP0Bundle(collectEntries());
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `awkn-marketing-p0-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(`已导出 ${Object.keys(bundle.entries).length} 个 P0 状态项。`);
  }

  async function importData(file: File | null) {
    if (!file) return;
    try {
      const bundle = parseP0Bundle(await file.text());
      const count = Object.keys(bundle.entries).length;
      if (!window.confirm(`将导入 ${count} 个 P0 状态项，并覆盖同名本地数据。继续吗？`)) return;
      for (const [key, value] of Object.entries(bundle.entries)) window.localStorage.setItem(key, value);
      setMessage(`已导入 ${count} 个状态项，正在刷新。`);
      window.location.reload();
    } catch {
      setMessage("导入失败：文件不是有效的 AWKN Marketing P0 数据包。");
    }
  }

  return <section className="data-portability panel">
    <div><p className="eyebrow">P0 DATA</p><h2>试跑数据备份与迁移</h2><p className="muted small">只导出 `marketing:` 产品层本地状态，不包含浏览器其他数据。</p></div>
    <div className="row gap-sm wrap"><button className="button secondary" onClick={exportData}>导出 P0 数据</button><label className="button ghost import-button">导入 P0 数据<input type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0] ?? null)} /></label>{message && <span className="muted small">{message}</span>}</div>
  </section>;
}
