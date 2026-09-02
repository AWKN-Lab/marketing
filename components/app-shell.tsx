"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LearningRunPoller } from "@/components/learning-run-poller";
import { PlatformStatusPill } from "@/components/platform-status";
import { useProductSession } from "@/components/product-session-provider";

const nav = [
  { href: "/today", label: "今日", mark: "01" },
  { href: "/workspaces", label: "Workspace", mark: "02" },
  { href: "/assistant", label: "营销助理", mark: "03" },
  { href: "/evolution", label: "进化", mark: "04" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useProductSession();
  const initial = session.actor.name.trim().slice(0, 1).toUpperCase() || "A";
  return (
    <div className="app-shell">
      <LearningRunPoller />
      <aside className="sidebar">
        <Link href="/today" className="brand"><span className="brand-mark">A</span><div><strong>AWKN</strong><small>MARKETING</small></div></Link>
        <nav>{nav.map((item) => <Link key={item.href} href={item.href} className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`}><span>{item.mark}</span>{item.label}</Link>)}</nav>
        <div className="sidebar-foot"><div className="agent-pulse"><span className="pulse"/><div><strong>Marketing Agent</strong><small>{session.mode === "platform" ? session.tenant.name : "Local Single-user"}</small></div></div></div>
      </aside>
      <div className="content-shell"><div className="topbar"><span>自主进化营销助理</span><div className="top-actions"><PlatformStatusPill/><span className="pill" title={`actor: ${session.actor.id}`}>{session.mode === "platform" ? session.tenant.name : "LOCAL SINGLE-USER"}</span><span className="avatar" title={session.actor.name}>{initial}</span></div></div>{children}</div>
    </div>
  );
}
