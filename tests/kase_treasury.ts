import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, web3 } from "@coral-xyz/anchor";
import { createAccount, createAssociatedTokenAccount, createMint, getAccount, getMint, mintTo, transfer, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createHash, randomBytes } from "crypto";
import assert from "node:assert/strict";
import { KaseTreasury } from "../target/types/kase_treasury";

const { SystemProgram, SYSVAR_RENT_PUBKEY } = web3;
const provider = AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.KaseTreasury as Program<KaseTreasury>;
let counter = 0;
type F = { issuer: number[]; id: number[]; config: web3.PublicKey; bond: web3.PublicKey; auth: web3.PublicKey; mint: web3.PublicKey; vault: web3.PublicKey; registry: web3.PublicKey };

function bytes(): number[] { counter += 1; const v = Array.from(randomBytes(32)); v[0] = counter & 255; return v; }
function addr(seeds: Buffer[]): web3.PublicKey { return web3.PublicKey.findProgramAddressSync(seeds, program.programId)[0]; }
async function fails(p: Promise<unknown>, label: string): Promise<void> {
  let didFail = false; try { await p; } catch { didFail = true; }
  assert.equal(didFail, true, "expected failure: " + label);
}
async function make(cap = 100, maturityOffsetSeconds = 86400): Promise<F> {
  const issuer = bytes(); const id = bytes();
  const config = addr([Buffer.from("issuer"), Buffer.from(issuer)]);
  const bond = addr([Buffer.from("bond"), config.toBuffer(), Buffer.from(id)]);
  const auth = addr([Buffer.from("bond_authority"), bond.toBuffer()]);
  const mint = addr([Buffer.from("bond_mint"), bond.toBuffer()]);
  const vault = addr([Buffer.from("bond_vault"), bond.toBuffer()]);
  const registry = addr([Buffer.from("registry"), bond.toBuffer()]);
  await program.methods.initializeIssuer(issuer).accountsStrict({ config, authority: provider.wallet.publicKey, systemProgram: SystemProgram.programId }).rpc();
  await program.methods.createBond(id, new BN(1_000_000_000), 1_000, { semiannual: {} }, new BN(Math.floor(Date.now()/1000)+maturityOffsetSeconds), new BN(cap))
    .accountsStrict({ config, authority: provider.wallet.publicKey, bond, bondAuthority: auth, mint, vault, registry, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY }).rpc();
  return { issuer, id, config, bond, auth, mint, vault, registry };
}
function position(f: F, holder: web3.PublicKey): web3.PublicKey { return addr([Buffer.from("position"), f.bond.toBuffer(), holder.toBuffer()]); }
async function register(f: F, holder = web3.Keypair.generate(), units = 1): Promise<web3.Keypair> {
  const registry = await program.account.registryState.fetch(f.registry);
  const registryEntry = addr([Buffer.from("registry_entry"), f.bond.toBuffer(), Buffer.from([registry.count])]);
  await program.methods.registerHolder(new BN(units)).accountsStrict({
    config: f.config, authority: provider.wallet.publicKey, bond: f.bond, registry: f.registry, registryEntry,
    position: position(f, holder.publicKey), holder: holder.publicKey, bondAuthority: f.auth,
    mint: f.mint, vault: f.vault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
  }).signers([holder]).rpc();
  return holder;
}
function issueAccounts(f: F, h: web3.Keypair, mint = f.mint, vault = f.vault): any {
  return { config: f.config, authority: provider.wallet.publicKey, bond: f.bond, registry: f.registry,
    position: position(f, h.publicKey), bondAuthority: f.auth, mint, vault, tokenProgram: TOKEN_PROGRAM_ID };
}
describe("KASE Treasury M2 localnet", function () {
  this.timeout(1_000_000);
  it("initializes unique issuer config and rejects duplicate/zero IDs", async () => {
    const id=bytes(); const config=addr([Buffer.from("issuer"),Buffer.from(id)]);
    await program.methods.initializeIssuer(id).accountsStrict({config,authority:provider.wallet.publicKey,systemProgram:SystemProgram.programId}).rpc();
    await fails(program.methods.initializeIssuer(id).accountsStrict({config,authority:provider.wallet.publicKey,systemProgram:SystemProgram.programId}).rpc(),"duplicate init");
    await fails(program.methods.initializeIssuer(Array(32).fill(0)).accountsStrict({config:addr([Buffer.from("issuer"),Buffer.alloc(32)]),authority:provider.wallet.publicKey,systemProgram:SystemProgram.programId}).rpc(),"zero issuer");
  });
  it("enforces issuer authorization and completes two-step handoff", async () => {
    const f=await make(); const next=web3.Keypair.generate(); const outsider=web3.Keypair.generate();
    await fails(program.methods.proposeIssuerAuthority(outsider.publicKey).accountsStrict({config:f.config,authority:outsider.publicKey}).signers([outsider]).rpc(),"unauthorized proposal");
    await program.methods.proposeIssuerAuthority(next.publicKey).accountsStrict({config:f.config,authority:provider.wallet.publicKey}).rpc();
    await fails(program.methods.acceptIssuerAuthority().accountsStrict({config:f.config,newAuthority:outsider.publicKey}).signers([outsider]).rpc(),"wrong accepter");
    await program.methods.acceptIssuerAuthority().accountsStrict({config:f.config,newAuthority:next.publicKey}).signers([next]).rpc();
    const cfg=await program.account.issuerConfig.fetch(f.config);
    assert.equal(cfg.authority.toBase58(),next.publicKey.toBase58());
    await fails(program.methods.proposeIssuerAuthority(outsider.publicKey).accountsStrict({config:f.config,authority:provider.wallet.publicKey}).rpc(),"old authority");
  });
  it("creates classic SPL mint/vault and registers unique positions", async () => {
    const f=await make(12); const h=await register(f,web3.Keypair.generate(),10);
    const mint=await getMint(provider.connection,f.mint,"confirmed",TOKEN_PROGRAM_ID);
    const vault=await getAccount(provider.connection,f.vault,"confirmed",TOKEN_PROGRAM_ID);
    assert.equal(mint.decimals,0); assert.equal(mint.mintAuthority?.toBase58(),f.auth.toBase58());
    assert.equal(vault.mint.toBase58(),f.mint.toBase58()); assert.equal(vault.owner.toBase58(),f.auth.toBase58());
    await fails(register(f,h,1),"duplicate Position PDA");
    await program.methods.issueUnits(new BN(2)).accountsStrict(issueAccounts(f,h)).rpc();
    await fails(program.methods.issueUnits(new BN(1)).accountsStrict(issueAccounts(f,h)).rpc(),"supply cap");
    const account=await getAccount(provider.connection,f.vault,"confirmed",TOKEN_PROGRAM_ID);
    const pos=await program.account.position.fetch(position(f,h.publicKey));
    const reg=await program.account.registryState.fetch(f.registry);
    assert.equal(account.amount,12n); assert.equal(pos.units.toNumber(),12); assert.equal(reg.totalUnits.toNumber(),12); assert.equal(reg.count,1);
  });
  it("rejects wrong mint and vault substitutions", async () => {
    const f=await make(10); const h=await register(f);
    await fails(program.methods.issueUnits(new BN(1)).accountsStrict(issueAccounts(f,h,web3.Keypair.generate().publicKey)).rpc(),"wrong mint");
    await fails(program.methods.issueUnits(new BN(1)).accountsStrict(issueAccounts(f,h,f.mint,web3.Keypair.generate().publicKey)).rpc(),"wrong vault");
  });
  it("enforces the 100-holder limit", async () => {
    const f=await make(100);
    for(let i=0;i<100;i+=1) await register(f,web3.Keypair.generate());
    await fails(register(f,web3.Keypair.generate()),"holder 101");
    const reg=await program.account.registryState.fetch(f.registry); assert.equal(reg.count,100);
  });
  it("reconciles aggregate supply and permanently revokes mint authority", async () => {
    const f=await make(10); const h=await register(f,web3.Keypair.generate(),3);
    await program.methods.issueUnits(new BN(2)).accountsStrict(issueAccounts(f,h)).rpc();
    await program.methods.closeIssuance().accountsStrict({config:f.config,authority:provider.wallet.publicKey,bond:f.bond,registry:f.registry,bondAuthority:f.auth,mint:f.mint,vault:f.vault,tokenProgram:TOKEN_PROGRAM_ID}).rpc();
    let mint=await getMint(provider.connection,f.mint,"confirmed",TOKEN_PROGRAM_ID);
    for (let retry=0; mint.mintAuthority !== null && retry < 10; retry += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      mint=await getMint(provider.connection,f.mint,"confirmed",TOKEN_PROGRAM_ID);
    }
    assert.equal(mint.supply,5n); assert.equal(mint.mintAuthority,null);
    await fails(program.methods.issueUnits(new BN(1)).accountsStrict(issueAccounts(f,h)).rpc(),"issuance after close");
    const bond=await program.account.bond.fetch(f.bond); assert.equal(bond.status.issuanceClosed !== undefined,true);
  });
});

