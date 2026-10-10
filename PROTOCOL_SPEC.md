# KASE Treasury — Protocol Specification

**Status:** M1 design plus M2 implementation record. Issuer, bond, registry, issuance, and closure are implemented and localnet-tested. Snapshots, settlement, redemption, governance, and Devnet behavior are not implemented.

## Financial model

- One bond token is one whole bond (bond mint decimals **0**); fractional bonds are unsupported in the MVP. Bond tokens stay in a program-controlled custody vault; wallet holders are represented by Position PDAs, not wallet SPL balances.
- Nominal principal is **1,000 DSET** per bond. DSET is a fabricated demo settlement SPL token with **6 decimals**, no monetary value, no KZT/USD conversion, and no peg. No settlement mint currently exists.
- Amounts use unsigned integer base units: 1 DSET = 1,000,000 settlement base units; 1 bond = 1 bond base unit. Frontend display conversion must be explicit.
- Annual coupon rate is integer basis points: **1,000 bps = 10%**. Frequency is **2 equal periods per year**. No accrual/day-count adjustment, compounding, stub period, or business-day calendar is in the MVP.
- Times are UTC Unix seconds checked against Solana `Clock`. `record_date_ts < payment_date_ts`; maturity is immutable and redemption requires `now >= maturity_ts`.
- Each coupon action has a unique sequential period index. Its schedule and terms version are fixed once activated.

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

Displayed amounts multiply by 1,000,000 for token base units; all example amounts are exact. Division floors toward zero at one settlement base unit. Fractional remainder is tracked as action dust and stays in the vault; it is never redistributed or rounded up. It cannot be swept while claims remain open. Any post-claim closeout/refund policy requires separate review. The example has no remainder.

Only the configured DSET mint is supported for payment. Each action must be fully funded before entering `Funded`; no partial completion or mint-on-demand. A transfer and claim-state change occur atomically. Underfunding blocks the action.

## M2 accounts and later planned accounts

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
| RecordDateSnapshot, SnapshotEntry | Planned M3 immutable cutoff eligibility and holder snapshot units. |
| CouponPeriod, ClaimRecord, PaymentVault | Planned M3 terms, funded settlement, unique claims. |
| RedemptionRecord | Planned unique maturity entitlement and atomic vault burn/position reduction. |
| Proposal, VoteRecord | Planned snapshot-weighted governance and unique vote. |

close_issuance reconciles mint supply and vault amount with Bond counters and RegistryState.total_units. Position and aggregate counters are updated atomically by the only M2 issuance paths; closure does not iterate all Position accounts. This is an accounting invariant, not an independent audit scan.

M2 is implemented in one Rust source file. Generated IDL/types and deploy artifacts under ignored target/ are build output. Current events cover issuer, authority, bond, and position transitions.

## Record-date design

An Anchor instruction cannot retrieve arbitrary historical SPL token balances. RPC/indexer queries are not proof to the program. The protocol must snapshot its own controlled registry and must not claim to have reconstructed arbitrary wallet history.

| Option | Benefit | MVP limitation |
| --- | --- | --- |
| A. Token-2022 NonTransferable wallet tokens | Holders visibly own wallet tokens; the extension blocks ordinary transfers. | Requires extension setup/validation and holder token-account lifecycle; future transfer support needs a new design and adds integration work to the pinned Anchor 0.31.1 scaffold. |
| B. Program-controlled classic SPL custody + Position PDAs | Direct classic SPL Token 7.0 CPI; all units remain in PDA vault custody. Position and sequential RegistryEntry PDAs form the eligibility registry. | Custodial beneficial positions, not wallet tokens; authority risk must be disclosed. No secondary transfer in MVP. |
| Explicit registered-holder snapshot (as a standalone source) | Bounded immutable list can be audited. | An operator-entered list is unsafe unless copied and reconciled against program-owned positions; it is a snapshot mechanism, not an ownership model. |

**Selected and implemented for M2: B.** BondAuthority controls the classic SPL mint and vault. Authorized instructions mint only to the vault. Position binds bond, holder, and units; RegistryEntry has a unique sequential index. Registration requires issuer authorization and holder signature. M2 validates PDA seeds, stored keys, token program, mint decimals/authority, and vault mint/authority. Localnet-only; not externally audited.

No transfers are allowed in the first MVP: there is no holder token balance to move and no `transfer_position` instruction. Only issuer-authorized issuance can increase positions while issuance is open; `close_issuance` irreversibly closes that path. A future transfer, if approved, must be program-mediated with source authorization, recipient acceptance, cutoff checks, and atomic position accounting. This model favors an enforceable registry over wallet transferability and is not a production custody recommendation.

