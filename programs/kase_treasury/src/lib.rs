use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program::{invoke, invoke_signed},
    program_option::COption,
    program_pack::Pack,
};
use spl_token::instruction::AuthorityType;
use spl_token::state::{Account as SplAccount, Mint as SplMint};

declare_id!("8Lbkzg5shbLTZSz9y68YxgxpWE59VbHEVmj2XczZxR69");

pub const ISSUER: &[u8] = b"issuer";
pub const BOND: &[u8] = b"bond";
pub const AUTH: &[u8] = b"bond_authority";
pub const MINT: &[u8] = b"bond_mint";
pub const VAULT: &[u8] = b"bond_vault";
pub const REGISTRY: &[u8] = b"registry";
pub const POSITION: &[u8] = b"position";
pub const REGISTRY_ENTRY: &[u8] = b"registry_entry";
pub const MAX_HOLDERS: usize = 100;

#[program]
pub mod kase_treasury {
    use super::*;

    pub fn initialize_issuer(ctx: Context<InitializeIssuer>, id: [u8; 32]) -> Result<()> {
        require!(id != [0; 32], ErrorCode::InvalidId);
        let cfg = &mut ctx.accounts.config;
        cfg.id = id;
        cfg.authority = ctx.accounts.authority.key();
        cfg.pending = Pubkey::default();
        cfg.bump = ctx.bumps.config;
        emit!(IssuerInitialized {
            config: cfg.key(),
            authority: cfg.authority
        });
        Ok(())
    }

    pub fn propose_issuer_authority(
        ctx: Context<ChangeAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        require!(
            new_authority != Pubkey::default(),
            ErrorCode::InvalidAuthority
        );
        require_keys_neq!(
            new_authority,
            ctx.accounts.config.authority,
            ErrorCode::AuthorityUnchanged
        );
        ctx.accounts.config.pending = new_authority;
        emit!(AuthorityProposed {
            config: ctx.accounts.config.key(),
            proposed: new_authority
        });
        Ok(())
    }