function snapshotAddress(f: F, snapshotId: number[]): web3.PublicKey {
  return addr([Buffer.from("snapshot"), f.bond.toBuffer(), Buffer.from(snapshotId)]);
}
function snapshotEntryAddress(snapshot: web3.PublicKey, holder: web3.PublicKey): web3.PublicKey {
  return addr([Buffer.from("snapshot_entry"), snapshot.toBuffer(), holder.toBuffer()]);
}
async function clockUnix(): Promise<number> {
  const info = await provider.connection.getAccountInfo(web3.SYSVAR_CLOCK_PUBKEY, "confirmed");
  assert.ok(info, "Clock sysvar must exist");
  return Number(Buffer.from(info.data).readBigInt64LE(32));
}
async function closeIssuance(f: F): Promise<void> {
  await program.methods.closeIssuance().accountsStrict({
    config: f.config,
    authority: provider.wallet.publicKey,
    bond: f.bond,
    registry: f.registry,
    bondAuthority: f.auth,
    mint: f.mint,
    vault: f.vault,
    tokenProgram: TOKEN_PROGRAM_ID,
  }).rpc();
}
async function createSnapshot(f: F, snapshotId: number[], recordDate: number, authority = provider.wallet.publicKey, signer?: web3.Keypair): Promise<web3.PublicKey> {
  const snapshot = snapshotAddress(f, snapshotId);
  const builder = program.methods.createSnapshot(snapshotId, new BN(recordDate)).accountsStrict({
    config: f.config,
    authority,
    bond: f.bond,
    registry: f.registry,
    snapshot,
    bondAuthority: f.auth,
    mint: f.mint,
    vault: f.vault,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  });
  if (signer) builder.signers([signer]);
  await builder.rpc();
  return snapshot;
}
async function snapshotBatch(f: F, snapshot: web3.PublicKey, start: number, size: number, overrides: Record<string, web3.PublicKey> = {}): Promise<string> {
  const entries = [];
  for (let offset = 0; offset < size; offset += 1) {
    const index = start + offset;
    const registryEntry = addr([Buffer.from("registry_entry"), f.bond.toBuffer(), Buffer.from([index])]);
    const state = await program.account.registryEntry.fetch(registryEntry);
    const holder = state.holder as web3.PublicKey;
    entries.push({
      pubkey: registryEntry,
      isSigner: false,
      isWritable: false,
    }, {
      pubkey: overrides["position"] ?? position(f, holder),
      isSigner: false,
      isWritable: false,
    }, {
      pubkey: overrides["snapshotEntry"] ?? snapshotEntryAddress(snapshot, holder),
      isSigner: false,
      isWritable: true,
    });
  }
  return program.methods.processSnapshotBatch(start, size).accountsStrict({
    snapshot,
    bond: f.bond,
    registry: f.registry,
    bondAuthority: f.auth,
    mint: f.mint,
    vault: f.vault,
    tokenProgram: TOKEN_PROGRAM_ID,
    cranker: provider.wallet.publicKey,
    systemProgram: SystemProgram.programId,
  }).remainingAccounts(entries).rpc();
}
async function fetchSnapshotEntry(address: web3.PublicKey): Promise<{ registryIndex: number; holder: web3.PublicKey; units: bigint; recordDateTs: bigint }> {
  let info = await provider.connection.getAccountInfo(address, "confirmed");
  for (let retry = 0; info === null && retry < 20; retry += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    info = await provider.connection.getAccountInfo(address, "confirmed");
  }
  assert.ok(info, "snapshot entry account must exist");
  const data = Buffer.from(info.data);
  const discriminator = createHash("sha256").update("account:SnapshotEntry").digest().subarray(0, 8);
  assert.deepEqual(data.subarray(0, 8), discriminator);
  return {
    holder: new web3.PublicKey(data.subarray(8 + 32 + 32, 8 + 32 + 32 + 32)),
    registryIndex: data.readUInt8(8 + 32 * 4),
    units: data.readBigUInt64LE(8 + 32 * 4 + 1),
    recordDateTs: data.readBigInt64LE(8 + 32 * 4 + 1 + 8),
  };
}
async function finalizeSnapshot(f: F, snapshot: web3.PublicKey): Promise<string> {
  return program.methods.finalizeSnapshot().accountsStrict({
    snapshot,
    bond: f.bond,
    registry: f.registry,
    bondAuthority: f.auth,
    mint: f.mint,
    vault: f.vault,
    tokenProgram: TOKEN_PROGRAM_ID,
    finalizer: provider.wallet.publicKey,
  }).rpc();
}

