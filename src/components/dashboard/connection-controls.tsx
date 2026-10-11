"use client";

import { useState } from "react";
import { useWallet } from "@/chain/wallet-provider";
import { Wallet, Wifi, WifiOff } from "lucide-react";
import { useRuntime } from "@/chain/runtime-context";
import { useChainState } from "@/chain/use-chain";

export function ConnectionControls() {
  const runtime = useRuntime();
  const { wallets, wallet, publicKey, connect, disconnect, select, connecting } = useWallet();
  const chain = useChainState();
  const [choice, setChoice] = useState("");
  const [walletError, setWalletError] = useState("");
  const [busy, setBusy] = useState(false);
  async function connectWallet() {
    try {
      setWalletError("");
      setBusy(true);
      if (!wallet && choice) select(choice as never);
      else if (wallet && !publicKey) await connect();
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Wallet connection failed.");
    } finally { setBusy(false); }
  }
  if (runtime.mode === "demo") return <div className="connection-controls"><span className="cluster-pill demo-cluster"><span className="status-dot" />Public demo · simulated</span><span className="wallet-button demo-wallet"><Wallet size={14} />No wallet required</span></div>;
  const status = chain.programReady ? "Program online" : chain.error ? "RPC unavailable" : chain.programReady === false ? "Program not deployed" : "Checking RPC";
  return <div className="connection-controls">
    <label className="cluster-select-label" htmlFor="cluster-select">Cluster</label>
    <select id="cluster-select" className="cluster-select" value={runtime.cluster} onChange={(event) => runtime.setCluster(event.target.value as "localnet" | "devnet")}>
      <option value="localnet">Localnet</option><option value="devnet">Devnet</option>
    </select>
    <span className={`cluster-pill ${chain.programReady ? "connected-cluster" : "offline-cluster"}`} title={chain.error ?? status}>
      {chain.programReady ? <Wifi size={13} /> : <WifiOff size={13} />}{status}
    </span>
    {publicKey ? <><span className="wallet-address" title={publicKey.toBase58()}>{publicKey.toBase58().slice(0,4)}…{publicKey.toBase58().slice(-4)}</span>
      {chain.balanceLamports !== null && <span className="wallet-balance">{(chain.balanceLamports / 1_000_000_000).toFixed(3)} SOL</span>}
      <button className="wallet-button" onClick={() => void disconnect()}><Wallet size={14} />Disconnect</button></> :
      <><select className="wallet-select" aria-label="Choose wallet" value={choice || wallet?.adapter.name || ""} onChange={(event) => { setChoice(event.target.value); if (event.target.value) select(event.target.value as never); }}>
        <option value="">Choose wallet</option>{wallets.map((item) => <option key={item.adapter.name} value={item.adapter.name}>{item.adapter.name}</option>)}
      </select><button className="wallet-button" onClick={() => void connectWallet()} disabled={busy || connecting || wallets.length === 0 || (!choice && !wallet)}>
        <Wallet size={14} />{connecting || busy ? "Connecting…" : wallet ? "Connect wallet" : wallets.length ? "Select wallet" : "Install a Solana wallet"}
      </button></>}
    {walletError && <span className="wallet-error" role="alert">{walletError}</span>}
    {wallets.length === 0 && <span className="wallet-hint">Install a Wallet Standard compatible wallet.</span>}
    <span className="sr-only">{runtime.cluster} {status}</span>
  </div>;
}

export function RuntimeSidebarStatus() {
  const runtime = useRuntime();
  const chain = useChainState();
  if (runtime.mode === "demo") return <div className="network-card"><div className="network-heading"><span className="live-dot" />Public Demo<span className="network-tag">SIMULATED</span></div><p>Deterministic sample data · no transactions</p></div>;
  const connected = chain.programReady === true;
  return <div className="network-card"><div className="network-heading"><span className={`live-dot ${connected ? "" : "muted-dot"}`} />Solana {runtime.cluster === "localnet" ? "Localnet" : "Devnet"}<span className="network-tag">{connected ? "LIVE" : "OFFLINE"}</span></div><p>{chain.error ?? (connected ? "Real account reads · wallet signed" : "Waiting for RPC and program")}</p></div>;
}
