"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Activity, ArrowDownUp, Blocks, ChevronDown, CircleHelp, Command, FileClock, Landmark, LayoutDashboard, Menu, Search, Settings2, ShieldCheck, Vote, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ConnectionControls, RuntimeSidebarStatus } from "./connection-controls";
import { useRuntime } from "@/chain/runtime-context";

const primaryLinks: { href: string; label: string; icon: LucideIcon; badge?: string }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/bonds", label: "Bond registry", icon: Landmark, badge: "03" },
  { href: "/actions", label: "Corporate actions", icon: ArrowDownUp },
  { href: "/governance", label: "Governance", icon: Vote, badge: "02" },
  { href: "/transactions", label: "Transactions", icon: FileClock },
  { href: "/operations", label: "Operations", icon: Blocks },
];

function BrandMark() {
  return <div className="brand-mark"><span /><span /><span /><span /></div>;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const runtime = useRuntime();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <BrandMark />
          <div className="brand-copy"><strong>KASE Treasury</strong><span>Issuer workspace</span></div>
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">A</div>
          <div className="workspace-copy"><span>Workspace</span><strong>{runtime.mode === "demo" ? "Atlas Capital · sample" : "Live issuer account"}</strong></div>
          <ChevronDown size={15} />
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          <span className="nav-label">PLATFORM</span>
          {primaryLinks.map(({ href, label, icon: Icon, badge }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{badge && runtime.mode === "demo" && <small>{badge}</small>}
            </Link>;
          })}
          <span className="nav-label nav-label-spaced">WORKSPACE</span>
          <Link href="/bonds" className="nav-link"><Blocks size={17} strokeWidth={1.8} /><span>Token registry</span></Link>
          <Link href="/transactions" className="nav-link"><Activity size={17} strokeWidth={1.8} /><span>Activity log</span></Link>
        </nav>

        <div className="sidebar-bottom">
          <RuntimeSidebarStatus />
          <Link href="/transactions" className="nav-link"><CircleHelp size={17} strokeWidth={1.8} /><span>Documentation</span></Link>
          <Link href="/" className="nav-link"><Settings2 size={17} strokeWidth={1.8} /><span>Settings</span></Link>
          <div className="profile-row"><div className="profile-avatar">◎</div><div className="profile-copy"><strong>{runtime.mode === "demo" ? "Sample issuer" : "Connected wallet"}</strong><span>{runtime.mode === "demo" ? "Illustrative profile" : "Current signer"}</span></div></div>
        </div>
      </aside>

      {menuOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <main className="main-frame">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{primaryLinks.find((link) => link.href === pathname || (link.href !== "/" && pathname.startsWith(link.href)))?.label ?? "Overview"}</strong></div>
          </div>
          <div className="topbar-actions">
            <button className="search-trigger"><Search size={15} /><span>Search anything...</span><kbd><Command size={11} /> K</kbd></button>
            <div className="topbar-divider" />
            <ConnectionControls />
          </div>
        </header>
        <div className="prototype-notice"><ShieldCheck size={14} /><span><strong>Independent educational prototype</strong><span className="notice-separator">·</span>Not affiliated with or endorsed by KASE. {runtime.mode === "demo" ? "All sample figures are simulated." : "Live views show selected on-chain accounts; unintegrated views remain demo data."}</span></div>
        <div className="page-content">{children}</div>
        <footer className="app-footer"><span>KASE Treasury <span className="footer-dot">·</span> Independent prototype</span><span>{runtime.mode === "demo" ? "Simulated public demo" : "Selected Solana cluster"}</span></footer>
      </main>
    </div>
  );
}