describe("KASE Treasury M3 record-date snapshots", function () {
  this.timeout(1_000_000);

  it("snapshots multiple holders in order, reconciles totals, and finalizes immutably", async () => {
    const f = await make(100);
    const holders = [
      await register(f, web3.Keypair.generate(), 10),
      await register(f, web3.Keypair.generate(), 5),
      await register(f, web3.Keypair.generate(), 2),
    ];
    await closeIssuance(f);

    const now = await clockUnix();
    const id = bytes();
    const recordDate = now + 5;
    const snapshotPda = snapshotAddress(f, id);
    await fails(createSnapshot(f, bytes(), now - 1), "retroactive snapshot");
    await createSnapshot(f, id, recordDate);
    await fails(createSnapshot(f, id, recordDate), "duplicate snapshot identity");
    await fails(finalizeSnapshot(f, snapshotPda), "premature finalization");
    await fails(snapshotBatch(f, snapshotPda, 0, 1), "processing before record date");
    await fails(program.methods.processSnapshotBatch(0, 6).accountsStrict({
      snapshot: snapshotPda, bond: f.bond, registry: f.registry, bondAuthority: f.auth,
      mint: f.mint, vault: f.vault, tokenProgram: TOKEN_PROGRAM_ID,
      cranker: provider.wallet.publicKey, systemProgram: SystemProgram.programId,
    }).remainingAccounts([]).rpc(), "batch above configured maximum");

    const outsider = web3.Keypair.generate();
    await fails(createSnapshot(f, bytes(), recordDate, outsider.publicKey, outsider), "unauthorized snapshot creation");

    const deadline = Date.now() + 30_000;
    while (await clockUnix() < recordDate && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok((await clockUnix()) >= recordDate, "local validator clock reached record date");

    await snapshotBatch(f, snapshotPda, 0, 2);
    const halfway = await program.account.recordDateSnapshot.fetch(snapshotPda);
    assert.equal(halfway.processedHolderCount, 2);
    assert.equal(halfway.totalUnits.toNumber(), 15);
    await fails(snapshotBatch(f, snapshotPda, 0, 1), "duplicate/out-of-order batch");

    await snapshotBatch(f, snapshotPda, 2, 1);
    for (let i = 0; i < holders.length; i += 1) {
      const entry = await fetchSnapshotEntry(snapshotEntryAddress(snapshotPda, holders[i].publicKey));
      assert.equal(entry.registryIndex, i);
      assert.equal(entry.holder.toBase58(), holders[i].publicKey.toBase58());
      assert.equal(Number(entry.units), [10, 5, 2][i]);
      assert.equal(Number(entry.recordDateTs), recordDate);
    }
    await finalizeSnapshot(f, snapshotPda);
    const finalized = await program.account.recordDateSnapshot.fetch(snapshotPda);
    assert.ok(finalized.status.finalized !== undefined);
    assert.equal(finalized.processedHolderCount, 3);
    assert.equal(finalized.totalUnits.toNumber(), 17);
    assert.ok(finalized.finalizedAtTs.toNumber() >= recordDate);
    await fails(snapshotBatch(f, snapshotPda, 3, 1), "mutation after finalization");
    await fails(finalizeSnapshot(f, snapshotPda), "repeat finalization");
  });

  it("rejects snapshots before issuance closure and invalid position accounts", async () => {
    const empty = await make(20);
    await fails(closeIssuance(empty), "closing empty issuance");
    await fails(createSnapshot(empty, bytes(), await clockUnix()), "empty bond snapshot");

    const f = await make(20);
    await register(f, web3.Keypair.generate(), 4);
    const now = await clockUnix();
    await fails(createSnapshot(f, bytes(), now), "snapshot before issuance closure");
    await closeIssuance(f);

    const id = bytes();
    const date = (await clockUnix()) + 10;
    const snapshotPda = await createSnapshot(f, id, date);
    const deadline = Date.now() + 30_000;
    while (await clockUnix() < date && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const bogus = web3.Keypair.generate().publicKey;
    await fails(snapshotBatch(f, snapshotPda, 0, 1, { position: bogus }), "substituted position");
    const afterFailure = await program.account.recordDateSnapshot.fetch(snapshotPda);
    assert.equal(afterFailure.processedHolderCount, 0);
    await snapshotBatch(f, snapshotPda, 0, 1);
    await finalizeSnapshot(f, snapshotPda);
  });
});


const settlementConfigAddress=(f:F)=>addr([Buffer.from("settlement_config"),f.config.toBuffer()]);
function couponAddress(f:F,period:number):web3.PublicKey { const b=Buffer.alloc(8); b.writeBigUInt64LE(BigInt(period)); return addr([Buffer.from("coupon"),f.bond.toBuffer(),b]); }
function couponAuthorityAddress(coupon:web3.PublicKey):web3.PublicKey { return addr([Buffer.from("coupon_authority"),coupon.toBuffer()]); }
function couponVaultAddress(coupon:web3.PublicKey):web3.PublicKey { return addr([Buffer.from("coupon_vault"),coupon.toBuffer()]); }
function claimAddress(coupon:web3.PublicKey,holder:web3.PublicKey):web3.PublicKey { return addr([Buffer.from("coupon_claim"),coupon.toBuffer(),holder.toBuffer()]); }
function settlementPayer():web3.Keypair { return (provider.wallet as any).payer as web3.Keypair; }
async function waitTokenAmount(address:web3.PublicKey,expected:bigint):Promise<Awaited<ReturnType<typeof getAccount>>> {
  let last=await getAccount(provider.connection,address,"confirmed",TOKEN_PROGRAM_ID);
  for(let retry=0;last.amount!==expected && retry<20;retry++) {
    await new Promise(resolve=>setTimeout(resolve,250));
    last=await getAccount(provider.connection,address,"confirmed",TOKEN_PROGRAM_ID);
  }
  return last;
}
async function makeAta(mint:web3.PublicKey,owner:web3.PublicKey):Promise<web3.PublicKey> {
  return createAssociatedTokenAccount(provider.connection,settlementPayer(),mint,owner,{commitment:"confirmed"},TOKEN_PROGRAM_ID);
}
async function makeTokenAccount(mint:web3.PublicKey,owner:web3.PublicKey):Promise<web3.PublicKey> {
  return createAccount(provider.connection,settlementPayer(),mint,owner,web3.Keypair.generate(),{commitment:"confirmed"},TOKEN_PROGRAM_ID);
}
async function makeDset(f:F):Promise<{mint:web3.PublicKey; source:web3.PublicKey; mintAuthority:web3.Keypair}> {
  const mintAuthority=web3.Keypair.generate();
  const mint=await createMint(provider.connection,settlementPayer(),mintAuthority.publicKey,null,6,undefined,undefined,TOKEN_PROGRAM_ID);
  const source=await makeAta(mint,provider.wallet.publicKey);
  await mintTo(provider.connection,settlementPayer(),mint,source,mintAuthority,850_000_000n,[],undefined,TOKEN_PROGRAM_ID);
  await program.methods.configureSettlementMint().accountsStrict({
    config:f.config,authority:provider.wallet.publicKey,settlementConfig:settlementConfigAddress(f),
    settlementMint:mint,tokenProgram:TOKEN_PROGRAM_ID,systemProgram:SystemProgram.programId,
  }).rpc();
  return {mint,source,mintAuthority};
}
async function makeFinalizedSnapshot(f:F,holders:web3.Keypair[]):Promise<{snapshot:web3.PublicKey;recordDate:number}> {
  await closeIssuance(f);
  const recordDate=(await clockUnix())+10;
  const snapshot=await createSnapshot(f,bytes(),recordDate);
  const deadline=Date.now()+30_000;
  while(await clockUnix()<recordDate && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,250));
  assert.ok((await clockUnix())>=recordDate);
  await snapshotBatch(f,snapshot,0,holders.length);
  await finalizeSnapshot(f,snapshot);
  return {snapshot,recordDate};
}
function createCouponAccounts(f:F,snapshot:web3.PublicKey,mint:web3.PublicKey,period:number,recordDate:number,paymentDate:number,overrides:Record<string,web3.PublicKey>={}):any {
  const coupon=couponAddress(f,period);
  return {coupon,accounts:{
    config:f.config,authority:provider.wallet.publicKey,bond:overrides.bond??f.bond,snapshot:overrides.snapshot??snapshot,
    settlementConfig:settlementConfigAddress(f),settlementMint:overrides.settlementMint??mint,coupon,
    couponAuthority:couponAuthorityAddress(coupon),escrow:couponVaultAddress(coupon),tokenProgram:TOKEN_PROGRAM_ID,
    systemProgram:SystemProgram.programId,rent:SYSVAR_RENT_PUBKEY,
  }};
}
function fundAccounts(f:F,mint:web3.PublicKey,source:web3.PublicKey,period:number,overrides:Record<string,web3.PublicKey>={}):any {
  const coupon=couponAddress(f,period);
  return {config:f.config,authority:overrides.authority??provider.wallet.publicKey,bond:overrides.bond??f.bond,coupon,
    settlementConfig:settlementConfigAddress(f),settlementMint:overrides.settlementMint??mint,source:overrides.source??source,
    escrow:couponVaultAddress(coupon),tokenProgram:TOKEN_PROGRAM_ID};
}
function claimAccounts(f:F,snapshot:web3.PublicKey,mint:web3.PublicKey,holder:web3.Keypair,period:number,destination:web3.PublicKey,overrides:Record<string,web3.PublicKey>={}):any {
  const coupon=couponAddress(f,period);
  return {config:f.config,bond:overrides.bond??f.bond,coupon,snapshot:overrides.snapshot??snapshot,holder:holder.publicKey,
    snapshotEntry:overrides.snapshotEntry??snapshotEntryAddress(snapshot,holder.publicKey),settlementConfig:settlementConfigAddress(f),
    settlementMint:overrides.settlementMint??mint,couponAuthority:couponAuthorityAddress(coupon),escrow:couponVaultAddress(coupon),
    destination,claimRecord:claimAddress(coupon,holder.publicKey),payer:provider.wallet.publicKey,tokenProgram:TOKEN_PROGRAM_ID,
    systemProgram:SystemProgram.programId,rent:SYSVAR_RENT_PUBKEY};
}

describe("KASE Treasury M4 coupon settlement",function(){
  this.timeout(1_000_000);
  it("funds the complete coupon reserve and pays immutable snapshot entitlements once",async()=>{
    const f=await make(100);
    const holders=[await register(f,web3.Keypair.generate(),10),await register(f,web3.Keypair.generate(),5),await register(f,web3.Keypair.generate(),2)];
    const {snapshot,recordDate}=await makeFinalizedSnapshot(f,holders);
    const {mint,source,mintAuthority}=await makeDset(f);
    const paymentDate=(await clockUnix())+30;
    const period=7001;
    const prepared=createCouponAccounts(f,snapshot,mint,period,recordDate,paymentDate);
    await program.methods.createCouponPeriod(new BN(period),new BN(recordDate),new BN(paymentDate)).accountsStrict(prepared.accounts).rpc();
    const coupon=await program.account.couponPeriod.fetch(prepared.coupon);
    assert.equal(coupon.couponPerBondBase.toString(),"50000000");
    assert.equal(coupon.expectedTotalBase.toString(),"850000000");
    assert.equal(coupon.fundedTotalBase.toString(),"0");
    await fails(program.methods.createCouponPeriod(new BN(period),new BN(recordDate),new BN(paymentDate)).accountsStrict(prepared.accounts).rpc(),"duplicate bond-period event");
    const unconfiguredMint=await createMint(provider.connection,settlementPayer(),web3.Keypair.generate().publicKey,null,9,undefined,undefined,TOKEN_PROGRAM_ID);
    await fails(program.methods.configureSettlementMint().accountsStrict({config:f.config,authority:provider.wallet.publicKey,settlementConfig:settlementConfigAddress(f),settlementMint:unconfiguredMint,tokenProgram:TOKEN_PROGRAM_ID,systemProgram:SystemProgram.programId}).rpc(),"second/invalid settlement configuration");
    const outsider=web3.Keypair.generate();
    await fails(program.methods.fundCouponPeriod(new BN(850_000_000)).accountsStrict(fundAccounts(f,mint,source,period,{authority:outsider.publicKey})).signers([outsider]).rpc(),"unauthorized issuer funding");
    await fails(program.methods.fundCouponPeriod(new BN(849_999_999)).accountsStrict(fundAccounts(f,mint,source,period)).rpc(),"partial reserve funding");
    const wrongMint=await createMint(provider.connection,settlementPayer(),web3.Keypair.generate().publicKey,null,6,undefined,undefined,TOKEN_PROGRAM_ID);
    await fails(program.methods.fundCouponPeriod(new BN(850_000_000)).accountsStrict(fundAccounts(f,mint,source,period,{settlementMint:wrongMint})).rpc(),"wrong funding mint");
    await fails(program.methods.fundCouponPeriod(new BN(850_000_000)).accountsStrict(fundAccounts(f,mint,source,period,{bond:web3.Keypair.generate().publicKey})).rpc(),"wrong bond funding");
    const before=await getAccount(provider.connection,source,"confirmed",TOKEN_PROGRAM_ID);
    assert.equal(before.amount,850_000_000n);
    await program.methods.fundCouponPeriod(new BN(850_000_000)).accountsStrict(fundAccounts(f,mint,source,period)).rpc();
    const after=await waitTokenAmount(source,0n);
    assert.equal(after.amount,0n);
    const funded=await getAccount(provider.connection,couponVaultAddress(prepared.coupon),"confirmed",TOKEN_PROGRAM_ID);
    assert.equal(funded.amount,850_000_000n);

    // Public SPL transfers may add surplus; this must not block holder claims.
    await mintTo(provider.connection,settlementPayer(),mint,source,mintAuthority,1n,[],undefined,TOKEN_PROGRAM_ID);
    await waitTokenAmount(source,1n);
    await transfer(provider.connection,settlementPayer(),source,couponVaultAddress(prepared.coupon),provider.wallet.publicKey,1n,[],undefined,TOKEN_PROGRAM_ID);
    const donated=await waitTokenAmount(couponVaultAddress(prepared.coupon),850_000_001n);
    assert.equal(donated.amount,850_000_001n);

    const wrongDest=await makeAta(mint,web3.Keypair.generate().publicKey);
    await fails(program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,holders[0],period,wrongDest)).signers([holders[0]]).rpc(),"destination owned by a different investor");
    const wrongMintDest=await makeAta(wrongMint,holders[0].publicKey);
    await fails(program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,holders[0],period,wrongMintDest)).signers([holders[0]]).rpc(),"wrong destination mint");
    const wrongInvestor=holders[1];
    await fails(program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,wrongInvestor,period,wrongDest,{snapshotEntry:snapshotEntryAddress(snapshot,holders[0].publicKey)})).signers([wrongInvestor]).rpc(),"snapshot entry belongs to another holder");
    const otherBond=await make(10);
    await fails(program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,holders[0],period,wrongDest,{bond:otherBond.bond})).signers([holders[0]]).rpc(),"wrong claim bond");
    await fails(program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,holders[0],period,wrongDest,{snapshot:web3.Keypair.generate().publicKey})).signers([holders[0]]).rpc(),"wrong claim snapshot");

    const payAt=Date.now()+180_000;
    while(await clockUnix()<paymentDate && Date.now()<payAt) await new Promise(resolve=>setTimeout(resolve,250));
    assert.ok((await clockUnix())>=paymentDate,"coupon payment date reached");
    const destinations:web3.PublicKey[]=[];
    for(const holder of holders) destinations.push(await makeAta(mint,holder.publicKey));
    for(let i=0;i<holders.length;i++) await program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,holders[i],period,destinations[i])).signers([holders[i]]).rpc();
    const paid=await Promise.all(destinations.map(d=>waitTokenAmount(d,[500_000_000n,250_000_000n,100_000_000n][destinations.indexOf(d)])));
    assert.deepEqual(paid.map(a=>a.amount),[500_000_000n,250_000_000n,100_000_000n]);
    await fails(program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,holders[0],period,destinations[0])).signers([holders[0]]).rpc(),"duplicate coupon claim");
    const final=await program.account.couponPeriod.fetch(prepared.coupon);
    assert.equal(final.paidTotalBase.toString(),"850000000");
    assert.equal(final.claimCount,3);
    assert.ok(final.status.complete!==undefined);
    const empty=await getAccount(provider.connection,couponVaultAddress(prepared.coupon),"confirmed",TOKEN_PROGRAM_ID);
    assert.equal(empty.amount,1n,"unsolicited escrow surplus remains unaccounted");
  });

  it("rejects invalid settlement mint decimals and claims before full funding",async()=>{
    const f=await make(10);
    const h=await register(f,web3.Keypair.generate(),1);
    const {snapshot,recordDate}=await makeFinalizedSnapshot(f,[h]);
    const badMint=await createMint(provider.connection,settlementPayer(),web3.Keypair.generate().publicKey,null,9,undefined,undefined,TOKEN_PROGRAM_ID);
    await fails(program.methods.configureSettlementMint().accountsStrict({config:f.config,authority:provider.wallet.publicKey,settlementConfig:settlementConfigAddress(f),settlementMint:badMint,tokenProgram:TOKEN_PROGRAM_ID,systemProgram:SystemProgram.programId}).rpc(),"non-six-decimal settlement mint");
    const {mint,source}=await makeDset(f);
    const payment=(await clockUnix())+30;
    const period=7002;
    const prep=createCouponAccounts(f,snapshot,mint,period,recordDate,payment);
    await program.methods.createCouponPeriod(new BN(period),new BN(recordDate),new BN(payment)).accountsStrict(prep.accounts).rpc();
    const destination=await makeAta(mint,h.publicKey);
    await fails(program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,h,period,destination)).signers([h]).rpc(),"claim before reserve funding");
    await program.methods.fundCouponPeriod(new BN(50_000_000)).accountsStrict(fundAccounts(f,mint,source,period)).rpc();
    await fails(program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,h,period,destination)).signers([h]).rpc(),"claim before payment date");
    await fails(program.methods.createCouponPeriod(new BN(period+1),new BN(recordDate),new BN(payment)).accountsStrict({...prep.accounts,coupon:couponAddress(f,period+1)}).rpc(),"invalid snapshot identity");
  });
});


