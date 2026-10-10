# KASE Treasury — Master Plan

## Purpose and boundaries

KASE Treasury is an independent educational prototype for tokenized bond lifecycle management and corporate actions on Solana, prepared in the context of the Superteam Kazakhstan × KASE Corporate Actions on Blockchain challenge. It is not an official KASE product and claims no partnership, endorsement, or approval. DSET values are fabricated Devnet test-token amounts, not money, KZT, or a pegged asset. This project does not claim to issue legally enforceable securities, replace regulated infrastructure, provide custody, or be production-ready.

This file is the primary development roadmap. M1 specifications define the demonstration model; M2 implementation status and evidence are recorded below. A planned feature is not implemented until its milestone is built and its acceptance checks pass.

## Product scope

The target workflow covers issuer setup, bond registry, snapshots, coupons, redemption, governance, and verifiable transaction history. The Next.js app remains a mock dashboard. M2 issuer, bond, position registry, issuance, and closure instructions are implemented on localnet; snapshots, settlement, redemption, governance, wallet client, and deployment are not implemented. See [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [PROTOCOL_SPEC.md](./PROTOCOL_SPEC.md), [SECURITY_MODEL.md](./SECURITY_MODEL.md), and [ARCHITECTURE.md](./ARCHITECTURE.md).

## Proposed architecture

- **Web:** Next.js App Router, TypeScript, Tailwind CSS, reusable components, and a typed data-access boundary. Mock fixtures are the current source.
- **Program:** M2 Anchor/Rust issuer, bond, custody, registry, issuance, and closure are implemented and localnet-tested. Snapshots, settlement, redemption, governance, and replay records remain future work.
- **Tokens:** Bond units are whole tokens (0 decimals). DSET (6 decimals) remains planned. M2 creates a classic SPL bond mint and holds units in a BondAuthority PDA vault; no DSET mint/payment exists.
- **Registry/snapshot:** M2 uses Position PDAs and sequential RegistryEntry PDAs, with compact RegistryState and 100-holder cap. Registration needs holder and issuer signatures. Snapshots and cutoff locks remain M3.
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
- **Limitations:** Closure reconciles atomic aggregates; it does not iterate every Position PDA. Snapshots, coupons, DSET mint/payment, redemption, governance, wallet/RPC frontend, Devnet, GitHub, and Vercel are not implemented. Anchor macro cfg warnings and Node/bigint warnings remain.

### M3 — Snapshot and corporate-action instructions

- **Tasks:** Implement cutoff timestamp gates, immutable snapshot header/entries, bounded permissionless snapshot batches, supply reconciliation, coupon funding/claims, maturity redemption/retirement, unique replay PDAs, proposal/vote/finalization, and typed events.
- **Files:** `programs/kase_treasury/src/instructions/{snapshot,coupon,redemption,governance}.rs`, state modules, math/errors/events, integration tests.
- **Dependencies:** M2 program, registry, token controls, and M1 invariants.
- **Acceptance:** A/B/C example produces 500/250/100 DSET coupon and 10,000/5,000/2,000 DSET principal; post-cutoff mutation fails; snapshots match registered beneficial positions and vault supply; no transfer exists in MVP; underfunding and duplicate claims/redemptions/votes fail; proposal quorum/majority deterministic.
- **Tests:** Local-validator happy path and negative tests at timestamp boundaries, repeated calls, wrong accounts, rounding, overflow, incomplete snapshots, insufficient vault, governance tie/quorum, and CPI atomic rollback.
- **Risks:** Transaction/account limits, cranker liveness, settlement-token CPI behavior, and unclaimed vault recovery policy.

### M4 — Automated verification and security gate

- **Tasks:** Complete local-validator end-to-end tests, property/boundary tests for financial math, secret/dependency/static checks, manual account/authority review, reproducible test fixtures, and known-limitations list.
- **Files:** `tests/**`, `programs/kase_treasury/src/**`, CI/test scripts when repository hosting is later approved, `SECURITY_MODEL.md` updates.
- **Dependencies:** M2 and M3 implementation; local validator and test toolchain.
- **Acceptance:** All required invariants in SECURITY_MODEL.md have passing reproducible tests; failures are documented; no unresolved critical issue for a Devnet demo. Passing tests are not described as a security audit.
- **Tests:** `anchor test`/Rust tests, property cases, account substitution/replay/cutoff/reserve tests; review generated IDL against actual constraints.
- **Risks:** Test harness can miss token-program edge cases; external audit and production guarantees remain out of scope.

### M5 — Solana Devnet transactions

- **Tasks:** Create a throwaway Devnet deployer only when approved, deploy and verify program ID/IDL/authority, create demo mints/accounts, run issuance → snapshot → coupon → governance → redemption script, retain signatures and expected outputs.
- **Files:** `scripts/devnet-demo.*`, sanitized config/docs, `Anchor.toml` Devnet config, demo guide.
- **Dependencies:** M4 security gate, faucet SOL, Devnet RPC; no Mainnet key or funds.
- **Acceptance:** Fresh wallet can replay the published demo; every displayed result matches confirmed Devnet accounts and signatures; program ID and authority are documented; recovery/redeploy steps work.
- **Tests:** Scripted Devnet smoke test, account/signature verification, insufficient-faucet/RPC retry behavior.
- **Risks:** Devnet reset/faucet/RPC outages, leaked deployer key, upgrade-authority ambiguity. Keep deployer secrets outside repository.

### M6 — Frontend integration

- **Tasks:** Add wallet provider and typed Anchor client; implement read/write workflows and transaction simulation/confirmation/errors; replace mock data only when corresponding chain data is live; expose source, cluster, slot, and signature.
- **Files:** `src/providers/**`, `src/lib/solana/**`, typed data-access adapters, route/components and accessible states.
- **Dependencies:** Stable IDL/client and verified M5 Devnet deployment.
- **Acceptance:** Read-only UI works without wallet; issuer/holder flows submit only valid instructions; displayed balances/proposals/history match confirmed state; mock and chain data cannot be confused.
- **Tests:** Unit tests for client mapping/formatting, browser smoke tests, wallet rejection/network mismatch/failed-confirmation tests, repeat Devnet end-to-end demo.
- **Risks:** Wallet compatibility, stale RPC/indexed data, transaction simulation/confirmation UX, accessibility regressions.

### M7 — GitHub integration and project documentation

- **Tasks:** Confirm the exact repository URL and ownership; inspect branch/remotes/history; audit tracked/untracked files and Git history for keys, seeds, tokens, RPC credentials, local validator files, dependencies, and build outputs; reconcile fetched remote without force; add CI and reproducibility docs.
- **Files:** `.gitignore`, safe `.env.example`, workflow config, README/demo/security docs, Git metadata only after explicit user instruction.
- **Dependencies:** User supplies/validates remote and authorizes publishing; M4 or later code state.
- **Acceptance:** Correct remote and branch verified; latest commit verifiably present on GitHub; CI status visible; history contains no secret; unrelated repositories untouched.
- **Tests:** Local security/secret scan plus GitHub commit/branch verification. If sensitive history is found, stop and get approval before rewriting it.
- **Risks:** Remote divergent work, wrong repository, secret exposure, authentication. Never ask for password/token in chat; user completes authorization flow.

### M8 — Vercel frontend deployment

- **Tasks:** Connect only reviewed GitHub repository, configure public cluster/program/RPC values and protected variables as needed, deploy preview, verify independent-project labels and routes.
- **Files:** Vercel project settings and deployment docs; avoid committing credentials.
- **Dependencies:** User authorization, M6 integration, M7 verified GitHub state, stable Devnet program.
- **Acceptance:** Preview URL loads and does not expose secrets; visible demo data has provenance; deployment matches reviewed branch/commit.
- **Tests:** Production build in deployment, route/responsive smoke test, environment inspection, Devnet read/write sanity checks as appropriate.
- **Risks:** Build/runtime environment drift, public environment leakage, RPC limits, accidental misleading production claims.

### M9 — Hackathon documentation and demonstration

- **Tasks:** Prepare problem statement, user flow, architecture, threat model, known limitations, reproducible Devnet guide, judge walkthrough and screenshots/video; map claims only to verified implementation.
- **Files:** `docs/demo-guide.md`, architecture/security/product docs, evidence assets and presentation materials if requested.
- **Dependencies:** M5 verified transactions and preferably M6 working UI; no implied KASE endorsement.
- **Acceptance:** Reviewer can replay the demo, verify evidence, calculate the example independently, and distinguish mock/planned/implemented behavior.
- **Tests:** Dry-run from fresh wallet/browser, independent signature/account verification, docs link check.
- **Risks:** Devnet volatility and overstated legal/security/partner claims; keep demo-only caveats visible.

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

M0 remains a mock-only frontend; dev server and production build were previously reported working. M1 documentation is complete. M2 issuer, bond, custody, registry, issuance, and closure passed local checks. No GitHub remote or deployment exists. **Next: M3 record-date snapshots, cutoff enforcement, bounded batches, and immutable finalization.**
