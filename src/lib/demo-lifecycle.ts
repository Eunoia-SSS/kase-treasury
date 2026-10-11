export const DEMO_TERMS = {
  faceValueDset: 1_000,
  annualCouponPercent: 10,
  couponFrequency: "Semiannual",
  couponPeriodsPerYear: 2,
  bondSupply: 17,
  recordDate: "2026-01-15",
  quorumPercent: 50,
  approvalPercent: 50,
} as const;

export const DEMO_HOLDERS = [
  { id: "Investor A", units: 10, defaultVote: "yes" },
  { id: "Investor B", units: 5, defaultVote: "no" },
  { id: "Investor C", units: 2, defaultVote: "abstain" },
] as const;

export type VoteChoice = "yes" | "no" | "abstain";
export type DemoPhase =
  | "not_started" | "ready" | "issued" | "snapshot_finalized"
  | "coupon_funded" | "coupon_complete" | "governance_voting"
  | "governance_ready" | "governance_complete" | "redemption_funded" | "redeemed";
export type DemoInvestor = {
  id: string; plannedUnits: number; bondUnits: number; snapshotUnits: number;
  couponClaimed: boolean; couponReceived: number; vote: VoteChoice | null;
  principalClaimed: boolean; principalReceived: number;
};
export type DemoState = {
  phase: DemoPhase; investors: DemoInvestor[]; issuanceClosed: boolean; bondSupply: number;
  snapshotStatus: "not-created" | "finalized"; snapshotDate: string | null; eligibleUnits: number;
  couponFunded: boolean; couponEscrowRemaining: number; couponPaid: number;
  governanceFinalized: boolean; governanceOutcome: "passed" | "rejected" | null;
  redemptionFunded: boolean; principalEscrowRemaining: number; principalPaid: number; retiredBondUnits: number;
  message: string;
};
export type DemoAction =
  | { type: "start" } | { type: "issue-bonds" } | { type: "finalize-snapshot" } | { type: "fund-coupon" }
  | { type: "claim-coupon"; investorId: string } | { type: "cast-vote"; investorId: string; choice: VoteChoice }
  | { type: "finalize-governance" } | { type: "fund-redemption" }
  | { type: "claim-principal"; investorId: string } | { type: "reset" };

export function createInitialDemoState(): DemoState {
  return {
    phase: "not_started",
    investors: DEMO_HOLDERS.map((holder) => ({
      id: holder.id, plannedUnits: holder.units, bondUnits: 0, snapshotUnits: 0,
      couponClaimed: false, couponReceived: 0, vote: null, principalClaimed: false, principalReceived: 0,
    })),
    issuanceClosed: false, bondSupply: 0, snapshotStatus: "not-created", snapshotDate: null,
    eligibleUnits: 0, couponFunded: false, couponEscrowRemaining: 0, couponPaid: 0,
    governanceFinalized: false, governanceOutcome: null, redemptionFunded: false,
    principalEscrowRemaining: 0, principalPaid: 0, retiredBondUnits: 0,
    message: "Start the walkthrough to begin the simulated lifecycle.",
  };
}

export function couponPerBondDset(): number {
  return DEMO_TERMS.faceValueDset * DEMO_TERMS.annualCouponPercent / 100 / DEMO_TERMS.couponPeriodsPerYear;
}

export function calculateGovernanceResult(yes: number, no: number, abstain: number, eligible: number) {
  const values = [yes, no, abstain, eligible];
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0) || eligible === 0) {
    throw new RangeError("Voting power must use non-negative safe integers and eligible power must be positive.");
  }
  const participation = yes + no + abstain;
  const decisive = yes + no;
  const quorumMet = participation * 2 >= eligible;
  const approved = quorumMet && decisive > 0 && yes * 2 > decisive;
  return { yes, no, abstain, decisive, participation, eligible, quorumMet, approved };
}

function reject(state: DemoState, message: string): DemoState { return { ...state, message }; }
function allClaimed(investors: DemoInvestor[], key: "couponClaimed" | "principalClaimed"): boolean {
  return investors.every((investor) => investor[key]);
}

