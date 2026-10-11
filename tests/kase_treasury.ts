import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, web3 } from "@coral-xyz/anchor";
import { getAccount, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
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
async function make(cap = 100): Promise<F> {
  const issuer = bytes(); const id = bytes();
  const config = addr([Buffer.from("issuer"), Buffer.from(issuer)]);
  const bond = addr([Buffer.from("bond"), config.toBuffer(), Buffer.from(id)]);
  const auth = addr([Buffer.from("bond_authority"), bond.toBuffer()]);
  const mint = addr([Buffer.from("bond_mint"), bond.toBuffer()]);
  const vault = addr([Buffer.from("bond_vault"), bond.toBuffer()]);
  const registry = addr([Buffer.from("registry"), bond.toBuffer()]);
  await program.methods.initializeIssuer(issuer).accountsStrict({ config, authority: provider.wallet.publicKey, systemProgram: SystemProgram.programId }).rpc();
  await program.methods.createBond(id, new BN(1_000_000_000), 1_000, { semiannual: {} }, new BN(Math.floor(Date.now()/1000)+86400), new BN(cap))
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
  const info = await provider.connection.getAccountInfo(address, "confirmed");
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
    const date = (await clockUnix()) + 2;
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
