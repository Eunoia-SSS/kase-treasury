import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, CircleDollarSign, Clock3, Landmark, MoreHorizontal, Plus, ShieldCheck, Sparkles, UsersRound, Vote } from "lucide-react";
import { bonds, corporateActions, proposals, snapshots, transactions } from "@/lib/mock-data";
import { formatCurrency, formatDate, formatCompactNumber } from "@/lib/format";
import { Card, MockLabel, PageHeading, SectionHeading, StatusBadge } from "@/components/ui/primitives";

export function OverviewDashboard() {
  const activeBonds = bonds.filter((bond) => bond.status !== "Matured").length;
  const outstanding = bonds.reduce((total, bond) => total + bond.outstandingUnits * bond.faceValue, 0);
  const nextAction = corporateActions.find((action) => action.status !== "Completed")!;
  const activeProposal = proposals.find((proposal) => proposal.status === "Active")!;
  const votingProgress = Math.round(((activeProposal.votesFor + activeProposal.votesAgainst) / activeProposal.eligibleUnits) * 100);

  return <>
    <PageHeading eyebrow="FRIDAY, OCTOBER 9, 2026" title="Good morning, Alex" description="Here’s what’s happening across your bond portfolio today." action={<><button className="button button-secondary" disabled title="Date filtering is planned"><CalendarDays size={15} />Sep 9 – Oct 9 <span className="button-caret">⌄</span></button><button className="button button-primary" disabled title="Bond issuance is planned for a later milestone"><Plus size={16} />Issue new bond</button></>} />
    <div className="dashboard-grid stat-grid">
      <MetricCard label="Total outstanding" value={formatCurrency(outstanding)} note="Across 3 active issuances" icon={<CircleDollarSign size={18} />} trend="+8.4%" trendUp />
      <MetricCard label="Active bond series" value={String(activeBonds).padStart(2, "0")} note="2 coupon dates this quarter" icon={<Landmark size={18} />} trend="On track" />
      <MetricCard label="Registered holders" value="3,482" note="Across all bond series" icon={<UsersRound size={18} />} trend="+12.6%" trendUp />
      <MetricCard label="Upcoming obligations" value={formatCurrency(174000000)} note="Coupon · Oct 18, 2026" icon={<Clock3 size={18} />} trend="9 days" trendAmber />
    </div>

    <div className="dashboard-grid content-grid">
      <Card className="portfolio-card">
        <div className="card-heading-row"><SectionHeading title="Portfolio overview" detail="Outstanding value by bond series" /><button className="icon-button" aria-label="More portfolio options"><MoreHorizontal size={18} /></button></div>
        <div className="portfolio-summary"><div><span className="muted-label">TOTAL PORTFOLIO VALUE <MockLabel /></span><div className="portfolio-total">{formatCurrency(outstanding)}</div></div><div className="portfolio-change"><ArrowUpRight size={15} />8.4% <span>vs last month</span></div></div>
        <div className="portfolio-chart" aria-label="Portfolio value trend chart">
          <div className="chart-y-labels"><span>₸5.5B</span><span>₸4.0B</span><span>₸2.5B</span><span>₸1.0B</span></div>
          <div className="chart-area"><div className="chart-gridlines"><i /><i /><i /><i /></div><svg viewBox="0 0 760 178" preserveAspectRatio="none" role="img" aria-label="Illustrative portfolio value trend"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#316c5d" stopOpacity=".19" /><stop offset="100%" stopColor="#316c5d" stopOpacity="0" /></linearGradient></defs><path d="M0 142 C32 134 44 143 70 128 S112 120 143 130 S184 112 210 115 S247 112 278 97 S319 105 350 88 S393 91 422 81 S465 90 493 66 S538 74 564 61 S606 72 635 47 S680 56 705 35 S740 40 760 20 L760 178 L0 178Z" fill="url(#chartFill)" /><path d="M0 142 C32 134 44 143 70 128 S112 120 143 130 S184 112 210 115 S247 112 278 97 S319 105 350 88 S393 91 422 81 S465 90 493 66 S538 74 564 61 S606 72 635 47 S680 56 705 35 S740 40 760 20" fill="none" stroke="#3b806c" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg><div className="chart-x-labels"><span>Sep 12</span><span>Sep 18</span><span>Sep 24</span><span>Sep 30</span><span>Oct 6</span><span>Oct 12</span></div></div>
        </div>
        <div className="portfolio-legend"><span><i className="legend-dot legend-navy" />SEN 27 <strong>₸2.40B</strong></span><span><i className="legend-dot legend-teal" />KTC 28 <strong>₸1.85B</strong></span><span><i className="legend-dot legend-violet" />AUA 26 <strong>₸0.96B</strong></span></div>
      </Card>

      <Card className="action-card">
        <div className="card-heading-row"><SectionHeading title="Next corporate action" detail="Action calendar" /><Link href="/actions" className="icon-button" aria-label="View actions"><ArrowRight size={17} /></Link></div>
        <div className="action-highlight"><div className="action-icon"><CircleDollarSign size={20} /></div><div><StatusBadge tone="amber">Processing</StatusBadge><h3>Quarterly coupon payment</h3><p>{bonds.find((bond) => bond.id === nextAction.bondId)?.name}</p></div></div>
        <div className="action-amount-row"><div><span className="muted-label">TOTAL DISTRIBUTION <MockLabel /></span><strong>{formatCurrency(nextAction.totalAmount)}</strong></div><div className="due-date"><span className="muted-label">PAYMENT DATE</span><strong>{formatDate(nextAction.paymentDate)}</strong></div></div>
        <div className="action-progress"><div className="progress-label"><span>Distribution readiness</span><strong>72%</strong></div><div className="progress-track"><i style={{ width: "72%" }} /></div></div>
        <Link href="/actions" className="text-link">Review corporate action <ArrowRight size={14} /></Link>
      </Card>

      <Card className="bonds-card">
        <div className="card-heading-row"><SectionHeading title="Bond registry" detail="Your latest bond issuances" /><Link href="/bonds" className="text-link">View all <ArrowRight size={14} /></Link></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Bond series</th><th>Coupon</th><th>Outstanding</th><th>Next payment</th><th>Status</th><th /></tr></thead><tbody>{bonds.map((bond) => <tr key={bond.id}><td><div className="bond-cell"><span className={`bond-mark mark-${bond.color}`}>{bond.ticker.slice(0, 1)}</span><span><strong>{bond.name}</strong><small>{bond.ticker} <span>·</span> {bond.issuer}</small></span></div></td><td>{bond.couponRate.toFixed(1)}%</td><td>{formatCurrency(bond.outstandingUnits * bond.faceValue)}</td><td>{formatDate(bond.nextCouponDate)}</td><td><StatusBadge tone={bond.status === "Active" ? "green" : "blue"}>{bond.status}</StatusBadge></td><td><button className="icon-button row-menu" aria-label={`More options for ${bond.ticker}`}><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table></div>
      </Card>

      <Card className="activity-card">
        <div className="card-heading-row"><SectionHeading title="Recent activity" detail="Latest on-chain events" /><Link href="/transactions" className="icon-button" aria-label="View all transactions"><ArrowRight size={17} /></Link></div>
        <div className="activity-list">{transactions.slice(0, 4).map((transaction, index) => <div className="activity-item" key={transaction.signature}><div className={`activity-icon activity-icon-${index}`}><ActivityIcon type={transaction.type} /></div><div className="activity-copy"><strong>{transaction.description}</strong><span>{transaction.bondTicker} <span>·</span> {formatDate(transaction.timestamp)}</span></div><StatusBadge tone={transaction.status === "Confirmed" ? "green" : "amber"}>{transaction.status}</StatusBadge></div>)}</div>
        <Link href="/transactions" className="text-link activity-footer">View transaction history <ArrowRight size={14} /></Link>
      </Card>
    </div>

    <div className="dashboard-grid bottom-grid">
      <Card className="snapshot-card"><div className="mini-card-icon mini-icon-blue"><ShieldCheck size={18} /></div><div className="mini-card-content"><div className="mini-card-title">Latest record-date snapshot <MockLabel /></div><p>{formatDate(snapshots[0].recordDate)} <span>·</span> {formatCompactNumber(snapshots[0].holderCount)} holders captured</p></div><div className="snapshot-slot"><span>SNAPSHOT SLOT</span><strong>#{formatCompactNumber(snapshots[0].snapshotSlot)}</strong></div><Link href="/actions" className="arrow-link" aria-label="View record-date snapshot"><ArrowRight size={17} /></Link></Card>
      <Card className="governance-card"><div className="mini-card-icon mini-icon-violet"><Vote size={18} /></div><div className="governance-info"><div className="mini-card-title">Active bondholder vote <MockLabel /></div><p>{activeProposal.title}</p><div className="vote-progress"><div className="progress-track"><i style={{ width: `${votingProgress}%` }} /></div><span>{votingProgress}% participation</span></div></div><Link href="/governance" className="arrow-link" aria-label="View governance"><ArrowRight size={17} /></Link></Card>
    </div>
    <div className="demo-callout"><div className="callout-icon"><Sparkles size={17} /></div><div><strong>Exploring the prototype?</strong><span>Every metric, transaction, and bond shown here is illustrative demo data and is not connected to a live wallet or Solana account.</span></div><Link href="/transactions">Learn more <ArrowRight size={13} /></Link></div>
  </>;
}

function MetricCard({ label, value, note, icon, trend, trendUp, trendAmber }: { label: string; value: string; note: string; icon: React.ReactNode; trend: string; trendUp?: boolean; trendAmber?: boolean }) {
  return <Card className="metric-card"><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value}</div><div className="metric-bottom"><span>{note}</span><span className={`metric-trend ${trendUp ? "trend-up" : ""} ${trendAmber ? "trend-amber" : ""}`}>{trendUp && <ArrowUpRight size={12} />}{trendAmber && <ArrowDownRight size={12} />}{trend}</span></div></Card>;
}

function ActivityIcon({ type }: { type: string }) {
  if (type === "Coupon") return <CircleDollarSign size={15} />;
  if (type === "Snapshot") return <ShieldCheck size={15} />;
  if (type === "Vote") return <Vote size={15} />;
  return <Landmark size={15} />;
}

