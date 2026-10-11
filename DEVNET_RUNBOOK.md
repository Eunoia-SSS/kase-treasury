# KASE Treasury - Devnet Runbook

**Status:** Preparation only. This runbook and client do not deploy or transact on Devnet. KASE Treasury is an independent educational prototype with no official KASE partnership or endorsement. DSET is fabricated test data with no monetary value.

## Current preparation state

- Program ID is synchronized across `declare_id!`, localnet/devnet Anchor entries, the existing ignored program keypair, and generated IDL after build: `7P3NaKZkqSKHYjTUF638mZifpWMeVq1qvfPNNjtVFjWZ`.
- Anchor defaults to localnet. Devnet requires explicit selection.
- `scripts/devnet-demo.ts` uses real Anchor and SPL RPC calls. It defaults to localhost. Devnet transactions require `KASE_DEMO_CLUSTER=devnet` and `KASE_DEMO_ALLOW_DEVNET_TRANSACTIONS=YES_I_APPROVE_DEVNET_TRANSACTIONS`.
- No deployer wallet is configured. No Devnet deployment, airdrop, mint, or transaction has been performed. The current global Solana CLI URL is mainnet-beta and its default wallet file is absent; use explicit cluster and wallet options on every CLI command. Read-only Devnet genesis hash was checked on 2026-10-11: `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
- Linux Node.js 24.21.0 is installed project-locally at ignored `target/kase-node-v24.21.0`, verified against the official SHA-256. The existing Windows Node 24.21.0 was not modified.
- Existing ignored program keypair is project-scoped and mode 600. Keep a secure offline backup. Never print or commit its contents. It signs the program address and is distinct from the disposable deployer wallet.

## Portable WSL Node runtime

The current environment uses a checksum-verified Node.js 24.21.0 runtime inside ignored `target/`; it is not a system install and is not committed. To recreate it in a fresh checkout, verify that `target/kase-node-v24.21.0` does not already exist, then run:

```bash
mkdir -p target/kase-node-v24.21.0
curl -fsSL https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz -o target/kase-node-v24.21.0.tar.xz
printf 'fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6  %s\n' target/kase-node-v24.21.0.tar.xz | sha256sum -c -
tar -xJf target/kase-node-v24.21.0.tar.xz -C target/kase-node-v24.21.0 --strip-components=1
rm target/kase-node-v24.21.0.tar.xz
export PATH="$PWD/target/kase-node-v24.21.0/bin:$PATH"
node --version
npm --version
```

The current project scripts then run normally with Linux npm. This leaves the Windows Node installation and system package configuration unchanged.

## Prerequisites

- WSL2 Ubuntu, Rust/Cargo, Solana CLI 2.1.0, Anchor CLI 0.31.1, Node.js/npm.
- Local validation: `cargo fmt --all -- --check`, `cargo test -p kase_treasury -q`, `anchor build`, `npm run typecheck:tests`, and the M2-M6 local validator suite.
- After explicit approval: disposable Devnet deployer, three disposable holder wallets, sufficient Devnet SOL for deployment/rent/fees, and a reliable Devnet RPC.
- Provider tokens belong only in a local shell environment; never put them in `.env.example`, source, or `NEXT_PUBLIC_*`.
- Secure backup of ignored `target/deploy/kase_treasury-keypair.json` is required. A fresh clone will not contain this file.
- Explicit user approval is required before deployment, airdrop, mint, or any Devnet demo transaction.

## Manual Devnet wallet setup (after approval)

These commands create a new disposable operator wallet and do not overwrite the Solana default identity. Run them yourself in WSL:

```bash
install -d -m 700 "$HOME/.config/solana"
umask 077
solana-keygen new --outfile "$HOME/.config/solana/kase-treasury-devnet-deployer.json"
chmod 600 "$HOME/.config/solana/kase-treasury-devnet-deployer.json"
solana address -k "$HOME/.config/solana/kase-treasury-devnet-deployer.json"
```

Keep the recovery phrase offline. Never paste it or the keypair file into chat, commit it, or save it under the repository. Create holder wallets separately using the same procedure. Fund them manually from a Devnet faucet. The demo client does not create or fund Devnet holders and does not request a Devnet airdrop.

## Identity preflight

Run from the WSL project root. Verify the selected RPC genesis hash before deployment or demo; the client also checks this before any Devnet transaction. The Devnet hash observed on 2026-10-11 was `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`. Devnet can be reset; on mismatch, stop and confirm the current official endpoint before updating the guard.

```bash
solana genesis-hash --url "$ANCHOR_PROVIDER_URL"
```



```bash
git status --short --branch
anchor keys list
solana address -k target/deploy/kase_treasury-keypair.json
grep 'declare_id!' programs/kase_treasury/src/lib.rs
grep -A2 '\[programs.devnet\]' Anchor.toml
grep -m1 '"address"' target/idl/kase_treasury.json
```

All addresses must equal `7P3NaKZkqSKHYjTUF638mZifpWMeVq1qvfPNNjtVFjWZ`. Stop if the local program keypair is missing or differs. Do not regenerate it or blindly rerun key synchronization. Build and record the program binary SHA-256 before deployment.

## Deployment SOL estimate

The M7 program binary was 938,576 bytes, with a rent-exempt program-data estimate of 4.76861632 SOL. Rebuild and recalculate; size may change. This is not the full deployment budget. Include temporary buffer rent, program account rent, transaction fees, and rent for issuer/bond/registry/positions/snapshot entries, SPL token accounts, event escrows, proposals, and receipts.

After approval, calculate the current program-data estimate:

```bash
bytes=$(wc -c < target/deploy/kase_treasury.so)
solana rent "$bytes" --url devnet
```

Do not assume a faucet can provide the total in one request. Check disposable deployer balance and rent needs before deployment.

## Deployment (only after explicit approval)

1. Review source, test results, binary hash, program ID, deployer address, and upgrade authority plan.
2. Confirm the deployer is disposable and not a Mainnet identity. The proposed initial upgrade authority is this same dedicated Devnet deployer; record its public address and retain controlled access. Do not make the program immutable.
3. Use command-scoped settings; do not change global Solana CLI defaults:

   ```bash
   anchor build
   anchor deploy -p kase_treasury --provider.cluster devnet --provider.wallet "$HOME/.config/solana/kase-treasury-devnet-deployer.json" --program-keypair target/deploy/kase_treasury-keypair.json
   ```

   Anchor uses the existing ignored `target/deploy/kase_treasury-keypair.json` as the program ID signer. Stop on any identity mismatch. Keep the upgrade authority controlled and disclose its address.
4. Verify using `solana program show 7P3NaKZkqSKHYjTUF638mZifpWMeVq1qvfPNNjtVFjWZ --url devnet`. Save only public addresses, signatures, and build hash.

Never deploy stale artifacts or continue after a cluster, identity, signer, binary, or authority mismatch.

## Demo client

First complete the localnet run. After explicit approval and after funding the disposable wallets, set:

```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET="$HOME/.config/solana/kase-treasury-devnet-deployer.json"
export KASE_DEMO_CLUSTER=devnet
export KASE_DEMO_HOLDER_A_KEYPAIR="$HOME/.config/solana/kase-holder-a.json"
export KASE_DEMO_HOLDER_B_KEYPAIR="$HOME/.config/solana/kase-holder-b.json"
export KASE_DEMO_HOLDER_C_KEYPAIR="$HOME/.config/solana/kase-holder-c.json"
export KASE_DEMO_ALLOW_DEVNET_TRANSACTIONS=YES_I_APPROVE_DEVNET_TRANSACTIONS
npm run demo:devnet
```

The opt-in variable is a local guard, not authorization. Do not set it until approval. Ensure each wallet has SOL for fees and rent. The client verifies executable program identity, creates issuer and bond, registers A/B/C with 10/5/2 units (the on-chain register instruction creates the initial units), closes issuance, finalizes the 17-unit snapshot, creates six-decimal DSET without freeze authority, mints 17,850 demo DSET, pays coupon amounts 500/250/100, records Yes/No/Abstain votes weighted 10/5/2, then waits for the 120-second Devnet maturity, redeems 17,000 DSET principal, burns all 17 bond units, and verifies final balances/states.

Localnet uses 30-second maturity; Devnet uses 120 seconds. Both poll the on-chain Clock with bounded timeouts. No time-warp is attempted. The script prints public signatures and addresses only. It uses fresh random IDs per run. If a run fails after transactions, inspect signatures and PDAs before retrying; a retry creates new accounts and consumes additional rent.

## Local test commands

```bash
cargo fmt --all -- --check
cargo test -p kase_treasury -q
anchor build
npm run typecheck:tests
anchor test --provider.wallet target/localnet-wallet.json
```

If the portable Linux Node runtime is absent, start `solana-test-validator` with the built program and run the direct Windows Node fallback from WSL:

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit -p tests/tsconfig.json
```

