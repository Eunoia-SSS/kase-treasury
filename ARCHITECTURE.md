# KASE Treasury — Architecture

**Status:** M2 registry/issuance and M3 snapshots are implemented and local-validator tested. Settlement, coupon, redemption, governance and frontend chain integration remain future work.

## Current implementation

Frontend: static Next.js mock dashboard with overview, bonds, actions, governance, transactions; reusable UI; typed domain models; fabricated fixtures.

Anchor workspace (M2–M3 implemented; localnet only): Anchor.toml pins Anchor 0.31.1/Solana 2.1.0; Cargo workspace/lockfile are present; programs/kase_treasury/src/lib.rs contains issuer, bond, registry, SPL mint/vault, issuance, closure, snapshots, errors and events. tests/kase_treasury.ts contains validator tests.

The frontend has no wallet adapter, RPC client, indexer, database, settlement, or authoritative chain history. Displayed values/signatures remain mock data. The Anchor program covers M2 registry/issuance and M3 snapshots; coupon, redemption, governance and settlement are absent. Local tests do not imply deployment or audit.

## Target runtime boundaries

```text
Next.js presentation
        │ typed use-case/data-access interface
        ├── mock adapter (current)
        ├── Anchor client → Solana program (future writes and account reads)
        └── indexed read model (optional future history/dashboard queries)
```

- **Presentation:** routes and reusable UI render issuer and holder journeys. They do not construct raw instructions or own RPC policy.
- **Domain:** typed models and deterministic validation/calculation helpers. Token amounts become integer base units; no floating-point financial math on-chain.
- **Data access:** typed interface hides fixture/program/indexer source. Live records carry cluster, account/signature provenance, and freshness.
- **Program:** Anchor validates authority, accounts, mints, state transitions, snapshots, replay protection, and settlement.
- **Token/registry (M2 implemented):** Classic SPL Token; all whole 0-decimal units remain in the PDA-authorized vault. BondAuthority is mint authority and vault owner. Position PDAs record beneficial holdings; registration requires holder and issuer signatures. No holder ATA or transfer instruction exists. This is a disclosed prototype custody trade-off.
- **Wallet:** future provider boundary; read-only views should remain usable without a connected wallet.
- **History:** program accounts and confirmed transaction signatures are authoritative. An indexer may accelerate history queries but cannot independently determine entitlement.

## Proposed on-chain components

M2 implements IssuerConfig, Bond, BondAuthority, RegistryState, sequential RegistryEntry, and Position accounts; the classic SPL mint and vault are Token Program accounts at their PDAs. RegistryState stores count and total; RegistryEntry makes holders enumerable without an inline array. Later accounts include RecordDateSnapshot, SnapshotEntry, CouponPeriod, ClaimRecord, PaymentVault, RedemptionRecord, Proposal, and VoteRecord. Current events cover issuer, authority, bond, and position transitions.

M2 keeps the compact program in programs/kase_treasury/src/lib.rs, including accounts, constraints, SPL CPI helpers, errors, and events. Later work may split state and instruction modules as snapshots and corporate actions are added.

## Record-date boundary

The program cannot query arbitrary historical SPL balances. M3 requires irreversible issuance closure before snapshots: mint authority is revoked and no transfer or position mutation instruction exists. The issuer creates a snapshot with record_date_ts at or after Clock.unix_timestamp; past cutoffs fail. The frozen registry makes future dates reliable. Permissionless bounded batches begin at/after that date and copy sequential validated RegistryEntry and Position pairs into unique per-holder SnapshotEntry PDAs. Finalization reconciles count, cursor and units against registry, bond, closed mint supply and vault custody. Finalized accounts have no mutation path. Later coupon and weighted voting instructions must use finalized entries; those actions are not implemented.

## Financial and authority boundary

Bond mint decimals are 0 (whole bonds) and the classic SPL mint remains in PDA custody; DSET settlement decimals are 6, with integer base-unit math and floor rounding. DSET has no real monetary value or peg. This MVP uses custodial beneficial positions, not wallet-held bond tokens. Issuer, program upgrade, mint, vault, and settlement authorities are distinct responsibilities and must be documented. Only fully funded actions can settle. No legal, market-infrastructure, or KASE affiliation claim follows from this architecture.

## Current project status

The UI remains mock-only. M2–M3 pass Rust unit and Anchor local-validator tests. No Devnet deployment, wallet integration, settlement, coupon, redemption or governance exists. M2 is pushed to GitHub; M3 remains local and unpushed. Vercel is not configured. Tests are not an audit.
