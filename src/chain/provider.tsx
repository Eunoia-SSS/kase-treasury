"use client";

import { WalletAdapterContextProvider } from "./wallet-provider";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ChainDataProvider } from "./use-chain";
import { DEVNET_RPC, LIVE_MODE, LOCALNET_RPC } from "./config";
import { RuntimeContext, type RuntimeContextValue, type Cluster } from "./runtime-context";

export { useRuntime } from "./runtime-context";
export type { Cluster, RuntimeMode } from "./runtime-context";

export function SolanaAppProvider({ children }: { children: ReactNode }) {
  const [selectedCluster, setSelectedCluster] = useState<"localnet" | "devnet">(
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "devnet" ? "devnet" : "localnet",
  );
  const cluster: Cluster = LIVE_MODE ? selectedCluster : "demo";
  const endpoint = LIVE_MODE && selectedCluster === "devnet" ? DEVNET_RPC : LOCALNET_RPC;
  const value = useMemo<RuntimeContextValue>(
    () => ({ mode: LIVE_MODE ? "live" : "demo", cluster, setCluster: setSelectedCluster, endpoint }),
    [cluster, endpoint],
  );
  return (
    <RuntimeContext.Provider value={value}>
      <WalletAdapterContextProvider>
        <ChainDataProvider>{children}</ChainDataProvider>
      </WalletAdapterContextProvider>
    </RuntimeContext.Provider>
  );
}
