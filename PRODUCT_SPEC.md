# KASE Treasury — Product Specification

**Status:** M1-M4 issuance, registry, snapshots, and coupon settlement plus M5 principal redemption are implemented and local-validator-tested. Governance and frontend chain workflows remain unimplemented. KASE Treasury is an independent project in the Superteam Kazakhstan × KASE Corporate Actions on Blockchain challenge context. It is not an official KASE product and does not claim partnership, endorsement, or approval.

## Positioning

KASE Treasury explores how a Solana program could make tokenized bond lifecycle events easier to operate and inspect. It combines issuer workflows, explicit holder eligibility snapshots, deterministic demo-token calculations, and on-chain action records. This is an educational Devnet prototype, not a securities venue, custodian, regulated settlement system, or production financial service.

## Users and problems

| User | Problem explored by the prototype |
| --- | --- |
| Bond issuer | Terms, supply, eligibility, actions, and approvals can be split across systems and hard to audit end to end. |
| Corporate treasury operator | Reconciling holder files, record dates, entitlements, funding, and payment evidence can be operationally costly and error-prone. |
| Bondholder / investor | It can be difficult to verify eligibility, payment calculation, or whether a vote was counted once. |
| Financial market infrastructure operator | A lifecycle requires explicit roles, deterministic records, and integration boundaries; this prototype must not imply it replaces regulated infrastructure. |

These are design assumptions, not claims about a named institution's current systems.

## Primary journeys

1. **Issuer setup and issuance:** authorized issuer defines terms and supply, then issues whole bond units into registered positions. Dashboard reads state and shows source/cluster.
2. **Coupon:** issuer schedules record/payment times; mutations stop at cutoff; snapshot is built and finalized; operator reviews totals and funds vault; eligible holders claim once; action and transactions are inspectable.
3. **Maturity:** after issuance closure and a finalized same-bond snapshot, the authorized issuer creates one redemption event at/after contractual maturity. The issuer funds exact principal into isolated escrow. Anyone may activate after maturity and full funding; activation burns the full PDA-custodied bond supply and puts Bond in terminal Redeemed state. Each snapshot holder signs one claim to a holder-owned settlement account. A receipt blocks replay.
4. **Governance:** authorized issuer creates a proposal against a finalized snapshot; holders vote once with snapshot-weighted power; result is finalized after the window. An approved result does not rewrite historic entitlements.
5. **Audit:** operator/investor inspects action state, snapshot reference, calculation inputs, claim/vote record, and confirmed Devnet signature. Current shortened signatures and figures are fabricated mock fixtures.

## MVP scope

Eventual hackathon MVP: one issuer, a bounded holder population (initial cap 100), one or a few test bond series, and an existing demo settlement mint registered to the issuer. The selected candidate keeps classic SPL bond tokens in a program-controlled vault; program-owned Position PDAs record beneficial holders. Holders receive no SPL bond tokens in their wallets, and direct or peer-to-peer transfers are disabled in the MVP. Implement holder-consented registration, issuer-authorized issuance, cutoff locks and immutable snapshots, semiannual coupons with idempotent claims, maturity redemption and unit retirement, snapshot-weighted proposals/votes, and a dashboard backed by confirmed Devnet state. Snapshot processing must be bounded and batchable. This custodial position model is a prototype trade-off, not a production custody recommendation. The current frontend is only a static mock-data scaffold; wallet integration, indexing, and live transaction history are not implemented. M4 coupon and M5 redemption instructions work on a local validator but are not wired to the frontend or deployed.

## Out of scope

- Mainnet, real money, real KZT/USD, fiat conversion, token peg, or investment return claims.
- Legally issued/traded securities, brokerage, custody, exchange matching, regulated settlement, or market-infrastructure integration.
- KYC/AML, investor eligibility, enforceability, tax/accounting advice, compliance approval.
- Wallet-held or peer-to-peer bond-token transfers, bridges, lending, derivatives, price feeds, multi-chain, production throughput. A future signed program-mediated position transfer needs separate review and implementation.
- Arbitrary historical RPC balance reconstruction, production-scale indexing, complex delegation/amendment execution, or multi-issuer administration.

## Differentiation hypothesis

The demo focuses on corporate-action eligibility and replay-safe lifecycle state: it makes the record-date source explicit, binds payouts and votes to immutable snapshots, and exposes traceable action records. This is a product hypothesis, not a claim of superiority over named products or a replacement for market infrastructure.

## Hackathon demo

Use fabricated Devnet wallets and DSET test tokens with no monetary value. Configure face value **1,000 DSET**, 10% annual coupon, semiannual frequency. Issue 17 units: A=10, B=5, C=2. At cutoff, finalize snapshot; fund **850 DSET** coupon; demonstrate A=500, B=250, C=100 and reject a repeated claim. Run a snapshot-weighted governance vote with weights 10/5/2. At maturity, fund **17,000 DSET**, redeem A=10,000, B=5,000, C=2,000, retire units, and reject duplicate redemption. A shortened voting period must be labeled demo-only. No figure represents actual money, a KZT peg, a real bond, or KASE affiliation.

## Decisions and unresolved risks

M1 chooses six-decimal demo DSET, whole-bond units, fixed semiannual coupon math, program-controlled positions, timestamp-based cutoff, and immutable snapshots. M2/M3 implement classic SPL custody and snapshots; M4 implements one-time issuer settlement-mint registration, exact coupon reserve funding, and holder-signed claims. M5 adds maturity redemption with a separate exact principal reserve, full-supply burn on activation, per-holder receipts, and protected unclaimed funds. Governance remains future work. This is an educational prototype, not production custody. Future transfer policy, multisig, unclaimed-payment closeout, registry scale, and any real-market integration remain unresolved and outside current claims.
