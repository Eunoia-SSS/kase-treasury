# KASE Treasury - Devnet Runbook

**Status:** Preparation only. This document does not authorize or perform Devnet transactions. KASE Treasury is an independent educational prototype; DSET is a fabricated test token with no monetary value. No KASE partnership, endorsement, or official product is claimed.

## Current readiness blockers

Do not deploy until all are resolved:

1. `declare_id!`, the `Anchor.toml` localnet entry, and generated IDL currently say `8Lbkzg5shbLTZSz9y68YxgxpWE59VbHEVmj2XczZxR69`, but `target/deploy/kase_treasury-keypair.json` derives `7P3NaKZkqSKHYjTUF638mZifpWMeVq1qvfPNNjtVFjWZ`. Select one program identity, synchronize source/config/IDL, rebuild, and rerun all tests. Do not blindly run `anchor keys sync`; it changes the declared ID.
2. The configured default Solana wallet `~/.config/solana/id.json` is absent. Create or select a throwaway Devnet deployer only after approval, and keep its key outside the repository.
3. There is no Devnet demo client/script and no frontend wallet/RPC integration. Local-validator tests are not a Devnet smoke test.

## Prerequisites

- WSL2 Ubuntu, Rust stable, Solana CLI 2.1.0, Anchor CLI 0.31.1, and Node.js/npm available in the WSL shell. Current WSL has Rust/Cargo 1.99.0, Solana 2.1.0, Anchor 0.31.1, and no Linux Node binary. Windows Node is available through `/mnt/c/Program Files/nodejs/node.exe` for direct TypeScript checks/tests. Linux Node is not required for those direct checks, but is recommended before relying on normal `anchor test` and npm scripts.
- Build artifact: `target/deploy/kase_treasury.so`. Run `wc -c target/deploy/kase_treasury.so` and `solana rent <byte_count>` to estimate program-data rent. Include transaction fees and temporary deployment-buffer rent. Account rent is additional for issuer/bond/registry/position/snapshot/entry/coupon/redemption/proposal/receipt and SPL token accounts.
- A throwaway Devnet deployer with enough Devnet SOL; a separate program-ID keypair whose public key matches compiled `declare_id!`; a wallet for upgrade authority; a funded demo issuer; and disposable holder wallets A/B/C.
- Public Devnet RPC is rate limited. Use it only for a low-volume demo. A private RPC credential belongs only in local tooling, never in committed files or `NEXT_PUBLIC_*`.
- Preserve the verified IDL from the exact source build. Do not deploy stale `target/` artifacts.

## Safe preflight sequence

Run in WSL from the repository root. These checks are read-only except for the build:

```bash
git status --short --branch
anchor --version
solana --version
anchor build
anchor keys list
solana address -k target/deploy/kase_treasury-keypair.json
grep 'declare_id!' programs/kase_treasury/src/lib.rs
grep -A2 '\[programs.localnet\]' Anchor.toml
grep -m1 '"address"' target/idl/kase_treasury.json
```

The program address must match in source, Anchor config, keypair public address, and IDL. Add the verified address under `[programs.devnet]` and deliberately set provider cluster/wallet only after selecting the identity. Keep localnet config for tests. Verify a wallet with `solana address -k <wallet-path>`; inspect its balance with `solana balance <address> --url devnet`. Never display or copy keypair JSON contents.

Do not use Mainnet credentials or funds. Do not make the program immutable during a hackathon demo; retain a controlled upgrade path and disclose its authority.

## Deployment sequence (after explicit approval)

1. Resolve the program-ID mismatch and missing throwaway deployer. Record selected program ID, deployer public address, and intended upgrade authority in a checklist; keep all private-key files outside tracked paths.
2. Build from a clean, reviewed commit. Run formatting, Rust tests, Anchor build, test TypeScript typecheck, and the complete local-validator suite. Confirm the IDL address and program binary hash correspond to that build.
3. Set the CLI endpoint explicitly to Devnet for the deployment shell. Verify selected keypair path and `solana cluster-version --url devnet`; check deployer balance and rent estimate. Keep any custom RPC credential in a local environment variable.
4. Review `solana program deploy --help` and the exact program ID before submitting. Deploy using the matching program-ID keypair and throwaway deployer: `solana program deploy target/deploy/kase_treasury.so --program-id <MATCHING_PROGRAM_ID_KEYPAIR> --keypair <THROWAWAY_DEPLOYER_KEYPAIR> --url devnet`. Select and disclose the upgrade authority.
5. Verify with `solana program show <PROGRAM_ID> --url devnet`; confirm executable and upgrade authority. Save only public signatures/addresses and the verified build hash in demo notes.
6. Stop if any address, cluster, signer, or binary hash differs from the checklist. Never use force or switch the operator wallet to Mainnet.

