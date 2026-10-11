"use client";

import { useMemo, useReducer, useState } from "react";
import { ArrowRight, Check, RotateCcw, ShieldCheck } from "lucide-react";
import { Card, PageHeading, SectionHeading, StatusBadge } from "@/components/ui/primitives";
import {
  createInitialDemoState, DEMO_HOLDERS, DEMO_TERMS, getCouponEntitlement, getGovernanceTotals,
  getPrincipalEntitlement, transitionDemo, type DemoAction, type DemoState, type VoteChoice,
} from "@/lib/demo-lifecycle";

const STEPS = ["Bond issuance", "Record-date snapshot", "Coupon payments", "Bondholder vote", "Principal redemption"];
const DSET = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
function dset(amount: number) { return `${DSET.format(amount)} DSET`; }

function highestUnlocked(state: DemoState): number {
  switch (state.phase) {
    case "not_started": return -1;
    case "ready": case "issued": return 0;
    case "snapshot_finalized": case "coupon_funded": return 2;
    case "coupon_complete": case "governance_voting": case "governance_ready": return 3;
    case "governance_complete": case "redemption_funded": case "redeemed": return 4;
  }
}
function stepComplete(state: DemoState, index: number): boolean {
  if (index === 0) return !["not_started", "ready"].includes(state.phase);
  if (index === 1) return ["snapshot_finalized", "coupon_funded", "coupon_complete", "governance_voting", "governance_ready", "governance_complete", "redemption_funded", "redeemed"].includes(state.phase);
  if (index === 2) return ["coupon_complete", "governance_voting", "governance_ready", "governance_complete", "redemption_funded", "redeemed"].includes(state.phase);
  if (index === 3) return ["governance_complete", "redemption_funded", "redeemed"].includes(state.phase);
  return state.phase === "redeemed";
}