function redemptionAddress(f:F):web3.PublicKey { return addr([Buffer.from("redemption"),f.bond.toBuffer()]); }
function redemptionAuthorityAddress(redemption:web3.PublicKey):web3.PublicKey { return addr([Buffer.from("redemption_authority"),redemption.toBuffer()]); }
function redemptionVaultAddress(redemption:web3.PublicKey):web3.PublicKey { return addr([Buffer.from("redemption_vault"),redemption.toBuffer()]); }
function redemptionReceiptAddress(redemption:web3.PublicKey,holder:web3.PublicKey):web3.PublicKey { return addr([Buffer.from("redemption_claim"),redemption.toBuffer(),holder.toBuffer()]); }
function createRedemptionAccounts(f:F,snapshot:web3.PublicKey,mint:web3.PublicKey,overrides:Record<string,web3.PublicKey>={}):any {
  const redemption=redemptionAddress(f);
  return {redemption,accounts:{
    config:f.config,authority:overrides.authority??provider.wallet.publicKey,bond:overrides.bond??f.bond,
    registry:f.registry,snapshot:overrides.snapshot??snapshot,settlementConfig:settlementConfigAddress(f),
    settlementMint:overrides.settlementMint??mint,redemption,
    redemptionAuthority:redemptionAuthorityAddress(redemption),escrow:redemptionVaultAddress(redemption),
    bondAuthority:f.auth,mint:f.mint,vault:f.vault,tokenProgram:TOKEN_PROGRAM_ID,
    systemProgram:SystemProgram.programId,rent:SYSVAR_RENT_PUBKEY,
  }};
}
function fundRedemptionAccounts(f:F,mint:web3.PublicKey,source:web3.PublicKey,overrides:Record<string,web3.PublicKey>={}):any {
  const redemption=redemptionAddress(f);
  return {config:f.config,authority:overrides.authority??provider.wallet.publicKey,bond:f.bond,redemption,
    settlementConfig:settlementConfigAddress(f),settlementMint:overrides.settlementMint??mint,
    source:overrides.source??source,escrow:overrides.escrow??redemptionVaultAddress(redemption),tokenProgram:TOKEN_PROGRAM_ID};
}
function activateRedemptionAccounts(f:F,snapshot:web3.PublicKey,overrides:Record<string,web3.PublicKey>={}):any {
  const redemption=redemptionAddress(f);
  return {redemption,bond:overrides.bond??f.bond,snapshot:overrides.snapshot??snapshot,registry:f.registry,
    bondAuthority:f.auth,mint:f.mint,vault:f.vault,escrow:overrides.escrow??redemptionVaultAddress(redemption),
    tokenProgram:TOKEN_PROGRAM_ID,activator:provider.wallet.publicKey};
}
function claimRedemptionAccounts(f:F,snapshot:web3.PublicKey,mint:web3.PublicKey,holder:web3.Keypair,destination:web3.PublicKey,overrides:Record<string,web3.PublicKey>={}):any {
  const redemption=redemptionAddress(f);
  return {config:f.config,bond:overrides.bond??f.bond,redemption,snapshot:overrides.snapshot??snapshot,
    holder:holder.publicKey,snapshotEntry:overrides.snapshotEntry??snapshotEntryAddress(snapshot,holder.publicKey),
    settlementConfig:settlementConfigAddress(f),settlementMint:overrides.settlementMint??mint,
    redemptionAuthority:redemptionAuthorityAddress(redemption),escrow:overrides.escrow??redemptionVaultAddress(redemption),
    destination,receipt:redemptionReceiptAddress(redemption,holder.publicKey),payer:provider.wallet.publicKey,
    tokenProgram:TOKEN_PROGRAM_ID,systemProgram:SystemProgram.programId,rent:SYSVAR_RENT_PUBKEY};
}
function proposalAddress(f:F, proposalId:number[]):web3.PublicKey {
  return addr([Buffer.from("governance_proposal"),f.bond.toBuffer(),Buffer.from(proposalId)]);
}
function voteReceiptAddress(proposal:web3.PublicKey, voter:web3.PublicKey):web3.PublicKey {
  return addr([Buffer.from("vote_receipt"),proposal.toBuffer(),voter.toBuffer()]);
}
function proposalAccounts(f:F,snapshot:web3.PublicKey,proposalId:number[],overrides:{authority?:web3.PublicKey;bond?:web3.PublicKey;snapshot?:web3.PublicKey}={}):any {
  return {config:f.config,authority:overrides.authority??provider.wallet.publicKey,bond:overrides.bond??f.bond,
    snapshot:overrides.snapshot??snapshot,proposal:proposalAddress(f,proposalId),systemProgram:SystemProgram.programId};
}
async function createProposal(
  f:F,snapshot:web3.PublicKey,proposalId:number[],start:number,end:number,
  options:{authority?:web3.PublicKey;authoritySigner?:web3.Keypair;bond?:web3.PublicKey;snapshotAccount?:web3.PublicKey;title?:string;contentHash?:number[];quorumBps?:number;approvalBps?:number}={},
):Promise<web3.PublicKey> {
  const proposal=proposalAddress(f,proposalId);
  const builder=program.methods.createProposal(
    proposalId,options.title??"Approve educational amendment",options.contentHash??bytes(),
    new BN(start),new BN(end),options.quorumBps??5_000,options.approvalBps??5_000,
  ).accountsStrict(proposalAccounts(f,snapshot,proposalId,{
    authority:options.authority,bond:options.bond,snapshot:options.snapshotAccount,
  }));
  if(options.authoritySigner) builder.signers([options.authoritySigner]);
  await builder.rpc();
  return proposal;
}
function voteAccounts(f:F,snapshot:web3.PublicKey,proposal:web3.PublicKey,holder:web3.Keypair,overrides:Record<string,web3.PublicKey>={}):any {
  return {proposal:overrides.proposal??proposal,bond:overrides.bond??f.bond,snapshot:overrides.snapshot??snapshot,
    holder:holder.publicKey,snapshotEntry:overrides.snapshotEntry??snapshotEntryAddress(snapshot,holder.publicKey),
    receipt:voteReceiptAddress(proposal,holder.publicKey),payer:provider.wallet.publicKey,systemProgram:SystemProgram.programId};
}
async function castVote(f:F,snapshot:web3.PublicKey,proposal:web3.PublicKey,holder:web3.Keypair,choice:{yes:{};no?:never;abstain?:never}|{no:{};yes?:never;abstain?:never}|{abstain:{};yes?:never;no?:never},overrides:Record<string,web3.PublicKey>={}):Promise<void> {
  await program.methods.castVote(choice as any).accountsStrict(voteAccounts(f,snapshot,proposal,holder,overrides)).signers([holder]).rpc();
}
function finalizeProposalAccounts(f:F,snapshot:web3.PublicKey,proposal:web3.PublicKey,overrides:Record<string,web3.PublicKey>={}):any {
  return {proposal:overrides.proposal??proposal,bond:overrides.bond??f.bond,snapshot:overrides.snapshot??snapshot,finalizer:provider.wallet.publicKey};
}
async function finalizeProposal(f:F,snapshot:web3.PublicKey,proposal:web3.PublicKey,overrides:Record<string,web3.PublicKey>={}):Promise<void> {
  await program.methods.finalizeProposal().accountsStrict(finalizeProposalAccounts(f,snapshot,proposal,overrides)).rpc();
}

