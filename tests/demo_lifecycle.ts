import assert from "node:assert/strict";
import { describe, it } from "mocha";
import {
  calculateGovernanceResult, createInitialDemoState, DEMO_HOLDERS, getCouponEntitlement,
  getPrincipalEntitlement, transitionDemo, type DemoAction, type DemoState,
} from "../src/lib/demo-lifecycle";

function act(state: DemoState, action: DemoAction): DemoState {
  return transitionDemo(state, action);
}
function issueAndSnapshot(): DemoState {
  let state = act(createInitialDemoState(), { type: "start" });
  state = act(state, { type: "issue-bonds" });
  return act(state, { type: "finalize-snapshot" });
}
function finishCoupons(): DemoState {
  let state = issueAndSnapshot();
  state = act(state, { type: "fund-coupon" });
  for (const investor of DEMO_HOLDERS) state = act(state, { type: "claim-coupon", investorId: investor.id });
  return state;
}
function finishGovernance(): DemoState {
  let state = finishCoupons();
  for (const investor of DEMO_HOLDERS) state = act(state, { type: "cast-vote", investorId: investor.id, choice: investor.defaultVote });
  return act(state, { type: "finalize-governance" });
}
function finishWalkthrough(): DemoState {
  let state = act(finishGovernance(), { type: "fund-redemption" });
  for (const investor of DEMO_HOLDERS) state = act(state, { type: "claim-principal", investorId: investor.id });
  return state;
}

