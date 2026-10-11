"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Card, PageHeading, SectionHeading, StatusBadge } from "@/components/ui/primitives";
import { useChainState } from "@/chain/use-chain";
import { useRuntime } from "@/chain/runtime-context";
import { displayStatus } from "@/chain/data";
import { formatDate } from "@/lib/format";

function short(s:string){return s.slice(0,6)+"…"+s.slice(-5)}
function Message({title}:{title:string}){const c=useChainState();return <Card className="live-state-card"><strong>{title}</strong><span>{c.error??(c.loading?"Reading on-chain accounts…":"Select a live cluster with the KASE Treasury program deployed to load accounts.")}</span><button className="button button-secondary" onClick={()=>void c.refresh()}><RefreshCw size={13}/>Retry</button><Link href="/operations">Open operations console →</Link></Card>}
function Header({title,description}:{title:string;description:string}){const r=useRuntime();return <PageHeading eyebrow={r.cluster.toUpperCase()+" · ON-CHAIN READS"} title={title} description={description} action={<Link className="button button-primary" href="/operations">Open operations</Link>}/>}

export function LiveOverview(){
 const c=useChainState();
 if(c.programReady!==true)return <><Header title="Treasury overview" description="Live account summary from the selected Solana RPC."/><Message title="Program data is not available"/></>;
 const units=c.bonds.reduce((n,b)=>n+BigInt(b.outstanding.toString()),0n);
 const holders=c.bonds.reduce((n,b)=>n+b.registryCount,0);
 return <><Header title="Treasury overview" description="Account values read from the configured Solana program. No sample metrics are mixed into this view."/>
  <div className="dashboard-grid stat-grid compact-stats"><Metric label="Bond series" value={String(c.bonds.length)}/><Metric label="Outstanding bond units" value={units.toString()}/><Metric label="Registry entries" value={String(holders)}/></div>
  <Card className="page-table-card"><SectionHeading title="Live bond registry" detail="Bond, mint, status, outstanding supply, and holder count."/><div className="table-scroll"><table className="data-table full-table"><thead><tr><th>Bond account</th><th>Mint</th><th>Face value (DSET base)</th><th>Outstanding</th><th>Holders</th><th>Status</th></tr></thead><tbody>{c.bonds.map(b=><tr key={b.key.toBase58()}><td><code>{b.key.toBase58()}</code></td><td><code>{short(b.mint.toBase58())}</code></td><td>{b.faceValueBase.toString()}</td><td>{b.outstanding.toString()}</td><td>{b.registryCount}</td><td><StatusBadge tone={displayStatus(b.status)==="Issuing"?"amber":"green"}>{displayStatus(b.status)}</StatusBadge></td></tr>)}</tbody></table></div></Card>
  <Card className="page-table-card"><SectionHeading title="Your positions" detail="Position PDAs derived for the connected wallet."/><div className="live-position-list">{c.bonds.map(b=><div key={b.key.toBase58()}><span>{short(b.key.toBase58())}</span><strong>{b.holderUnits?.toString()??"No registered position"} {b.holderUnits?"bond units":""}</strong></div>)}</div></Card>
 </>;
}
function Metric({label,value}:{label:string;value:string}){return <Card className="metric-card"><div className="metric-top"><span>{label}</span></div><div className="metric-value">{value}</div><div className="metric-bottom"><span>Confirmed RPC account read</span></div></Card>}

export function LiveBondRegistry(){
 const c=useChainState();
 if(c.programReady!==true)return <><Header title="Bond registry" description="Live bond state and connected wallet position reads."/><Message title="No live registry connection"/></>;
 return <><Header title="Bond registry" description="Live program accounts. These rows are fetched from Solana, not generated demo data."/>
  <div className="dashboard-grid stat-grid compact-stats"><Metric label="Bond accounts" value={String(c.bonds.length)}/><Metric label="Registered holders" value={String(c.bonds.reduce((n,b)=>n+b.registryCount,0))}/><Metric label="Snapshots" value={String(c.snapshots.length)}/></div>
  <Card className="page-table-card"><SectionHeading title="Bond accounts" detail="Derived account status, mint, supply, and investor position."/><div className="table-scroll"><table className="data-table full-table"><thead><tr><th>Bond PDA</th><th>Mint</th><th>Face value</th><th>Issued</th><th>Outstanding</th><th>Holders</th><th>Your units</th><th>Status</th></tr></thead><tbody>{c.bonds.map(b=><tr key={b.key.toBase58()}><td><code>{b.key.toBase58()}</code></td><td><code>{short(b.mint.toBase58())}</code></td><td>{b.faceValueBase.toString()}</td><td>{b.issued.toString()}</td><td>{b.outstanding.toString()}</td><td>{b.registryCount}</td><td>{b.holderUnits?.toString()??"—"}</td><td><StatusBadge>{displayStatus(b.status)}</StatusBadge></td></tr>)}</tbody></table></div></Card>
  <p className="page-footnote">Bond token accounts are program-custodied; displayed ownership comes from Position PDAs.</p>
 </>;
}

