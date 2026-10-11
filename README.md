# KASE Treasury

**Tokenized bond corporate actions, made inspectable.**

KASE Treasury is an independent educational prototype exploring how Solana programs can represent a bond lifecycle: issuance, holder eligibility, coupon claims, maturity redemption, and snapshot-weighted governance. It was created in the context of the Superteam Kazakhstan x KASE Corporate Actions on Blockchain challenge. It is not an official KASE product and is not affiliated with, endorsed by, or approved by KASE.

> **Demo notice:** The public `/operations` walkthrough is deterministic browser simulation. It does not connect a wallet, contact Solana, or execute transactions. The Anchor program has been tested against a local validator; it has not been deployed to Devnet.

## Try it

- [KASE Treasury website](https://kase-treasury.vercel.app/)
- [Interactive educational demo](https://kase-treasury.vercel.app/operations)
- [GitHub repository](https://github.com/Eunoia-SSS/kase-treasury)

The fixed 17-unit example assigns 10/5/2 bonds to Investors A/B/C; simulated coupon claims are 500/250/100 DSET; voting power is 10/5/2; simulated principal claims are 10,000/5,000/2,000 DSET. DSET is fabricated test data with no monetary value.

## Problem and approach

Corporate actions depend on clear answers to who qualified on a record date, how much each holder is owed, and whether each payment or vote was counted once. KASE Treasury prototypes an auditable flow by tying entitlements to a finalized on-chain snapshot and storing per-holder claim or vote receipts. It makes the eligibility source and lifecycle state explicit instead of treating an arbitrary historical token balance as authoritative.

Solana programs and SPL Token accounts provide programmable state, signer constraints, and inspectable transactions. This is an educational design choice, not a claim that the project replaces regulated market infrastructure.

## Implemented foundation

- **Anchor M2-M6 program:** issuer and bond setup, SPL custody vault, beneficial-holder registry, issuance closure, immutable record-date snapshots, fully reserved coupon settlement, maturity redemption, and informational snapshot-weighted governance.
- **Local validator tests:** Rust unit tests and Anchor integration tests exercise the program locally.
- **Frontend:** six Next.js routes, public deterministic lifecycle simulation at `/operations`, and a separate wallet-connected live mode for Localnet/Devnet reads and signing workflows.
- **Demo lifecycle:** issue 17 units; finalize a 10/5/2 snapshot; claim 850 simulated DSET coupon; finalize a 10/5/2 weighted vote; claim 17,000 simulated DSET principal and retire all units.

The public simulation does not make its actions on-chain. Devnet deployment and Devnet transactions have not occurred.

## Architecture and stack

Next.js App Router, React, TypeScript, and Tailwind CSS form the web application. Demo Mode uses fixed in-memory state and does not call RPC. Live mode uses the checked-in Anchor IDL and Program ID with a compatible user-selected wallet to read accounts and request transaction signatures.

The Anchor program uses classic SPL Token. Whole bond units (0 decimals) stay in a PDA-authorized vault; program-owned `Position` PDAs record beneficial holdings. Issuance closes before snapshots, preventing later issuance or transfers from changing eligibility. Bounded batches enumerate the sequential registry. Six-decimal demo settlement tokens are funded into event vaults before claims. Per-holder records prevent repeated claims or votes. Governance results do not execute amendments.

**Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Rust, Anchor 0.31.1, Solana CLI 2.1.0, classic SPL Token, Wallet Standard, Mocha/ts-mocha.

See [architecture](./ARCHITECTURE.md), [product specification](./PRODUCT_SPEC.md), [protocol](./PROTOCOL_SPEC.md), [security model](./SECURITY_MODEL.md), and [Devnet runbook](./DEVNET_RUNBOOK.md).

## Run locally

Use WSL Ubuntu with Node.js/npm, Rust/Cargo, Solana CLI 2.1.0, and Anchor CLI 0.31.1 for the full project. See the runbook for toolchain setup.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Demo Mode is the default and needs no wallet, RPC endpoint, validator, or SOL. For the wallet-connected Localnet interface, follow [DEVNET_RUNBOOK.md](./DEVNET_RUNBOOK.md) and set `NEXT_PUBLIC_APP_MODE=live` in an untracked `.env.local`.

## Verification

```bash
npm run typecheck
./node_modules/.bin/eslint src
npm run test
npm run typecheck:tests
npm run build
cargo fmt --all -- --check
cargo test -p kase_treasury -q
anchor build
npm run test:anchor
```

`npm run test` runs deterministic simulation tests without a validator. `npm run test:anchor` requires the Anchor/Solana local-validator toolchain. Record actual results for the submission revision; prior passing results do not substitute for rerunning after a change.

## Verification results from this review

- Frontend TypeScript check, source ESLint, test TypeScript check, and all 9 deterministic Demo Mode tests passed.
- The Next.js production build succeeded. All six production routes returned HTTP 200 locally. The operations route rendered the simulation disclaimer.
- Rust formatting passed; `cargo test -p kase_treasury -q` passed 5 tests; `anchor build` succeeded.
- The first complete Localnet Anchor run reported 21 passing and 1 transient M3 SnapshotEntry account-read failure immediately after batch confirmation. The test helper now polls for confirmed account visibility for up to 5 seconds. After that test-only adjustment, the full suite passed: 22 passing.
- The hosted home and operations routes opened. The five-step hosted walkthrough completed with the expected values at a 390px viewport and Reset returned it to its start state. The exact hosted source revision was not cross-checked.
- `npm audit --omit=dev` reports 17 advisories (6 high, 11 moderate). Dependency upgrades were not made; see limitations.

## Limitations and safety

- No Devnet or Mainnet deployment has been performed.
- Demo Mode is simulated and produces no Solana signature.
- The program and frontend have not received an independent security audit and are not production-ready.
- Beneficial positions use a custodial model; investors do not hold or directly transfer bond SPL tokens.
- The registry is capped at 100 holders; live transaction history is bounded and there is no indexer.
- Browser issuer/holder co-signing limitations are documented in the architecture and runbook.
- No legal enforceability, regulated custody, KYC/AML, compliance, tax, or investment claim is made. Demo values are not money or a KZT peg.

- A current production-dependency audit reports 17 advisories (6 high, 11 moderate). Several dependency fixes require major-version changes or have no compatible fix; this review did not upgrade dependencies. Assess before enabling live transactions.

This is a hackathon prototype only. Do not use real funds, production credentials, or valuable wallets.
