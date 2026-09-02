"use client";

import { useEffect, useState } from "react";

type PlatformStatus = {
  mode: "local" | "partial" | "connected";
  agentConfigured: boolean;
  productConfigured: boolean;
};

const labels = {
  local: "LOCAL P0",
  partial: "PARTIAL",
  connected: "AWKN CONNECTED",
} as const;

export function PlatformStatusPill() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((value) => setStatus(value as PlatformStatus))
      .catch(() => setStatus({ mode: "local", agentConfigured: false, productConfigured: false }));
  }, []);

  const mode = status?.mode ?? "local";
  const title = status
    ? `Agent: ${status.agentConfigured ? "connected" : "local"} · Product API: ${status.productConfigured ? "connected" : "local"}`
    : "正在读取平台状态";

  return <span className={`pill platform-status ${mode}`} title={title}>{labels[mode]}</span>;
}
