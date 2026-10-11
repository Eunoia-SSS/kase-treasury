# KASE Treasury — Protocol Specification

**Status:** M1-M6 financial model, issuance/registry, snapshots, coupon settlement, principal redemption, and informational governance are implemented and local-validator tested. Frontend integration and Devnet remain future work.

## Financial model

- One bond token is one whole bond (bond mint decimals **0**); fractional bonds are unsupported in the MVP. Bond tokens stay in a program-controlled custody vault; wallet holders are represented by Position PDAs, not wallet SPL balances.
- Nominal principal is **1,000 DSET** per bond. DSET is a fabricated demo settlement SPL token with **6 decimals**, no monetary value, no KZT/USD conversion, and no peg. M4 binds each issuer once to an existing classic SPL mint with six decimals; the local test fixture creates and funds it outside the program.
- Amounts use unsigned integer base units: 1 DSET = 1,000,000 settlement base units; 1 bond = 1 bond base unit. Frontend display conversion must be explicit.
- Annual coupon rate is integer basis points: **1,000 bps = 10%**. Frequency is **2 equal periods per year**. No accrual/day-count adjustment, compounding, stub period, or business-day calendar is in the MVP.
- Times are UTC Unix seconds checked against Solana `Clock`. `record_date_ts < payment_date_ts`; maturity is immutable and redemption requires `now >= maturity_ts`.
- Each coupon action has a unique per-bond u64 period ID. Its schedule, snapshot, settlement mint, and calculation are fixed at creation.

Checked integer formula (no floating point):

```text
coupon_per_bond_base = floor(nominal_base × annual_coupon_bps / (10,000 × periods_per_year))
holder_coupon_base   = snapshot_bond_units × coupon_per_bond_base
holder_principal_base = snapshot_bond_units × nominal_base
```

Use checked `u128` intermediates and checked conversion to `u64`. For the example, 1,000 × 10% / 2 = 50 DSET per bond per period.

| Holder | Units at record date | Coupon (DSET) | Principal at maturity (DSET) |
| --- | ---: | ---: | ---: |
| Investor A | 10 | **500** | **10,000** |
| Investor B | 5 | **250** | **5,000** |
| Investor C | 2 | **100** | **2,000** |
| **Total** | **17** | **850** | **17,000** |

Displayed amounts multiply by 1,000,000 for token base units; all example amounts are exact. Coupon-per-bond division floors toward zero at one settlement base unit. Sub-base-unit fractional remainders are excluded from the required reserve and are not redistributed. Any future alternate distribution policy needs separate review. Any post-claim closeout/refund policy requires separate review. The example has no remainder.

Only the configured DSET mint is supported for payment. Each action must be fully funded before entering `Funded`; no partial completion or mint-on-demand. A token transfer, ClaimRecord creation, and accounting update occur atomically. Underfunding blocks the action.

## On-chain account model

| Account | Status and identity |
| --- | --- |
| IssuerConfig | Implemented PDA: issuer + issuer_id; current/pending authority. |
| Bond | Implemented PDA: bond + config + bond_id; DSET-base face value, coupon bps, semiannual frequency, maturity, cap, issued/outstanding units, status. |
| BondAuthority | Implemented PDA: bond_authority + bond; mint signer and vault owner. |
| Bond mint | Classic SPL mint PDA: bond_mint + bond; decimals 0; authority revoked at closure. |
| Bond vault | Classic SPL token PDA: bond_vault + bond; owner is BondAuthority; all bond tokens stay here. |
| RegistryState | Program PDA: registry + bond; holder count and total units. |
| RegistryEntry | Program PDA: registry_entry + bond + sequential u8 index; maximum 100 unique entries. |
| Position | Program PDA: position + bond + holder; holder and beneficial units. |
| RecordDateSnapshot | Implemented M3 PDA: snapshot + bond + snapshot_id; cutoff, expected/processed count and units, cursor, status and time/slot metadata. |
| SnapshotEntry | Implemented M3 PDA: snapshot_entry + snapshot + holder; one recorded Position, index and units per holder. |
| SettlementConfig | Implemented M4 PDA: settlement_config + issuer config; one classic SPL mint address and six-decimal assertion. |
| CouponPeriod | Implemented M4 PDA: coupon + bond + u64 period ID encoded little-endian; immutable terms, finalized snapshot, amount, funding/paid totals and status. |
| CouponAuthority | Implemented per-period PDA: coupon_authority + CouponPeriod; SPL escrow authority. |
| Coupon escrow | Implemented classic SPL token account PDA: coupon_vault + CouponPeriod; isolated per event, owned by CouponAuthority. |
| ClaimRecord | Implemented M4 PDA: coupon_claim + CouponPeriod + holder; amount and paid time/slot; unique per holder and event. |
| Redemption | Implemented M5 PDA [redemption, bond]; one principal event per bond, snapshot/face value and reserve totals. |
| RedemptionAuthority | Implemented PDA [redemption_authority, Redemption]; controls separate principal escrow. |
| Redemption escrow | Implemented classic SPL token PDA [redemption_vault, Redemption]. |
| RedemptionReceipt | Implemented M5 PDA [redemption_claim, Redemption + holder]; exact amount and paid time/slot. |
| Proposal | Implemented M6 PDA [governance_proposal, bond, proposal_id]; immutable terms, snapshot, window, thresholds, eligibility, tallies and status. |
| VoteReceipt | Implemented M6 PDA [vote_receipt, proposal, holder]; one signed immutable choice and snapshot-derived weight per holder. |