    pub fn accept_issuer_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        let old = cfg.authority;
        cfg.authority = ctx.accounts.new_authority.key();
        cfg.pending = Pubkey::default();
        emit!(AuthorityAccepted {
            config: cfg.key(),
            old,
            new: cfg.authority
        });
        Ok(())
    }

    pub fn create_bond(
        ctx: Context<CreateBond>,
        id: [u8; 32],
        face_value_base: u64,
        annual_coupon_bps: u16,
        frequency: CouponFrequency,
        maturity_ts: i64,
        supply_cap: u64,
    ) -> Result<()> {
        require!(id != [0; 32], ErrorCode::InvalidId);
        require!(
            face_value_base > 0 && annual_coupon_bps <= 10_000,
            ErrorCode::InvalidTerms
        );
        require!(
            frequency == CouponFrequency::Semiannual,
            ErrorCode::InvalidTerms
        );
        require!(
            maturity_ts > Clock::get()?.unix_timestamp,
            ErrorCode::InvalidMaturity
        );
        require!(supply_cap > 0, ErrorCode::InvalidSupplyCap);
        let mint_ix = spl_token::instruction::initialize_mint2(
            &spl_token::ID,
            &ctx.accounts.mint.key(),
            &ctx.accounts.bond_authority.key(),
            None,
            0,
        )?;
        invoke(
            &mint_ix,
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;
        let vault_ix = spl_token::instruction::initialize_account3(
            &spl_token::ID,
            &ctx.accounts.vault.key(),
            &ctx.accounts.mint.key(),
            &ctx.accounts.bond_authority.key(),
        )?;
        invoke(
            &vault_ix,
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;

        let bond = &mut ctx.accounts.bond;
        bond.config = ctx.accounts.config.key();
        bond.id = id;
        bond.mint = ctx.accounts.mint.key();
        bond.vault = ctx.accounts.vault.key();
        bond.bond_authority = ctx.accounts.bond_authority.key();
        bond.face_value_base = face_value_base;
        bond.annual_coupon_bps = annual_coupon_bps;
        bond.frequency = frequency;
        bond.maturity_ts = maturity_ts;
        bond.supply_cap = supply_cap;
        bond.issued = 0;
        bond.outstanding = 0;
        bond.status = Status::Issuing;
        bond.bump = ctx.bumps.bond;
        bond.authority_bump = ctx.bumps.bond_authority;
        bond.registry_bump = ctx.bumps.registry;
        ctx.accounts.bond_authority.bond = bond.key();
        ctx.accounts.bond_authority.bump = ctx.bumps.bond_authority;
        let reg = &mut ctx.accounts.registry;
        reg.bond = bond.key();
        reg.count = 0;
        reg.total_units = 0;
        reg.bump = ctx.bumps.registry;
        emit!(BondCreated {
            bond: bond.key(),
            mint: bond.mint,
            vault: bond.vault,
            supply_cap
        });
        Ok(())
    }

    pub fn register_holder(ctx: Context<RegisterHolder>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);
        require!(
            ctx.accounts.bond.status == Status::Issuing,
            ErrorCode::IssuanceClosed
        );
        require!(
            Clock::get()?.unix_timestamp < ctx.accounts.bond.maturity_ts,
            ErrorCode::BondMatured
        );
        check_supply(
            &ctx.accounts.bond,
            &ctx.accounts.registry,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
        )?;
        let i = usize::from(ctx.accounts.registry.count);
        require!(i < MAX_HOLDERS, ErrorCode::RegistryFull);
        let issued = ctx
            .accounts
            .bond
            .issued
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        require!(issued <= ctx.accounts.bond.supply_cap, ErrorCode::SupplyCap);
        let outstanding = ctx
            .accounts
            .bond
            .outstanding
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        let total = ctx
            .accounts
            .registry
            .total_units
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        mint_to_vault(
            &ctx.accounts.token_program,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
            &ctx.accounts.bond_authority,
            ctx.accounts.bond.key(),
            ctx.accounts.bond.authority_bump,
            amount,
        )?;
        let p = &mut ctx.accounts.position;
        p.bond = ctx.accounts.bond.key();
        p.holder = ctx.accounts.holder.key();
        p.units = amount;
        p.bump = ctx.bumps.position;
        ctx.accounts.registry_entry.bond = ctx.accounts.bond.key();
        ctx.accounts.registry_entry.holder = ctx.accounts.holder.key();
        ctx.accounts.registry_entry.index = ctx.accounts.registry.count;
        ctx.accounts.registry_entry.bump = ctx.bumps.registry_entry;
        let reg = &mut ctx.accounts.registry;
        reg.count = reg.count.checked_add(1).ok_or(ErrorCode::Overflow)?;
        reg.total_units = total;
        ctx.accounts.bond.issued = issued;
        ctx.accounts.bond.outstanding = outstanding;
        emit!(PositionIssued {
            bond: p.bond,
            holder: p.holder,
            units: amount
        });
        Ok(())
    }

    pub fn issue_units(ctx: Context<IssueUnits>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);
        require!(
            ctx.accounts.bond.status == Status::Issuing,
            ErrorCode::IssuanceClosed
        );
        require!(
            Clock::get()?.unix_timestamp < ctx.accounts.bond.maturity_ts,
            ErrorCode::BondMatured
        );
        check_supply(
            &ctx.accounts.bond,
            &ctx.accounts.registry,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
        )?;
        let count = usize::from(ctx.accounts.registry.count);
        require!(count <= MAX_HOLDERS, ErrorCode::RegistryFull);
        let issued = ctx
            .accounts
            .bond
            .issued
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        require!(issued <= ctx.accounts.bond.supply_cap, ErrorCode::SupplyCap);
        let units = ctx
            .accounts
            .position
            .units
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        let total = ctx
            .accounts
            .registry
            .total_units
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        let outstanding = ctx
            .accounts
            .bond
            .outstanding
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        mint_to_vault(
            &ctx.accounts.token_program,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
            &ctx.accounts.bond_authority,
            ctx.accounts.bond.key(),
            ctx.accounts.bond.authority_bump,
            amount,
        )?;
        ctx.accounts.position.units = units;
        ctx.accounts.registry.total_units = total;
        ctx.accounts.bond.issued = issued;
        ctx.accounts.bond.outstanding = outstanding;
        emit!(PositionIssued {
            bond: ctx.accounts.bond.key(),
            holder: ctx.accounts.position.holder,
            units: amount
        });
        Ok(())
    }

    pub fn close_issuance(ctx: Context<CloseIssuance>) -> Result<()> {
        require!(
            ctx.accounts.bond.status == Status::Issuing,
            ErrorCode::InvalidTransition
        );
        require!(ctx.accounts.bond.issued > 0, ErrorCode::EmptyIssuance);
        check_supply(
            &ctx.accounts.bond,
            &ctx.accounts.registry,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
        )?;
        let key = ctx.accounts.bond.key();
        let bump = [ctx.accounts.bond.authority_bump];
        let seeds: &[&[u8]] = &[AUTH, key.as_ref(), &bump];
        let ix = spl_token::instruction::set_authority(
            &spl_token::ID,
            &ctx.accounts.mint.key(),
            None,
            AuthorityType::MintTokens,
            &ctx.accounts.bond_authority.key(),
            &[],
        )?;
        invoke_signed(
            &ix,
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.bond_authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
            &[seeds],
        )?;
        ctx.accounts.bond.status = Status::IssuanceClosed;
        emit!(IssuanceClosed {
            bond: key,
            units: ctx.accounts.bond.issued,
            holders: ctx.accounts.registry.count
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(id: [u8; 32])]
pub struct InitializeIssuer<'info> {
    #[account(init, payer=authority, space=IssuerConfig::SPACE, seeds=[ISSUER, id.as_ref()], bump)]
    pub config: Account<'info, IssuerConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ChangeAuthority<'info> {
    #[account(mut, seeds=[ISSUER, config.id.as_ref()], bump=config.bump, has_one=authority)]
    pub config: Account<'info, IssuerConfig>,
    pub authority: Signer<'info>,
}
#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    #[account(mut, seeds=[ISSUER, config.id.as_ref()], bump=config.bump, constraint=config.pending == new_authority.key() @ ErrorCode::NotPendingAuthority)]
    pub config: Account<'info, IssuerConfig>,
    pub new_authority: Signer<'info>,
}
#[derive(Accounts)]
#[instruction(id: [u8; 32])]
pub struct CreateBond<'info> {
    #[account(mut, seeds=[ISSUER, config.id.as_ref()], bump=config.bump, has_one=authority)]
    pub config: Account<'info, IssuerConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer=authority, space=Bond::SPACE, seeds=[BOND, config.key().as_ref(), id.as_ref()], bump)]
    pub bond: Account<'info, Bond>,
    #[account(init, payer=authority, space=BondAuthority::SPACE, seeds=[AUTH, bond.key().as_ref()], bump)]
    pub bond_authority: Account<'info, BondAuthority>,
    #[account(init, payer=authority, owner=spl_token::ID, space=SplMint::LEN, seeds=[MINT, bond.key().as_ref()], bump)]
    /// CHECK: PDA allocation is owned by the classic SPL Token Program and initialized by its CPI.
    pub mint: UncheckedAccount<'info>,
    #[account(init, payer=authority, owner=spl_token::ID, space=SplAccount::LEN, seeds=[VAULT, bond.key().as_ref()], bump)]
    /// CHECK: Manual validation checks classic SPL owner, mint, vault owner PDA, and stored address.
    pub vault: UncheckedAccount<'info>,
    #[account(init, payer=authority, space=RegistryState::SPACE, seeds=[REGISTRY, bond.key().as_ref()], bump)]
    pub registry: Account<'info, RegistryState>,
    #[account(address = spl_token::ID)]
    /// CHECK: The account address is constrained to the canonical classic SPL Token Program ID.
    pub token_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
#[derive(Accounts)]
pub struct RegisterHolder<'info> {
    #[account(seeds=[ISSUER, config.id.as_ref()], bump=config.bump, has_one=authority)]
    pub config: Account<'info, IssuerConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds=[BOND, config.key().as_ref(), bond.id.as_ref()], bump=bond.bump, has_one=config, has_one=mint, has_one=vault, has_one=bond_authority)]
    pub bond: Account<'info, Bond>,
    #[account(mut, seeds=[REGISTRY, bond.key().as_ref()], bump=bond.registry_bump, has_one=bond)]
    pub registry: Account<'info, RegistryState>,
    #[account(init, payer=authority, space=RegistryEntry::SPACE, seeds=[REGISTRY_ENTRY, bond.key().as_ref(), &[registry.count]], bump)]
    pub registry_entry: Account<'info, RegistryEntry>,
    #[account(init, payer=authority, space=Position::SPACE, seeds=[POSITION, bond.key().as_ref(), holder.key().as_ref()], bump)]
    pub position: Account<'info, Position>,
    pub holder: Signer<'info>,
    #[account(seeds=[AUTH, bond.key().as_ref()], bump=bond.authority_bump, constraint=bond_authority.bond == bond.key() @ ErrorCode::WrongAuthority)]
    pub bond_authority: Account<'info, BondAuthority>,
    #[account(mut, address=bond.mint)]
    /// CHECK: Manual validation checks classic SPL owner, decimals, mint authority, and stored mint address.
    pub mint: UncheckedAccount<'info>,
    #[account(mut, address=bond.vault)]
    /// CHECK: Manual validation checks classic SPL owner, mint, vault owner PDA, and stored address.
    pub vault: UncheckedAccount<'info>,
    #[account(address = spl_token::ID)]
    /// CHECK: The account address is constrained to the canonical classic SPL Token Program ID.
    pub token_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct IssueUnits<'info> {
    #[account(seeds=[ISSUER, config.id.as_ref()], bump=config.bump, has_one=authority)]
    pub config: Account<'info, IssuerConfig>,
    pub authority: Signer<'info>,
    #[account(mut, seeds=[BOND, config.key().as_ref(), bond.id.as_ref()], bump=bond.bump, has_one=config, has_one=mint, has_one=vault, has_one=bond_authority)]
    pub bond: Account<'info, Bond>,
    #[account(mut, seeds=[REGISTRY, bond.key().as_ref()], bump=bond.registry_bump, has_one=bond)]
    pub registry: Account<'info, RegistryState>,
    #[account(mut, seeds=[POSITION, bond.key().as_ref(), position.holder.as_ref()], bump=position.bump, has_one=bond)]
    pub position: Account<'info, Position>,
    #[account(seeds=[AUTH, bond.key().as_ref()], bump=bond.authority_bump, constraint=bond_authority.bond == bond.key() @ ErrorCode::WrongAuthority)]
    pub bond_authority: Account<'info, BondAuthority>,
    #[account(mut, address=bond.mint)]
    /// CHECK: Manual validation checks classic SPL owner, decimals, mint authority, and stored mint address.
    pub mint: UncheckedAccount<'info>,
    #[account(mut, address=bond.vault)]
    /// CHECK: Manual validation checks classic SPL owner, mint, vault owner PDA, and stored address.
    pub vault: UncheckedAccount<'info>,
    #[account(address = spl_token::ID)]
    /// CHECK: The account address is constrained to the canonical classic SPL Token Program ID.
    pub token_program: UncheckedAccount<'info>,
}
#[derive(Accounts)]
pub struct CloseIssuance<'info> {
    #[account(seeds=[ISSUER, config.id.as_ref()], bump=config.bump, has_one=authority)]
    pub config: Account<'info, IssuerConfig>,
    pub authority: Signer<'info>,
    #[account(mut, seeds=[BOND, config.key().as_ref(), bond.id.as_ref()], bump=bond.bump, has_one=config, has_one=mint, has_one=vault, has_one=bond_authority)]
    pub bond: Account<'info, Bond>,
    #[account(seeds=[REGISTRY, bond.key().as_ref()], bump=bond.registry_bump, has_one=bond)]
    pub registry: Account<'info, RegistryState>,
    #[account(seeds=[AUTH, bond.key().as_ref()], bump=bond.authority_bump, constraint=bond_authority.bond == bond.key() @ ErrorCode::WrongAuthority)]
    pub bond_authority: Account<'info, BondAuthority>,
    #[account(mut, address=bond.mint)]
    /// CHECK: Manual validation checks classic SPL owner, decimals, mint authority, and stored mint address.
    pub mint: UncheckedAccount<'info>,
    #[account(mut, address=bond.vault)]
    /// CHECK: Manual validation checks classic SPL owner, mint, vault owner PDA, and stored address.
    pub vault: UncheckedAccount<'info>,
    #[account(address = spl_token::ID)]
    /// CHECK: The account address is constrained to the canonical classic SPL Token Program ID.
    pub token_program: UncheckedAccount<'info>,
}

