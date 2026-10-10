import { ArrowRight, Check, Clock3, Plus, Vote, X } from "lucide-react";
import { Card, MockLabel, PageHeading, SectionHeading, StatusBadge } from "@/components/ui/primitives";
import { bonds, proposals } from "@/lib/mock-data";
import { formatDate, formatCompactNumber } from "@/lib/format";

export default function GovernancePage() {
  return <>
    <PageHeading eyebrow="BONDHOLDER GOVERNANCE" title="Governance" description="Track bondholder proposals and participation weighted by eligible units." action={<button className="button button-primary" disabled title="Proposal creation is planned for a later milestone"><Plus size={16} />Create proposal</button>} />
    <div className="dashboard-grid stat-grid compact-stats">
      <Card className="metric-card"><div className="metric-top"><span>Active proposals</span><span className="metric-icon"><Vote size={18} /></span></div><div className="metric-value">01</div><div className="metric-bottom"><span>Open for bondholder vote</span><StatusBadge tone="blue">Voting open</StatusBadge></div></Card>
      <Card className="metric-card"><div className="metric-top"><span>Eligible voting units</span><span className="metric-icon">◎</span></div><div className="metric-value">4.25M</div><div className="metric-bottom"><span>Across 2 demo series</span><span className="metric-trend">Snapshot-weighted</span></div></Card>
      <Card className="metric-card"><div className="metric-top"><span>Average participation</span><span className="metric-icon">%</span></div><div className="metric-value">70.8%</div><div className="metric-bottom"><span>Illustrative turnout</span><span className="metric-trend trend-up">+5.2%</span></div></Card>
    </div>
    <Card className="proposal-list-card"><div className="card-heading-row"><SectionHeading title="Proposals" detail="Voting power shown in bond units" /><MockLabel /></div><div className="proposal-list">{proposals.map((proposal) => {
      const bond = bonds.find((item) => item.id === proposal.bondId);
      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      const participation = Math.min(100, Math.round(totalVotes / proposal.eligibleUnits * 100));
      const forPercent = totalVotes ? Math.round(proposal.votesFor / totalVotes * 100) : 0;
      return <article className="proposal-item" key={proposal.id}>
        <div className="proposal-main"><div className="proposal-topline"><StatusBadge tone={proposal.status === "Active" ? "blue" : "green"}>{proposal.status === "Active" ? "Voting open" : "Passed"}</StatusBadge><span className="proposal-bond">{bond?.ticker} <span>·</span> {bond?.name}</span></div><h3>{proposal.title}</h3><p>{proposal.description}</p><div className="proposal-meta"><span><Clock3 size={14} />{proposal.status === "Active" ? `Voting ends ${formatDate(proposal.votingEndsAt)}` : `Closed ${formatDate(proposal.votingEndsAt)}`}</span><span><Vote size={14} />{formatCompactNumber(proposal.eligibleUnits)} eligible units</span></div></div>
        <div className="proposal-results"><div className="vote-counts"><div><span className="vote-choice"><Check size={13} />For</span><strong>{formatCompactNumber(proposal.votesFor)}</strong></div><div><span className="vote-choice vote-against"><X size={13} />Against</span><strong>{formatCompactNumber(proposal.votesAgainst)}</strong></div></div><div className="vote-bar"><i style={{ width: `${forPercent}%` }} /><i style={{ width: `${100 - forPercent}%` }} /></div><div className="participation-label"><span>{participation}% participation</span><span>{proposal.status === "Active" ? "Snapshot weighted" : "Result recorded"}</span></div>{proposal.status === "Active" && <div className="proposal-actions"><button className="button button-secondary" disabled title="Proposal details are planned for a later milestone">View details <ArrowRight size={14} /></button><button className="button button-primary" disabled title="Wallet voting is planned for a later milestone">Cast vote</button></div>}</div>
      </article>;
    })}</div></Card>
    <div className="inline-info"><Vote size={17} /><span><strong>Voting is not connected to a wallet.</strong> Vote totals and outcomes are fabricated sample values. Eligibility and tally rules require protocol specification before implementation.</span></div>
  </>;
}

