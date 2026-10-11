# KASE Treasury

KASE Treasury is an independent educational prototype exploring tokenized bond lifecycle management and corporate actions on Solana. It is intended for the Superteam Kazakhstan and KASE Corporate Actions on Blockchain challenge context. It is not an official KASE product and claims no partnership, endorsement, or approval.

The repository contains a Next.js dashboard with a transaction-free public Demo Mode and an optional wallet-signed Localnet interface and an Anchor program for issuer setup, bond issuance, holder registry, issuance closure, record-date snapshots, coupon settlement, principal redemption, and snapshot-weighted governance. The program is locally tested; it is not audited or production-ready. Devnet deployment has not been performed.

## Current foundation

- Responsive Next.js App Router dashboard with deterministic public Demo Mode and a separate live Localnet/Devnet mode. Live registry, snapshots, coupon periods, redemptions, proposals, balances, and bond-account signatures are read from the selected RPC.
- Anchor 0.31.1 workspace with classic SPL Token integration and M2-M6 lifecycle instructions.
- Local-validator integration suite in `tests/kase_treasury.ts`.
- Wallet Standard-compatible browser-wallet discovery; Anchor and SPL transactions request wallet approval. The frontend never reads issuer or investor key files.
- Real Anchor/SPL RPC lifecycle demo in `scripts/devnet-demo.ts`. It defaults to localhost; Devnet transactions require an explicit guard, an exact Devnet genesis hash, and have not been run.
- Program ID synchronized across source, localnet/devnet Anchor config, existing ignored local program keypair, generated IDL, and demo guard.
- `.env.example` contains public configuration only.

## Development

Public Demo Mode is the default. For live local development, create .env.local with NEXT_PUBLIC_APP_MODE=live, NEXT_PUBLIC_SOLANA_CLUSTER=localnet, and NEXT_PUBLIC_LOCALNET_RPC_URL=http://127.0.0.1:8899. Start a validator with the program deployed (see DEVNET_RUNBOOK.md), run npm run dev, then connect a browser wallet configured for the same RPC. The app never reads local keypair files.

For Vercel, keep NEXT_PUBLIC_APP_MODE=demo (or unset). The hosted demo uses fixed sample data and requires no validator or RPC access; all simulated activity is labeled and never presented as a Solana signature. Devnet live mode is not deployed.

Run Anchor commands in WSL Ubuntu with Rust/Cargo, Solana CLI 2.1.0, Anchor CLI 0.31.1, and Node.js/npm. This workspace has a portable Linux Node 24.21.0 in ignored `target/kase-node-v24.21.0`; add it to PATH with `export PATH="$PWD/target/kase-node-v24.21.0/bin:$PATH`. See the runbook to recreate it in a fresh checkout. The Windows Node installation was not changed.

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

Run local tests:

```bash
anchor test
npm run typecheck:tests
```

If the Anchor wrapper cannot use Linux Node, use the direct ts-mocha procedure in [DEVNET_RUNBOOK.md](./DEVNET_RUNBOOK.md).

## Browser operations

The /operations page exposes wallet-signed workflows for issuer initialization, bond creation, connected-holder registration, issuance close, snapshot batches/finalization, demo DSET setup, coupon funding/claims, proposal creation/voting/finalization, and maturity redemption. Registration currently supports the connected issuer wallet as holder because the program requires both issuer and holder signatures. The frontend does not impersonate another holder.

Live account history is limited to confirmed signatures touching the first 20 bond accounts, up to 10 signatures per bond. There is no indexer.

## Local demo client

The client runs issuance, snapshot, coupon settlement, weighted voting, maturity redemption, and final-state verification through real Anchor and SPL RPC calls. Local mode creates holder keypairs in memory only and funds them only from the local validator.

```bash
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET=target/localnet-wallet.json \
KASE_DEMO_CLUSTER=localnet \
npm run demo:localnet
```

Each run uses fresh random issuer, bond, proposal, and event IDs. Use a fresh local ledger for repeatable runs. The sample bond uses 1,000 six-decimal DSET face value, 10% annual coupon, and semiannual payments. The client creates a six-decimal DSET mint without freeze authority and mints 17,850 DSET for the 850 coupon and 17,000 principal. DSET is fabricated test data with no monetary value. Localnet maturity is 30 seconds; Devnet maturity is 120 seconds. The client polls the on-chain Clock and has bounded timeouts.

## Environment and secrets

Copy `.env.example` to `.env.local` only for local frontend configuration. Never put wallet keypairs, seed phrases, private keys, provider tokens, or other secrets in tracked files or any `NEXT_PUBLIC_*` variable. Devnet wallets must be disposable, created manually, and stored outside the repository with restrictive file permissions.

## Specifications and status

See [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), [PROTOCOL_SPEC.md](./PROTOCOL_SPEC.md), [SECURITY_MODEL.md](./SECURITY_MODEL.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [MASTER_PLAN.md](./MASTER_PLAN.md), and [DEVNET_RUNBOOK.md](./DEVNET_RUNBOOK.md).

Bond units use a controlled SPL custody vault and Position PDAs; investors do not directly transfer SPL bond tokens. Issuance closes before snapshots. Coupon entitlements and governance weight use a finalized snapshot. Redemption waits for maturity, funds full principal, retires bond supply, and pays snapshot holders once. Governance results are informational only and execute no proposal. Public Demo Mode remains deterministic mock data; live mode has focused on-chain account and operations views. Analytical charts outside those views remain sample content.

This prototype does not issue legally enforceable securities, provide investment, legal, tax, custody, or compliance advice, replace regulated infrastructure, or represent an official KASE product.
