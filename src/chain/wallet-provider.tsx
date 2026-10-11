"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useStandardWalletAdapters } from "@solana/wallet-standard-wallet-adapter-react";
import type { Adapter } from "@solana/wallet-adapter-base";
import { Connection, type Signer, type Transaction, type TransactionSignature } from "@solana/web3.js";
import { useRuntime } from "./runtime-context";

type SignableAdapter = Adapter & { signTransaction?: <T extends Transaction>(transaction: T) => Promise<T> };
type WalletValue = {
  wallets: { adapter: Adapter }[]; wallet: { adapter: Adapter } | null; publicKey: Adapter["publicKey"];
  connected: boolean; connecting: boolean; select: (name: string) => void; connect: () => Promise<void>;
  disconnect: () => Promise<void>; signTransaction: <T extends Transaction>(transaction: T) => Promise<T>;
  signAllTransactions: <T extends Transaction>(transactions: T[]) => Promise<T[]>;
  sendTransaction: (transaction: Transaction, connection: Connection, options?: { signers?: Signer[] }) => Promise<TransactionSignature>;
};
const WalletContext = createContext<{ connection: Connection; wallet: WalletValue } | null>(null);

export function WalletAdapterContextProvider({ children }: { children: ReactNode }) {
  const runtime = useRuntime();
  const connection = useMemo(() => new Connection(runtime.endpoint, "confirmed"), [runtime.endpoint]);
  const adapters = useStandardWalletAdapters([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const adapter = adapters.find((item) => item.name === selectedName) ?? null;
  useEffect(() => {
    if (!adapter) return;
    const update = () => setRevision((value) => value + 1);
    adapter.on("connect", update); adapter.on("disconnect", update); adapter.on("error", update);
    return () => { adapter.off("connect", update); adapter.off("disconnect", update); adapter.off("error", update); };
  }, [adapter]);
  const requireAdapter = useCallback((): SignableAdapter => {
    if (!adapter) throw new Error("Choose a compatible Solana wallet first.");
    return adapter as SignableAdapter;
  }, [adapter]);
  const signTransaction = useCallback(async <T extends Transaction>(transaction: T): Promise<T> => {
    const selected = requireAdapter();
    if (!selected.signTransaction) throw new Error(`${selected.name} does not support transaction signing in this browser.`);
    return selected.signTransaction(transaction);
  }, [requireAdapter]);
  const wallet = useMemo<WalletValue>(() => {
    void revision;
    return ({
    wallets: adapters.map((item) => ({ adapter: item })), wallet: adapter ? { adapter } : null,
    publicKey: adapter?.publicKey ?? null, connected: adapter?.connected ?? false, connecting: adapter?.connecting ?? false,
    select: (name) => setSelectedName(name),
    connect: async () => { const selected = requireAdapter(); if (!selected.connected) await selected.connect(); },
    disconnect: async () => { const selected = requireAdapter(); if (selected.connected) await selected.disconnect(); },
    signTransaction,
    signAllTransactions: async <T extends Transaction>(transactions: T[]) => Promise.all(transactions.map((transaction) => signTransaction(transaction))),
    sendTransaction: async (transaction, targetConnection, options) => {
      const selected = requireAdapter();
      if (!selected.connected) throw new Error("Connect the selected wallet before submitting a transaction.");
      if (options?.signers?.length) transaction.partialSign(...options.signers);
      return selected.sendTransaction(transaction, targetConnection, { signers: [] });
    },
  });
  }, [adapters, adapter, requireAdapter, signTransaction, revision]);
  const value = useMemo(() => ({ connection, wallet }), [connection, wallet]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
export function useConnection() {
  const value = useContext(WalletContext); if (!value) throw new Error("WalletAdapterContextProvider is missing");
  return { connection: value.connection };
}
export function useWallet() {
  const value = useContext(WalletContext); if (!value) throw new Error("WalletAdapterContextProvider is missing");
  return value.wallet;
}
