# KASE Treasury — Architecture

**Status:** M2 registry/issuance, M3 snapshots, and M4 coupon settlement are implemented and local-validator tested. Redemption, governance, and frontend chain integration remain future work.

## Current implementation

Frontend: static Next.js mock dashboard with overview, bonds, actions, governance, transactions; reusable UI; typed domain models; fabricated fixtures.

Anchor workspace (M2–M3 implemented; localnet only): Anchor.toml pins Anchor 0.31.1/Solana 2.1.0; Cargo workspace/lockfile are present; programs/kase_treasury/src/lib.rs contains issuer, bond, registry, SPL mint/vault, issuance, closure, snapshots, errors and events. tests/kase_treasury.ts contains validator tests.

The frontend has no wallet adapter, RPC client, indexer, database, or authoritative chain history. Displayed values/signatures remain mock data. The Anchor program covers M2 registry/issuance, M3 snapshots, and M4 coupon settlement locally; redemption, governance, and frontend chain integration are absent. Local tests do not imply deployment or audit.

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

M2 implements IssuerConfig, Bond, BondAuthority, RegistryState, sequential RegistryEntry, and Position accounts; the classic SPL mint and vault are Token Program accounts at their PDAs. RegistryState stores count and total; RegistryEntry makes holders enumerable without an inline array. M3 implements RecordDateSnapshot and SnapshotEntry. M4 adds SettlementConfig, CouponPeriod, CouponAuthority, the per-event SPL escrow token account, and ClaimRecord. Later accounts include RedemptionRecord, Proposal, and VoteRecord. Events expose issuer, authority, bond, position, snapshot, mint configuration, coupon creation/funding, and claims.

M2 keeps the compact program in programs/kase_treasury/src/lib.rs, including accounts, constraints, SPL CPI helpers, errors, and events. Later work may split state and instruction modules as snapshots and corporate actions are added.

## Record-date boundary

The program cannot query arbitrary historical SPL balances. M3 requires irreversible issuance closure before snapshots: mint authority is revoked and no transfer or position mutation instruction exists. The issuer creates a snapshot with record_date_ts at or after Clock.unix_timestamp; past cutoffs fail. The frozen registry makes future dates reliable. Permissionless bounded batches begin at/after that date and copy sequential validated RegistryEntry and Position pairs into unique per-holder SnapshotEntry PDAs. Finalization reconciles count, cursor and units against registry, bond, closed mint supply and vault custody. Finalized accounts have no mutation path. M4 coupon events reference finalized snapshots and use SnapshotEntry units. Redemption and weighted voting remain unimplemented and must also use finalized entries.

## Financial and authority boundary

Bond mint decimals are 0 (whole bonds) and the classic SPL mint remains in PDA custody; DSET settlement decimals are 6, with integer base-unit math and floor rounding. DSET has no real monetary value or peg. This MVP uses custodial beneficial positions, not wallet-held bond tokens. Issuer, program upgrade, bond mint/vault, and coupon escrow authorities are distinct. A one-time per-issuer SettlementConfig accepts an existing classic SPL six-decimal mint; test DSET issuance happens outside the program. CouponPeriod records fixed terms, snapshot, reserve totals, and lifecycle. CouponAuthority controls an isolated PDA escrow. Holder-signed claims pay only a holder-owned DSET account and create one ClaimRecord. Only fully funded coupons can settle. Unclaimed funds have no recovery path and remain escrowed. No legal, market-infrastructure, or KASE affiliation claim follows from this architecture.

## Current project status

The UI remains mock-only. M2–M4 pass Rust unit and Anchor local-validator tests. Coupon settlement is local-validator-only; no Devnet deployment or wallet integration exists. Redemption and governance are not implemented. M2/M3 are on GitHub; this M4 work remains local unless later approved. Vercel is not configured. Tests are not an audit.