For cutoff `T`, every position/supply-changing instruction reads `Clock.unix_timestamp` and rejects if `now >= T`; issuance must also be closed before action snapshots are enabled. After cutoff, `begin_snapshot` is permissionless and records the processing slot. Bounded `snapshot_batch` calls copy registry entries and validate each Position PDA to unique immutable entries; the registry stays locked until completion. Finalization requires all holders processed once, unique entries, snapshot units equal outstanding positions, and outstanding units equal `BondVault.amount` and mint supply. Store `T`, processing/finalization slots, holder count, and total units. Mutations at/after `T` fail even if the cranker starts later; chain clock, not browser time, is authoritative. UI shows scheduled cutoff and observed slots. Permissionless batching/finalization avoids issuer-controlled liveness. Registry cap is 100; initial batch cap is 5, subject to transaction-size/compute tests.

There are no holder-to-holder transfers in the MVP, before or after snapshot finalization. Issuance is the only increase path and ends permanently at `close_issuance`; later redemption is a one-way retirement path. From cutoff through finalization, all future position mutation paths must reject. Coupon/vote rights remain attached to the recorded snapshot holder even if a transfer instruction is added in a separately approved future milestone. A unique coupon-period PDA plus `ClaimRecord(coupon,holder)` prevents duplicate benefits. A unique maturity/holder redemption record prevents repeat principal; redemption later burns vault units and retires Position units atomically.

## Lifecycle, instructions, and settlement

Implemented M2 instructions: initialize_issuer, propose_issuer_authority, accept_issuer_authority, create_bond, register_holder, issue_units, close_issuance. Registration requires nonzero initial units plus issuer and holder signatures and mints only to BondVault. issue_units increases an existing position while issuance is open. close_issuance requires nonempty issuance and matching mint/vault/aggregate balances, then revokes mint authority. Planned later instructions include snapshots, coupons, redemption, and governance. No transfer or DSET settlement mint/sweep exists.

```text
Bond: Draft -> Active -> Matured -> Closed
Snapshot: Scheduled -> Building -> Finalized (immutable)
Coupon: Draft -> SnapshotBuilding -> SnapshotFinalized -> Funded -> Claiming -> Closed
Redemption: Scheduled -> Matured -> SnapshotFinalized -> Funded -> Claiming -> Closed
Proposal: Draft -> Voting -> Finalized(Passed | Rejected | NoQuorum)
```

At maturity, `now >= maturity_ts`, the maturity snapshot is finalized, and vault reserves cover `snapshot_units × nominal_base`. Holder signs; destination is a validated holder token account or another fixed authorized destination. Payment and burn/retirement plus unique redemption record are atomic. Unclaimed principal remains reserved; MVP does not permit issuer recovery.

Solana transaction atomicity must ensure a failed CPI cannot leave a claim marked paid or units retired. Transitions are explicit, validated, and monotonic where possible.

## Governance

Only issuer authority creates a proposal. It fixes content hash/reference, finalized snapshot, voting interval, proposal type, and quorum at creation. Default period is 7 days; a shorter Devnet demo period is clearly marked demo-only. Voter is a holder in `SnapshotEntry`; weight is snapshot whole-bond units. `VoteRecord(proposal,holder)` permits one immutable vote; no split voting/delegation in MVP. Voting closes at end timestamp and may be finalized permissionlessly. Quorum is at least **50%** of eligible units cast; For, Against, and Abstain count toward quorum. It passes only if `For > Against`; abstain is excluded from that comparison, and tie/no quorum is rejected. A passed proposal records a result only. Any future term amendment requires a separate explicit issuer instruction, new terms version and future effective time; it cannot revise finalized snapshots or coupon entitlements.

## Invariants and failure behavior

Reject unauthorized signer, bad PDA/owner/program/mint/decimals/account authority/vault/destination, stale/unfinalized snapshot, duplicate action/claim/redemption/vote, mutation at or after cutoff, invalid timestamps/rate/frequency, invalid state transition, overflow/underflow, incomplete or inconsistent snapshot, and insufficient reserves. Fail atomically.

Invariants: registry supply = outstanding units; finalized snapshot sum = cutoff outstanding units; action total = sum of holder amounts; claims/redemptions never exceed finalized entitlement; vault spend <= funded reserve; action/holder replay identities are unique; vote weight <= snapshot eligible weight; finalized snapshot and action terms are immutable.
