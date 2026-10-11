import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "./wallet-provider";
import { useMemo } from "react";
import IDL from "./idl/kase_treasury.json";
import type { KaseTreasury } from "./types/kase_treasury";
import { useRuntime } from "./runtime-context";

export function useTreasuryProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const runtime = useRuntime();
  return useMemo(() => {
    if (runtime.mode !== "live") return null;
    const readonly = {
      publicKey: wallet.publicKey ?? new PublicKey(new Uint8Array(32)),
      signTransaction: async () => { throw new Error("Connect a wallet to submit transactions."); },
      signAllTransactions: async () => { throw new Error("Connect a wallet to submit transactions."); },
    } as never;
    const signer = wallet.publicKey
      ? { publicKey: wallet.publicKey, signTransaction: wallet.signTransaction, signAllTransactions: wallet.signAllTransactions }
      : readonly;
    const provider = new AnchorProvider(connection, signer as never, { commitment: "confirmed", preflightCommitment: "confirmed" });
    return new Program<KaseTreasury>(IDL as unknown as Idl, provider);
  }, [connection, runtime.mode, wallet.publicKey, wallet.signAllTransactions, wallet.signTransaction]);
}
