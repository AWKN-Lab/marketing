"use client";

import { useEffect, useState } from "react";
import { readSyncRecord, SYNC_EVENT, type SyncRecord } from "@/lib/sync-store";

const labels: Record<string, string> = {
  syncing: "同步中",
  synced: "AWKN 已同步",
  "local-only": "仅本地",
  "sync-error": "同步失败",
};

export function SyncStatusBadge({ entityKey }: { entityKey: string }) {
  const [record, setRecord] = useState<SyncRecord | null>(null);
  useEffect(() => {
    const refresh = () => setRecord(readSyncRecord(entityKey));
    const onSync = (event: Event) => {
      const custom = event as CustomEvent<{ entityKey?: string }>;
      if (!custom.detail?.entityKey || custom.detail.entityKey === entityKey) refresh();
    };
    refresh();
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [entityKey]);
  if (!record) return <span className="muted small">本地未同步</span>;
  return <span className={`sync-badge ${record.state}`} title={record.error ?? record.traceId}>{labels[record.state] ?? record.state}</span>;
}
