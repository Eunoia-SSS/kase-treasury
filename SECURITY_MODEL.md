# KASE Treasury — Security Model

**Status:** Threat model and implementation boundary. M2 controls are implemented and localnet-tested; M3/later controls remain requirements. This is not an audit or production-readiness claim.

## Assets and trust boundaries

Protect issuer and upgrade authorities, bond mint/supply, PDA-owned bond custody vault, registered beneficial positions, immutable snapshots, DSET reserves, claim/redemption/vote records, and displayed transaction provenance. Boundaries include browser/wallet, issuer/operator/holder signers, Anchor program, classic SPL Token program, RPC/indexer, Devnet, environment configuration, and deployment keys. UI and RPC responses are not authorization; validated program state is authoritative.

## Assumptions

- Issuer may configure actions within bounds but cannot forge holder positions, mutate finalized snapshots, or withdraw action reserves arbitrarily.
- M2 implements non-transferable custodial ownership: bond SPL units are not distributed to holder wallets. All units remain in a PDA vault; beneficial ownership is in Position plus sequential RegistryEntry. This is a prototype-only custody trade-off.
- Registration requires holder signature plus issuer authorization. Issuance requires issuer authorization and mints only into the canonical bond vault. Holder proves control at registration, not through an SPL ATA.
- Holder controls their key; permissionless cranker can advance bounded snapshot/tally work but cannot choose balances or beneficiaries.
- RPC/indexer may be stale or incomplete; verify cluster, account owner, and transaction status.
- Demo tokens and Devnet SOL have no assumed value. Solana, selected token program, Anchor constraints, and deployed binary remain dependencies.
- No real assets, enforceable securities, custody, regulated settlement, or KASE affiliation are represented.

## Threats and required controls

The table lists controls across the roadmap; it does not mean every control is already live. M2 evidence and remaining work follow.

| Threat | Required control and test |
| --- | --- |
| Unauthorized issuer action | PDA-stored authority, signer and canonical-seed constraints, two-step authority handoff; test wrong/stale signer. |
| Upgrade-key compromise | Separate and document upgrade authority; Devnet-only deployer key kept outside repo; consider multisig before public release. |
| Duplicate coupon | Unique bond/period action and `ClaimRecord(coupon,holder)`; transfer and claim update atomic; test replay/retry. |
| Duplicate redemption | Maturity and snapshot checks, unique holder redemption record, holder signature, atomic payment plus unit retirement; test replay/partial failure. |
| Duplicate/overweight vote | Unique vote PDA, immutable snapshot weight, tally bounded by eligible units; test duplicate and ineligible voter. |
| Invalid mint/account | Validate the classic SPL Token Program ID, mint, 0 bond decimals, state-appropriate mint authority (BondAuthority before issuance closure, none after), Position owner/seeds/keys, vault mint and PDA owner; reject holder ATAs and substituted accounts. |
| Unauthorized mint or vault movement | Mint only through issuer-authorized program instruction, CPI-signed by BondAuthority PDA, destination restricted to canonical BondVault. Do not expose generic withdrawal/transfer instructions. Test rogue issuer, wrong mint/vault, and attempted external signature. |
| Unintended direct bond transfer | No holder receives SPL units and no transfer instruction exists in MVP. Classic Token vault owner is a PDA with no external private key. Test that holder-created token accounts cannot withdraw vault tokens. |
| Snapshot manipulation | Program-controlled registry, no arbitrary operator-uploaded balances, block direct SPL transfer or gate it through atomic program logic, cutoff mutation guard, registry lock, bounded complete unique entries, sum/supply reconciliation; never rely on arbitrary RPC historical balances. |
| Snapshot liveness | Permissionless bounded batch/finalization after cutoff; no issuer signature after cutoff; test delayed/restarted cranker and holder cap. |
| Overflow/rounding exploit | Integer base units, checked `u128` intermediate and `u64` conversions, input bounds, documented floor and dust policy; boundary/property tests. |
| Invalid lifecycle transition | Explicit enum/status guards, immutable activated terms/snapshots; test out-of-order and repeated calls. |
| Insufficient reserves | Full reserve check before `Funded`; one base unit short must fail without state change; wrong-mint and CPI rollback tests. |
| Time ambiguity | UTC Unix seconds from `Clock`, reject mutation at `now >= cutoff`, show scheduled time and slots; test just before/equal/after. |
| Misleading UI/indexer | Mark fixtures as mock; on live data show cluster/source/freshness; no fake explorer links; cross-check finalized state and signatures. |
| Secret leak | No private key/seed/API secret in source or `NEXT_PUBLIC_*`; safe `.env.example`, ignore local env/wallet/validator/build output, audit files and Git history before any public push. |

