"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Activity, ArrowDownUp, Bell, Blocks, ChevronDown, CircleHelp, Command, FileClock, Landmark, LayoutDashboard, Menu, Search, Settings2, ShieldCheck, Vote, Wallet, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const primaryLinks: { href: string; label: string; icon: LucideIcon; badge?: string }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/bonds", label: "Bond registry", icon: Landmark, badge: "03" },
  { href: "/actions", label: "Corporate actions", icon: ArrowDownUp },
  { href: "/governance", label: "Governance", icon: Vote, badge: "02" },
  { href: "/transactions", label: "Transactions", icon: FileClock },
];

function BrandMark() {
  return <div className="brand-mark"><span /><span /><span /><span /></div>;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
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
          <div className="workspace-copy"><span>Workspace</span><strong>Atlas Capital</strong></div>
          <ChevronDown size={15} />
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          <span className="nav-label">PLATFORM</span>
          {primaryLinks.map(({ href, label, icon: Icon, badge }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{badge && <small>{badge}</small>}
            </Link>;
          })}
          <span className="nav-label nav-label-spaced">WORKSPACE</span>
          <Link href="/bonds" className="nav-link"><Blocks size={17} strokeWidth={1.8} /><span>Token registry</span></Link>
          <Link href="/transactions" className="nav-link"><Activity size={17} strokeWidth={1.8} /><span>Activity log</span></Link>
        </nav>

        <div className="sidebar-bottom">
          <div className="network-card"><div className="network-heading"><span className="live-dot" />Solana Devnet<span className="network-tag">DEMO</span></div><p>Read-only preview · mock data</p></div>
          <Link href="/transactions" className="nav-link"><CircleHelp size={17} strokeWidth={1.8} /><span>Documentation</span></Link>
          <Link href="/" className="nav-link"><Settings2 size={17} strokeWidth={1.8} /><span>Settings</span></Link>
          <div className="profile-row"><div className="profile-avatar">AK</div><div className="profile-copy"><strong>Alex Kim</strong><span>Issuer admin</span></div><button className="icon-button" aria-label="Profile options"><ChevronDown size={15} /></button></div>
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
            <span className="cluster-pill"><span className="live-dot" />Devnet</span>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={17} /><i /></button>
            <button className="wallet-button" disabled title="Wallet integration is planned for a later milestone"><Wallet size={15} /><span>Connect wallet</span></button>
          </div>
        </header>
        <div className="prototype-notice"><ShieldCheck size={14} /><span><strong>Independent educational prototype</strong><span className="notice-separator">·</span>Not affiliated with or endorsed by KASE. All displayed data is mock data.</span><button aria-label="Dismiss notice">×</button></div>
        <div className="page-content">{children}</div>
        <footer className="app-footer"><span>KASE Treasury <span className="footer-dot">·</span> Independent prototype</span><span>Built for learning on Solana Devnet</span></footer>
      </main>
    </div>
  );
}