close_issuance reconciles mint supply and vault amount with Bond counters and RegistryState.total_units. Position and aggregate counters are updated atomically by the only M2 issuance paths; closure does not iterate all Position accounts. This is an accounting invariant, not an independent audit scan.

M2-M6 are implemented in one Rust source file. Generated IDL/types and deploy artifacts under ignored target/ are build output. Events cover issuer, authority, bond, position, snapshot, settlement-mint configuration, coupon creation/funding/claims, redemption, proposal creation, votes and final results.

## Record-date design

Anchor cannot retrieve arbitrary historical SPL token balances; RPC/indexer results are not on-chain proof. Eligibility comes from the M2 program-controlled beneficial ownership registry.

The implemented rule is a deterministic freeze:

1. Issuance must be closed. Closing irreversibly revokes mint authority, and no transfer or post-close position mutation instruction exists.
2. The issuer creates a unique snapshot with a UTC Unix-second record date. The instruction requires record_date_ts to be at least the current on-chain Clock time, rejecting retroactive snapshots.
3. Permissionless processing starts only when Clock reaches the record date. Each batch handles 1–5 consecutive registry indices and validates the RegistryEntry PDA, Position PDA, stored bond/holder identities, positive units, and unique SnapshotEntry PDA.
4. The header stores expected holder count and frozen units. Processing writes one entry per holder and advances a checked sequential cursor atomically. The caller pays entry rent.
5. Finalization requires expected count/cursor, exact unit total, and reconciliation with registry, bond outstanding, closed mint supply, and vault amount.

A future cutoff is reliable because the registry is frozen before that date. Late processing records the same units. No transfers are allowed in the MVP. The 100-holder and 5-entry batch limits bound work. The program does not reconstruct past account state.

M4 coupon claims, M5 principal claims, and M6 governance votes use the applicable finalized snapshot and immutable SnapshotEntry units. Later ownership models cannot revise finalized entitlements.

## Lifecycle, instructions, and settlement

Implemented M2 instructions: initialize_issuer, propose_issuer_authority, accept_issuer_authority, create_bond, register_holder, issue_units, close_issuance. Implemented M3 instructions: create_snapshot, process_snapshot_batch, finalize_snapshot. Implemented M4 instructions: configure_settlement_mint, create_coupon_period, fund_coupon_period, claim_coupon. Implemented M5 instructions: create_redemption, fund_redemption, activate_redemption, claim_redemption. Implemented M6 instructions: create_proposal, cast_vote, finalize_proposal. Registration requires issuer and holder signatures and mints to BondVault. close_issuance reconciles supply then revokes mint authority.

```text
Bond: Issuing -> IssuanceClosed -> Redeemed (terminal)
Snapshot: Scheduled -> Processing -> Finalized (immutable)
Coupon: Created -> Funded -> Complete (claim records remain immutable)
Redemption: Created -> Funded -> Activated -> Complete
Proposal: Open -> Passed | Rejected
```

create_redemption is issuer-authorized and requires Clock time at/after immutable maturity, closed issuance, a finalized same-bond snapshot, and exact registry/Bond/mint/vault reconciliation. The unique [redemption, bond] PDA limits one principal event. Required principal is snapshot.total_units * bond.face_value_base, calculated with checked u128 then checked u64 conversion.

fund_redemption accepts exactly the full reserve from a token account owned by the current issuer, using the configured six-decimal classic SPL settlement mint. Its PDA escrow is separate from coupons and cannot be withdrawn by the issuer. Activation is permissionless after maturity and exact full funding; it revalidates custody, burns all units from BondVault under BondAuthority PDA signing, checks mint supply and vault amount are zero, sets Bond status to terminal Redeemed, and sets Bond.outstanding to zero. Bond.issued, registry totals, Position accounts, and finalized snapshots retain historical values. No new issuance, snapshots, coupon periods, or redemption can follow.

A holder signs claim_redemption, references their finalized SnapshotEntry, and receives snapshot units * frozen face value into a classic SPL account owned by that holder. A unique [redemption_claim, redemption, holder] receipt and checked paid totals prevent replay; transfer and state updates are atomic. Previously funded M4 coupon periods remain claimable after retirement. Unclaimed principal has no sweep or recovery instruction. Unsolicited escrow deposits are surplus, cannot increase claims, and may remain stranded.

Solana transaction atomicity must ensure a failed CPI cannot leave a claim marked paid or units retired. Transitions are explicit, validated, and monotonic where possible.


### M4 coupon settlement

