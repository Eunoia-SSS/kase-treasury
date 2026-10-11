# KASE Treasury — Master Plan

## Purpose and boundaries

KASE Treasury is an independent educational prototype for tokenized bond lifecycle management and corporate actions on Solana, prepared in the context of the Superteam Kazakhstan × KASE Corporate Actions on Blockchain challenge. It is not an official KASE product and claims no partnership, endorsement, or approval. DSET values are fabricated Devnet test-token amounts, not money, KZT, or a pegged asset. This project does not claim to issue legally enforceable securities, replace regulated infrastructure, provide custody, or be production-ready.

This file is the primary development roadmap. M1 specifications define the demonstration model; M2 implementation status and evidence are recorded below. A planned feature is not implemented until its milestone is built and its acceptance checks pass.

## Product scope

The target workflow covers issuer setup, bond registry, snapshots, coupons, redemption, governance, and verifiable transaction history. The Next.js app remains a mock dashboard. M2 issuance/registry, M3 snapshots, M4 coupon settlement, M5 principal redemption, and M6 snapshot-weighted governance are implemented and local-validator-tested. Wallet client and deployment remain unimplemented. See [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [PROTOCOL_SPEC.md](./PROTOCOL_SPEC.md), [SECURITY_MODEL.md](./SECURITY_MODEL.md), and [ARCHITECTURE.md](./ARCHITECTURE.md).

## Proposed architecture

- **Web:** Next.js App Router, TypeScript, Tailwind CSS, reusable components, and a typed data-access boundary. Mock fixtures are the current source.
- **Program:** M2 issuer, bond, custody, registry, issuance and closure; M3 snapshots; M4 coupon configuration, funding, and claims; M5 principal redemption; and M6 informational governance are implemented and local-validator-tested. Frontend chain workflows remain future work.
- **Tokens:** Bond units are whole tokens (0 decimals). M2 creates a classic SPL bond mint in a BondAuthority PDA vault. M4/M5 use an existing issuer-registered classic SPL six-decimal demo settlement mint; the program does not mint DSET.
- **Registry/snapshot:** Position and sequential RegistryEntry PDAs use compact RegistryState and a 100-holder cap. Registration needs holder and issuer signatures. M3 requires issuance closure, forward-only Clock cutoff and batches of at most five sequential holders.
- **History:** Confirmed transaction signatures and validated program accounts are authoritative. Optional indexer is only a read accelerator.
- **Release:** Local validator first, then Devnet only. GitHub and Vercel work are later milestones and must not overwrite remote work or expose secrets. No Mainnet deployment.

## Milestones

### M0 — Frontend foundation

**Status:** Next.js foundation exists; the user previously reported that the dev server starts and production build passes. The UI is mock-only. M2 Anchor code is implemented separately; no claim is made here that frontend lint/typecheck was rerun in this milestone.

- **Tasks:** Create responsive Next.js routes, reusable UI, typed mock data, Anchor workspace skeleton, environment example, ignore rules, and base docs.
- **Files:** `src/app/**`, `src/components/**`, `src/lib/**`, `src/types/domain.ts`, `programs/kase_treasury/**`, `Anchor.toml`, root config/docs.
- **Dependencies:** Node.js/npm; Rust/Solana/Anchor not needed for UI-only work.
- **Acceptance:** Routes render; mock-only state is labeled; no wallet/RPC claims; README and ignore rules describe current boundaries.
- **Tests:** `npm run lint`, `npm run typecheck`, `npm run build`, route smoke test when dependency installation works.
- **Risks:** Managed/OneDrive filesystem previously reported `EPERM` during npm install; re-check in the current project path before attributing cause. No system permissions/security settings should be weakened.

### M1 — Product and protocol specification

**Status:** Completed. M1 assumptions are documented consistently; M2 implements the selected classic SPL custody model without changing the financial model.

- **Tasks:** Fix target users/journeys/scope/demo; specify 1,000 DSET face, 10% annual coupon, semiannual periods, 0-decimal bond units, 6-decimal DSET, integer/floor math; define account model, timestamps, cutoff snapshot, transfer semantics, claims, redemption, governance, threat model, and milestone acceptance gates.
- **Files:** `PRODUCT_SPEC.md`, `PROTOCOL_SPEC.md`, `SECURITY_MODEL.md`, `ARCHITECTURE.md`, `MASTER_PLAN.md`, plus README links/status.
- **Dependencies:** Current scaffold and explicit product assumptions; no toolchain installation or blockchain implementation.
- **Acceptance:** Documents agree on demo-only status, decimals, formulas, snapshot source, cutoff/transfer behavior, duplicate protection, governance, and limitations. Reviewed before M2 implementation.
- **Tests:** Manual consistency review; calculate expected 500/250/100 coupon and 10,000/5,000/2,000 principal; ensure no document implies planned behavior is live.
- **Risks:** Token transfer policy, legal characterization, clock cutoff expectations, registry cap, vault closeout, and authority model remain implementation/review risks.

### M2 — Anchor program and bondholder registry

**Status:** Implemented and verified on localnet. Educational prototype; not audited or production-ready.

**Selected model:** Classic SPL Token, 0-decimal bond mint, BondAuthority PDA mint authority and vault owner, all bond units in the controlled BondVault, beneficial ownership in program-owned Position PDAs. No holder token accounts or transfer instruction exist. M1 financial terms are unchanged.

- **Toolchain:** Anchor 0.31.1, Solana CLI 2.1.0, Rust/Cargo host MSRV 1.79; Cargo.lock pins compatible dependencies. Direct spl-token 7.0.0 CPI is used because Anchor SPL dependency resolution produced a Solana set incompatible with the pinned SBF build.
- **Source:** programs/kase_treasury/src/lib.rs contains instruction handlers, constraints, SPL CPI helpers, state, errors, and events.
- **Accounts/seeds:** IssuerConfig (issuer + issuer_id), Bond (bond + config + bond_id), BondAuthority (bond_authority + bond), mint (bond_mint + bond), vault (bond_vault + bond), RegistryState (registry + bond), RegistryEntry (registry_entry + bond + sequential u8 index), Position (position + bond + holder). RegistryState stores holder count and total units; sequential RegistryEntry PDAs permit bounded enumeration without a fixed 100-key array.
- **Instructions:** initialize_issuer, propose_issuer_authority, accept_issuer_authority, create_bond, register_holder, issue_units, close_issuance.
- **Controls:** Unique nonzero IDs; two-step issuer handoff; bounded terms; 0-decimal classic SPL mint; issuer and holder registration signatures; unique Position and RegistryEntry; 100-holder cap; issuer-only CPI minting into the vault; checked accounting and supply cap. Closure requires nonempty issuance, reconciles bond counters, registry totals, mint supply, and vault amount, then permanently sets mint authority to None.
- **Tests run:** cargo test -p kase_treasury -q (3 passed); anchor build (success); npm exec -- tsc --noEmit -p tests/tsconfig.json (success); anchor test --provider.wallet target/localnet-wallet.json (6 local-validator groups passed). Coverage includes initialization/authority handoff, mint and vault properties, registration/duplicate rejection, wrong mint/vault, cap/accounting, 100/101 holders, closure and revocation.
- **At M2:** Closure reconciles atomic aggregates; it does not iterate every Position PDA. Later milestones subsequently implemented snapshots (M3) and coupons (M4). Redemption, governance, wallet/RPC frontend, Devnet, and Vercel remain future work. Anchor macro cfg warnings and Node/bigint warnings remain.

### M3 — Record-date snapshots

**Status:** Implemented and verified on a local Solana validator. Snapshot scope only; coupon, payment, redemption and governance execution were not added.

- Eligibility: close_issuance permanently ends issuance, revokes mint authority, and leaves no transfer or position mutation path. Issuer creates a snapshot after closure with record_date_ts at or after Clock.unix_timestamp. Past dates fail. Processing starts at/after cutoff. The frozen registry defines present/future eligibility; no historical reconstruction is claimed.
- Accounts: RecordDateSnapshot PDA [snapshot, bond, snapshot_id]; SnapshotEntry PDA [snapshot_entry, snapshot, holder]. Header stores expected/processed counts and units, cursor, status and times/slots. Entries store holder, Position, registry index, units and processing metadata.
- Instructions: issuer-authorized create_snapshot; permissionless process_snapshot_batch for 1–5 sequential entries; permissionless finalize_snapshot. Holder cap 100. Finalization reconciles count, cursor, units, registry, Bond counters, closed mint supply and vault.
- Files: Anchor source, integration tests, protocol/security/architecture docs, README and this roadmap.
- Acceptance: reject past dates, early processing/finalization, duplicate/replayed entries, invalid Position substitution, oversized batches, empty issuance, unauthorized creation and post-finalization mutation. Multi-holder totals reconcile exactly.
- Verification: Rust format/unit tests, Anchor build, TypeScript test typecheck and local-validator tests. M2–M4 combined local-validator suite: 10 groups passed, including both M3 snapshot cases.
- Limits: issuance must close before snapshots; no later issuance or transfers. No backdating. Progress depends on a cranker. Holder/batch caps are prototype limits; no audit or Devnet.

### M4 — Coupon settlement

**Status:** Implemented and verified on a local Solana validator. This milestone covers coupon settlement only; redemption and governance remain later work.

- **Model:** Each issuer registers one existing classic SPL settlement mint with six decimals. The local fixture creates and mints demo DSET outside the program using a test-only mint authority; the program has no mint-on-claim or faucet instruction.
- **Accounts:** SettlementConfig PDA [settlement_config, issuer_config]; CouponPeriod PDA [coupon, bond, period_id_le_u64]; per-event CouponAuthority PDA [coupon_authority, coupon]; per-event SPL escrow token account [coupon_vault, coupon]; ClaimRecord PDA [coupon_claim, coupon, holder].
- **Instructions:** configure_settlement_mint (issuer, one-time); create_coupon_period (issuer, unique bond period bound to a finalized snapshot and immutable terms); fund_coupon_period (issuer transfers the exact full reserve); claim_coupon (eligible holder signs; payment goes only to that holder's token account).
- **Math:** For semiannual terms, per-bond base units = floor(face_value_base × annual_coupon_bps / 20,000), using checked u128 and checked u64 conversion. The event total is per-bond amount × finalized snapshot units. Example: 50,000,000 base units per bond; A/B/C receive 500/250/100 DSET; total escrow is 850 DSET.
- **Accounting:** Funding must equal expected total exactly and is allowed once. Claims check vault token balance against funded minus paid, use a unique holder record, and atomically transfer and update counters. No sweep or close instruction exists; unclaimed funds stay in escrow.
- **Files:** Anchor source, validator tests, IDL build output, and protocol/security/architecture/roadmap/README updates. Frontend stays mock-only.
- **Acceptance/tests:** Local validator covers exact 17-unit example, full reserve, per-holder balances, duplicate event/claim, partial funding, unauthorized funding/configuration, wrong mint/bond/snapshot/investor/destination, invalid DSET decimals, unfunded and early claims, and M2/M3 regression suite.
- **Verification:** `cargo fmt --all -- --check`, `cargo test -p kase_treasury -q`, `anchor build`, test TypeScript typecheck, and 10 local-validator integration groups passed. M4 covers M2/M3 regressions plus coupon success/negative cases.
- **Limits:** Demo mint label is off-chain/test-fixture metadata; no Token-2022 or metadata program. DSET has no value. Settlement mint setup is one-time per issuer. No recovery path for unclaimed tokens.

### M5 — Bond principal redemption

**Status:** Implemented and verified on a local Solana validator. Governance moves to M6 and was not implemented in M5.

- **Accounts:** Redemption PDA [redemption, bond], RedemptionAuthority PDA [redemption_authority, redemption], isolated SPL escrow [redemption_vault, redemption], and RedemptionReceipt PDA [redemption_claim, redemption, holder].
- **Instructions:** create_redemption (current issuer, closed issuance, at/after bond maturity, finalized same-bond snapshot and reconciled custody); fund_redemption (current issuer transfers exact full reserve); activate_redemption (permissionless after maturity and full funding, validates custody, burns all BondVault units under BondAuthority PDA signing and marks Bond terminal Redeemed); claim_redemption (holder signs, claims exact SnapshotEntry principal to holder-owned settlement account, receipt and atomic accounting).
- **Accounting:** Created -> Funded -> Activated -> Complete. Principal is snapshot_units * face_value_base using checked u128 and checked u64 conversion. Activation leaves mint supply and vault amount zero and Bond.outstanding zero. Bond.issued, registry totals, positions and snapshots remain historical and immutable. No new issuance, snapshots, coupon periods or redemption can follow.
- **Coupon compatibility:** Funded M4 coupon claims work after retirement. Coupon and principal escrows are separate.
- **Unclaimed funds:** No issuer sweep or withdrawal path. Unclaimed principal and unsolicited surplus remain locked; surplus never increases entitlement.
- **Acceptance/tests:** Local validator checks 10/5/2 units, 10,000/5,000/2,000 DSET, 17,000 DSET reserve, maturity, exact funding, wrong/unauthorized accounts, duplicate event/claims, premature activation, full SPL burn, terminal restrictions, coupon compatibility and M2-M4 regressions. Unit tests cover account sizes and checked conversion.
- **Limits:** 100 holders; no recovery, Devnet, wallet integration, governance or audit.

### M6 - Bondholder governance

**Status:** Implemented and verified with Anchor local-validator integration tests. Governance records informational outcomes only; it executes no financial or privileged action.

- **Accounts:** Proposal PDA [governance_proposal, bond, proposal_id]; VoteReceipt PDA [vote_receipt, proposal, holder]. Proposal stores immutable title/content hash, issuer, finalized snapshot, window, basis-point thresholds and frozen eligible voting power, plus checked tallies/status.
- **Instructions:** create_proposal (current issuer, closed and not redeemed bond, finalized same-bond nonempty snapshot, unique 32-byte ID, nonzero content hash, bounded title, valid window no longer than 365 days); cast_vote (eligible holder signature and exact SnapshotEntry, one receipt, weight from snapshot units); finalize_proposal (permissionless at/after deadline, validates tallies and stores Passed or Rejected).
- **Rules:** Demo settings use 5,000 bps quorum and 5,000 bps approval. Quorum is participation * 10,000 >= eligible power * quorum_bps. Abstain counts toward participation/quorum. Approval requires yes * 10,000 > (yes + no) * approval_bps; no decisive votes or unmet quorum rejects. All comparisons use checked u128 arithmetic. Voting interval is [start, end).
- **Redemption:** No proposal may be created once Bond is terminal Redeemed. A proposal opened earlier remains open and uses its original finalized snapshot after redemption; votes remain informational and cannot affect financial state.
- **Tests:** Full M2-M6 local-validator suite covers 10/5/2 Yes/No/Abstain weights, duplicate/ineligible/wrong-bond/wrong-snapshot votes, invalid proposal snapshots, issuer authorization, time boundaries, invalid windows/thresholds, exact quorum, strict approval boundary, no-vote and abstain-only rejection, double finalization, post-redemption restrictions, and M2-M5 regressions.
- **Limits:** One vote per holder, no delegation/split votes, 100-holder cap, max 365-day window, no amendment executor, no quorum extension/cancellation, and no audit. Hash integrity depends on clients retaining the exact proposal content that was hashed.

### M7 — Automated verification and security gate

- **Tasks:** End-to-end/property/boundary tests, secret/dependency/static scans, account/authority review, reproducible fixtures and limitations.
- **Acceptance:** Required invariants have reproducible passing tests; no unresolved critical issue for an educational Devnet demo. Tests are not an audit.
- **Tests:** Rust/Anchor localnet, math boundaries, account substitution/replay/cutoff/reserve/lifecycle and IDL review.

### M8 — Solana Devnet transactions

- **Tasks:** After approval, use a throwaway deployer, verify program/IDL/authority, create demo accounts, run issuance -> snapshot -> coupon -> redemption -> governance and retain signatures.
- **Dependencies:** M7, faucet SOL and Devnet RPC; no Mainnet key or funds.
- **Acceptance:** Fresh wallet can replay and outputs match confirmed accounts/signatures.
- **Risks:** Network resets, RPC outages, deployer exposure and upgrade authority.

### M9 — Frontend integration

- **Tasks:** Add wallet and typed Anchor client; implement read/write flows and errors; replace fixtures only for live data; show cluster/account/signature provenance.
- **Dependencies:** Stable IDL and verified M8 deployment.
- **Acceptance:** Read-only UI works without wallet; flows match confirmed accounts and mock data stays identifiable.
- **Tests:** Mapping/unit, browser, wallet/network/error and Devnet journey.

### M10 — GitHub workflow and project documentation

- **Tasks:** Confirm URL/ownership; inspect branch/remotes/history; audit secrets and generated files; fetch/reconcile without force; add reproducibility docs and CI.
- **Dependencies:** User-verified remote and publishing authorization.
- **Acceptance:** Correct branch/latest commit verified; no secrets in history; unrelated repositories untouched.
- **Risks:** Wrong/divergent remote, secret exposure and authentication. Stop for approval before history rewrite.

### M11 — Vercel frontend deployment

- **Tasks:** Connect reviewed GitHub repo, configure public cluster/program settings, deploy preview and verify labels/routes.
- **Dependencies:** Approval, M9, M10 and verified Devnet program.
- **Acceptance:** Preview works without secret leakage and matches reviewed commit.

### M12 — Hackathon documentation and demonstration

- **Tasks:** Prepare problem/user flow, architecture, threat model, limitations, Devnet guide, judge walkthrough and evidence; claim only verified functionality.
- **Dependencies:** M8 and preferably M9; no implied KASE endorsement.
- **Acceptance:** Reviewers can replay and verify results and distinguish mock/planned/live behavior.

## Cross-cutting security and correctness rules

- Never commit private keys, seed phrases, signing material, `.env` files, RPC/API tokens, or deployer credentials. `NEXT_PUBLIC_*` values are public.
- Keep ignores for dependencies, Next/Rust builds, Solana/Anchor local state, logs, and local env/wallet files. Audit working files and Git history before publishing.
- Issuer, token, vault, and upgrade authority are distinct and documented. Treat them as high risk.
- Use integer base units, checked math, explicit floor rounding, and tested boundaries.
- Validate signer, PDA, account owner, token program/mint/decimals/authority, state, snapshot, and vault. Use unique action/holder replay records.
- Snapshot eligibility comes only from a program-controlled registry frozen at cutoff, not arbitrary RPC historical balance data.
- RPC/indexer records must communicate cluster/source/freshness and be verified against confirmed state.
- No legal enforceability, custody, KYC/AML, compliance, accounting, or production security claim.

## Testing strategy

- **Frontend:** lint, TypeScript typecheck, production build, focused tests, route and browser smoke tests.
- **Program:** Rust unit math tests and Anchor local-validator integration tests for permissions, replay, snapshot, settlement, lifecycle, and governance.
- **Integration:** local client tests followed by scripted Devnet smoke test with non-production wallets.
- **Security:** secret/dependency scan, static checks, boundary/property tests, account/authority review, and eventual independent audit only if use case expands.
- A test is reported passed only when it actually ran; no tests or deployment imply audit or production readiness.

## Current status and next gate

M0 remains a mock-only frontend; dev server and production build were previously reported working. M1 documentation is complete. M2-M5 are on the remote branch. M6 governance is implemented and locally tested in the current unpushed worktree. No Devnet or Vercel deployment exists. **Next: M7 automated verification and security gate.**
