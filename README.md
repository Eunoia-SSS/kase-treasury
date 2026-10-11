# KASE Treasury

KASE Treasury is an **independent educational prototype** exploring tokenized bond lifecycle management and corporate actions on Solana. It is intended for the Superteam Kazakhstan × KASE Corporate Actions on Blockchain challenge context. It is not an official KASE product and does not claim KASE partnership, endorsement, or approval.

The repository contains a mock-only Next.js dashboard and an Anchor program for issuer setup, bond issuance, holder registry, issuance closure, M3 snapshots, M4 coupon settlement, M5 principal redemption, and M6 snapshot-weighted governance. UI values remain fabricated. The frontend has no wallet/RPC connection. The program is local-validator-tested, not deployed or audited.

## Current foundation

- Responsive Next.js App Router application with Overview, Bond registry, Corporate actions, Governance, and Transaction history routes; governance UI data remains mock-only.
- Reusable layout, navigation, metric, table, status, and notice components.
- Typed domain models for bonds, holders, snapshots, corporate actions, proposals, and transactions.
- Demo fixtures in `src/lib/mock-data.ts`, visibly labeled as mock throughout the UI.
- Anchor 0.31.1 workspace with classic SPL Token 7.0.0 CPI, issuer/bond/position/registry/snapshot/coupon/redemption/proposal/vote accounts and M2-M6 instructions.
- Local-validator integration tests are in tests/kase_treasury.ts.
- Security-oriented `.gitignore` and placeholder-only `.env.example`.

## Development

Frontend: Node.js 20.9+ and npm. On-chain development: Anchor 0.31.1, Solana CLI 2.1.0, Rust/Cargo host MSRV 1.79. Run Anchor commands in WSL Ubuntu.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Available checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Environment

Copy `.env.example` to `.env.local` for local frontend configuration. Current values are public placeholders only. Do not add wallet keypairs, seed phrases, private keys, provider tokens, or other secrets to this file or to any `NEXT_PUBLIC_*` variable. `.env.local` is ignored by Git.

The current local program ID is in Anchor.toml and programs/kase_treasury/src/lib.rs. It is for local development only; deployment addresses and cluster configuration belong to a later approved milestone.

## Specifications and project status

Product, protocol, and security specifications are in PRODUCT_SPEC.md, PROTOCOL_SPEC.md, and SECURITY_MODEL.md. ARCHITECTURE.md distinguishes current code from future design; MASTER_PLAN.md is the roadmap. M2 issuer setup, bond creation, registry, issuance and closure; M3 snapshots; M4 coupon settlement; M5 principal redemption; and M6 governance are local-validator-tested. Snapshots require closed issuance and process only at/after cutoff. M4 binds an issuer to an existing six-decimal classic SPL demo settlement mint, requires full coupon funding, and pays each eligible holder once from a PDA escrow. Test DSET is created/minted by an off-chain local fixture and has no monetary value. Principal redemption is implemented and local-validator-tested: issuer-funded isolated escrow, full custody-token burn at maturity activation, and holder-signed snapshot claims. The governance program records immutable proposal terms, snapshot-weighted Yes/No/Abstain votes and an integer quorum/approval result only. It does not execute proposals. Wallet/RPC integration and Devnet/Vercel deployment are not implemented. The frontend remains mock-only.

This is a learning prototype, not investment, legal, tax, custody, or compliance advice and not a production securities platform.
