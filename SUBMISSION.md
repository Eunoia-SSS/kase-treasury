# KASE Treasury - Hackathon Submission

## Project name
KASE Treasury

## Tagline
**A transparent lifecycle for tokenized bond corporate actions.**

## One-sentence description
KASE Treasury is an independent Solana prototype that models bond issuance, record-date eligibility, coupon settlement, maturity redemption, and snapshot-weighted governance with inspectable state and replay-resistant receipts.

## Short pitch (~100 words)
Bond corporate actions require a dependable answer to who qualified on a record date, what each holder is entitled to, and whether a payment or vote has already been processed. KASE Treasury explores those questions with a Solana Anchor program and an easy-to-follow browser walkthrough. The program represents beneficial ownership in a bounded holder registry, freezes eligibility in finalized snapshots, requires settlement reserves before claims, and records holder-specific claim and vote receipts. Judges can replay the 17-unit A/B/C lifecycle in Demo Mode without a wallet or network access. That walkthrough is explicitly simulated; the separate program has been exercised on a local Solana validator and is not deployed to Devnet.

## Full project description (300-500 words)
Corporate actions are operationally sensitive because holder eligibility, entitlement calculations, payment funding, and voting records must line up across an event lifecycle. KASE Treasury is an independent educational prototype that makes those steps visible and testable. It was prepared in the context of the Superteam Kazakhstan x KASE Corporate Actions on Blockchain challenge; it is not an official KASE product and does not claim affiliation, endorsement, or approval.

The project combines a Next.js dashboard with an Anchor program. The on-chain design uses classic SPL Token with whole bond units held in a program-derived vault. Program-owned position accounts record beneficial holdings, and the issuer closes issuance before a snapshot can be taken. Bounded snapshot batches enumerate the frozen registry; later coupon claims, principal entitlements, and governance weights reference the finalized snapshot rather than arbitrary historical token balances. Coupon and redemption actions require reserves to be funded before claims. Per-holder records prevent a holder from claiming the same event or voting on the same proposal twice. Governance results are informational and do not execute amendments.

The `/operations` browser walkthrough uses deterministic sample data: 17 bond units split 10/5/2, 850 simulated DSET coupon, voting power of 10/5/2, and 17,000 simulated DSET principal. It has no wallet connection, RPC access, transaction signature, or token transfer. Separately, the Anchor program and integration tests have been run against a local Solana validator. Local testing is not a Devnet deployment and is not a security audit.

Solana provides a programmable ledger for account state, SPL token custody, signer authorization, and inspectable transactions. The prototype is intentionally bounded and educational: its holder registry is capped at 100, ownership is custodial rather than freely transferable, the frontend has no indexer, and no legally enforceable securities or real-money settlement are provided. The project does not replace regulated infrastructure or offer investment, legal, tax, or compliance advice.

## Problem
Corporate-action workflows need consistent, verifiable eligibility and entitlement accounting, plus safeguards against duplicate claims and votes.

## Solution
A frozen on-chain holder registry and finalized snapshot anchor coupon, redemption, and voting rights. Fully funded event vaults and per-holder receipts make the sample lifecycle replay-resistant and inspectable.

## Key differentiators
- Record-date eligibility is explicit and does not pretend a program can reconstruct arbitrary historic SPL balances.
- A capped sequential registry allows bounded snapshot processing.
- Claims and votes reference immutable snapshot units and unique receipts.
- A no-wallet public simulation makes the lifecycle understandable while clearly separating it from real transactions.

## Solana integration
Anchor 0.31.1 program; classic SPL Token bond custody and demo settlement mint; PDA-based issuer, bond, registry, snapshot, event-vault, claim, redemption, proposal, and vote accounts. The program has local-validator test coverage. It is **not deployed on Devnet**.

## Core corporate actions
Issuance and position registry; record-date snapshots; funded coupon claims; maturity principal redemption and bond-unit retirement; snapshot-weighted proposals and votes; account and transaction inspection in live mode.

## Technology stack
Next.js 15, React 19, TypeScript, Tailwind CSS 4, Rust, Anchor 0.31.1, Solana CLI 2.1.0, classic SPL Token, Wallet Standard, Mocha/ts-mocha.

## Links
- Website: https://kase-treasury.vercel.app/
- Interactive demo: https://kase-treasury.vercel.app/operations
- GitHub: https://github.com/Eunoia-SSS/kase-treasury
- Suggested judge walkthrough: https://kase-treasury.vercel.app/operations

## Current development status
The M2-M6 Anchor lifecycle has local-validator coverage. In this review, the first full run reported 21 passing and one transient M3 SnapshotEntry read failure. After adding bounded polling to that test helper, the complete suite passed with 22 passing. The Next.js source includes both a deterministic simulation and a separate wallet-connected Localnet/Devnet client. The supplied hosted home and operations routes returned successfully. The five-step browser walkthrough was completed and reset at a 390px viewport; all six route headings and prototype disclaimers were visible. The exact hosted source commit was not cross-checked against this checkout. No Devnet deployment or transaction has occurred.

## Honest limitations
This is not an audited or production-ready system. Demo Mode is not on-chain. The program uses a 100-holder cap and custodial beneficial positions; no direct transfers, indexer, multisig governance, legal issuance, KYC/AML, fiat settlement, or real monetary value are provided. Browser wallet signing against Localnet and the current hosted build require separate end-to-end verification. The current production dependency audit reports 17 advisories (6 high, 11 moderate); compatible remediation was not attempted in this submission review. No external security audit has been performed, and the dependency advisories listed above remain unresolved.