Set Anchor provider environment variables inside the Node process when launching that fallback. Keep the RPC endpoint at localhost. The local demo command is:

```bash
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET=target/localnet-wallet.json \
KASE_DEMO_CLUSTER=localnet \
npm run demo:localnet
```

### Direct localnet verification when Linux Node is absent

Terminal 1, from the project root:

```bash
solana-test-validator --reset --ledger target/m8a-local-ledger   --bpf-program 7P3NaKZkqSKHYjTUF638mZifpWMeVq1qvfPNNjtVFjWZ   target/deploy/kase_treasury.so --quiet
```

Terminal 2, use the existing ignored local test wallet (do not create or print its secret):

```bash
solana airdrop 100 --url http://127.0.0.1:8899 --keypair target/localnet-wallet.json
```

When using the existing Windows Node through WSL, set environment variables inside Node because Windows child processes do not inherit WSL exports reliably:

```bash
"/mnt/c/Program Files/nodejs/node.exe" -e 'process.env.ANCHOR_PROVIDER_URL="http://127.0.0.1:8899";process.env.ANCHOR_WALLET="target/localnet-wallet.json";process.argv=["node","ts-mocha","-p","tests/tsconfig.json","-t","1000000","tests/kase_treasury.ts"];require("./node_modules/ts-mocha/bin/ts-mocha")'
```