export function InteractiveDemo() {
  const [state, dispatch] = useReducer(transitionDemo, undefined, createInitialDemoState);
  const [activeStep, setActiveStep] = useState(0);
  const [voteChoices, setVoteChoices] = useState<Record<string, VoteChoice>>(() =>
    Object.fromEntries(DEMO_HOLDERS.map((holder) => [holder.id, holder.defaultVote])),
  );
  const result = useMemo(() => getGovernanceTotals(state), [state]);
  const unlocked = highestUnlocked(state);
  const reset = () => { dispatch({ type: "reset" }); setActiveStep(0); setVoteChoices(Object.fromEntries(DEMO_HOLDERS.map((holder) => [holder.id, holder.defaultVote]))); };
  const perform = (action: DemoAction) => dispatch(action);
  const continueTo = (index: number) => setActiveStep(index);
  const couponFull = getCouponEntitlement(DEMO_TERMS.bondSupply);
  const principalFull = getPrincipalEntitlement(DEMO_TERMS.bondSupply);

  return <div className="demo-lifecycle">
    <PageHeading eyebrow="PUBLIC INTERACTIVE DEMO" title="Bond lifecycle walkthrough" description="Run the complete sample corporate-action flow using deterministic, browser-only simulation." action={state.phase === "not_started"
      ? <button className="button button-primary" onClick={() => perform({ type: "start" })}>Start Demo <ArrowRight size={14}/></button>
      : <button className="button button-secondary" onClick={reset}><RotateCcw size={14}/>Reset Demo</button>} />

    <div className="demo-trust-notice" role="note">
      <ShieldCheck size={18}/><p><strong>Interactive educational simulation.</strong> No blockchain transactions, wallet signatures, or real token transfers occur in Demo Mode.</p>
    </div>

    <Card className="demo-terms-card">
      <div className="demo-term"><span>Face value</span><strong>{dset(DEMO_TERMS.faceValueDset)}</strong></div>
      <div className="demo-term"><span>Annual coupon</span><strong>{DEMO_TERMS.annualCouponPercent}% · {DEMO_TERMS.couponFrequency}</strong></div>
      <div className="demo-term"><span>Sample supply</span><strong>{DEMO_TERMS.bondSupply} bond units</strong></div>
      <div className="demo-term"><span>Settlement asset</span><strong>Simulated DSET</strong></div>
    </Card>

    <ol className="demo-progress" aria-label="Bond lifecycle progress">
      {STEPS.map((label, index) => {
        const complete = stepComplete(state, index);
        const current = state.phase !== "not_started" && !complete && index === activeStep;
        return <li key={label}>
          <button type="button" disabled={index > unlocked} aria-current={activeStep === index ? "step" : undefined}
            className={`demo-progress-step ${complete ? "is-complete" : ""} ${current ? "is-current" : ""}`}
            onClick={() => setActiveStep(index)}>
            <span className="demo-progress-number">{complete ? <Check size={14}/> : `0${index + 1}`}</span><span>{label}</span>
          </button>
        </li>;
      })}
    </ol>

    {state.phase === "not_started" ? <Card className="demo-start-card">
      <div className="demo-start-mark">KT</div><div><SectionHeading title="A complete bond story, step by step" detail="Issue a sample bond, lock record-date ownership, pay coupons, tally snapshot-weighted votes, and redeem principal."/>
      <p>Start whenever you’re ready. The investor holdings, record date, and calculations are fixed so every judge can replay the same walkthrough.</p></div>
      <button className="button button-primary" onClick={() => perform({ type: "start" })}>Start Demo <ArrowRight size={14}/></button>
    </Card> : <div className="demo-layout">
      <div className="demo-main-column">
        <Card className="demo-step-card">
          <div className="demo-step-heading">
            <div><div className="demo-step-eyebrow">STEP 0{activeStep + 1} · SIMULATED</div><h2>{STEPS[activeStep]}</h2></div>
            <StatusBadge tone={stepComplete(state, activeStep) ? "green" : "amber"}>{stepComplete(state, activeStep) ? "Completed" : "In progress"}</StatusBadge>
          </div>

          {activeStep === 0 && <section className="demo-step-body">
            <p className="demo-copy">Issue the complete sample series and register its three beneficial holders. The simulation closes issuance after the planned supply is allocated.</p>
            <InvestorTable state={state} view="issuance"/>
            <div className="demo-action-row"><div><span className="demo-label">Issued supply</span><strong>{state.bondSupply} / {DEMO_TERMS.bondSupply} units</strong></div>
              <button className="button button-primary" disabled={state.phase !== "ready"} onClick={() => perform({ type: "issue-bonds" })}>{stepComplete(state, 0) ? "Issuance simulated" : "Issue Demo Bonds"}</button></div>
            {state.issuanceClosed && <p className="demo-success"><Check size={14}/> Simulated issuance closed; registry contains 17 units.</p>}
          </section>}

          {activeStep === 1 && <section className="demo-step-body">
            <p className="demo-copy">A record-date snapshot freezes the eligible positions used by later coupons and voting. In this walkthrough the simulated issuance is closed first; the finalized snapshot cannot be edited.</p>
            <div className="demo-snapshot-callout"><span className="snapshot-lock"><ShieldCheck size={17}/></span><div><strong>Why the record date matters</strong><p>Corporate actions use ownership recorded at a defined cutoff. Later position changes do not rewrite finalized entitlements.</p></div></div>
            <InvestorTable state={state} view="snapshot"/>
            <div className="demo-action-row"><div><span className="demo-label">Snapshot</span><strong>{state.snapshotStatus === "finalized" ? `Finalized · ${state.snapshotDate}` : "Not created"}</strong></div>
              <button className="button button-primary" disabled={state.phase !== "issued"} onClick={() => perform({ type: "finalize-snapshot" })}>{stepComplete(state, 1) ? "Snapshot finalized" : "Simulate snapshot finalization"}</button></div>
            <p className="demo-inline-note">Eligible units: <strong>{state.eligibleUnits} / {DEMO_TERMS.bondSupply}</strong> · Simulated registry validation</p>
          </section>}

          {activeStep === 2 && <section className="demo-step-body">
            <p className="demo-copy">Each semiannual coupon is 10% annual interest ÷ 2 periods × {dset(DEMO_TERMS.faceValueDset)} face value = {dset(getCouponEntitlement(1))} per snapshot unit.</p>
            <div className="demo-escrow-strip"><div><span>Required reserve</span><strong>{dset(couponFull)}</strong></div><div><span>Paid to investors</span><strong>{dset(state.couponPaid)}</strong></div><div><span>Reserved remaining</span><strong>{dset(state.couponEscrowRemaining)}</strong></div>
              <div className="demo-mini-progress"><span style={{ width: `${couponFull ? state.couponPaid / couponFull * 100 : 0}%` }}/></div></div>
            {!state.couponFunded && <button className="button button-primary" disabled={state.phase !== "snapshot_finalized"} onClick={() => perform({ type: "fund-coupon" })}>Simulate funding {dset(couponFull)} coupon escrow</button>}
            {state.couponFunded && <InvestorTable state={state} view="coupon" onClaim={(investorId) => perform({ type: "claim-coupon", investorId })}/>}
            {state.couponPaid === couponFull && <p className="demo-success"><Check size={14}/> All {dset(couponFull)} simulated coupon reserves have been claimed.</p>}
          </section>}

          {activeStep === 3 && <section className="demo-step-body">
            <p className="demo-copy">The finalized snapshot determines voting weight. Cast each investor’s sample vote once, then finalize the informational result.</p>
            <div className="demo-proposal"><span className="proposal-tag">SIMULATED PROPOSAL</span><strong>Approve the proposed update to the bondholder communication policy.</strong></div>
            <div className="demo-vote-totals">
              <VoteMetric label="YES power" amount={result.yes} tone="yes"/><VoteMetric label="NO power" amount={result.no} tone="no"/><VoteMetric label="ABSTAIN" amount={result.abstain} tone="abstain"/>
            </div>
            <div className="demo-vote-bar" role="img" aria-label={`Votes: yes ${result.yes}, no ${result.no}, abstain ${result.abstain}`}>
              <i className="vote-yes" style={{ width: `${result.yes / Math.max(state.eligibleUnits, 1) * 100}%` }}/><i className="vote-no" style={{ width: `${result.no / Math.max(state.eligibleUnits, 1) * 100}%` }}/><i className="vote-abstain" style={{ width: `${result.abstain / Math.max(state.eligibleUnits, 1) * 100}%` }}/>
            </div>
            <div className="demo-quorum-row"><span>Participation <strong>{result.participation} / {result.eligible}</strong></span><span>Quorum <strong>{state.eligibleUnits ? (result.participation / state.eligibleUnits * 100).toFixed(0) : "0"}% / {DEMO_TERMS.quorumPercent}%</strong></span><StatusBadge tone={result.quorumMet ? "green" : "amber"}>{result.quorumMet ? "Quorum met" : "Quorum pending"}</StatusBadge></div>
            <InvestorTable state={state} view="vote" voteChoices={voteChoices}
              onVoteChoice={(id, choice) => setVoteChoices((current) => ({ ...current, [id]: choice }))}
              onVote={(investorId) => perform({ type: "cast-vote", investorId, choice: voteChoices[investorId] })}/>
            {state.phase === "governance_ready" && <button className="button button-primary demo-finalize-vote" onClick={() => perform({ type: "finalize-governance" })}>Finalize simulated result</button>}
            {state.governanceFinalized && <div className={`demo-result ${state.governanceOutcome === "passed" ? "result-passed" : "result-rejected"}`}><span>{state.governanceOutcome === "passed" ? "PASSED" : "REJECTED"}</span><strong>{result.yes} YES · {result.no} NO · {result.abstain} ABSTAIN</strong><small>Informational outcome only. No bond terms or on-chain state change.</small></div>}
            {!state.governanceFinalized && state.phase !== "governance_ready" && <p className="demo-inline-note">Approval requires YES to exceed 50% of decisive YES + NO power. Abstentions count toward quorum only.</p>}
          </section>}

          {activeStep === 4 && <section className="demo-step-body">
            <p className="demo-copy">The final simulated action pays each snapshot holder their face value entitlement, retires all 17 sample units, and leaves no outstanding principal.</p>
            <div className="demo-escrow-strip"><div><span>Total principal</span><strong>{dset(principalFull)}</strong></div><div><span>Paid</span><strong>{dset(state.principalPaid)}</strong></div><div><span>Remaining obligation</span><strong>{dset(state.principalEscrowRemaining)}</strong></div></div>
            {!state.redemptionFunded && <button className="button button-primary" disabled={state.phase !== "governance_complete"} onClick={() => perform({ type: "fund-redemption" })}>Simulate funding {dset(principalFull)} redemption escrow</button>}
            {state.redemptionFunded && <InvestorTable state={state} view="principal" onClaim={(investorId) => perform({ type: "claim-principal", investorId })}/>}
            {state.phase === "redeemed" && <div className="demo-final-summary"><div className="final-status"><Check size={18}/><strong>Redeemed</strong></div><div><span>Principal paid</span><strong>{dset(state.principalPaid)}</strong></div><div><span>Bond units retired</span><strong>{state.retiredBondUnits} / 17</strong></div><div><span>Outstanding supply</span><strong>{state.bondSupply}</strong></div></div>}
          </section>}
          <div className="demo-feedback" role="status" aria-live="polite">{state.message}</div>
        </Card>
        {stepComplete(state, activeStep) && activeStep < 4 && <button className="demo-continue" onClick={() => continueTo(activeStep + 1)}>Review next step <ArrowRight size={14}/></button>}
      </div>

      <aside className="demo-investor-panel">
        <Card className="demo-investor-card"><SectionHeading title="Investor summary" detail="All balances below are simulated DSET and snapshot units."/>
          <InvestorTable state={state} view="summary"/>
          <div className="demo-summary-totals"><div><span>Coupon paid</span><strong>{dset(state.couponPaid)}</strong></div><div><span>Principal paid</span><strong>{dset(state.principalPaid)}</strong></div></div>
        </Card>
        <Card className="demo-ledger-card"><SectionHeading title="Lifecycle ledger" detail="Local demo state only"/>
          <LedgerItem label="Issuance" value={state.issuanceClosed ? "Closed · 17 units" : "Pending"} done={state.issuanceClosed}/>
          <LedgerItem label="Snapshot" value={state.snapshotStatus === "finalized" ? `Finalized · ${state.eligibleUnits} eligible` : "Pending"} done={state.snapshotStatus === "finalized"}/>
          <LedgerItem label="Coupon escrow" value={state.couponFunded ? `${dset(state.couponPaid)} paid · ${dset(state.couponEscrowRemaining)} left` : "Not funded"} done={state.phase === "coupon_complete" || ["governance_voting", "governance_ready", "governance_complete", "redemption_funded", "redeemed"].includes(state.phase)}/>
          <LedgerItem label="Governance" value={state.governanceFinalized ? `Proposal ${state.governanceOutcome}` : "Pending"} done={state.governanceFinalized}/>
          <LedgerItem label="Redemption" value={state.phase === "redeemed" ? "Redeemed · supply 0" : state.redemptionFunded ? `${dset(state.principalPaid)} paid` : "Pending"} done={state.phase === "redeemed"}/>
        </Card>
      </aside>
    </div>}
    {state.phase === "redeemed" && <div className="demo-end-banner"><ShieldCheck size={18}/><div><strong>Walkthrough complete</strong><span>Reset Demo to run the same deterministic scenario again.</span></div><button className="button button-secondary" onClick={reset}><RotateCcw size={14}/>Restart</button></div>}
  </div>;
}