#[account]
pub struct IssuerConfig {
    pub id: [u8; 32],
    pub authority: Pubkey,
    pub pending: Pubkey,
    pub bump: u8,
}
impl IssuerConfig {
    pub const SPACE: usize = 105;
}
#[account]
pub struct Bond {
    pub config: Pubkey,
    pub id: [u8; 32],
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub bond_authority: Pubkey,
    pub face_value_base: u64,
    pub annual_coupon_bps: u16,
    pub frequency: CouponFrequency,
    pub maturity_ts: i64,
    pub supply_cap: u64,
    pub issued: u64,
    pub outstanding: u64,
    pub status: Status,
    pub bump: u8,
    pub authority_bump: u8,
    pub registry_bump: u8,
}
impl Bond {
    pub const SPACE: usize = 256;
}
#[account]
pub struct BondAuthority {
    pub bond: Pubkey,
    pub bump: u8,
}
impl BondAuthority {
    pub const SPACE: usize = 41;
}
#[account]
pub struct RegistryState {
    pub bond: Pubkey,
    pub count: u8,
    pub total_units: u64,
    pub bump: u8,
}
impl RegistryState {
    pub const SPACE: usize = 50;
}
#[account]
pub struct RegistryEntry {
    pub bond: Pubkey,
    pub holder: Pubkey,
    pub index: u8,
    pub bump: u8,
}
impl RegistryEntry {
    pub const SPACE: usize = 74;
}