async function waitForClock(target:number):Promise<void> {
  const deadline=Date.now()+180_000;
  while(await clockUnix()<target && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,250));
  assert.ok((await clockUnix())>=target,"validator clock reached target timestamp");
}

describe("KASE Treasury M5 principal redemption",function(){
  this.timeout(1_000_000);
  it("funds full maturity principal, burns custody units, pays each snapshot holder once, and preserves funded coupon claims",async()=>{
    const f=await make(100,180);
    const holders=[await register(f,web3.Keypair.generate(),10),await register(f,web3.Keypair.generate(),5),await register(f,web3.Keypair.generate(),2)];
    const {snapshot,recordDate}=await makeFinalizedSnapshot(f,holders);
    const openStart=(await clockUnix())+1;
    const openGovernanceProposal=await createProposal(f,snapshot,bytes(),openStart,openStart+180);
    const {mint,source,mintAuthority}=await makeDset(f);
    const prepared=createRedemptionAccounts(f,snapshot,mint);
    await fails(program.methods.createRedemption().accountsStrict(prepared.accounts).rpc(),"redemption before maturity");
    const earlyRedemption=redemptionAddress(f);
    assert.equal(await provider.connection.getAccountInfo(earlyRedemption,"confirmed"),null,"failed early creation is atomic");

    const couponPeriod=8101;
    const couponPayment=(await clockUnix())+2;
    const c1=createCouponAccounts(f,snapshot,mint,couponPeriod,recordDate,couponPayment);
    await program.methods.createCouponPeriod(new BN(couponPeriod),new BN(recordDate),new BN(couponPayment)).accountsStrict(c1.accounts).rpc();
    await program.methods.fundCouponPeriod(new BN(850_000_000)).accountsStrict(fundAccounts(f,mint,source,couponPeriod)).rpc();
    await waitForClock(couponPayment);
    const couponDests=await Promise.all(holders.map(h=>makeAta(mint,h.publicKey)));
    for(let i=0;i<holders.length;i++) await program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,holders[i],couponPeriod,couponDests[i])).signers([holders[i]]).rpc();
    const couponBalances=await Promise.all(couponDests.map((d,i)=>waitTokenAmount(d,[500_000_000n,250_000_000n,100_000_000n][i])));
    assert.deepEqual(couponBalances.map(x=>Number(x.amount)/1_000_000),[500,250,100]);

    // A second fully funded coupon stays claimable after the bond is retired.
    const couponPeriodAfter=8102;
    const couponPaymentAfter=(await clockUnix())+1;
    const c2=createCouponAccounts(f,snapshot,mint,couponPeriodAfter,recordDate,couponPaymentAfter);
    await mintTo(provider.connection,settlementPayer(),mint,source,mintAuthority,850_000_000n,[],undefined,TOKEN_PROGRAM_ID);
    await program.methods.createCouponPeriod(new BN(couponPeriodAfter),new BN(recordDate),new BN(couponPaymentAfter)).accountsStrict(c2.accounts).rpc();
    await program.methods.fundCouponPeriod(new BN(850_000_000)).accountsStrict(fundAccounts(f,mint,source,couponPeriodAfter)).rpc();

    const outsider=web3.Keypair.generate();
    await fails(program.methods.createRedemption().accountsStrict(createRedemptionAccounts(f,snapshot,mint,{authority:outsider.publicKey}).accounts).signers([outsider]).rpc(),"unauthorized issuer");
    await fails(program.methods.createRedemption().accountsStrict(createRedemptionAccounts(f,snapshot,mint,{bond:web3.Keypair.generate().publicKey}).accounts).rpc(),"wrong bond account");
    const wrongMint=await createMint(provider.connection,settlementPayer(),web3.Keypair.generate().publicKey,null,6,undefined,undefined,TOKEN_PROGRAM_ID);
    await fails(program.methods.createRedemption().accountsStrict(createRedemptionAccounts(f,snapshot,mint,{settlementMint:wrongMint}).accounts).rpc(),"wrong settlement mint");
    const other=await make(2,60);
    const otherHolder=await register(other,web3.Keypair.generate(),1);
    const otherSnapshot=(await makeFinalizedSnapshot(other,[otherHolder])).snapshot;
    await fails(program.methods.createRedemption().accountsStrict(createRedemptionAccounts(f,snapshot,mint,{snapshot:otherSnapshot}).accounts).rpc(),"snapshot belongs to another bond");
    await waitForClock(Number((await program.account.bond.fetch(f.bond)).maturityTs.toString()));
    await program.methods.createRedemption().accountsStrict(prepared.accounts).rpc();
    const redemption=await program.account.redemption.fetch(prepared.redemption);
    assert.equal(redemption.requiredTotalBase.toString(),"17000000000");
    assert.equal(redemption.snapshotTotalUnits.toString(),"17");
    await fails(program.methods.createRedemption().accountsStrict(prepared.accounts).rpc(),"second redemption event");
    await fails(program.methods.activateRedemption().accountsStrict(activateRedemptionAccounts(f,snapshot)).rpc(),"activation before funding");
    const supplyBefore=await getMint(provider.connection,f.mint,"confirmed",TOKEN_PROGRAM_ID);
    assert.equal(supplyBefore.supply,17n,"bond tokens remain unburned before reserve funding");

    await mintTo(provider.connection,settlementPayer(),mint,source,mintAuthority,17_000_000_000n,[],undefined,TOKEN_PROGRAM_ID);
    await fails(program.methods.fundRedemption(new BN(16_999_999_999)).accountsStrict(fundRedemptionAccounts(f,mint,source)).rpc(),"partial funding");
    await fails(program.methods.fundRedemption(new BN(17_000_000_000)).accountsStrict(fundRedemptionAccounts(f,mint,source,{authority:outsider.publicKey})).signers([outsider]).rpc(),"unauthorized funding");
    await fails(program.methods.fundRedemption(new BN(17_000_000_000)).accountsStrict(fundRedemptionAccounts(f,mint,source,{settlementMint:wrongMint})).rpc(),"incorrect funding mint");
    await fails(program.methods.fundRedemption(new BN(17_000_000_000)).accountsStrict(fundRedemptionAccounts(f,mint,source,{escrow:web3.Keypair.generate().publicKey})).rpc(),"incorrect escrow");
    await program.methods.fundRedemption(new BN(17_000_000_000)).accountsStrict(fundRedemptionAccounts(f,mint,source)).rpc();
    const redemptionEscrow=redemptionVaultAddress(prepared.redemption);
    assert.equal((await waitTokenAmount(redemptionEscrow,17_000_000_000n)).amount,17_000_000_000n);

    const principalDests=await Promise.all(holders.map(h=>makeTokenAccount(mint,h.publicKey)));
    await fails(program.methods.claimRedemption().accountsStrict(claimRedemptionAccounts(f,snapshot,mint,holders[0],principalDests[0])).signers([holders[0]]).rpc(),"claim before activation");
    const wrongDest=await makeAta(mint,outsider.publicKey);
    await fails(program.methods.activateRedemption().accountsStrict(activateRedemptionAccounts(f,snapshot,{escrow:wrongDest})).rpc(),"wrong activation escrow");
    await program.methods.activateRedemption().accountsStrict(activateRedemptionAccounts(f,snapshot)).rpc();

    let retired=await getMint(provider.connection,f.mint,"confirmed",TOKEN_PROGRAM_ID);
    for(let retry=0;retired.supply!==0n&&retry<20;retry++){await new Promise(resolve=>setTimeout(resolve,250));retired=await getMint(provider.connection,f.mint,"confirmed",TOKEN_PROGRAM_ID);}
    assert.equal(retired.supply,0n,"all 17 custody tokens burned");
    assert.equal((await waitTokenAmount(f.vault,0n)).amount,0n);
    const bond=await program.account.bond.fetch(f.bond);
    assert.ok(bond.status.redeemed!==undefined);
    assert.equal(bond.outstanding.toString(),"0");
    assert.equal((await program.account.registryState.fetch(f.registry)).totalUnits.toString(),"17","registry history remains intact");

    const stillOpenProposal=await program.account.proposal.fetch(openGovernanceProposal);
    assert.ok(stillOpenProposal.status.open!==undefined,"a pre-redemption proposal remains snapshot-bound and open");
    await castVote(f,snapshot,openGovernanceProposal,holders[0],{yes:{}});
    assert.equal((await program.account.proposal.fetch(openGovernanceProposal)).yesVotingPower.toString(),"10");
    const blockedProposalId=bytes();
    const blockedStart=(await clockUnix())+2;
    await fails(createProposal(f,snapshot,blockedProposalId,blockedStart,blockedStart+10),"proposal creation after terminal redemption");

    await fails(program.methods.issueUnits(new BN(1)).accountsStrict(issueAccounts(f,holders[0])).rpc(),"issue after terminal redemption");
    await fails(createSnapshot(f,bytes(),await clockUnix()),"new snapshot after terminal redemption");
    await fails(program.methods.claimRedemption().accountsStrict(claimRedemptionAccounts(f,snapshot,mint,holders[0],wrongDest)).signers([holders[0]]).rpc(),"destination belongs to different investor");
    await fails(program.methods.claimRedemption().accountsStrict(claimRedemptionAccounts(f,snapshot,mint,holders[1],principalDests[1],{snapshotEntry:snapshotEntryAddress(snapshot,holders[0].publicKey)})).signers([holders[1]]).rpc(),"wrong holder snapshot entry");
    await fails(program.methods.claimRedemption().accountsStrict(claimRedemptionAccounts(f,snapshot,mint,holders[0],principalDests[0],{snapshot:web3.Keypair.generate().publicKey})).signers([holders[0]]).rpc(),"wrong snapshot");

    // The second coupon was funded before redemption and remains payable afterward.
    await waitForClock(couponPaymentAfter);
    for(let i=0;i<holders.length;i++) await program.methods.claimCoupon().accountsStrict(claimAccounts(f,snapshot,mint,holders[i],couponPeriodAfter,couponDests[i])).signers([holders[i]]).rpc();
    const couponAfter=await program.account.couponPeriod.fetch(c2.coupon);
    assert.ok(couponAfter.status.complete!==undefined);
    assert.equal(couponAfter.paidTotalBase.toString(),"850000000");

    for(let i=0;i<holders.length;i++) await program.methods.claimRedemption().accountsStrict(claimRedemptionAccounts(f,snapshot,mint,holders[i],principalDests[i])).signers([holders[i]]).rpc();
    assert.deepEqual(await Promise.all(principalDests.map(async (d,i)=>Number((await waitTokenAmount(d,[10_000_000_000n,5_000_000_000n,2_000_000_000n][i])).amount)/1_000_000)),[10_000,5_000,2_000]);
    await fails(program.methods.claimRedemption().accountsStrict(claimRedemptionAccounts(f,snapshot,mint,holders[0],principalDests[0])).signers([holders[0]]).rpc(),"duplicate principal claim");
    const final=await program.account.redemption.fetch(prepared.redemption);
    assert.ok(final.status.complete!==undefined);
    assert.equal(final.paidTotalBase.toString(),"17000000000");
    assert.equal(final.fundedTotalBase.toString(),"17000000000");
    assert.equal(final.burnedUnits.toString(),"17");
    assert.equal(final.claimCount,3);
    assert.deepEqual(await Promise.all(holders.map(async h=>(await program.account.redemptionReceipt.fetch(redemptionReceiptAddress(prepared.redemption,h.publicKey))).amountBase.toString())),["10000000000","5000000000","2000000000"]);
    assert.equal((await waitTokenAmount(redemptionEscrow,0n)).amount,0n);
    assert.equal((await waitTokenAmount(f.vault,0n)).amount,0n);
  });
});