export function LiveActions(){
 const c=useChainState();
 if(c.programReady!==true)return <><Header title="Corporate actions" description="Live snapshots, coupon periods, and redemption state."/><Message title="No live action accounts"/></>;
 return <><Header title="Corporate actions" description="Lifecycle account states fetched from the selected Solana cluster."/>
  <AccountTable title="Record-date snapshots" cols={["Snapshot PDA","Record time","Progress","Units","Status"]} rows={c.snapshots.map(s=>[s.key.toBase58(),formatDate(new Date(Number(s.recordDateTs.toString())*1000).toISOString()),s.processedHolderCount+"/"+s.expectedHolderCount,s.totalUnits.toString(),displayStatus(s.status)])}/>
  <AccountTable title="Coupon periods" cols={["Coupon PDA","Bond","Payable DSET base","Funded DSET base","Paid DSET base","Status"]} rows={c.coupons.map(x=>[x.key.toBase58(),short(x.bond.toBase58()),x.expectedTotalBase.toString(),x.fundedTotalBase.toString(),x.paidTotalBase.toString(),displayStatus(x.status)])}/>
  <AccountTable title="Redemptions" cols={["Redemption PDA","Bond","Required DSET base","Funded DSET base","Paid DSET base","Status"]} rows={c.redemptions.map(x=>[x.key.toBase58(),short(x.bond.toBase58()),x.requiredTotalBase.toString(),x.fundedTotalBase.toString(),x.paidTotalBase.toString(),displayStatus(x.status)])}/>
 </>;
}
export function LiveGovernance(){
 const c=useChainState();
 if(c.programReady!==true)return <><Header title="Governance" description="Live proposal account data and voting state."/><Message title="No live proposal accounts"/></>;
 return <><Header title="Governance" description="Proposal status and weighted tallies fetched from on-chain accounts."/><AccountTable title="Proposals" cols={["Proposal PDA","Title","Eligible units","For","Against","Abstain","Status"]} rows={c.proposals.map(p=>[p.key.toBase58(),p.title,p.eligibleVotingPower.toString(),p.yesVotingPower.toString(),p.noVotingPower.toString(),p.abstainVotingPower.toString(),displayStatus(p.status)])}/><p className="page-footnote">Proposal results are informational; approved proposals do not execute amendments.</p></>;
}
export function LiveHistory(){
 const c=useChainState(),r=useRuntime();
 if(c.programReady!==true)return <><Header title="Transaction history" description="Recent confirmed signatures touching bond accounts."/><Message title="No live transaction history"/></>;
 return <><Header title="Transaction history" description="Confirmed transactions associated with program bond accounts."/><AccountTable title="Recent signatures" cols={["Signature","Block time","Status","Explorer"]} rows={c.signatures.map(s=>[s.signature,s.blockTime?new Date(s.blockTime*1000).toLocaleString():"—",s.err?"Failed":"Confirmed",<a key={s.signature} href={r.cluster==="devnet"?"https://explorer.solana.com/tx/"+s.signature+"?cluster=devnet":"https://explorer.solana.com/tx/"+s.signature+"?cluster=custom&customUrl="+encodeURIComponent(r.endpoint)} target="_blank" rel="noreferrer">Open ↗</a>])}/></>;
}
function AccountTable({title,cols,rows}:{title:string;cols:string[];rows:React.ReactNode[][]}){return <Card className="page-table-card"><SectionHeading title={title} detail="Live decoded Anchor account fields."/><div className="table-scroll"><table className="data-table full-table"><thead><tr>{cols.map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.length?rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>):<tr><td colSpan={cols.length}>No accounts found on this cluster.</td></tr>}</tbody></table></div></Card>}
