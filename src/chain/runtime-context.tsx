"use client";

import { createContext, useContext } from "react";

export type Cluster = "localnet" | "devnet" | "demo";
export type RuntimeMode = "live" | "demo";
export type RuntimeContextValue = {
  mode: RuntimeMode;
  cluster: Cluster;
  setCluster: (cluster: "localnet" | "devnet") => void;
  endpoint: string;
};
export const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function useRuntime() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("SolanaAppProvider is missing");
  return value;
}