The issuer calls `configure_settlement_mint` once for its IssuerConfig. It accepts only an account owned by the classic SPL Token Program with six decimals. The prototype does not create or mint DSET on-chain; local tests make a throwaway six-decimal mint and mint demo tokens using a fixture authority. The mint has no price or monetary value.

`create_coupon_period` is issuer-authorized and requires a closed bond, a finalized snapshot for that bond, an exact snapshot record-date match, and a payment date strictly after the snapshot record date and no earlier than current Clock time. A unique `u64` period ID seeds one CouponPeriod per bond. It calculates per-bond coupon base units with checked `u128`, floor rounding, and a checked `u64` result; expected reserve equals that amount times finalized snapshot units. The record fixes all terms and links.

`fund_coupon_period` moves exactly the full expected amount from an issuer-owned DSET token account to the event's PDA-owned escrow. Partial, extra, duplicate, wrong-mint, or wrong-authority funding fails. The event becomes claimable only after the token CPI succeeds and the escrow reconciles.

At/after payment date, a holder must sign `claim_coupon`. The program requires the deterministic SnapshotEntry for that holder, same finalized snapshot and bond, and a DSET token account whose mint matches and owner is that holder. A ClaimRecord PDA prevents replay. Transfer, claim record, and counters update atomically. The accounted reserve is `funded_total - paid_total`; the actual escrow balance must be at least that amount and each outgoing claim is bounded by the accounted reserve. Unsolicited SPL deposits are surplus: they cannot increase entitlements or block claims. No sweep/close path exists, so any remainder or surplus stays in the isolated escrow indefinitely.

The code uses the M1 example unchanged: 1,000 DSET face, 1,000 annual bps, two periods/year, producing 50 DSET per bond per period. A/B/C with 10/5/2 units receive 500/250/100 DSET; the total reserve is 850 DSET (850,000,000 base units). The per-bond result floors at one DSET base unit; fractions smaller than that are not included in the funded entitlement and are not redistributed. The example divides exactly.

## Governance proposal and voting

The issuer may create a proposal only for a closed, not-yet-redeemed bond and a nonempty finalized snapshot belonging to that bond. A unique 32-byte proposal ID derives the Proposal PDA. Creation stores the current issuer, snapshot, 1-128 byte title, nonzero 32-byte content hash, voting start/end, quorum/approval thresholds in basis points, and eligible voting power copied from snapshot total units. The content hash commits to client-retained proposal text; the program does not fetch or interpret external content. Terms have no update instruction.

Voting starts at or after creation time and ends strictly after start; the maximum window is 365 days. Votes are accepted for Clock time in [start, end). Only the holder signing with the wallet matching a deterministic SnapshotEntry for this finalized snapshot can vote. Weight is the immutable entry's whole-bond units, never current SPL balances or Position values. The holder may cast one Yes, No or Abstain vote. A deterministic VoteReceipt PDA [vote_receipt, proposal, holder] is created once; a separate fee payer may cover rent, but cannot substitute for the holder signature. At most 100 voters can participate because the frozen registry has at most 100 holders.

Every vote uses checked additions and maintains yes + no + abstain = participating power <= eligible snapshot power. voter_count cannot exceed the snapshot holder count. Permissionless finalization is allowed only at or after voting_end_ts, verifies the snapshot and accounting again, stores final totals/time/slot, and changes status once from Open to Passed or Rejected.

The demo uses quorum_bps=5,000 and approval_bps=5,000. Quorum is met when participating_power * 10,000 >= eligible_power * quorum_bps; Abstain counts toward participation. Approval is met only when decisive power is nonzero and yes_power * 10,000 > (yes_power + no_power) * approval_bps. Thus exactly 50% Yes is not approval. Quorum failure, no Yes/No votes, abstain-only participation, or an approval tie results in Rejected. Calculations use checked u128 integers; no floating point is used. Thresholds are proposal-specific and must be between 1 and 10,000 bps for quorum and 0 and 10,000 bps for approval.

Once Bond is terminal Redeemed, new proposals are rejected. Proposals already open at redemption remain open against their original finalized snapshot and may conclude; their result is informational only and cannot change bond, coupon, redemption, or snapshot state. A passed result is not an instruction executor. Any amendment needs a separate future-effective issuer instruction, must not change finalized coupon/redemption entitlements, and is outside M6. There is no delegation, split voting, cancellation, extension, or proposal-content hosting in the program.
## Invariants and failure behavior

Reject unauthorized signer, bad PDA/owner/program/mint/decimals/account authority/vault/destination, stale/unfinalized snapshot, duplicate action/claim/redemption/vote, mutation at or after cutoff, invalid timestamps/rate/frequency, invalid state transition, overflow/underflow, incomplete or inconsistent snapshot, and insufficient reserves. Fail atomically.

Invariants: registry supply = outstanding units; finalized snapshot sum = cutoff outstanding units; action total = sum of holder amounts; claims/redemptions never exceed finalized entitlement; vault spend <= funded reserve; action/holder replay identities are unique; vote weight <= snapshot eligible weight; finalized snapshot and action terms are immutable.