describe("KASE Treasury M6 bondholder governance",function(){
  this.timeout(1_000_000);

  it("creates immutable snapshot-bound proposals and tallies signed 10/5/2 votes",async()=>{
    const f=await make(100);
    const holders=[await register(f,web3.Keypair.generate(),10),await register(f,web3.Keypair.generate(),5),await register(f,web3.Keypair.generate(),2)];
    const {snapshot}=await makeFinalizedSnapshot(f,holders);
    const wrongBond=await make(2);
    const wrongBondHolder=await register(wrongBond,web3.Keypair.generate(),1);
    const wrongSnapshot=(await makeFinalizedSnapshot(wrongBond,[wrongBondHolder])).snapshot;
    const id=bytes();
    const validationNow=await clockUnix();
    const validationStart=validationNow+30;
    const validationEnd=validationStart+5;
    const outsider=web3.Keypair.generate();
    await fails(createProposal(f,snapshot,bytes(),validationStart,validationEnd,{authority:outsider.publicKey,authoritySigner:outsider}),"unauthorized proposal issuer");
    await fails(createProposal(f,snapshot,bytes(),validationStart,validationEnd,{bond:wrongBond.bond}),"proposal with incorrect bond");
    await fails(createProposal(f,snapshot,bytes(),validationStart,validationEnd,{snapshotAccount:wrongSnapshot}),"proposal with another bond snapshot");
    const pendingSnapshot=await createSnapshot(f,bytes(),(await clockUnix())+30);
    await fails(createProposal(f,pendingSnapshot,bytes(),validationStart,validationEnd),"proposal with unfinalized snapshot");
    await fails(createProposal(f,snapshot,bytes(),validationNow-1,validationNow+2),"past proposal start");
    await fails(createProposal(f,snapshot,bytes(),validationStart,validationStart),"empty voting window");
    await fails(createProposal(f,snapshot,bytes(),validationStart,validationStart+31_536_000+1),"excessive voting window");
    await fails(createProposal(f,snapshot,bytes(),validationStart,validationEnd,{title:"   "}),"empty proposal title");
    await fails(createProposal(f,snapshot,bytes(),validationStart,validationEnd,{quorumBps:0}),"zero quorum");
    await fails(createProposal(f,snapshot,bytes(),validationStart,validationEnd,{approvalBps:10_001}),"approval threshold above 100 percent");

    const start=(await clockUnix())+60;
    const end=start+30;
    const proposalPda=proposalAddress(f,id);
    await createProposal(f,snapshot,id,start,end);
    let proposal=await program.account.proposal.fetch(proposalPda);
    assert.equal(proposal.eligibleVotingPower.toString(),"17");
    assert.equal(proposal.quorumBps,5_000);
    assert.equal(proposal.approvalBps,5_000);
    assert.equal(proposal.title,"Approve educational amendment");
    const originalHash=proposal.contentHash;
    await fails(program.methods.castVote({yes:{}}).accountsStrict(voteAccounts(f,snapshot,proposalPda,holders[0])).signers([holders[0]]).rpc(),"vote before voting start");
    await fails(finalizeProposal(f,snapshot,proposalPda),"finalize before voting deadline");
    await fails(createProposal(f,snapshot,id,start,end),"duplicate proposal identifier");
    await fails(castVote(f,snapshot,proposalPda,holders[0],{yes:{}},{bond:wrongBond.bond}),"vote with incorrect bond account");
    await fails(castVote(f,snapshot,proposalPda,holders[0],{yes:{}},{snapshot:wrongSnapshot}),"vote with another finalized bond snapshot");
    const wrongEntry=snapshotEntryAddress(snapshot,holders[1].publicKey);
    await fails(castVote(f,snapshot,proposalPda,holders[0],{yes:{}},{snapshotEntry:wrongEntry}),"snapshot entry for another investor");
    const unauthorizedVoter=web3.Keypair.generate();
    await fails(castVote(f,snapshot,proposalPda,unauthorizedVoter,{yes:{}}),"wallet absent from finalized snapshot");

    await waitForClock(start);
    await castVote(f,snapshot,proposalPda,holders[0],{yes:{}});
    await fails(castVote(f,snapshot,proposalPda,holders[0],{no:{}}),"duplicate vote receipt");
    await castVote(f,snapshot,proposalPda,holders[1],{no:{}});
    await castVote(f,snapshot,proposalPda,holders[2],{abstain:{}});
    proposal=await program.account.proposal.fetch(proposalPda);
    assert.equal(proposal.yesVotingPower.toString(),"10");
    assert.equal(proposal.noVotingPower.toString(),"5");
    assert.equal(proposal.abstainVotingPower.toString(),"2");
    assert.equal(proposal.participatingVotingPower.toString(),"17");
    assert.equal(proposal.voterCount,3);
    assert.equal((await program.account.voteReceipt.fetch(voteReceiptAddress(proposalPda,holders[0].publicKey))).weight.toString(),"10");
    await waitForClock(end);
    await fails(castVote(f,snapshot,proposalPda,holders[0],{yes:{}}),"vote after deadline");
    await finalizeProposal(f,snapshot,proposalPda);
    proposal=await program.account.proposal.fetch(proposalPda);
    assert.ok(proposal.status.passed!==undefined);
    assert.equal(proposal.yesVotingPower.toString(),"10");
    assert.deepEqual(proposal.contentHash,originalHash);
    await fails(finalizeProposal(f,snapshot,proposalPda),"double finalization");
    await fails(castVote(f,snapshot,proposalPda,holders[0],{yes:{}}),"vote after finalization");
  });

  it("applies exact quorum and strict approval boundaries, rejects no-vote and abstain-only proposals",async()=>{
    const f=await make(30);
    const holders=[await register(f,web3.Keypair.generate(),10),await register(f,web3.Keypair.generate(),10)];
    const {snapshot}=await makeFinalizedSnapshot(f,holders);
    const start=(await clockUnix())+30;
    const end=start+60;
    const exactQuorum=await createProposal(f,snapshot,bytes(),start,end,{quorumBps:5_000,approvalBps:5_000});
    const exactApproval=await createProposal(f,snapshot,bytes(),start,end,{quorumBps:10_000,approvalBps:5_000});
    const abstainOnly=await createProposal(f,snapshot,bytes(),start,end,{quorumBps:10_000,approvalBps:5_000});
    const noVotes=await createProposal(f,snapshot,bytes(),start,end,{quorumBps:5_000,approvalBps:5_000});
    await waitForClock(start);
    await castVote(f,snapshot,exactQuorum,holders[0],{yes:{}});
    await castVote(f,snapshot,exactApproval,holders[0],{yes:{}});
    await castVote(f,snapshot,exactApproval,holders[1],{no:{}});
    await castVote(f,snapshot,abstainOnly,holders[0],{abstain:{}});
    await castVote(f,snapshot,abstainOnly,holders[1],{abstain:{}});
    await waitForClock(end);
    await finalizeProposal(f,snapshot,exactQuorum);
    await finalizeProposal(f,snapshot,exactApproval);
    await finalizeProposal(f,snapshot,abstainOnly);
    await finalizeProposal(f,snapshot,noVotes);
    const [q,a,abstain,none]=await Promise.all([
      program.account.proposal.fetch(exactQuorum),program.account.proposal.fetch(exactApproval),
      program.account.proposal.fetch(abstainOnly),program.account.proposal.fetch(noVotes),
    ]);
    assert.ok(q.status.passed!==undefined,"exact 50% quorum passes when Yes is unanimous among decisive votes");
    assert.equal(q.participatingVotingPower.toString(),"10");
    assert.ok(a.status.rejected!==undefined,"exactly 50% Yes does not satisfy the strict approval threshold");
    assert.ok(abstain.status.rejected!==undefined,"abstentions count for quorum but cannot approve a proposal");
    assert.equal(abstain.abstainVotingPower.toString(),"20");
    assert.ok(none.status.rejected!==undefined,"zero participation cannot meet quorum");
    await fails(finalizeProposal(f,snapshot,exactQuorum),"repeat finalization");
  });
});
