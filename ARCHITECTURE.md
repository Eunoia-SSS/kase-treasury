# KASE Treasury — Architecture

**Status:** M2 issuance/registry, M3 snapshots, M4 coupon settlement, M5 principal redemption, and M6 informational governance are implemented and local-validator tested. M9A adds wallet-connected Localnet/Devnet reads and transaction workflows; public Demo Mode remains simulated.

## Current implementation

Frontend: Next.js dashboard with a deterministic interactive public Demo Mode and a separate live Localnet/Devnet mode, responsive shell, Wallet Standard discovery, typed Anchor client, account readers, wallet-signed transaction console, and fixtures used only in Demo Mode.

Anchor workspace (M2-M6 implemented; localnet only): Anchor.toml pins Anchor 0.31.1/Solana 2.1.0; Cargo workspace/lockfile are present; programs/kase_treasury/src/lib.rs contains issuer, bond, registry, SPL mint/vault, issuance, closure, snapshots, errors and events. tests/kase_treasury.ts contains validator tests.

Live mode uses Wallet Standard discovery through the lightweight Solana wallet adapter packages and the checked-in Anchor IDL/Program ID for reads and wallet-signed transactions. Demo Mode does not issue RPC requests. There is no indexer or database; live history is a bounded scan of signatures touching up to 20 bond PDAs, not a complete event index. The Anchor program covers M2-M6 locally; M9A adds frontend reads and transaction workflows. Local tests do not imply deployment or audit.

## Target runtime boundaries

```text
Next.js presentation
        │ typed use-case/data-access interface
        ├── mock adapter (public Demo Mode)
        ├── Anchor client → Solana program (live reads and wallet-signed writes)
        └── indexed read model (optional future history/dashboard queries)
```

- **Presentation:** routes and reusable UI render issuer and holder journeys. They do not construct raw instructions or own RPC policy.
- **Domain:** typed models and deterministic validation/calculation helpers. Token amounts become integer base units; no floating-point financial math on-chain.
- **Data access:** typed interface hides fixture/program/indexer source. Live records carry cluster, account/signature provenance, and freshness.
- **Program:** Anchor validates authority, accounts, mints, state transitions, snapshots, replay protection, and settlement.
- **Token/registry (M2 implemented):** Classic SPL Token; all whole 0-decimal units remain in the PDA-authorized vault. BondAuthority is mint authority and vault owner. Position PDAs record beneficial holdings; registration requires holder and issuer signatures. No holder ATA or transfer instruction exists. This is a disclosed prototype custody trade-off.
- **Wallet:** Wallet Standard integration auto-discovers compatible browser wallets. Read-only live views do not require a connected wallet; signing controls require a connected wallet. The frontend never reads keypair or seed files.
- **History:** decoded program accounts and confirmed signatures are authoritative. The current frontend queries up to 10 signatures for each of the first 20 bonds; complete history requires a later indexer. An indexer cannot independently determine entitlement.

## Proposed on-chain components

M2 implements IssuerConfig, Bond, BondAuthority, RegistryState, sequential RegistryEntry, and Position accounts; the classic SPL mint and vault are Token Program accounts at their PDAs. RegistryState stores count and total; RegistryEntry makes holders enumerable without an inline array. M3 implements RecordDateSnapshot and SnapshotEntry. M4 adds SettlementConfig, CouponPeriod, CouponAuthority, the per-event SPL escrow token account, and ClaimRecord. M5 adds Redemption, RedemptionAuthority, isolated SPL escrow and RedemptionReceipt. M6 adds Proposal [governance_proposal, bond, proposal_id] and VoteReceipt [vote_receipt, proposal, holder]. Events expose issuer, authority, bond, position, snapshot, mint configuration, coupon creation/funding/claims, redemption, proposal creation, vote receipts and finalized results.

M2 keeps the compact program in programs/kase_treasury/src/lib.rs, including accounts, constraints, SPL CPI helpers, errors, and events. Later work may split state and instruction modules as snapshots and corporate actions are added.

## Record-date boundary

The program cannot query arbitrary historical SPL balances. M3 requires irreversible issuance closure before snapshots: mint authority is revoked and no transfer or position mutation instruction exists. The issuer creates a snapshot with record_date_ts at or after Clock.unix_timestamp; past cutoffs fail. The frozen registry makes future dates reliable. Permissionless bounded batches begin at/after that date and copy sequential validated RegistryEntry and Position pairs into unique per-holder SnapshotEntry PDAs. Finalization reconciles count, cursor and units against registry, bond, closed mint supply and vault custody. Finalized accounts have no mutation path. M4 coupon claims, M5 principal claims, and M6 votes use finalized snapshots and immutable SnapshotEntry units. M6 stores fixed proposal terms and content hash; receipt-backed holder signatures contribute checked snapshot units to integer tallies. Finalization is permissionless after the exclusive end timestamp. A proposal cannot be created after terminal redemption; proposals already open remain on their original snapshot and cannot change corporate-action state.

## Financial and authority boundary

Bond mint decimals are 0 (whole bonds) and the classic SPL mint remains in PDA custody; DSET settlement decimals are 6, with integer base-unit math and floor rounding. DSET has no real monetary value or peg. This MVP uses custodial beneficial positions, not wallet-held bond tokens. Issuer, program upgrade, bond mint/vault, and coupon escrow authorities are distinct. A one-time per-issuer SettlementConfig accepts an existing classic SPL six-decimal mint; test DSET issuance happens outside the program. CouponPeriod records fixed terms, snapshot, reserve totals and lifecycle. CouponAuthority controls an isolated PDA escrow. Holder-signed claims pay holder-owned DSET accounts and create one ClaimRecord. M5 adds one Redemption per bond, separate escrow, exact principal funding, full custody burn at maturity activation, terminal Redeemed status and holder receipts. Funded coupons remain claimable after retirement. Unclaimed funds have no recovery path. Governance outcome is informational; no proposal triggers an amendment, payment, redemption, or arbitrary instruction. No legal, market-infrastructure, or KASE affiliation claim follows from this architecture.

## Current project status

Public Demo Mode uses deterministic fixture data and an interactive in-browser lifecycle state machine at /operations; it makes no RPC requests and sends no transactions. Live mode has account reads and wallet-approved transaction flows. M2-M6 pass Rust unit and Anchor local-validator tests; Devnet deployment has not occurred. The existing M9A baseline is deployed at https://kase-treasury.vercel.app; M9B changes are local and not deployed. The M9A browser-wallet Localnet flow still needs an end-user wallet smoke test. Tests are not an audit.


## M9B public simulation boundary

The /operations page presents the five-step public walkthrough using a pure TypeScript reducer and fixed sample inputs. It simulates issuance, an immutable record-date snapshot, coupon escrow/claims, snapshot-weighted governance, and principal redemption in browser memory. Integer DSET amounts and the documented inclusive 50% quorum / strict greater-than-50% decisive-vote approval rule are tested independently. Reset returns the exact initial state. The simulation code has no RPC, wallet, key, signature, or Explorer dependency.

The M9A live operations component remains a separate runtime branch selected by NEXT_PUBLIC_APP_MODE=live; its Localnet/Devnet transaction paths are not used by the public simulation. The demo does not prove that browser wallet transactions were exercised, nor does local-validator testing imply Devnet deployment or an audit.
