# KASE Treasury — Security Model

**Status:** M2 registry/issuance, M3 snapshots, M4 coupon controls, and M5 principal redemption are implemented and local-validator tested. Governance remains a requirement. Passing tests do not constitute an audit.

## Assets and trust boundaries

Protect issuer and upgrade authorities, bond mint/supply, PDA-owned bond custody vault, registered beneficial positions, immutable snapshots, DSET reserves, claim/redemption/vote records, and displayed transaction provenance. Boundaries include browser/wallet, issuer/operator/holder signers, Anchor program, classic SPL Token program, RPC/indexer, Devnet, environment configuration, and deployment keys. UI and RPC responses are not authorization; validated program state is authoritative.

## Assumptions

- Issuer may configure actions within bounds but cannot forge holder positions, mutate finalized snapshots, or withdraw action reserves arbitrarily.
- M2 implements non-transferable custodial ownership: bond SPL units are not distributed to holder wallets. All units remain in a PDA vault; beneficial ownership is in Position plus sequential RegistryEntry. This is a prototype-only custody trade-off.
- Registration requires holder signature plus issuer authorization. Issuance requires issuer authorization and mints only into the canonical bond vault. Holder proves control at registration, not through an SPL ATA.
- Holder controls their key; permissionless cranker can advance bounded snapshot/tally work but cannot choose balances or beneficiaries.
- RPC/indexer may be stale or incomplete; verify cluster, account owner, and transaction status.
- Demo tokens and Devnet SOL have no assumed value. Solana, selected token program, Anchor constraints, and deployed binary remain dependencies.
- No real assets, enforceable securities, custody, regulated settlement, or KASE affiliation are represented.

## Threats and required controls

The table lists controls across the roadmap; it does not mean every control is already live. M2 evidence and remaining work follow.

| Threat | Required control and test |
| --- | --- |
| Unauthorized issuer action | PDA-stored authority, signer and canonical-seed constraints, two-step authority handoff; test wrong/stale signer. |
| Upgrade-key compromise | Separate and document upgrade authority; Devnet-only deployer key kept outside repo; consider multisig before public release. |
| Duplicate coupon | Implemented unique `CouponPeriod(bond,period_id)` and `ClaimRecord(coupon,holder)` PDAs; one exact reserve; signer-bound entitlement; transfer and accounting update atomic. Local-validator tests replay. |
| Duplicate redemption | Implemented one [redemption, bond] event PDA and one [redemption_claim, redemption, holder] receipt. Holder signature, fixed SnapshotEntry, exact principal and atomic transfer/accounting prevent replay. Activation requires full funding before burning custody supply. |
| Duplicate/overweight vote | Unique vote PDA, immutable snapshot weight, tally bounded by eligible units; test duplicate and ineligible voter. |
| Invalid mint/account | Validate the classic SPL Token Program ID, mint, 0 bond decimals, state-appropriate mint authority (BondAuthority before issuance closure, none after), Position owner/seeds/keys, vault mint and PDA owner; reject holder ATAs and substituted accounts. |
| Unauthorized mint or vault movement | Mint only through issuer-authorized program instruction, CPI-signed by BondAuthority PDA, destination restricted to canonical BondVault. Do not expose generic withdrawal/transfer instructions. Test rogue issuer, wrong mint/vault, and attempted external signature. |
| Unintended direct bond transfer | No holder receives SPL units and no transfer instruction exists in MVP. Classic Token vault owner is a PDA with no external private key. Test that holder-created token accounts cannot withdraw vault tokens. |
| Snapshot manipulation | Close issuance, revoke mint authority, and provide no transfer/mutation instruction. Issuer cannot choose balances. Clock rejects past cutoffs and gates processing until record date. Bounded sequential processing validates registry/Position PDAs and creates one entry per holder; finalization reconciles count/units to registry, bond, mint and vault. Test cutoff, substitution, replay, incompleteness and totals. |
| Snapshot liveness | Permissionless batches of at most 5 and permissionless finalization after cutoff; cranker cannot choose holder or units. Test cutoff and 100-holder cap. |
| Overflow/rounding exploit | Integer base units, checked `u128` intermediate and `u64` conversions, input bounds, documented floor and dust policy; boundary/property tests. |
| Invalid lifecycle transition | Explicit enum/status guards, immutable activated terms/snapshots; test out-of-order and repeated calls. |
| Insufficient reserves | Implemented exact full-reserve funding before `Funded`; event remains Created on partial funding failure; escrow amount reconciles with funded minus paid; claims cannot exceed reserve. Local tests underfund and check escrow. |
| Time ambiguity | UTC Unix seconds from `Clock`, reject mutation at `now >= cutoff`, show scheduled time and slots; test just before/equal/after. |
| Misleading UI/indexer | Mark fixtures as mock; on live data show cluster/source/freshness; no fake explorer links; cross-check finalized state and signatures. |
| Secret leak | No private key/seed/API secret in source or `NEXT_PUBLIC_*`; safe `.env.example`, ignore local env/wallet/validator/build output, audit files and Git history before any public push. |

## M2–M3 implemented controls and test evidence

Implemented: issuer signer/PDA checks and two-step handoff; unique IDs; bounded terms; classic SPL program ID; 0-decimal mint with BondAuthority; canonical vault PDA/mint/owner; issuer and holder signatures; unique Position/RegistryEntry; 100-holder limit; issuer-only minting to vault; checked accounting and cap; lifecycle guards; aggregate/mint/vault reconciliation; permanent mint-authority revocation. No holder transfer or vault withdrawal instruction exists.

