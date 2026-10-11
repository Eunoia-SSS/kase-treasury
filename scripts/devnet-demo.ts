import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, web3 } from "@coral-xyz/anchor";
import { createAccount, createAssociatedTokenAccount, createMint, getAccount, getMint, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { KaseTreasury } from "../target/types/kase_treasury";

const EXPECTED = new web3.PublicKey("7P3NaKZkqSKHYjTUF638mZifpWMeVq1qvfPNNjtVFjWZ");
const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const SYS = web3.SystemProgram.programId, RENT = web3.SYSVAR_RENT_PUBKEY, TOKEN = TOKEN_PROGRAM_ID;
const UNITS = [10, 5, 2], COUPON = [500_000_000n, 250_000_000n, 100_000_000n], PRINCIPAL = [10_000_000_000n, 5_000_000_000n, 2_000_000_000n];
const b32 = () => Array.from(randomBytes(32));
const pda = (p: Program<KaseTreasury>, ...s: Buffer[]) => web3.PublicKey.findProgramAddressSync(s, p.programId)[0];
function check(v: unknown, m: string): asserts v { if (!v) throw new Error(m); }
async function send(label: string, tx: Promise<string>) { const signature=await tx; console.log("TX",label,signature); }
async function now(c: web3.Connection) { const a=await c.getAccountInfo(web3.SYSVAR_CLOCK_PUBKEY,"confirmed"); check(a,"Clock sysvar unavailable"); return Number(Buffer.from(a.data).readBigInt64LE(32)); }
async function waitUntil(c: web3.Connection, t: number, local: boolean, label: string) {
  let n=await now(c);
  const until=Date.now()+(local?45_000:180_000);
  while(n<t&&Date.now()<until){await new Promise(x=>setTimeout(x,500));n=await now(c);}
  check(n>=t,`Timed out waiting for ${label}; check RPC and restart with fresh demo IDs.`);
}
function readKey(path: string,label: string) {
  try{return web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(resolve(path),"utf8")) as number[]));}
  catch{throw new Error(`${label} keypair cannot be read. Never paste or commit wallet secrets.`);}
}
async function main(){
  const provider=AnchorProvider.env(); anchor.setProvider(provider);
  const program=anchor.workspace.KaseTreasury as Program<KaseTreasury>;
  const cluster=process.env.KASE_DEMO_CLUSTER??"localnet", endpoint=process.env.ANCHOR_PROVIDER_URL??provider.connection.rpcEndpoint;
  const host=new URL(endpoint).hostname, local=["localhost","127.0.0.1","::1"].includes(host);
  check(program.programId.equals(EXPECTED),`IDL ID mismatch: expected ${EXPECTED}, got ${program.programId}`);
  if(cluster==="localnet")check(local,"Localnet mode only permits localhost RPC.");
  else if(cluster==="devnet"){
    check(!local,"Devnet mode cannot use localhost.");
    check(process.env.KASE_DEMO_ALLOW_DEVNET_TRANSACTIONS==="YES_I_APPROVE_DEVNET_TRANSACTIONS","Devnet guard is closed. Set the explicit guard only after deployment/demo approval.");
    const genesis=await provider.connection.getGenesisHash();
    check(genesis===DEVNET_GENESIS,`RPC genesis hash ${genesis} is not the configured Solana Devnet. No transactions sent.`);
  }else throw new Error("KASE_DEMO_CLUSTER must be localnet or devnet.");
  const executable=await provider.connection.getAccountInfo(program.programId,"confirmed");
  check(executable?.executable,`Program ${program.programId} is not executable at selected RPC.`);
  const payer=(provider.wallet as any).payer as web3.Keypair;
  check(payer,"Set ANCHOR_WALLET to a local Keypair file.");
  console.log(`Cluster=${cluster}; program=${program.programId}; issuer=${provider.wallet.publicKey}`);
  let hs:web3.Keypair[];
  if(cluster==="localnet"){
    hs=[web3.Keypair.generate(),web3.Keypair.generate(),web3.Keypair.generate()];
    console.log("Funding in-memory holders from local validator only.");
    for(const h of hs){const s=await provider.connection.requestAirdrop(h.publicKey,2*web3.LAMPORTS_PER_SOL);await provider.connection.confirmTransaction(s,"confirmed");}
  }else{
    const paths=[process.env.KASE_DEMO_HOLDER_A_KEYPAIR,process.env.KASE_DEMO_HOLDER_B_KEYPAIR,process.env.KASE_DEMO_HOLDER_C_KEYPAIR];
    check(paths.every(Boolean),"Set KASE_DEMO_HOLDER_A/B/C_KEYPAIR to existing disposable holders; this script never creates/funds Devnet wallets.");
    hs=paths.map((x,i)=>readKey(x!,`Holder ${"ABC"[i]}`));
  }
  console.log("Holders:",...hs.map((h,i)=>`${"ABC"[i]}=${h.publicKey}`));

  const issuerId=b32(), bondId=b32(), cfg=pda(program,Buffer.from("issuer"),Buffer.from(issuerId));
  const bond=pda(program,Buffer.from("bond"),cfg.toBuffer(),Buffer.from(bondId));
  const auth=pda(program,Buffer.from("bond_authority"),bond.toBuffer()), mint=pda(program,Buffer.from("bond_mint"),bond.toBuffer());
  const vault=pda(program,Buffer.from("bond_vault"),bond.toBuffer()), reg=pda(program,Buffer.from("registry"),bond.toBuffer());
  await send("initialize issuer",program.methods.initializeIssuer(issuerId).accountsStrict({config:cfg,authority:provider.wallet.publicKey,systemProgram:SYS}).rpc());
  await send("create sample bond",program.methods.createBond(bondId,new BN("1000000000"),1000,{semiannual:{}},new BN((await now(provider.connection))+(local?30:120)),new BN(17)).accountsStrict({config:cfg,authority:provider.wallet.publicKey,bond,bondAuthority:auth,mint,vault,registry:reg,tokenProgram:TOKEN,systemProgram:SYS,rent:RENT}).rpc());
  for(let i=0;i<3;i++){
    const count=(await program.account.registryState.fetch(reg)).count;
    const entry=pda(program,Buffer.from("registry_entry"),bond.toBuffer(),Buffer.from([count]));
    const pos=pda(program,Buffer.from("position"),bond.toBuffer(),hs[i].publicKey.toBuffer());
    await send(`register holder ${"ABC"[i]}`,program.methods.registerHolder(new BN(UNITS[i])).accountsStrict({config:cfg,authority:provider.wallet.publicKey,bond,registry:reg,registryEntry:entry,position:pos,holder:hs[i].publicKey,bondAuthority:auth,mint,vault,tokenProgram:TOKEN,systemProgram:SYS}).signers([hs[i]]).rpc());
  }
  await send("close issuance",program.methods.closeIssuance().accountsStrict({config:cfg,authority:provider.wallet.publicKey,bond,registry:reg,bondAuthority:auth,mint,vault,tokenProgram:TOKEN}).rpc());

  const record=(await now(provider.connection))+3,id=b32(),snap=pda(program,Buffer.from("snapshot"),bond.toBuffer(),Buffer.from(id));
  await send("create record-date snapshot",program.methods.createSnapshot(id,new BN(record)).accountsStrict({config:cfg,authority:provider.wallet.publicKey,bond,registry:reg,snapshot:snap,bondAuthority:auth,mint,vault,tokenProgram:TOKEN,systemProgram:SYS,rent:RENT}).rpc());
  await waitUntil(provider.connection,record,local,"record date");
  const metas:web3.AccountMeta[]=[];
  for(let i=0;i<3;i++){metas.push({pubkey:pda(program,Buffer.from("registry_entry"),bond.toBuffer(),Buffer.from([i])),isSigner:false,isWritable:false},{pubkey:pda(program,Buffer.from("position"),bond.toBuffer(),hs[i].publicKey.toBuffer()),isSigner:false,isWritable:false},{pubkey:pda(program,Buffer.from("snapshot_entry"),snap.toBuffer(),hs[i].publicKey.toBuffer()),isSigner:false,isWritable:true});}
  await send("process snapshot",program.methods.processSnapshotBatch(0,3).accountsStrict({snapshot:snap,bond,registry:reg,bondAuthority:auth,mint,vault,tokenProgram:TOKEN,cranker:provider.wallet.publicKey,systemProgram:SYS}).remainingAccounts(metas).rpc());
  await send("finalize snapshot",program.methods.finalizeSnapshot().accountsStrict({snapshot:snap,bond,registry:reg,bondAuthority:auth,mint,vault,tokenProgram:TOKEN,finalizer:provider.wallet.publicKey}).rpc());

  console.log("Creating 6-decimal DSET without freeze authority; minting the explicit 17,850 DSET demo reserve.");
  const mintAuth=web3.Keypair.generate(), dset=await createMint(provider.connection,payer,mintAuth.publicKey,null,6,undefined,undefined,TOKEN);
  const source=await createAssociatedTokenAccount(provider.connection,payer,dset,provider.wallet.publicKey,{commitment:"confirmed"},TOKEN);
  await send("mint 17,850 DSET",mintTo(provider.connection,payer,dset,source,mintAuth,17_850_000_000n,[],undefined,TOKEN));
  const mi=await getMint(provider.connection,dset,"confirmed",TOKEN);check(mi.decimals===6&&mi.freezeAuthority===null,"DSET must have 6 decimals and no freeze authority.");
  const sc=pda(program,Buffer.from("settlement_config"),cfg.toBuffer());
  await send("configure settlement mint",program.methods.configureSettlementMint().accountsStrict({config:cfg,authority:provider.wallet.publicKey,settlementConfig:sc,settlementMint:dset,tokenProgram:TOKEN,systemProgram:SYS}).rpc());

  const period=randomBytes(8).readBigUInt64LE()||1n,le=Buffer.alloc(8);le.writeBigUInt64LE(period);
  const coupon=pda(program,Buffer.from("coupon"),bond.toBuffer(),le),ca=pda(program,Buffer.from("coupon_authority"),coupon.toBuffer()),esc=pda(program,Buffer.from("coupon_vault"),coupon.toBuffer());
  const pay=(await now(provider.connection))+3;
  await send("create coupon event",program.methods.createCouponPeriod(new BN(period.toString()),new BN(record),new BN(pay)).accountsStrict({config:cfg,authority:provider.wallet.publicKey,bond,snapshot:snap,settlementConfig:sc,settlementMint:dset,coupon,couponAuthority:ca,escrow:esc,tokenProgram:TOKEN,systemProgram:SYS,rent:RENT}).rpc());
  await send("fund coupon (850 DSET)",program.methods.fundCouponPeriod(new BN("850000000")).accountsStrict({config:cfg,authority:provider.wallet.publicKey,bond,coupon,settlementConfig:sc,settlementMint:dset,source,escrow:esc,tokenProgram:TOKEN}).rpc());
  await waitUntil(provider.connection,pay,local,"coupon payment date");
  const cDests:web3.PublicKey[]=[];
  for(let i=0;i<3;i++){
    const dest=await createAssociatedTokenAccount(provider.connection,payer,dset,hs[i].publicKey,{commitment:"confirmed"},TOKEN);cDests.push(dest);
    await send(`claim ${"ABC"[i]} coupon ${Number(COUPON[i]/1_000_000n)} DSET`,program.methods.claimCoupon().accountsStrict({config:cfg,bond,coupon,snapshot:snap,holder:hs[i].publicKey,snapshotEntry:pda(program,Buffer.from("snapshot_entry"),snap.toBuffer(),hs[i].publicKey.toBuffer()),settlementConfig:sc,settlementMint:dset,couponAuthority:ca,escrow:esc,destination:dest,claimRecord:pda(program,Buffer.from("coupon_claim"),coupon.toBuffer(),hs[i].publicKey.toBuffer()),payer:provider.wallet.publicKey,tokenProgram:TOKEN,systemProgram:SYS}).signers([hs[i]]).rpc());
  }
  const proposalId=b32(),proposal=pda(program,Buffer.from("governance_proposal"),bond.toBuffer(),Buffer.from(proposalId));
  const title="Approve educational bond reporting amendment",hash=Array.from(createHash("sha256").update(title).digest());
  const start=(await now(provider.connection))+3,end=start+5;
  await send("create proposal",program.methods.createProposal(proposalId,title,hash,new BN(start),new BN(end),5000,5000).accountsStrict({config:cfg,authority:provider.wallet.publicKey,bond,snapshot:snap,proposal,systemProgram:SYS}).rpc());
  await waitUntil(provider.connection,start,local,"voting start");
  const choices=[{yes:{}},{no:{}},{abstain:{}}];
  for(let i=0;i<3;i++)await send(`vote ${["Yes","No","Abstain"][i]} weight ${UNITS[i]}`,program.methods.castVote(choices[i] as any).accountsStrict({proposal,bond,snapshot:snap,holder:hs[i].publicKey,snapshotEntry:pda(program,Buffer.from("snapshot_entry"),snap.toBuffer(),hs[i].publicKey.toBuffer()),receipt:pda(program,Buffer.from("vote_receipt"),proposal.toBuffer(),hs[i].publicKey.toBuffer()),payer:provider.wallet.publicKey,systemProgram:SYS}).signers([hs[i]]).rpc());
  await waitUntil(provider.connection,end,local,"voting end");
  await send("finalize proposal",program.methods.finalizeProposal().accountsStrict({proposal,bond,snapshot:snap,finalizer:provider.wallet.publicKey}).rpc());

  const maturity=Number((await program.account.bond.fetch(bond)).maturityTs.toString());
  await waitUntil(provider.connection,maturity,local,"bond maturity");
  const red=pda(program,Buffer.from("redemption"),bond.toBuffer()),ra=pda(program,Buffer.from("redemption_authority"),red.toBuffer()),re=pda(program,Buffer.from("redemption_vault"),red.toBuffer());
  await send("create redemption",program.methods.createRedemption().accountsStrict({config:cfg,authority:provider.wallet.publicKey,bond,registry:reg,snapshot:snap,settlementConfig:sc,settlementMint:dset,redemption:red,redemptionAuthority:ra,escrow:re,bondAuthority:auth,mint,vault,tokenProgram:TOKEN,systemProgram:SYS,rent:RENT}).rpc());
  await send("fund principal (17,000 DSET)",program.methods.fundRedemption(new BN("17000000000")).accountsStrict({config:cfg,authority:provider.wallet.publicKey,bond,redemption:red,settlementConfig:sc,settlementMint:dset,source,escrow:re,tokenProgram:TOKEN}).rpc());
  await send("activate and retire bond supply",program.methods.activateRedemption().accountsStrict({redemption:red,bond,snapshot:snap,registry:reg,bondAuthority:auth,mint,vault,escrow:re,tokenProgram:TOKEN,activator:provider.wallet.publicKey}).rpc());
  const pDests:web3.PublicKey[]=[];
  for(let i=0;i<3;i++){
    const dest=await createAccount(provider.connection,payer,dset,hs[i].publicKey,web3.Keypair.generate(),{commitment:"confirmed"},TOKEN);pDests.push(dest);
    await send(`claim ${"ABC"[i]} principal ${Number(PRINCIPAL[i]/1_000_000n)} DSET`,program.methods.claimRedemption().accountsStrict({config:cfg,bond,redemption:red,snapshot:snap,holder:hs[i].publicKey,snapshotEntry:pda(program,Buffer.from("snapshot_entry"),snap.toBuffer(),hs[i].publicKey.toBuffer()),settlementConfig:sc,settlementMint:dset,redemptionAuthority:ra,escrow:re,destination:dest,receipt:pda(program,Buffer.from("redemption_claim"),red.toBuffer(),hs[i].publicKey.toBuffer()),payer:provider.wallet.publicKey,tokenProgram:TOKEN,systemProgram:SYS,rent:RENT}).signers([hs[i]]).rpc());
  }
  const ss=await program.account.recordDateSnapshot.fetch(snap),cp=await program.account.couponPeriod.fetch(coupon),gv=await program.account.proposal.fetch(proposal),rd=await program.account.redemption.fetch(red);
  check(ss.status.finalized&&ss.totalUnits.toString()==="17","Snapshot mismatch.");
  check(cp.status.complete&&cp.paidTotalBase.toString()==="850000000","Coupon results mismatch.");
  check(gv.status.passed&&gv.yesVotingPower.toString()==="10"&&gv.noVotingPower.toString()==="5"&&gv.abstainVotingPower.toString()==="2","Voting results mismatch.");
  check(rd.status.complete&&rd.paidTotalBase.toString()==="17000000000","Redemption result mismatch.");
  check((await getMint(provider.connection,mint,"confirmed",TOKEN)).supply===0n&&(await getAccount(provider.connection,vault,"confirmed",TOKEN)).amount===0n,"Bond retirement mismatch.");
  for(let i=0;i<3;i++){check((await getAccount(provider.connection,cDests[i],"confirmed",TOKEN)).amount===COUPON[i],`Coupon ${i} mismatch.`);check((await getAccount(provider.connection,pDests[i],"confirmed",TOKEN)).amount===PRINCIPAL[i],`Principal ${i} mismatch.`);}
  console.log("Verified: coupons 500/250/100, principal 10,000/5,000/2,000 DSET, votes 10/5/2, retired supply 0.");
  console.log(`Public accounts: issuer=${cfg} bond=${bond} snapshot=${snap} dset=${dset} coupon=${coupon} proposal=${proposal} redemption=${red}`);
}
main().catch(e=>{console.error("Demo failed:",e instanceof Error?e.message:String(e));process.exitCode=1;});
