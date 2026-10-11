"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useConnection, useWallet } from "./wallet-provider";
import type { Program } from "@coral-xyz/anchor";
import { programId } from "./keys";
import { useRuntime } from "./runtime-context";
import { useTreasuryProgram } from "./anchor";
import { readChainState, type ChainState } from "./data";
import type { KaseTreasury } from "./types/kase_treasury";

const empty: ChainState = {
  programReady: null, error: null, loading: false, balanceLamports: null,
  bonds: [], snapshots: [], coupons: [], proposals: [], redemptions: [], signatures: [], settlementMint: null, settlementBalanceBase: null,
};
type ChainContextValue = ChainState & {
  refresh: () => Promise<void>;
  program: Program<KaseTreasury> | null;
  connection: ReturnType<typeof useConnection>["connection"];
  wallet: ReturnType<typeof useWallet>;
};
const ChainContext = createContext<ChainContextValue | null>(null);

export function ChainDataProvider({ children }: { children: ReactNode }) {
  const runtime = useRuntime();
  const { connection } = useConnection();
  const wallet = useWallet();
  const program = useTreasuryProgram();
  const [state, setState] = useState<ChainState>(empty);
  const refresh = useCallback(async () => {
    if (runtime.mode !== "live" || !program) { setState({ ...empty }); return; }
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const info = await connection.getAccountInfo(programId, "confirmed");
      if (!info?.executable) {
        const balanceLamports = wallet.publicKey ? await connection.getBalance(wallet.publicKey, "confirmed").catch(() => null) : null;
        setState({ ...empty, programReady: false, error: "The KASE Treasury program is not deployed to this cluster.", balanceLamports });
        return;
      }
      const accounts = await readChainState(program, connection, wallet.publicKey);
      const balanceLamports = wallet.publicKey ? await connection.getBalance(wallet.publicKey, "confirmed") : null;
      setState({ ...empty, ...accounts, programReady: true, loading: false, balanceLamports });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : "RPC read failed." }));
    }
  }, [connection, program, runtime.mode, wallet.publicKey]);
  useEffect(() => { void refresh(); }, [refresh, runtime.cluster]);
  useEffect(() => {
    if (runtime.mode !== "live") return;
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, [refresh, runtime.mode]);
  const value = useMemo(() => ({ ...state, refresh, program, connection, wallet }), [state, refresh, program, connection, wallet]);
  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>;
}

export function useChainState() {
  const value = useContext(ChainContext);
  if (!value) throw new Error("ChainDataProvider is missing");
  return value;
}