#[account]
pub struct Position {
    pub bond: Pubkey,
    pub holder: Pubkey,
    pub units: u64,
    pub bump: u8,
}
impl Position {
    pub const SPACE: usize = 81;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum CouponFrequency {
    Semiannual,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Status {
    Issuing,
    IssuanceClosed,
}
#[event]
pub struct IssuerInitialized {
    pub config: Pubkey,
    pub authority: Pubkey,
}
#[event]
pub struct AuthorityProposed {
    pub config: Pubkey,
    pub proposed: Pubkey,
}
#[event]
pub struct AuthorityAccepted {
    pub config: Pubkey,
    pub old: Pubkey,
    pub new: Pubkey,
}
#[event]
pub struct BondCreated {
    pub bond: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub supply_cap: u64,
}
#[event]
pub struct PositionIssued {
    pub bond: Pubkey,
    pub holder: Pubkey,
    pub units: u64,
}
#[event]
pub struct IssuanceClosed {
    pub bond: Pubkey,
    pub units: u64,
    pub holders: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Identifier cannot be zero.")]
    InvalidId,
    #[msg("Authority is invalid.")]
    InvalidAuthority,
    #[msg("Authority is already current.")]
    AuthorityUnchanged,
    #[msg("Only pending authority may accept the transfer.")]
    NotPendingAuthority,
    #[msg("Bond terms are outside supported bounds.")]
    InvalidTerms,
    #[msg("Maturity must be in the future.")]
    InvalidMaturity,
    #[msg("Supply cap must be positive.")]
    InvalidSupplyCap,
    #[msg("Amount must be positive.")]
    ZeroAmount,
    #[msg("Issuance is closed.")]
    IssuanceClosed,
    #[msg("Bond has matured.")]
    BondMatured,
    #[msg("Registry capacity reached.")]
    RegistryFull,
    #[msg("Holder is already registered.")]
    DuplicateHolder,
    #[msg("Holder is not registered.")]
    UnregisteredHolder,
    #[msg("Supply cap would be exceeded.")]
    SupplyCap,
    #[msg("Arithmetic overflow.")]
    Overflow,
    #[msg("Bond mint is not a valid classic SPL mint with expected authority/decimals.")]
    InvalidMint,
    #[msg("Bond vault is not a valid classic SPL token account with expected mint/authority.")]
    InvalidVault,
    #[msg("Token mint supply mismatch.")]
    SupplyMismatch,
    #[msg("Custody vault balance mismatch.")]
    VaultMismatch,
    #[msg("Bond authority PDA mismatch.")]
    WrongAuthority,
    #[msg("Position account has wrong owner.")]
    WrongPositionOwner,
    #[msg("Position PDA is invalid.")]
    WrongPositionPda,
    #[msg("Position count does not match registry.")]
    PositionCountMismatch,
    #[msg("Position sum does not match recorded supply.")]
    PositionTotalMismatch,
    #[msg("Cannot close an empty issuance.")]
    EmptyIssuance,
    #[msg("Lifecycle transition is invalid or repeated.")]
    InvalidTransition,
}

fn mint_to_vault<'info>(
    token_program: &UncheckedAccount<'info>,
    mint: &UncheckedAccount<'info>,
    vault: &UncheckedAccount<'info>,
    authority: &Account<'info, BondAuthority>,
    bond: Pubkey,
    bump: u8,
    amount: u64,
) -> Result<()> {
    let bump_seed = [bump];
    let seeds: &[&[u8]] = &[AUTH, bond.as_ref(), &bump_seed];
    let ix = spl_token::instruction::mint_to(
        &spl_token::ID,
        &mint.key(),
        &vault.key(),
        &authority.key(),
        &[],
        amount,
    )?;
    invoke_signed(
        &ix,
        &[
            mint.to_account_info(),
            vault.to_account_info(),
            authority.to_account_info(),
            token_program.to_account_info(),
        ],
        &[seeds],
    )?;
    Ok(())
}

fn check_supply(
    bond: &Bond,
    registry: &RegistryState,
    mint: &UncheckedAccount,
    vault: &UncheckedAccount,
) -> Result<()> {
    require_keys_eq!(*mint.owner, spl_token::ID, ErrorCode::InvalidMint);
    require_keys_eq!(*vault.owner, spl_token::ID, ErrorCode::InvalidVault);
    let mint_data =
        SplMint::unpack(&mint.try_borrow_data()?).map_err(|_| error!(ErrorCode::InvalidMint))?;
    let vault_data = SplAccount::unpack(&vault.try_borrow_data()?)
        .map_err(|_| error!(ErrorCode::InvalidVault))?;
    require!(mint_data.decimals == 0, ErrorCode::InvalidMint);
    require!(
        mint_data.mint_authority == COption::Some(bond.bond_authority),
        ErrorCode::InvalidMint
    );
    require_keys_eq!(vault_data.mint, mint.key(), ErrorCode::InvalidVault);
    require_keys_eq!(
        vault_data.owner,
        bond.bond_authority,
        ErrorCode::InvalidVault
    );
    require!(mint_data.supply == bond.issued, ErrorCode::SupplyMismatch);
    require!(vault_data.amount == bond.issued, ErrorCode::VaultMismatch);
    require!(
        registry.total_units == bond.outstanding && bond.outstanding == bond.issued,
        ErrorCode::PositionTotalMismatch
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn account_space_bounds() {
        assert_eq!(IssuerConfig::SPACE, 105);
        assert_eq!(BondAuthority::SPACE, 41);
        assert_eq!(RegistryState::SPACE, 50);
        assert_eq!(Position::SPACE, 81);
        assert!(Bond::SPACE >= 220);
    }
    #[test]
    fn maximum_holder_count_is_one_hundred() {
        assert_eq!(MAX_HOLDERS, 100);
    }
}