For the local demo, use the same Node command with `process.env.KASE_DEMO_CLUSTER="localnet"` and final argv path `scripts/devnet-demo.ts`. Example:

```bash
"/mnt/c/Program Files/nodejs/node.exe" -e 'process.env.ANCHOR_PROVIDER_URL="http://127.0.0.1:8899";process.env.ANCHOR_WALLET="target/localnet-wallet.json";process.env.KASE_DEMO_CLUSTER="localnet";process.argv=["node","ts-mocha","-p","tests/tsconfig.json","-t","1000000","scripts/devnet-demo.ts"];require("./node_modules/ts-mocha/bin/ts-mocha")'
```

Use a fresh validator ledger after a test suite if a clean demo state is desired. All of these local validator operations are isolated from Devnet.

## Troubleshooting and limitations

- ID mismatch: compare declaration, both Anchor cluster entries, existing keypair address, and generated IDL. Never replace the ignored keypair automatically.
- Program not executable: verify RPC cluster and deployment with `solana program show`.
- Insufficient funds: recalculate program/buffer/account rent and fees. Fund only approved disposable Devnet wallets.
- Account/PDA error: use the exact generated IDL and verify seed encoding/accounts.
- Timeout or unknown transaction result: query its printed signature and expected PDA before retrying. Timeout does not mean failure.
- DSET has no monetary value. Issuer and upgrade authorities remain trusted. Bond beneficial ownership is custodial in Position PDAs; direct transfers are unavailable; holder cap is 100.
- Unclaimed coupon/redemption surplus has no sweep path. Frontend is mock-only. This program is unaudited, not production-ready, and must not be used with real funds.