Verification: 3 Rust unit tests, anchor build, TypeScript test typecheck, and 6 Anchor local-validator groups passed. Tests cover issuer initialization/handoff/auth, mint/vault, registration/duplicate, wrong mint/vault, cap/accounting, 100/101 holders, closure/revocation. Tests do not prove absence of all exploits.

M3 implements forward-only dates, issuance freeze, bounded batches, unique holder entries, checked reconciliation, and finalization checks of registry, Bond, mint and vault. M4 implements six-decimal settlement configuration, immutable coupon terms, exact funding, holder-signed claims, replay records and atomic accounting. M5 implements maturity-gated redemption, separate escrow, full funding, permissionless activation, full custody burn, terminal Bond state and receipts. Funded coupons remain claimable after redemption. Tests cover payout amounts, duplicate/auth/account failures, time boundaries, reserves and M2-M4 regressions. Governance, Devnet, fuzzing and audit remain incomplete. Closure does not scan every Position.

## Snapshot invariants

1. Only the frozen program registry supplies snapshot balances.
2. Snapshot creation requires closed issuance and revoked mint authority. No transfer or post-close mutation exists. Past cutoffs fail; processing starts at/after cutoff.
3. Registry is bounded to 100 unique sequential holders. Batches validate registry and Position PDAs, create one deterministic entry per holder, and advance the cursor atomically.
4. Finalization requires each index, exact count/units and reconciliation with closed supply and vault custody. Entries and finalized headers have no mutation instruction.
5. Coupon and redemption claims reference finalized snapshots and immutable SnapshotEntry units; unique action/holder receipts prevent replay.
6. At activation, mint supply and custody vault become zero. Bond.outstanding becomes zero while Bond.issued, registry totals, Positions and snapshots retain historical values; terminal status prevents treating these values as live supply.
7. Historic external balances and transfers are unsupported.

## Authority and pause model

Issuer authority configures bonds/actions/proposals; safe snapshot processing, claims, and expired-result finalization should be permissionless. Pause scope must be explicit and cannot rewrite finalized entitlements or withdraw reserves. MVP requires two-step issuer handoff. Program upgrade authority is separate; document it. Production requires authority/custody review, likely multisig, legal/compliance review, and external audit.


## M4 coupon invariants

- SettlementConfig is created once by the current issuer authority and binds a classic SPL mint with six decimals. The mint's demo identity comes from the local fixture; the program neither mints nor treats DSET as money.
- CouponPeriod is unique by bond and period ID and can be created only for a finalized same-bond snapshot. Coupon rate/frequency are read from the immutable Bond; record date must match the snapshot; payment date cannot be in the past at event creation.
- The reserve is computed in checked integer base units and must be transferred in full exactly once from an issuer-owned token account before claims. No mint-on-claim, partial funding, generic withdrawal, or sweep instruction exists.
- Claim requires the signer to match the PDA-derived SnapshotEntry holder and exact finalized snapshot/bond. The destination must be initialized classic SPL, use the configured mint, and be owned by that signer.
- ClaimRecord uniqueness, checked counters, event status, token CPI, and balance reconciliation make replay or partial state changes fail atomically. Escrow balance must equal funded minus paid.
- This design locks unclaimed balances permanently in the prototype. It has no recovery/closeout path; if the UI displays a coupon, operators must disclose that limit.

## M5 principal-redemption invariants

- Redemption fixes the bond, finalized snapshot, settlement mint, face value, maturity, holder count and principal obligation at creation. Its PDA is unique per bond.
- The issuer funds the exact reserve before activation. Permissionless activation is maturity-gated and rechecks snapshot, registry aggregate, Bond counters, closed mint authority, supply and vault.
- One CPI burns all custody units before claims. A failed burn or post-CPI check rolls activation back atomically. Terminal Redeemed status, zero Bond.outstanding, zero mint supply and zero vault prevent future issuance, snapshots, coupon periods or another redemption.
- Each holder signs and matches the deterministic SnapshotEntry. Destination uses the event mint and belongs to the holder. RedemptionReceipt and checked totals permit one exact claim.
- Recorded reserve remaining is funded minus paid. Actual escrow must be at least that amount; claims cannot exceed it. Unsolicited deposits never increase entitlements and may remain locked as surplus.
- Previously funded coupon claims remain valid after redemption. New coupon periods are blocked. Historical snapshots, positions, registry totals and Bond.issued stay immutable.

## Required security tests before Devnet demo

Test correct/incorrect issuer and holder signers, PDAs, program IDs, 0-decimal bond mint, mint authority, vault token owner/mint, registry membership, duplicate holder and 100-holder cap, issuance overflow and closed issuance; verify no holder ATA receives units and no external wallet can move vault tokens. Later gates test cutoff boundary and lock, snapshot batching/completeness/duplicates/mismatch/cap/resumption; math, underfunding, duplicate claims/redemption, governance, CPI rollback, pause, and authority handoff. Local tests, static review, fuzzing, and dependency review are not an external audit; Devnet is not production readiness.

## Incident and residual risks

If a secret appears in files or Git history, stop before publication, explain exposure, and request approval before history rewrite; rotate exposed credentials through their owner. Never paste secrets in chat. Pause a compromised demo and state what is known; do not promise recovery without proof.

Unresolved risks: custody and authority compromise, scaling beyond 100 holders, issuer-selected future dates, unclaimed reserve closeout, RPC availability, legal characterization and no audit. M2–M3 are localnet-only; snapshot liveness depends on a caller.
