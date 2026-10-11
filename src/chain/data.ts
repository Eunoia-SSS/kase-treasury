import { Buffer } from "buffer";
import type { BN, Program } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { PublicKey, Connection } from "@solana/web3.js";
import type { KaseTreasury } from "./types/kase_treasury";

export type BondAccount = {
  key: PublicKey; id: number[]; config: PublicKey; mint: PublicKey; vault: PublicKey;
  faceValueBase: BN; annualCouponBps: number; maturityTs: BN; supplyCap: BN; issued: BN; outstanding: BN;
  status: Record<string, unknown>; registryCount: number; registryUnits: BN; holderUnits: BN | null;
};
export type SnapshotAccount = {
  key: PublicKey; bond: PublicKey; snapshotId: number[]; recordDateTs: BN;
  expectedHolderCount: number; processedHolderCount: number; expectedTotalUnits: BN; totalUnits: BN;
  status: Record<string, unknown>; nextIndex: number;
};
export type CouponAccount = {
  key: PublicKey; bond: PublicKey; snapshot: PublicKey; settlementMint: PublicKey; periodId: BN;
  paymentDateTs: BN; couponPerBondBase: BN; expectedTotalBase: BN; fundedTotalBase: BN;
  paidTotalBase: BN; status: Record<string, unknown>;
};
export type ProposalAccount = {
  key: PublicKey; bond: PublicKey; snapshot: PublicKey; title: string; votingStartTs: BN;
  votingEndTs: BN; eligibleVotingPower: BN; yesVotingPower: BN; noVotingPower: BN;
  abstainVotingPower: BN; status: Record<string, unknown>;
};
export type RedemptionAccount = {
  key: PublicKey; bond: PublicKey; snapshot: PublicKey; settlementMint: PublicKey;
  requiredTotalBase: BN; fundedTotalBase: BN; paidTotalBase: BN; maturityTs: BN;
  status: Record<string, unknown>;
};
export type ChainState = {
  programReady: boolean | null; error: string | null; loading: boolean; balanceLamports: number | null;
  bonds: BondAccount[]; snapshots: SnapshotAccount[]; coupons: CouponAccount[];
  proposals: ProposalAccount[]; redemptions: RedemptionAccount[];
  signatures: { signature: string; blockTime: number | null; err: unknown }[];
  settlementMint: PublicKey | null; settlementBalanceBase: string | null;
};

export function displayStatus(value: Record<string, unknown>) {
  const name = Object.keys(value)[0] ?? "Unknown";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export async function readChainState(program: Program<KaseTreasury>, connection: Connection, wallet: PublicKey | null) {
  const { PublicKey } = await import("@solana/web3.js");
  const [bondRows, snapshotRows, couponRows, proposalRows, redemptionRows] = await Promise.all([
    program.account.bond.all(), program.account.recordDateSnapshot.all(), program.account.couponPeriod.all(),
    program.account.proposal.all(), program.account.redemption.all(),
  ]);
  const bonds: BondAccount[] = await Promise.all(bondRows.map(async ({ publicKey, account }) => {
    const registryKey = PublicKey.findProgramAddressSync([Buffer.from("registry"), publicKey.toBuffer()], program.programId)[0];
    const registry = await program.account.registryState.fetch(registryKey);
    const positionKey = wallet ? PublicKey.findProgramAddressSync([Buffer.from("position"), publicKey.toBuffer(), wallet.toBuffer()], program.programId)[0] : null;
    const holderPosition = positionKey ? await program.account.position.fetchNullable(positionKey) : null;
    return {
      key: publicKey, id: account.id, config: account.config, mint: account.mint, vault: account.vault,
      faceValueBase: account.faceValueBase, annualCouponBps: account.annualCouponBps, maturityTs: account.maturityTs,
      supplyCap: account.supplyCap, issued: account.issued, outstanding: account.outstanding,
      status: account.status as Record<string, unknown>, registryCount: registry.count,
      registryUnits: registry.totalUnits, holderUnits: holderPosition?.units ?? null,
    };
  }));
  const snapshots: SnapshotAccount[] = snapshotRows.map(({ publicKey, account }) => ({
    key: publicKey, bond: account.bond, snapshotId: account.snapshotId, recordDateTs: account.recordDateTs,
    expectedHolderCount: account.expectedHolderCount, processedHolderCount: account.processedHolderCount,
    expectedTotalUnits: account.expectedTotalUnits, totalUnits: account.totalUnits,
    status: account.status as Record<string, unknown>, nextIndex: account.nextIndex,
  }));
  const coupons: CouponAccount[] = couponRows.map(({ publicKey, account }) => ({
    key: publicKey, bond: account.bond, snapshot: account.snapshot, settlementMint: account.settlementMint,
    periodId: account.periodId, paymentDateTs: account.paymentDateTs, couponPerBondBase: account.couponPerBondBase,
    expectedTotalBase: account.expectedTotalBase, fundedTotalBase: account.fundedTotalBase,
    paidTotalBase: account.paidTotalBase, status: account.status as Record<string, unknown>,
  }));
  const proposals: ProposalAccount[] = proposalRows.map(({ publicKey, account }) => ({
    key: publicKey, bond: account.bond, snapshot: account.snapshot, title: account.title,
    votingStartTs: account.votingStartTs, votingEndTs: account.votingEndTs,
    eligibleVotingPower: account.eligibleVotingPower, yesVotingPower: account.yesVotingPower,
    noVotingPower: account.noVotingPower, abstainVotingPower: account.abstainVotingPower,
    status: account.status as Record<string, unknown>,
  }));
  const redemptions: RedemptionAccount[] = redemptionRows.map(({ publicKey, account }) => ({
    key: publicKey, bond: account.bond, snapshot: account.snapshot, settlementMint: account.settlementMint,
    requiredTotalBase: account.requiredTotalBase, fundedTotalBase: account.fundedTotalBase,
    paidTotalBase: account.paidTotalBase, maturityTs: account.maturityTs, status: account.status as Record<string, unknown>,
  }));
  const signatureSets = await Promise.all(bonds.slice(0, 20).map((bond) => connection.getSignaturesForAddress(bond.key, { limit: 10 }).catch(() => [])));
  const unique = new Map<string, { signature: string; blockTime: number | null; err: unknown }>();
  signatureSets.flat().forEach((item) => unique.set(item.signature, { signature: item.signature, blockTime: item.blockTime ?? null, err: item.err }));
  let settlementMint: PublicKey | null = null;
  let settlementBalanceBase: string | null = null;
  if (wallet) {
    const issuerConfig = PublicKey.findProgramAddressSync([Buffer.from("issuer"), wallet.toBuffer()], program.programId)[0];
    const settlementKey = PublicKey.findProgramAddressSync([Buffer.from("settlement_config"), issuerConfig.toBuffer()], program.programId)[0];
    try { settlementMint = (await program.account.settlementConfig.fetch(settlementKey)).mint; settlementBalanceBase = (await connection.getTokenAccountBalance(getAssociatedTokenAddressSync(settlementMint, wallet), "confirmed")).value.amount; } catch { /* current wallet has not configured settlement or associated token account yet */ }
  }
  return {
    bonds, snapshots, coupons, proposals, redemptions, settlementMint, settlementBalanceBase,
    signatures: [...unique.values()].sort((a, b) => (b.blockTime ?? 0) - (a.blockTime ?? 0)),
  };
}