## M2 implemented controls and test evidence

Implemented: issuer signer/PDA checks and two-step handoff; unique IDs; bounded terms; classic SPL program ID; 0-decimal mint with BondAuthority; canonical vault PDA/mint/owner; issuer and holder signatures; unique Position/RegistryEntry; 100-holder limit; issuer-only minting to vault; checked accounting and cap; lifecycle guards; aggregate/mint/vault reconciliation; permanent mint-authority revocation. No holder transfer or vault withdrawal instruction exists.

Verification: 3 Rust unit tests, anchor build, TypeScript test typecheck, and 6 Anchor local-validator groups passed. Tests cover issuer initialization/handoff/auth, mint/vault, registration/duplicate, wrong mint/vault, cap/accounting, 100/101 holders, closure/revocation. Tests do not prove absence of all exploits.

Not implemented: record-date guards, snapshots/locks, settlement mint/reserves, coupon, redemption, governance, pause, wallet signing, Devnet, fuzz/property tests, or external audit. Closure uses atomic aggregates and does not scan all Position PDAs.

## Snapshot invariants

1. The issuer cannot submit arbitrary snapshot balances.
2. All balance mutations enforce cutoff; positions stay locked while snapshot is built.
3. Registry is bounded, unique, and complete; snapshot total matches outstanding beneficial positions; total positions equal `BondVault.amount` and mint supply (adjusted only by later burns/redemptions). When issuance closes, mint authority is revoked.
4. Snapshot entries are immutable; later transfer only affects later snapshots.
5. Payout, vote, and redemption records are scoped to unique action/proposal identities and cannot be consumed twice.
6. Payment destination is constrained to the snapshot holder or a separately authorized fixed destination.

## Authority and pause model

Issuer authority configures bonds/actions/proposals; safe snapshot processing, claims, and expired-result finalization should be permissionless. Pause scope must be explicit and cannot rewrite finalized entitlements or withdraw reserves. MVP requires two-step issuer handoff. Program upgrade authority is separate; document it. Production requires authority/custody review, likely multisig, legal/compliance review, and external audit.

## Required security tests before Devnet demo

Test correct/incorrect issuer and holder signers, PDAs, program IDs, 0-decimal bond mint, mint authority, vault token owner/mint, registry membership, duplicate holder and 100-holder cap, issuance overflow and closed issuance; verify no holder ATA receives units and no external wallet can move vault tokens. Later gates test cutoff boundary and lock, snapshot batching/completeness/duplicates/mismatch/cap/resumption; math, underfunding, duplicate claims/redemption, governance, CPI rollback, pause, and authority handoff. Local tests, static review, fuzzing, and dependency review are not an external audit; Devnet is not production readiness.

## Incident and residual risks

If a secret appears in files or Git history, stop before publication, explain exposure, and request approval before history rewrite; rotate exposed credentials through their owner. Never paste secrets in chat. Pause a compromised demo and state what is known; do not promise recovery without proof.

Unresolved risks: custodial semantics and issuer/upgrade authority compromise, scaling beyond the 100-holder cap, M3 cutoff semantics, unclaimed settlement-reserve closeout, RPC availability, legal characterization, and no audit. M2 is localnet-only.