## Demo-token and account setup

Use a fresh six-decimal classic SPL mint with no freeze authority. Its mint authority is a disposable demo key. Never represent DSET as currency, a KZT peg, an investment, or a real security.

After deployment approval and funding:

```bash
solana config set --url devnet
solana address -k <THROWAWAY_DEPLOYER_KEYPAIR>
solana balance <DEPLOYER_PUBLIC_ADDRESS> --url devnet
spl-token create-token --decimals 6
spl-token create-account <DSET_MINT> --owner <ISSUER_PUBLIC_ADDRESS>
spl-token display <DSET_MINT>
spl-token mint <DSET_MINT> <AMOUNT_DSET> <ISSUER_DSET_ACCOUNT>
```

The SPL CLI mint amount is expressed in displayed token units, not raw base units; mint 17,850 DSET for the 850 coupon plus 17,000 principal example. Verify the displayed mint has no freeze authority. Record returned mint/account addresses. Keep the mint authority in a protected local key file. Configure the issuer's one-time SettlementConfig with this mint. The protocol example needs 850 DSET coupon reserve and 17,000 DSET principal (17,850,000,000 base units total), plus any other demo period reserve. The frontend must show the Devnet cluster and settlement mint.

Program initialization and lifecycle instructions require a TypeScript Anchor client; this repository has no Devnet demo runner. Before a demo, implement and review a disposable-wallet script that invokes the IDL instructions, prints only public addresses/signatures, waits for confirmed transactions, and verifies resulting accounts. The local suite does not perform this setup.

## Planned end-to-end smoke test

Use disposable wallets and run a fresh sequence through the reviewed client:

1. Initialize issuer; create a bond with 1,000 DSET face value, 10% annual coupon, semiannual frequency, and demo maturity.
2. Register A/B/C with holder consent and issue 10/5/2 whole bond units. Verify registry and 17 units in custody.
3. Close issuance; create a non-retroactive snapshot; process bounded sequential batches; finalize and verify A/B/C entries and total 17.
4. Create the six-decimal DSET mint and SettlementConfig; create/fund the coupon period with 850 DSET. After payment time, claim 500/250/100 DSET and verify duplicate claim rejection.
5. Create a proposal tied to the finalized snapshot; vote with weights 10/5/2 and finalize after its demo voting window. Verify receipts/tallies and informational-only outcome.
6. At/after maturity, create/fund redemption with 17,000 DSET; activate permissionlessly; verify custody mint supply and vault are zero; claim 10,000/5,000/2,000 DSET once.
7. Verify funded coupon claims still work after retirement when that scenario is used; verify duplicate principal claims/votes fail. Save only public signatures and account addresses.

Use shortened dates only on a disposable Devnet bond and label them demo-only. Local tests control validator time; a Devnet client must wait for Clock/time and tolerate RPC latency. Keep repeatable IDs/keys isolated so a failed run cannot silently reuse PDAs.

## Verification and troubleshooting

- `solana cluster-version --url devnet` confirms endpoint connectivity.
- `solana program show <PROGRAM_ID> --url devnet` confirms deployed program and authority.
- Compare ID among source, Anchor config, IDL, selected program keypair, and CLI/Explorer.
- For incorrect program ID, stop and resolve identity mismatch; do not sync or redeploy blindly.
- For insufficient rent, re-check binary size, deployment rent, account rent, and fees. Fund only the throwaway wallet with Devnet SOL.
- For account owner/PDA errors, use the exact IDL, cluster, seed encoding, and addresses from this run.
- For timeouts, query the signature before retrying; PDA creation may already have succeeded.
- For blockhash/RPC errors, refresh blockhash or use a stable Devnet RPC only after checking transaction status.
- Keep logs/errors, but redact RPC URLs with embedded credentials and never save wallet secret material.

## Security limitations

M2-M6 are a locally tested educational prototype, not an audit or production-ready financial system. Bond ownership is custodial beneficial ownership in program PDAs; direct bond-token transfer is unavailable. The holder cap is 100. Issuer and program upgrade authorities are highly trusted. A configured settlement mint can retain a freeze authority; that authority can freeze an escrow or holder account and halt settlement. Demo operators must use a disposable mint without freeze authority. Coupon/redemption surplus donations remain locked because no sweep exists. The UI is mock-only and browser wallet integration is absent. Never use real funds or claim official KASE affiliation.