function InvestorTable({ state, view, onClaim, voteChoices, onVoteChoice, onVote }: {
  state: DemoState;
  view: "issuance" | "snapshot" | "coupon" | "vote" | "principal" | "summary";
  onClaim?: (investorId: string) => void;
  voteChoices?: Record<string, VoteChoice>;
  onVoteChoice?: (investorId: string, choice: VoteChoice) => void;
  onVote?: (investorId: string) => void;
}) {
  return <div className="demo-table-wrap"><table className="demo-investor-table">
    <thead><tr><th>Investor</th><th>{view === "snapshot" || view === "summary" ? "Snapshot units" : "Bond units"}</th>
      {(view === "coupon" || view === "summary") && <><th>Coupon</th><th>Coupon claim</th></>}
      {(view === "vote" || view === "summary") && <><th>Vote</th><th>Voting power</th></>}
      {(view === "principal" || view === "summary") && <><th>Principal</th><th>Principal claim</th></>}
      {view === "coupon" && <th>Action</th>}{view === "principal" && <th>Action</th>}{view === "vote" && <th>Action</th>}
    </tr></thead>
    <tbody>{state.investors.map((investor) => {
      const units = view === "snapshot" || view === "summary" ? investor.snapshotUnits : investor.bondUnits;
      const coupon = investor.couponReceived;
      const principal = investor.principalReceived;
      return <tr key={investor.id}><td><strong>{investor.id}</strong></td><td>{units}</td>
        {(view === "coupon" || view === "summary") && <><td>{dset(view === "coupon" ? getCouponEntitlement(investor.snapshotUnits) : coupon)}</td><td><StatusBadge tone={investor.couponClaimed ? "green" : "neutral"}>{investor.couponClaimed ? "Claimed" : "Pending"}</StatusBadge></td></>}
        {(view === "vote" || view === "summary") && <><td>{investor.vote ? investor.vote.toUpperCase() : "—"}</td><td>{investor.vote ? investor.snapshotUnits : view === "summary" ? investor.snapshotUnits : investor.snapshotUnits}</td></>}
        {(view === "principal" || view === "summary") && <><td>{dset(view === "principal" ? getPrincipalEntitlement(investor.snapshotUnits) : principal)}</td><td><StatusBadge tone={investor.principalClaimed ? "green" : "neutral"}>{investor.principalClaimed ? "Claimed" : "Pending"}</StatusBadge></td></>}
        {view === "coupon" && <td><button className="button button-secondary demo-row-button" disabled={!investor.snapshotUnits || investor.couponClaimed} onClick={() => onClaim?.(investor.id)}>{investor.couponClaimed ? "Claimed" : "Claim Simulated Coupon"}</button></td>}
        {view === "principal" && <td><button className="button button-secondary demo-row-button" disabled={!investor.snapshotUnits || investor.principalClaimed} onClick={() => onClaim?.(investor.id)}>{investor.principalClaimed ? "Claimed" : "Claim Simulated Principal"}</button></td>}
        {view === "vote" && <td>{investor.vote ? <StatusBadge tone="green">Vote cast</StatusBadge> : <div className="demo-vote-control"><label className="sr-only" htmlFor={`vote-${investor.id}`}>{investor.id} simulated vote choice</label><select id={`vote-${investor.id}`} value={voteChoices?.[investor.id] ?? "yes"} onChange={(event) => onVoteChoice?.(investor.id, event.target.value as VoteChoice)}><option value="yes">YES</option><option value="no">NO</option><option value="abstain">ABSTAIN</option></select><button className="button button-secondary demo-row-button" disabled={!investor.snapshotUnits} onClick={() => onVote?.(investor.id)}>Cast Demo Vote</button></div>}</td>}
      </tr>;
    })}</tbody>
  </table></div>;
}
function VoteMetric({ label, amount, tone }: { label: string; amount: number; tone: string }) {
  return <div className={`demo-vote-metric vote-${tone}`}><span>{label}</span><strong>{amount}</strong></div>;
}
function LedgerItem({ label, value, done }: { label: string; value: string; done: boolean }) {
  return <div className="demo-ledger-item"><span className={done ? "ledger-check" : "ledger-pending"}>{done ? <Check size={12}/> : "·"}</span><div><span>{label}</span><strong>{value}</strong></div></div>;
}
