# KASE Treasury - Submission Checklist

Mark an item complete only after performing the check for the exact submission build.

## Public access and presentation

- [ ] Confirm the GitHub repository is public and opens in a signed-out browser: https://github.com/Eunoia-SSS/kase-treasury
- [x] Confirm the public website opens: https://kase-treasury.vercel.app/
- [x] Confirm the hosted interactive demo opens and visibly labels all actions as simulated: https://kase-treasury.vercel.app/operations
- [x] Play the complete five-step demo; verify 17 issued units, snapshot 10/5/2, coupon claims 500/250/100 DSET, vote weights 10/5/2, principal claims 10,000/5,000/2,000 DSET, and final supply zero.
- [x] Reset and replay the entire demo.
- [ ] Check all six routes on desktop and a mobile viewport: /, /bonds, /actions, /governance, /transactions, /operations.
- [ ] Check keyboard focus, menu open/close, form labels, errors, and links in a real browser.
- [x] README and submission description prepared in this source tree.
- [ ] Record and review the 2-minute video using DEMO_VIDEO_SCRIPT.md.

## Code and security

- [ ] Inspect the final Git diff and verify no unrelated changes are included.
- [ ] Scan tracked files and Git history for private keys, seed phrases, API/RPC credentials, and environment secrets; do not rely on ignore rules alone.
- [x] Confirm .env.example contains public configuration only and no credentials.
- [x] Check that local validator ledgers, keypairs, node_modules, .next, and build outputs are ignored and not tracked.
- [x] Review current production dependency advisories; 17 are reported (6 high, 11 moderate). Remediation remains unresolved and must be assessed before enabling live transactions.
- [ ] Keep user/deployer wallets disposable; never use valuable keys or real funds.

## Verification and claims

- [x] Run frontend typecheck, lint, tests, build, and git diff --check on this submission working tree.
- [x] Run Anchor build and full Localnet suite after the test-helper polling adjustment; the final suite passed 22 tests.
- [x] Confirm the submission clearly says the browser demo is simulated and the Anchor program is not deployed to Devnet.
- [x] Confirm no claim of an external security audit, real-money settlement, or official KASE affiliation appears.
- [ ] Verify contest-specific submission fields, deadline, category, team details, and required links in the official submission form.

## Current review status

The source and local checks are being reviewed in this M10 preparation. Hosted routes and the complete operations demo were manually checked in a browser; the demo reset to its initial state. The six route headings were checked at a narrow viewport. Signed-out repository visibility, desktop visual review, and keyboard accessibility remain owner checks. Devnet deployment and Devnet transactions have not occurred.
