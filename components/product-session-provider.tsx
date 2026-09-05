"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  MARKETING_SESSION_INVALIDATE_EVENT,
  MARKETING_SESSION_REFRESH_EVENT,
  MARKETING_SESSION_REFRESH_INTERVAL_MS,
  normalizeMarketingSession,
  type MarketingSession,
} from "@/lib/product-session";
import { setActiveStorageScope } from "@/lib/storage-scope";

const SessionContext = createContext<MarketingSession | null>(null);

export function ProductSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<MarketingSession | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let refreshVersion = 0;
    const load = async () => {
      const version = ++refreshVersion;
      try {
        const response = await fetch("/api/session", { credentials: "include", cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? `SESSION_${response.status}`);
        const next = normalizeMarketingSession(payload);
        if (!next) throw new Error("INVALID_SESSION_RESPONSE");
        if (cancelled || version !== refreshVersion) return;
        setActiveStorageScope(next);
        setError("");
        setSession(next);
      } catch (cause) {
        if (!cancelled && version === refreshVersion) {
          setSession(null);
          setError(cause instanceof Error ? cause.message : "SESSION_UNAVAILABLE");
        }
      }
    };
    const refresh = () => { void load(); };
    const invalidateAndRefresh = () => {
      setSession(null);
      setError("");
      void load();
    };
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    void load();
    window.addEventListener(MARKETING_SESSION_REFRESH_EVENT, refresh);
    window.addEventListener(MARKETING_SESSION_INVALIDATE_EVENT, invalidateAndRefresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshOnVisible);
    const timer = window.setInterval(refresh, MARKETING_SESSION_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      refreshVersion += 1;
      window.removeEventListener(MARKETING_SESSION_REFRESH_EVENT, refresh);
      window.removeEventListener(MARKETING_SESSION_INVALIDATE_EVENT, invalidateAndRefresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshOnVisible);
      window.clearInterval(timer);
    };
  }, []);

  if (error) return <main className="page"><section className="panel stack-md"><p className="eyebrow">SESSION</p><h1>无法进入营销工作区</h1><p className="muted">{error}</p><p className="muted small">生产环境需要由 AWKN 平台提供经过认证的 Marketing Session；浏览器不会自行声明租户或用户身份。</p></section></main>;
  if (!session) return <main className="page"><section className="panel"><p className="muted">正在确认营销工作区身份…</p></section></main>;
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useProductSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("ProductSessionProvider is required");
  return session;
}
