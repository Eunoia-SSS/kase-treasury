import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, web3 } from "@coral-xyz/anchor";
import { getAccount, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { randomBytes } from "crypto";
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
    const mint=await getMint(provider.connection,f.mint,"confirmed",TOKEN_PROGRAM_ID);
    assert.equal(mint.supply,5n); assert.equal(mint.mintAuthority,null);
    await fails(program.methods.issueUnits(new BN(1)).accountsStrict(issueAccounts(f,h)).rpc(),"issuance after close");
    const bond=await program.account.bond.fetch(f.bond); assert.equal(bond.status.issuanceClosed !== undefined,true);
  });
});