describe("M9B deterministic public demo state machine", () => {
  it("issues exactly 17 units to A/B/C and rejects snapshot before issuance", () => {
    let state = createInitialDemoState();
    const early = act(state, { type: "finalize-snapshot" });
    assert.equal(early.phase, "not_started");
    assert.match(early.message, /Issue and close/);
    state = act(state, { type: "start" });
    state = act(state, { type: "issue-bonds" });
    assert.deepEqual(state.investors.map((investor) => investor.bondUnits), [10, 5, 2]);
    assert.equal(state.bondSupply, 17);
    assert.equal(state.issuanceClosed, true);
    assert.equal(act(state, { type: "issue-bonds" }).bondSupply, 17);
    assert.equal(act(state, { type: "finalize-snapshot" }).snapshotStatus, "finalized");
  });

  it("freezes deterministic snapshot ownership and records 17 eligible units", () => {
    const state = issueAndSnapshot();
    assert.equal(state.snapshotStatus, "finalized");
    assert.equal(state.snapshotDate, "2026-01-15");
    assert.deepEqual(state.investors.map((investor) => investor.snapshotUnits), [10, 5, 2]);
    assert.equal(state.eligibleUnits, 17);
  });

  it("calculates and pays a fully funded 850 DSET semiannual coupon once per holder", () => {
    assert.equal(getCouponEntitlement(10), 500);
    assert.equal(getCouponEntitlement(5), 250);
    assert.equal(getCouponEntitlement(2), 100);
    let state = issueAndSnapshot();
    const early = act(state, { type: "claim-coupon", investorId: "Investor A" });
    assert.equal(early.couponPaid, 0);
    state = act(state, { type: "fund-coupon" });
    assert.equal(state.couponEscrowRemaining, 850);
    state = act(state, { type: "claim-coupon", investorId: "Investor A" });
    assert.equal(state.couponPaid, 500);
    assert.equal(state.couponEscrowRemaining, 350);
    const duplicate = act(state, { type: "claim-coupon", investorId: "Investor A" });
    assert.equal(duplicate.couponPaid, 500);
    assert.equal(duplicate.investors[0].couponReceived, 500);
    state = act(state, { type: "claim-coupon", investorId: "Investor B" });
    state = act(state, { type: "claim-coupon", investorId: "Investor C" });
    assert.equal(state.couponPaid, 850);
    assert.equal(state.couponEscrowRemaining, 0);
    assert.equal(state.phase, "coupon_complete");
  });

  it("rejects a claim larger than the remaining funded coupon reserve", () => {
    const funded = act(issueAndSnapshot(), { type: "fund-coupon" });
    const underfunded: DemoState = { ...funded, couponEscrowRemaining: 499 };
    const result = act(underfunded, { type: "claim-coupon", investorId: "Investor A" });
    assert.equal(result.couponPaid, 0);
    assert.equal(result.investors[0].couponClaimed, false);
    assert.match(result.message, /insufficient/);
  });

  it("uses snapshot voting weights and produces the expected 10/5/2 passed result", () => {
    let state = finishCoupons();
    state = act(state, { type: "cast-vote", investorId: "Investor A", choice: "yes" });
    const earlyFinalize = act(state, { type: "finalize-governance" });
    assert.equal(earlyFinalize.governanceFinalized, false);
    const duplicate = act(state, { type: "cast-vote", investorId: "Investor A", choice: "no" });
    assert.equal(duplicate.investors[0].vote, "yes");
    state = act(state, { type: "cast-vote", investorId: "Investor B", choice: "no" });
    state = act(state, { type: "cast-vote", investorId: "Investor C", choice: "abstain" });
    assert.equal(state.phase, "governance_ready");
    state = act(state, { type: "finalize-governance" });
    assert.deepEqual(
      [state.governanceOutcome, state.governanceFinalized, state.investors.map((investor) => investor.vote)],
      ["passed", true, ["yes", "no", "abstain"]],
    );
    assert.equal(act(state, { type: "finalize-governance" }).governanceOutcome, "passed");
  });

  it("enforces inclusive 50% quorum, strict majority, and abstention quorum weight", () => {
    assert.equal(calculateGovernanceResult(5, 0, 0, 10).quorumMet, true);
    assert.equal(calculateGovernanceResult(4, 0, 0, 10).quorumMet, false);
    assert.equal(calculateGovernanceResult(5, 5, 0, 10).approved, false);
    assert.equal(calculateGovernanceResult(6, 4, 0, 10).approved, true);
    const abstain = calculateGovernanceResult(5, 5, 7, 17);
    assert.equal(abstain.participation, 17);
    assert.equal(abstain.quorumMet, true);
    assert.equal(abstain.approved, false);
  });

  it("calculates principal, prevents duplicate claims, and retires all 17 units", () => {
    assert.deepEqual([getPrincipalEntitlement(10), getPrincipalEntitlement(5), getPrincipalEntitlement(2)], [10_000, 5_000, 2_000]);
    let state = finishGovernance();
    const early = act(state, { type: "claim-principal", investorId: "Investor A" });
    assert.equal(early.principalPaid, 0);
    state = act(state, { type: "fund-redemption" });
    assert.equal(state.principalEscrowRemaining, 17_000);
    state = act(state, { type: "claim-principal", investorId: "Investor A" });
    assert.equal(state.principalPaid, 10_000);
    const duplicate = act(state, { type: "claim-principal", investorId: "Investor A" });
    assert.equal(duplicate.principalPaid, 10_000);
    assert.equal(duplicate.investors[0].principalReceived, 10_000);
    state = act(state, { type: "claim-principal", investorId: "Investor B" });
    state = act(state, { type: "claim-principal", investorId: "Investor C" });
    assert.equal(state.principalPaid, 17_000);
    assert.equal(state.principalEscrowRemaining, 0);
    assert.equal(state.retiredBondUnits, 17);
    assert.equal(state.bondSupply, 0);
    assert.equal(state.phase, "redeemed");
  });

  it("rejects principal overclaim and redemption before the prior steps finish", () => {
    const beforeVote = finishCoupons();
    assert.equal(act(beforeVote, { type: "fund-redemption" }).redemptionFunded, false);
    const funded: DemoState = { ...finishGovernance(), principalEscrowRemaining: 9_999, redemptionFunded: true, phase: "redemption_funded" };
    const result = act(funded, { type: "claim-principal", investorId: "Investor A" });
    assert.equal(result.principalPaid, 0);
    assert.equal(result.investors[0].principalClaimed, false);
    assert.match(result.message, /insufficient/);
  });

  it("resets all lifecycle and investor state to the deterministic initial state", () => {
    const completed = finishWalkthrough();
    assert.equal(completed.phase, "redeemed");
    const reset = act(completed, { type: "reset" });
    assert.deepEqual(reset, createInitialDemoState());
  });
});
