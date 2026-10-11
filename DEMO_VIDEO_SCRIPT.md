# KASE Treasury - 2-Minute Demo Video Script

**Recording note:** Record the hosted `/operations` page only after confirming it shows the current five-step walkthrough. The page is a deterministic educational simulation. It does not access a wallet or Solana RPC and creates no on-chain transaction.

| Time | Screen / action | Narration |
| --- | --- | --- |
| 0:00-0:12 | Title card, then dashboard | "Corporate actions depend on clear holder eligibility, correct entitlements, and protection against duplicate payments or votes. KASE Treasury is an independent educational prototype exploring that lifecycle on Solana. It is not an official KASE product." |
| 0:12-0:25 | Show dashboard, point out prototype notice and Operations | "The dashboard summarizes the concept. I will use the public interactive walkthrough. The page labels every action as simulated, so nothing here requires a wallet or creates a transaction." |
| 0:25-0:42 | Start demo; issue sample bonds | "The fixed example has a face value of 1,000 demo DSET per bond, with Investors A, B, and C receiving 10, 5, and 2 units. Issuance closes at 17 units." |
| 0:42-0:55 | Finalize record-date snapshot | "The snapshot freezes those sample positions as the source for later entitlements. In the program design, snapshots are created only after issuance is closed and are processed in bounded registry batches." |
| 0:55-1:12 | Fund and claim coupon | "At a 10 percent annual coupon paid semiannually, the simulated coupon is 500, 250, and 100 DSET - 850 in total. Each sample holder claims once." |
| 1:12-1:29 | Cast YES / NO / ABSTAIN and finalize | "Voting power follows the snapshot: 10, 5, and 2. The example records YES, NO, and ABSTAIN, then finalizes an informational result. It does not execute a bond amendment." |
| 1:29-1:45 | Fund and claim redemption | "At maturity, the simulation distributes 10,000, 5,000, and 2,000 DSET principal. Once all sample claims are complete, the displayed outstanding supply is zero." |
| 1:45-1:56 | Show completion state and GitHub | "The separate Rust and Anchor program has been tested with a local Solana validator, and its integration suite covers the lifecycle. Local testing is not a Devnet deployment, and the program has not received an independent security audit." |
| 1:56-2:00 | Closing card with links | "KASE Treasury: inspectable corporate actions, with the demo and on-chain implementation clearly distinguished." |

**Suggested on-screen footer:** "Interactive browser simulation | No wallet/RPC | No real token transfers | Anchor tested locally | Not deployed to Devnet | Independent prototype, not affiliated with or endorsed by KASE."

**Capture checklist:** Keep the Demo Mode label visible; show resulting balances and final zero supply; do not show wallet key files, secret environment values, or imply Explorer signatures exist for simulated actions.
