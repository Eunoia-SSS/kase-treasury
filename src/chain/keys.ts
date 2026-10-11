import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./config";

export const programId = new PublicKey(PROGRAM_ID);
export const seeds = {
  issuer: Buffer.from("issuer"),
  bond: Buffer.from("bond"),
  bondAuthority: Buffer.from("bond_authority"),
  mint: Buffer.from("bond_mint"),
  vault: Buffer.from("bond_vault"),
  registry: Buffer.from("registry"),
  position: Buffer.from("position"),
  registryEntry: Buffer.from("registry_entry"),
  snapshot: Buffer.from("snapshot"),
  snapshotEntry: Buffer.from("snapshot_entry"),
  settlementConfig: Buffer.from("settlement_config"),
  coupon: Buffer.from("coupon"),
  couponAuthority: Buffer.from("coupon_authority"),
  couponVault: Buffer.from("coupon_vault"),
  claim: Buffer.from("coupon_claim"),
  redemption: Buffer.from("redemption"),
  redemptionAuthority: Buffer.from("redemption_authority"),
  redemptionVault: Buffer.from("redemption_vault"),
  redemptionClaim: Buffer.from("redemption_claim"),
  proposal: Buffer.from("governance_proposal"),
  voteReceipt: Buffer.from("vote_receipt"),
};

export function pda(...parts: (Buffer | Uint8Array | PublicKey)[]) {
  return PublicKey.findProgramAddressSync(
    parts.map((part) => part instanceof PublicKey ? part.toBuffer() : Buffer.from(part)),
    programId,
  )[0];
}

export function issuerIdFor(wallet: PublicKey) {
  return wallet.toBytes();
}

export function randomId() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes);
}

export function bytes32Hex(bytes: number[] | Uint8Array) {
  return Buffer.from(bytes).toString("hex");
}