export function transitionDemo(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "reset") return createInitialDemoState();
  if (action.type === "start") {
    if (state.phase !== "not_started") return reject(state, "The demo has already started. Use Reset Demo to restart.");
    return { ...state, phase: "ready", message: "Demo started. Issue the sample bond to continue." };
  }
  if (action.type === "issue-bonds") {
    if (state.phase !== "ready") return reject(state, "Issue the demo bond only once, after starting the walkthrough.");
    const investors = state.investors.map((investor) => ({ ...investor, bondUnits: investor.plannedUnits }));
    return { ...state, phase: "issued", investors, issuanceClosed: true, bondSupply: DEMO_TERMS.bondSupply, message: "Simulation complete: 17 bond units were issued and the sample issuance was closed." };
  }
  if (action.type === "finalize-snapshot") {
    if (state.phase !== "issued" || !state.issuanceClosed || state.bondSupply === 0) return reject(state, "Issue and close the sample bond before finalizing a record-date snapshot.");
    const investors = state.investors.map((investor) => ({ ...investor, snapshotUnits: investor.bondUnits }));
    const eligibleUnits = investors.reduce((sum, investor) => sum + investor.snapshotUnits, 0);
    if (eligibleUnits !== DEMO_TERMS.bondSupply) return reject(state, "The simulated registry total does not match the sample bond supply.");
    return { ...state, phase: "snapshot_finalized", investors, snapshotStatus: "finalized", snapshotDate: DEMO_TERMS.recordDate, eligibleUnits, message: "Snapshot finalized. These immutable balances determine simulated coupon and voting rights." };
  }
  if (action.type === "fund-coupon") {
    if (state.phase !== "snapshot_finalized" || state.snapshotStatus !== "finalized" || state.eligibleUnits === 0) return reject(state, "Finalize a non-empty record-date snapshot before funding coupons.");
    const reserve = couponPerBondDset() * state.eligibleUnits;
    return { ...state, phase: "coupon_funded", couponFunded: true, couponEscrowRemaining: reserve, message: `Simulation complete: ${reserve.toLocaleString("en-US")} DSET reserved for coupon claims.` };
  }
  if (action.type === "claim-coupon") {
    if (state.phase !== "coupon_funded" || !state.couponFunded) return reject(state, "Fully fund the simulated coupon escrow before any investor can claim.");
    const index = state.investors.findIndex((investor) => investor.id === action.investorId);
    if (index < 0) return reject(state, "Unknown simulated investor.");
    const investor = state.investors[index];
    if (investor.couponClaimed) return reject(state, `${investor.id} has already claimed this simulated coupon.`);
    const amount = couponPerBondDset() * investor.snapshotUnits;
    if (amount <= 0 || amount > state.couponEscrowRemaining) return reject(state, "The remaining simulated coupon reserve is insufficient.");
    const investors = state.investors.map((item, itemIndex) => itemIndex === index ? { ...item, couponClaimed: true, couponReceived: amount } : item);
    const complete = allClaimed(investors, "couponClaimed");
    return { ...state, phase: complete ? "coupon_complete" : "coupon_funded", investors, couponEscrowRemaining: state.couponEscrowRemaining - amount, couponPaid: state.couponPaid + amount, message: `${investor.id} received ${amount.toLocaleString("en-US")} simulated DSET coupon.` };
  }
  if (action.type === "cast-vote") {
    if (state.phase !== "coupon_complete" && state.phase !== "governance_voting") return reject(state, "Complete all simulated coupon claims before voting.");
    const index = state.investors.findIndex((investor) => investor.id === action.investorId);
    if (index < 0) return reject(state, "Unknown simulated investor.");
    const investor = state.investors[index];
    if (investor.vote) return reject(state, `${investor.id} has already cast a simulated vote.`);
    if (investor.snapshotUnits <= 0) return reject(state, "Only snapshot-eligible simulated investors may vote.");
    const investors = state.investors.map((item, itemIndex) => itemIndex === index ? { ...item, vote: action.choice } : item);
    const complete = investors.every((item) => item.vote !== null);
    return { ...state, phase: complete ? "governance_ready" : "governance_voting", investors, message: `${investor.id} cast a simulated ${action.choice.toUpperCase()} vote weighted by ${investor.snapshotUnits} snapshot units.` };
  }
  if (action.type === "finalize-governance") {
    if (state.phase !== "governance_ready" || state.governanceFinalized) return reject(state, "Cast one vote for every eligible investor before finalizing the simulated result.");
    const result = getGovernanceTotals(state);
    return { ...state, phase: "governance_complete", governanceFinalized: true, governanceOutcome: result.approved ? "passed" : "rejected", message: `Simulated vote finalized: proposal ${result.approved ? "PASSED" : "REJECTED"}.` };
  }
  if (action.type === "fund-redemption") {
    if (state.phase !== "governance_complete" || !state.governanceFinalized) return reject(state, "Finalize the simulated governance vote before funding principal redemption.");
    const reserve = DEMO_TERMS.faceValueDset * state.eligibleUnits;
    return { ...state, phase: "redemption_funded", redemptionFunded: true, principalEscrowRemaining: reserve, message: `Simulation complete: ${reserve.toLocaleString("en-US")} DSET reserved for principal claims.` };
  }
  if (action.type === "claim-principal") {
    if (state.phase !== "redemption_funded" || !state.redemptionFunded) return reject(state, "Fund the simulated principal escrow before any investor can claim.");
    const index = state.investors.findIndex((investor) => investor.id === action.investorId);
    if (index < 0) return reject(state, "Unknown simulated investor.");
    const investor = state.investors[index];
    if (investor.principalClaimed) return reject(state, `${investor.id} has already claimed simulated principal.`);
    const amount = DEMO_TERMS.faceValueDset * investor.snapshotUnits;
    if (amount <= 0 || amount > state.principalEscrowRemaining) return reject(state, "The remaining simulated principal reserve is insufficient.");
    const investors = state.investors.map((item, itemIndex) => itemIndex === index ? { ...item, principalClaimed: true, principalReceived: amount } : item);
    const complete = allClaimed(investors, "principalClaimed");
    return {
      ...state, phase: complete ? "redeemed" : "redemption_funded", investors,
      principalEscrowRemaining: state.principalEscrowRemaining - amount, principalPaid: state.principalPaid + amount,
      bondSupply: complete ? 0 : state.bondSupply,
      retiredBondUnits: complete ? state.retiredBondUnits + state.eligibleUnits : state.retiredBondUnits,
      message: complete ? "Simulation complete: 17,000 DSET principal paid; all 17 bond units retired." : `${investor.id} received ${amount.toLocaleString("en-US")} simulated DSET principal.`,
    };
  }
  return reject(state, "Unsupported demo action.");
}

export function getCouponEntitlement(units: number): number {
  if (!Number.isSafeInteger(units) || units < 0) throw new RangeError("Bond units must be a non-negative safe integer.");
  return couponPerBondDset() * units;
}
export function getPrincipalEntitlement(units: number): number {
  if (!Number.isSafeInteger(units) || units < 0) throw new RangeError("Bond units must be a non-negative safe integer.");
  return DEMO_TERMS.faceValueDset * units;
}
export function getGovernanceTotals(state: DemoState) {
  const totals = state.investors.reduce((sum, investor) => {
    if (investor.vote === "yes") sum.yes += investor.snapshotUnits;
    if (investor.vote === "no") sum.no += investor.snapshotUnits;
    if (investor.vote === "abstain") sum.abstain += investor.snapshotUnits;
    return sum;
  }, { yes: 0, no: 0, abstain: 0 });
  return calculateGovernanceResult(totals.yes, totals.no, totals.abstain, Math.max(state.eligibleUnits, 1));
}
