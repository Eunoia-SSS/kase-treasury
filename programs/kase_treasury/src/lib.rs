use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program::{invoke, invoke_signed},
    program_option::COption,
    program_pack::Pack,
    system_instruction,
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
pub const SNAPSHOT: &[u8] = b"snapshot";
pub const SNAPSHOT_ENTRY: &[u8] = b"snapshot_entry";
pub const SETTLEMENT_CONFIG: &[u8] = b"settlement_config";
pub const COUPON: &[u8] = b"coupon";
pub const COUPON_AUTHORITY: &[u8] = b"coupon_authority";
pub const COUPON_VAULT: &[u8] = b"coupon_vault";
pub const CLAIM: &[u8] = b"coupon_claim";
pub const DSET_DECIMALS: u8 = 6;
pub const MAX_HOLDERS: usize = 100;
pub const MAX_SNAPSHOT_BATCH: u8 = 5;

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

    pub fn create_snapshot(
        ctx: Context<CreateSnapshot>,
        snapshot_id: [u8; 32],
        record_date_ts: i64,
    ) -> Result<()> {
        require!(snapshot_id != [0; 32], ErrorCode::InvalidSnapshotId);
        require!(
            ctx.accounts.bond.status == Status::IssuanceClosed,
            ErrorCode::IssuanceNotClosed
        );
        let clock = Clock::get()?;
        require!(
            record_date_ts >= clock.unix_timestamp,
            ErrorCode::RetroactiveSnapshot
        );
        let count = ctx.accounts.registry.count;
        let units = ctx.accounts.registry.total_units;
        require!(count > 0 && units > 0, ErrorCode::EmptySnapshot);
        require!(usize::from(count) <= MAX_HOLDERS, ErrorCode::RegistryFull);
        require!(
            ctx.accounts.bond.outstanding == units,
            ErrorCode::SnapshotTotalMismatch
        );
        check_closed_supply(
            &ctx.accounts.bond,
            &ctx.accounts.registry,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
        )?;

        let snapshot = &mut ctx.accounts.snapshot;
        snapshot.bond = ctx.accounts.bond.key();
        snapshot.snapshot_id = snapshot_id;
        snapshot.issuer = ctx.accounts.authority.key();
        snapshot.record_date_ts = record_date_ts;
        snapshot.created_at_ts = clock.unix_timestamp;
        snapshot.created_slot = clock.slot;
        snapshot.finalized_at_ts = 0;
        snapshot.finalized_slot = 0;
        snapshot.expected_holder_count = count;
        snapshot.processed_holder_count = 0;
        snapshot.next_index = 0;
        snapshot.expected_total_units = units;
        snapshot.total_units = 0;
        snapshot.status = SnapshotStatus::Scheduled;
        snapshot.bump = ctx.bumps.snapshot;
        emit!(SnapshotCreated {
            snapshot: snapshot.key(),
            bond: snapshot.bond,
            record_date_ts,
            expected_holder_count: count,
            expected_total_units: units,
        });
        Ok(())
    }

    pub fn process_snapshot_batch<'info>(
        ctx: Context<'_, '_, '_, 'info, ProcessSnapshotBatch<'info>>,
        start_index: u8,
        batch_size: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let snapshot = &ctx.accounts.snapshot;
        require!(
            snapshot.status != SnapshotStatus::Finalized,
            ErrorCode::SnapshotFinalized
        );
        require!(
            clock.unix_timestamp >= snapshot.record_date_ts,
            ErrorCode::SnapshotNotDue
        );
        require!(
            ctx.accounts.bond.status == Status::IssuanceClosed,
            ErrorCode::IssuanceNotClosed
        );
        require!(
            start_index == snapshot.next_index,
            ErrorCode::SnapshotIndexMismatch
        );
        require!(
            batch_size > 0 && batch_size <= MAX_SNAPSHOT_BATCH,
            ErrorCode::InvalidSnapshotBatch
        );
        let end_index = start_index
            .checked_add(batch_size)
            .ok_or(ErrorCode::Overflow)?;
        require!(
            end_index <= snapshot.expected_holder_count,
            ErrorCode::SnapshotIndexMismatch
        );
        let expected_accounts = usize::from(batch_size)
            .checked_mul(3)
            .ok_or(ErrorCode::Overflow)?;
        require!(
            ctx.remaining_accounts.len() == expected_accounts,
            ErrorCode::InvalidSnapshotBatch
        );
        require!(
            ctx.accounts.registry.count == snapshot.expected_holder_count,
            ErrorCode::SnapshotCountMismatch
        );
        require!(
            ctx.accounts.registry.total_units == snapshot.expected_total_units
                && ctx.accounts.bond.outstanding == snapshot.expected_total_units,
            ErrorCode::SnapshotTotalMismatch
        );
        check_closed_supply(
            &ctx.accounts.bond,
            &ctx.accounts.registry,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
        )?;

        let bond_key = ctx.accounts.bond.key();
        let snapshot_key = ctx.accounts.snapshot.key();
        let record_date_ts = ctx.accounts.snapshot.record_date_ts;
        let mut batch_units = 0u64;
        for offset in 0..batch_size {
            let index = start_index.checked_add(offset).ok_or(ErrorCode::Overflow)?;
            let base = usize::from(offset)
                .checked_mul(3)
                .ok_or(ErrorCode::Overflow)?;
            let registry_info = &ctx.remaining_accounts[base];
            let position_info = &ctx.remaining_accounts[base + 1];
            let snapshot_entry_info = &ctx.remaining_accounts[base + 2];

            let index_seed = [index];
            let expected_registry = Pubkey::find_program_address(
                &[REGISTRY_ENTRY, bond_key.as_ref(), &index_seed],
                ctx.program_id,
            )
            .0;
            require_keys_eq!(
                registry_info.key(),
                expected_registry,
                ErrorCode::InvalidRegistryEntry
            );
            require_keys_eq!(
                *registry_info.owner,
                *ctx.program_id,
                ErrorCode::InvalidRegistryEntry
            );
            let registered = read_registry_entry(registry_info)?;
            require_keys_eq!(registered.bond, bond_key, ErrorCode::InvalidRegistryEntry);
            require!(
                registered.index == index && registered.holder != Pubkey::default(),
                ErrorCode::InvalidRegistryEntry
            );

            let expected_position = Pubkey::find_program_address(
                &[POSITION, bond_key.as_ref(), registered.holder.as_ref()],
                ctx.program_id,
            )
            .0;
            require_keys_eq!(
                position_info.key(),
                expected_position,
                ErrorCode::InvalidPosition
            );
            require_keys_eq!(
                *position_info.owner,
                *ctx.program_id,
                ErrorCode::InvalidPosition
            );
            let position = read_position(position_info)?;
            require_keys_eq!(position.bond, bond_key, ErrorCode::InvalidPosition);
            require_keys_eq!(
                position.holder,
                registered.holder,
                ErrorCode::InvalidPosition
            );
            require!(position.units > 0, ErrorCode::InvalidPosition);

            let (expected_entry, entry_bump) = Pubkey::find_program_address(
                &[
                    SNAPSHOT_ENTRY,
                    snapshot_key.as_ref(),
                    registered.holder.as_ref(),
                ],
                ctx.program_id,
            );
            require_keys_eq!(
                snapshot_entry_info.key(),
                expected_entry,
                ErrorCode::InvalidSnapshotEntry
            );
            require!(
                snapshot_entry_info.is_writable,
                ErrorCode::InvalidSnapshotEntry
            );
            if *snapshot_entry_info.owner == *ctx.program_id {
                return err!(ErrorCode::DuplicateSnapshotEntry);
            }
            require_keys_eq!(
                *snapshot_entry_info.owner,
                System::id(),
                ErrorCode::InvalidSnapshotEntry
            );
            require!(
                snapshot_entry_info.data_is_empty(),
                ErrorCode::InvalidSnapshotEntry
            );

            batch_units = batch_units
                .checked_add(position.units)
                .ok_or(ErrorCode::Overflow)?;
            let entry = SnapshotEntry {
                snapshot: snapshot_key,
                bond: bond_key,
                holder: registered.holder,
                position: position_info.key(),
                registry_index: index,
                units: position.units,
                record_date_ts,
                recorded_at_ts: clock.unix_timestamp,
                recorded_slot: clock.slot,
                bump: entry_bump,
            };
            create_snapshot_entry(
                &ctx.accounts.cranker.to_account_info(),
                snapshot_entry_info,
                &ctx.accounts.system_program.to_account_info(),
                &entry,
            )?;
            emit!(SnapshotEntryRecorded {
                snapshot: snapshot_key,
                holder: registered.holder,
                registry_index: index,
                units: position.units,
            });
        }
        let snapshot = &mut ctx.accounts.snapshot;
        let processed = snapshot
            .processed_holder_count
            .checked_add(batch_size)
            .ok_or(ErrorCode::Overflow)?;
        let total = snapshot
            .total_units
            .checked_add(batch_units)
            .ok_or(ErrorCode::Overflow)?;
        require!(
            processed <= snapshot.expected_holder_count,
            ErrorCode::SnapshotCountMismatch
        );
        require!(
            total <= snapshot.expected_total_units,
            ErrorCode::SnapshotTotalMismatch
        );
        snapshot.next_index = end_index;
        snapshot.processed_holder_count = processed;
        snapshot.total_units = total;
        snapshot.status = SnapshotStatus::Processing;
        emit!(SnapshotBatchProcessed {
            snapshot: snapshot_key,
            start_index,
            processed_holder_count: processed,
            total_units: total,
        });
        Ok(())
    }

    pub fn finalize_snapshot(ctx: Context<FinalizeSnapshot>) -> Result<()> {
        let clock = Clock::get()?;
        let snapshot = &ctx.accounts.snapshot;
        require!(
            snapshot.status != SnapshotStatus::Finalized,
            ErrorCode::SnapshotFinalized
        );
        require!(
            clock.unix_timestamp >= snapshot.record_date_ts,
            ErrorCode::SnapshotNotDue
        );
        require!(
            snapshot.expected_holder_count > 0 && snapshot.expected_total_units > 0,
            ErrorCode::EmptySnapshot
        );
        require!(
            snapshot.processed_holder_count == snapshot.expected_holder_count
                && snapshot.next_index == snapshot.expected_holder_count,
            ErrorCode::SnapshotIncomplete
        );
        require!(
            snapshot.total_units == snapshot.expected_total_units,
            ErrorCode::SnapshotTotalMismatch
        );
        require!(
            ctx.accounts.registry.count == snapshot.expected_holder_count,
            ErrorCode::SnapshotCountMismatch
        );
        require!(
            ctx.accounts.registry.total_units == snapshot.expected_total_units
                && ctx.accounts.bond.outstanding == snapshot.expected_total_units,
            ErrorCode::SnapshotTotalMismatch
        );
        require!(
            ctx.accounts.bond.status == Status::IssuanceClosed,
            ErrorCode::IssuanceNotClosed
        );
        check_closed_supply(
            &ctx.accounts.bond,
            &ctx.accounts.registry,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
        )?;
        let snapshot = &mut ctx.accounts.snapshot;
        snapshot.status = SnapshotStatus::Finalized;
        snapshot.finalized_at_ts = clock.unix_timestamp;
        snapshot.finalized_slot = clock.slot;
        emit!(SnapshotFinalized {
            snapshot: snapshot.key(),
            bond: snapshot.bond,
            holder_count: snapshot.processed_holder_count,
            total_units: snapshot.total_units,
            finalized_at_ts: snapshot.finalized_at_ts,
            finalized_slot: snapshot.finalized_slot,
        });
        Ok(())
    }

    pub fn configure_settlement_mint(ctx: Context<ConfigureSettlementMint>) -> Result<()> {
        check_dset_mint(&ctx.accounts.settlement_mint)?;
        let settlement = &mut ctx.accounts.settlement_config;
        settlement.config = ctx.accounts.config.key();
        settlement.mint = ctx.accounts.settlement_mint.key();
        settlement.decimals = DSET_DECIMALS;
        settlement.bump = ctx.bumps.settlement_config;
        emit!(SettlementMintConfigured {
            config: settlement.config,
            mint: settlement.mint
        });
        Ok(())
    }

    pub fn create_coupon_period(
        ctx: Context<CreateCouponPeriod>,
        period_id: u64,
        record_date_ts: i64,
        payment_date_ts: i64,
    ) -> Result<()> {
        require!(
            ctx.accounts.bond.status == Status::IssuanceClosed,
            ErrorCode::IssuanceNotClosed
        );
        require!(
            ctx.accounts.snapshot.status == SnapshotStatus::Finalized,
            ErrorCode::SnapshotNotFinalized
        );
        require!(
            ctx.accounts.snapshot.bond == ctx.accounts.bond.key()
                && record_date_ts == ctx.accounts.snapshot.record_date_ts,
            ErrorCode::WrongSnapshot
        );
        let now = Clock::get()?.unix_timestamp;
        require!(record_date_ts <= now, ErrorCode::SnapshotNotDue);
        require!(
            payment_date_ts > record_date_ts && payment_date_ts >= now,
            ErrorCode::InvalidPaymentDate
        );
        require!(
            ctx.accounts.snapshot.total_units > 0
                && ctx.accounts.snapshot.expected_holder_count > 0
                && ctx.accounts.snapshot.total_units == ctx.accounts.bond.outstanding,
            ErrorCode::SnapshotTotalMismatch
        );
        require!(
            ctx.accounts.settlement_config.config == ctx.accounts.config.key()
                && ctx.accounts.settlement_config.mint == ctx.accounts.settlement_mint.key()
                && ctx.accounts.settlement_config.decimals == DSET_DECIMALS,
            ErrorCode::InvalidSettlementMint
        );
        check_dset_mint(&ctx.accounts.settlement_mint)?;
        let per = coupon_per_bond_base(&ctx.accounts.bond)?;
        let raw = u128::from(per)
            .checked_mul(u128::from(ctx.accounts.snapshot.total_units))
            .ok_or(ErrorCode::Overflow)?;
        let total = u64::try_from(raw).map_err(|_| error!(ErrorCode::Overflow))?;
        require!(total > 0, ErrorCode::ZeroCoupon);
        let ix = spl_token::instruction::initialize_account3(
            &spl_token::ID,
            &ctx.accounts.escrow.key(),
            &ctx.accounts.settlement_mint.key(),
            &ctx.accounts.coupon_authority.key(),
        )?;
        invoke(
            &ix,
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.settlement_mint.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;
        let coupon = &mut ctx.accounts.coupon;
        coupon.bond = ctx.accounts.bond.key();
        coupon.snapshot = ctx.accounts.snapshot.key();
        coupon.settlement_mint = ctx.accounts.settlement_mint.key();
        coupon.escrow = ctx.accounts.escrow.key();
        coupon.coupon_authority = ctx.accounts.coupon_authority.key();
        coupon.issuer = ctx.accounts.authority.key();
        coupon.period_id = period_id;
        coupon.record_date_ts = record_date_ts;
        coupon.payment_date_ts = payment_date_ts;
        coupon.coupon_per_bond_base = per;
        coupon.expected_total_base = total;
        coupon.funded_total_base = 0;
        coupon.paid_total_base = 0;
        coupon.claim_count = 0;
        coupon.status = CouponStatus::Created;
        coupon.bump = ctx.bumps.coupon;
        ctx.accounts.coupon_authority.coupon = coupon.key();
        ctx.accounts.coupon_authority.bump = ctx.bumps.coupon_authority;
        emit!(CouponPeriodCreated {
            coupon: coupon.key(),
            bond: coupon.bond,
            snapshot: coupon.snapshot,
            period_id,
            coupon_per_bond_base: per,
            expected_total_base: total,
            payment_date_ts
        });
        Ok(())
    }

    pub fn fund_coupon_period(ctx: Context<FundCouponPeriod>, amount: u64) -> Result<()> {
        let coupon = &ctx.accounts.coupon;
        require!(
            coupon.status == CouponStatus::Created,
            ErrorCode::InvalidTransition
        );
        require!(
            amount == coupon.expected_total_base && amount > 0,
            ErrorCode::FundingAmountMismatch
        );
        require!(
            ctx.accounts.bond.status == Status::IssuanceClosed
                && coupon.bond == ctx.accounts.bond.key(),
            ErrorCode::WrongBond
        );
        require!(
            ctx.accounts.settlement_config.config == ctx.accounts.config.key()
                && ctx.accounts.settlement_config.mint == coupon.settlement_mint,
            ErrorCode::InvalidSettlementMint
        );
        check_dset_mint(&ctx.accounts.settlement_mint)?;
        check_token_account(
            &ctx.accounts.source.to_account_info(),
            coupon.settlement_mint,
            ctx.accounts.authority.key(),
            ErrorCode::InvalidSettlementAccount,
        )?;
        check_coupon_escrow(&ctx.accounts.escrow, coupon, 0)?;
        let ix = spl_token::instruction::transfer(
            &spl_token::ID,
            &ctx.accounts.source.key(),
            &ctx.accounts.escrow.key(),
            &ctx.accounts.authority.key(),
            &[],
            amount,
        )?;
        invoke(
            &ix,
            &[
                ctx.accounts.source.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;
        let coupon = &mut ctx.accounts.coupon;
        coupon.funded_total_base = amount;
        coupon.status = CouponStatus::Funded;
        check_coupon_escrow(&ctx.accounts.escrow, coupon, 0)?;
        emit!(CouponPeriodFunded {
            coupon: coupon.key(),
            funded_total_base: amount
        });
        Ok(())
    }

    pub fn claim_coupon(ctx: Context<ClaimCoupon>) -> Result<()> {
        let coupon = &ctx.accounts.coupon;
        require!(
            coupon.status == CouponStatus::Funded,
            ErrorCode::CouponNotFunded
        );
        require!(
            Clock::get()?.unix_timestamp >= coupon.payment_date_ts,
            ErrorCode::PaymentNotDue
        );
        require!(
            ctx.accounts.snapshot.status == SnapshotStatus::Finalized
                && ctx.accounts.snapshot.key() == coupon.snapshot
                && ctx.accounts.snapshot.bond == coupon.bond,
            ErrorCode::WrongSnapshot
        );
        require!(
            ctx.accounts.bond.key() == coupon.bond
                && ctx.accounts.bond.status == Status::IssuanceClosed,
            ErrorCode::WrongBond
        );
        require!(
            ctx.accounts.snapshot_entry.snapshot == coupon.snapshot
                && ctx.accounts.snapshot_entry.bond == coupon.bond
                && ctx.accounts.snapshot_entry.holder == ctx.accounts.holder.key()
                && ctx.accounts.snapshot_entry.units > 0,
            ErrorCode::IneligibleHolder
        );
        require!(
            ctx.accounts.settlement_config.config == ctx.accounts.config.key()
                && ctx.accounts.settlement_config.mint == coupon.settlement_mint,
            ErrorCode::InvalidSettlementMint
        );
        check_dset_mint(&ctx.accounts.settlement_mint)?;
        check_token_account(
            &ctx.accounts.destination.to_account_info(),
            coupon.settlement_mint,
            ctx.accounts.holder.key(),
            ErrorCode::InvalidDestination,
        )?;
        let raw = u128::from(coupon.coupon_per_bond_base)
            .checked_mul(u128::from(ctx.accounts.snapshot_entry.units))
            .ok_or(ErrorCode::Overflow)?;
        let amount = u64::try_from(raw).map_err(|_| error!(ErrorCode::Overflow))?;
        require!(amount > 0, ErrorCode::ZeroCoupon);
        let paid = coupon
            .paid_total_base
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        require!(
            paid <= coupon.funded_total_base,
            ErrorCode::InsufficientReserve
        );
        check_coupon_escrow(&ctx.accounts.escrow, coupon, amount)?;
        let bump = [ctx.accounts.coupon_authority.bump];
        let key = coupon.key();
        let seeds: &[&[u8]] = &[COUPON_AUTHORITY, key.as_ref(), &bump];
        let ix = spl_token::instruction::transfer(
            &spl_token::ID,
            &ctx.accounts.escrow.key(),
            &ctx.accounts.destination.key(),
            &ctx.accounts.coupon_authority.key(),
            &[],
            amount,
        )?;
        invoke_signed(
            &ix,
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.destination.to_account_info(),
                ctx.accounts.coupon_authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
            &[seeds],
        )?;
        let clock = Clock::get()?;
        let record = &mut ctx.accounts.claim_record;
        record.coupon = key;
        record.holder = ctx.accounts.holder.key();
        record.amount_base = amount;
        record.paid_at_ts = clock.unix_timestamp;
        record.paid_slot = clock.slot;
        record.bump = ctx.bumps.claim_record;
        let coupon = &mut ctx.accounts.coupon;
        coupon.paid_total_base = paid;
        coupon.claim_count = coupon
            .claim_count
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
        if paid == coupon.expected_total_base {
            coupon.status = CouponStatus::Complete;
        }
        check_coupon_escrow(&ctx.accounts.escrow, coupon, 0)?;
        emit!(CouponClaimed {
            coupon: key,
            holder: record.holder,
            amount_base: amount,
            paid_total_base: paid
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ConfigureSettlementMint<'info> {
    #[account(seeds=[ISSUER, config.id.as_ref()], bump=config.bump, has_one=authority)]
    pub config: Account<'info, IssuerConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer=authority, space=SettlementConfig::SPACE, seeds=[SETTLEMENT_CONFIG, config.key().as_ref()], bump)]
    pub settlement_config: Account<'info, SettlementConfig>,
    /// CHECK: validated as classic SPL mint with six decimals.
    pub settlement_mint: UncheckedAccount<'info>,
    #[account(address=spl_token::ID)]
    /// CHECK: canonical classic SPL Token Program.
    pub token_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(period_id: u64)]
pub struct CreateCouponPeriod<'info> {
    #[account(seeds=[ISSUER, config.id.as_ref()], bump=config.bump, has_one=authority)]
    pub config: Account<'info, IssuerConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds=[BOND, config.key().as_ref(), bond.id.as_ref()], bump=bond.bump, has_one=config)]
    pub bond: Account<'info, Bond>,
    #[account(seeds=[SNAPSHOT, bond.key().as_ref(), snapshot.snapshot_id.as_ref()], bump=snapshot.bump, has_one=bond)]
    pub snapshot: Account<'info, RecordDateSnapshot>,
    #[account(seeds=[SETTLEMENT_CONFIG, config.key().as_ref()], bump=settlement_config.bump, has_one=config)]
    pub settlement_config: Account<'info, SettlementConfig>,
    #[account(address=settlement_config.mint)]
    /// CHECK: validated classic SPL mint.
    pub settlement_mint: UncheckedAccount<'info>,
    #[account(init, payer=authority, space=CouponPeriod::SPACE, seeds=[COUPON, bond.key().as_ref(), &period_id.to_le_bytes()], bump)]
    pub coupon: Account<'info, CouponPeriod>,
    #[account(init, payer=authority, space=CouponAuthority::SPACE, seeds=[COUPON_AUTHORITY, coupon.key().as_ref()], bump)]
    pub coupon_authority: Account<'info, CouponAuthority>,
    #[account(init, payer=authority, owner=spl_token::ID, space=SplAccount::LEN, seeds=[COUPON_VAULT, coupon.key().as_ref()], bump)]
    /// CHECK: initialized as token account controlled by coupon authority PDA.
    pub escrow: UncheckedAccount<'info>,
    #[account(address=spl_token::ID)]
    /// CHECK: canonical classic SPL Token Program.
    pub token_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct FundCouponPeriod<'info> {
    #[account(seeds=[ISSUER, config.id.as_ref()], bump=config.bump, has_one=authority)]
    pub config: Account<'info, IssuerConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds=[BOND, bond.config.as_ref(), bond.id.as_ref()], bump=bond.bump, has_one=config)]
    pub bond: Account<'info, Bond>,
    #[account(mut, seeds=[COUPON, bond.key().as_ref(), &coupon.period_id.to_le_bytes()], bump=coupon.bump, has_one=bond)]
    pub coupon: Account<'info, CouponPeriod>,
    #[account(seeds=[SETTLEMENT_CONFIG, config.key().as_ref()], bump=settlement_config.bump, has_one=config)]
    pub settlement_config: Account<'info, SettlementConfig>,
    #[account(address=coupon.settlement_mint)]
    /// CHECK: validated registered settlement mint.
    pub settlement_mint: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: validated token account owned by issuer.
    pub source: UncheckedAccount<'info>,
    #[account(mut, address=coupon.escrow)]
    /// CHECK: validated escrow mint, authority and balance.
    pub escrow: UncheckedAccount<'info>,
    #[account(address=spl_token::ID)]
    /// CHECK: canonical classic SPL Token Program.
    pub token_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ClaimCoupon<'info> {
    #[account(seeds=[ISSUER, config.id.as_ref()], bump=config.bump)]
    pub config: Account<'info, IssuerConfig>,
    #[account(seeds=[BOND, bond.config.as_ref(), bond.id.as_ref()], bump=bond.bump, has_one=config)]
    pub bond: Account<'info, Bond>,
    #[account(mut, seeds=[COUPON, bond.key().as_ref(), &coupon.period_id.to_le_bytes()], bump=coupon.bump, has_one=bond)]
    pub coupon: Account<'info, CouponPeriod>,
    #[account(seeds=[SNAPSHOT, bond.key().as_ref(), snapshot.snapshot_id.as_ref()], bump=snapshot.bump, has_one=bond)]
    pub snapshot: Account<'info, RecordDateSnapshot>,
    pub holder: Signer<'info>,
    #[account(seeds=[SNAPSHOT_ENTRY, snapshot.key().as_ref(), holder.key().as_ref()], bump=snapshot_entry.bump)]
    pub snapshot_entry: Account<'info, SnapshotEntry>,
    #[account(seeds=[SETTLEMENT_CONFIG, config.key().as_ref()], bump=settlement_config.bump, has_one=config)]
    pub settlement_config: Account<'info, SettlementConfig>,
    #[account(address=coupon.settlement_mint)]
    /// CHECK: validated registered settlement mint.
    pub settlement_mint: UncheckedAccount<'info>,
    #[account(seeds=[COUPON_AUTHORITY, coupon.key().as_ref()], bump=coupon_authority.bump, constraint=coupon_authority.coupon == coupon.key() @ ErrorCode::WrongAuthority)]
    pub coupon_authority: Account<'info, CouponAuthority>,
    #[account(mut, address=coupon.escrow)]
    /// CHECK: validates escrow token state and accounting.
    pub escrow: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: validated as token account owned by holder with configured mint.
    pub destination: UncheckedAccount<'info>,
    #[account(init, payer=payer, space=ClaimRecord::SPACE, seeds=[CLAIM, coupon.key().as_ref(), holder.key().as_ref()], bump)]
    pub claim_record: Account<'info, ClaimRecord>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(address=spl_token::ID)]
    /// CHECK: canonical classic SPL Token Program.
    pub token_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
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

#[derive(Accounts)]
#[instruction(snapshot_id: [u8; 32])]
pub struct CreateSnapshot<'info> {
    #[account(seeds=[ISSUER, config.id.as_ref()], bump=config.bump, has_one=authority)]
    pub config: Account<'info, IssuerConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds=[BOND, config.key().as_ref(), bond.id.as_ref()], bump=bond.bump, has_one=config, has_one=mint, has_one=vault, has_one=bond_authority)]
    pub bond: Account<'info, Bond>,
    #[account(seeds=[REGISTRY, bond.key().as_ref()], bump=bond.registry_bump, has_one=bond)]
    pub registry: Account<'info, RegistryState>,
    #[account(init, payer=authority, space=RecordDateSnapshot::SPACE, seeds=[SNAPSHOT, bond.key().as_ref(), snapshot_id.as_ref()], bump)]
    pub snapshot: Account<'info, RecordDateSnapshot>,
    #[account(seeds=[AUTH, bond.key().as_ref()], bump=bond.authority_bump, constraint=bond_authority.bond == bond.key() @ ErrorCode::WrongAuthority)]
    pub bond_authority: Account<'info, BondAuthority>,
    #[account(address=bond.mint)]
    /// CHECK: Closed-mint custody is manually validated against SPL owner, decimals, supply and revoked authority.
    pub mint: UncheckedAccount<'info>,
    #[account(address=bond.vault)]
    /// CHECK: Closed-vault custody is manually validated against SPL owner, mint, balance and PDA authority.
    pub vault: UncheckedAccount<'info>,
    #[account(address = spl_token::ID)]
    /// CHECK: The account address is constrained to the canonical classic SPL Token Program ID.
    pub token_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ProcessSnapshotBatch<'info> {
    #[account(mut, seeds=[SNAPSHOT, bond.key().as_ref(), snapshot.snapshot_id.as_ref()], bump=snapshot.bump, has_one=bond)]
    pub snapshot: Account<'info, RecordDateSnapshot>,
    #[account(seeds=[BOND, bond.config.as_ref(), bond.id.as_ref()], bump=bond.bump, has_one=mint, has_one=vault, has_one=bond_authority)]
    pub bond: Account<'info, Bond>,
    #[account(seeds=[REGISTRY, bond.key().as_ref()], bump=bond.registry_bump, has_one=bond)]
    pub registry: Account<'info, RegistryState>,
    #[account(seeds=[AUTH, bond.key().as_ref()], bump=bond.authority_bump, constraint=bond_authority.bond == bond.key() @ ErrorCode::WrongAuthority)]
    pub bond_authority: Account<'info, BondAuthority>,
    #[account(address=bond.mint)]
    /// CHECK: Closed-mint custody is manually validated against SPL owner, decimals, supply and revoked authority.
    pub mint: UncheckedAccount<'info>,
    #[account(address=bond.vault)]
    /// CHECK: Closed-vault custody is manually validated against SPL owner, mint, balance and PDA authority.
    pub vault: UncheckedAccount<'info>,
    #[account(address = spl_token::ID)]
    /// CHECK: The account address is constrained to the canonical classic SPL Token Program ID.
    pub token_program: UncheckedAccount<'info>,
    #[account(mut)]
    pub cranker: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeSnapshot<'info> {
    #[account(mut, seeds=[SNAPSHOT, bond.key().as_ref(), snapshot.snapshot_id.as_ref()], bump=snapshot.bump, has_one=bond)]
    pub snapshot: Account<'info, RecordDateSnapshot>,
    #[account(seeds=[BOND, bond.config.as_ref(), bond.id.as_ref()], bump=bond.bump, has_one=mint, has_one=vault, has_one=bond_authority)]
    pub bond: Account<'info, Bond>,
    #[account(seeds=[REGISTRY, bond.key().as_ref()], bump=bond.registry_bump, has_one=bond)]
    pub registry: Account<'info, RegistryState>,
    #[account(seeds=[AUTH, bond.key().as_ref()], bump=bond.authority_bump, constraint=bond_authority.bond == bond.key() @ ErrorCode::WrongAuthority)]
    pub bond_authority: Account<'info, BondAuthority>,
    #[account(address=bond.mint)]
    /// CHECK: Closed-mint custody is manually validated against SPL owner, decimals, supply and revoked authority.
    pub mint: UncheckedAccount<'info>,
    #[account(address=bond.vault)]
    /// CHECK: Closed-vault custody is manually validated against SPL owner, mint, balance and PDA authority.
    pub vault: UncheckedAccount<'info>,
    #[account(address = spl_token::ID)]
    /// CHECK: The account address is constrained to the canonical classic SPL Token Program ID.
    pub token_program: UncheckedAccount<'info>,
    pub finalizer: Signer<'info>,
}

#[account]
pub struct SettlementConfig {
    pub config: Pubkey,
    pub mint: Pubkey,
    pub decimals: u8,
    pub bump: u8,
}
impl SettlementConfig {
    pub const SPACE: usize = 74;
}

#[account]
pub struct CouponAuthority {
    pub coupon: Pubkey,
    pub bump: u8,
}
impl CouponAuthority {
    pub const SPACE: usize = 41;
}

#[account]
pub struct CouponPeriod {
    pub bond: Pubkey,
    pub snapshot: Pubkey,
    pub settlement_mint: Pubkey,
    pub escrow: Pubkey,
    pub coupon_authority: Pubkey,
    pub issuer: Pubkey,
    pub period_id: u64,
    pub record_date_ts: i64,
    pub payment_date_ts: i64,
    pub coupon_per_bond_base: u64,
    pub expected_total_base: u64,
    pub funded_total_base: u64,
    pub paid_total_base: u64,
    pub claim_count: u8,
    pub status: CouponStatus,
    pub bump: u8,
}
impl CouponPeriod {
    pub const SPACE: usize = 264;
}

#[account]
pub struct ClaimRecord {
    pub coupon: Pubkey,
    pub holder: Pubkey,
    pub amount_base: u64,
    pub paid_at_ts: i64,
    pub paid_slot: u64,
    pub bump: u8,
}
impl ClaimRecord {
    pub const SPACE: usize = 97;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum CouponStatus {
    Created,
    Funded,
    Complete,
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

#[account]
pub struct RecordDateSnapshot {
    pub bond: Pubkey,
    pub snapshot_id: [u8; 32],
    pub issuer: Pubkey,
    pub record_date_ts: i64,
    pub created_at_ts: i64,
    pub created_slot: u64,
    pub finalized_at_ts: i64,
    pub finalized_slot: u64,
    pub expected_holder_count: u8,
    pub processed_holder_count: u8,
    pub next_index: u8,
    pub expected_total_units: u64,
    pub total_units: u64,
    pub status: SnapshotStatus,
    pub bump: u8,
}
impl RecordDateSnapshot {
    pub const SPACE: usize = 176;
}

#[account]
pub struct SnapshotEntry {
    pub snapshot: Pubkey,
    pub bond: Pubkey,
    pub holder: Pubkey,
    pub position: Pubkey,
    pub registry_index: u8,
    pub units: u64,
    pub record_date_ts: i64,
    pub recorded_at_ts: i64,
    pub recorded_slot: u64,
    pub bump: u8,
}
impl SnapshotEntry {
    pub const SPACE: usize = 176;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SnapshotStatus {
    Scheduled,
    Processing,
    Finalized,
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
pub struct SettlementMintConfigured {
    pub config: Pubkey,
    pub mint: Pubkey,
}
#[event]
pub struct CouponPeriodCreated {
    pub coupon: Pubkey,
    pub bond: Pubkey,
    pub snapshot: Pubkey,
    pub period_id: u64,
    pub coupon_per_bond_base: u64,
    pub expected_total_base: u64,
    pub payment_date_ts: i64,
}
#[event]
pub struct CouponPeriodFunded {
    pub coupon: Pubkey,
    pub funded_total_base: u64,
}
#[event]
pub struct CouponClaimed {
    pub coupon: Pubkey,
    pub holder: Pubkey,
    pub amount_base: u64,
    pub paid_total_base: u64,
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

#[event]
pub struct SnapshotCreated {
    pub snapshot: Pubkey,
    pub bond: Pubkey,
    pub record_date_ts: i64,
    pub expected_holder_count: u8,
    pub expected_total_units: u64,
}
#[event]
pub struct SnapshotEntryRecorded {
    pub snapshot: Pubkey,
    pub holder: Pubkey,
    pub registry_index: u8,
    pub units: u64,
}
#[event]
pub struct SnapshotBatchProcessed {
    pub snapshot: Pubkey,
    pub start_index: u8,
    pub processed_holder_count: u8,
    pub total_units: u64,
}
#[event]
pub struct SnapshotFinalized {
    pub snapshot: Pubkey,
    pub bond: Pubkey,
    pub holder_count: u8,
    pub total_units: u64,
    pub finalized_at_ts: i64,
    pub finalized_slot: u64,
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
    #[msg("Snapshot identifier cannot be zero.")]
    InvalidSnapshotId,
    #[msg("A snapshot requires a closed, immutable issuance.")]
    IssuanceNotClosed,
    #[msg("Record date cannot be in the past when snapshot is created.")]
    RetroactiveSnapshot,
    #[msg("Snapshot requires at least one registered holder and one bond unit.")]
    EmptySnapshot,
    #[msg("Snapshot record date has not arrived.")]
    SnapshotNotDue,
    #[msg("Snapshot has already been finalized.")]
    SnapshotFinalized,
    #[msg("Snapshot batch size is zero, too large, or has an incorrect account list.")]
    InvalidSnapshotBatch,
    #[msg("Snapshot batch start index is not the next required registry index.")]
    SnapshotIndexMismatch,
    #[msg("Registry entry account is invalid for this bond and index.")]
    InvalidRegistryEntry,
    #[msg("Position account is invalid for the registry holder.")]
    InvalidPosition,
    #[msg("Snapshot entry PDA or account is invalid.")]
    InvalidSnapshotEntry,
    #[msg("A snapshot entry already exists for this holder.")]
    DuplicateSnapshotEntry,
    #[msg("Snapshot holder count does not match the registry.")]
    SnapshotCountMismatch,
    #[msg("Snapshot total does not match the frozen registry supply.")]
    SnapshotTotalMismatch,
    #[msg("Snapshot cannot be finalized before every holder has been processed.")]
    SnapshotIncomplete,
    #[msg("Lifecycle transition is invalid or repeated.")]
    InvalidTransition,
    #[msg("Snapshot must be finalized.")]
    SnapshotNotFinalized,
    #[msg("Coupon references a different snapshot.")]
    WrongSnapshot,
    #[msg("Payment date must be on or after record date and current chain time.")]
    InvalidPaymentDate,
    #[msg("Settlement mint must be classic SPL with six decimals.")]
    InvalidSettlementMint,
    #[msg("Coupon rounds to zero settlement base units.")]
    ZeroCoupon,
    #[msg("Funding must exactly equal the coupon reserve.")]
    FundingAmountMismatch,
    #[msg("Coupon is not fully funded.")]
    CouponNotFunded,
    #[msg("Coupon payment date has not arrived.")]
    PaymentNotDue,
    #[msg("Bond account does not match coupon.")]
    WrongBond,
    #[msg("Snapshot entry does not establish holder eligibility.")]
    IneligibleHolder,
    #[msg("Settlement source token account is invalid.")]
    InvalidSettlementAccount,
    #[msg("Destination must be a token account owned by the holder.")]
    InvalidDestination,
    #[msg("Coupon reserve is insufficient.")]
    InsufficientReserve,
}

fn check_dset_mint(mint: &UncheckedAccount) -> Result<()> {
    require_keys_eq!(*mint.owner, spl_token::ID, ErrorCode::InvalidSettlementMint);
    let data = SplMint::unpack(&mint.try_borrow_data()?)
        .map_err(|_| error!(ErrorCode::InvalidSettlementMint))?;
    require!(
        data.decimals == DSET_DECIMALS,
        ErrorCode::InvalidSettlementMint
    );
    Ok(())
}
fn check_token_account(
    info: &AccountInfo<'_>,
    mint: Pubkey,
    owner: Pubkey,
    error_code: ErrorCode,
) -> Result<()> {
    if *info.owner != spl_token::ID {
        return Err(error!(error_code));
    }
    let data = SplAccount::unpack(&info.try_borrow_data()?).map_err(|_| error!(error_code))?;
    if data.state != spl_token::state::AccountState::Initialized
        || data.mint != mint
        || data.owner != owner
    {
        return Err(error!(error_code));
    }
    Ok(())
}
fn check_coupon_escrow(
    escrow: &UncheckedAccount,
    coupon: &CouponPeriod,
    outgoing: u64,
) -> Result<()> {
    require_keys_eq!(escrow.key(), coupon.escrow, ErrorCode::InvalidVault);
    require_keys_eq!(*escrow.owner, spl_token::ID, ErrorCode::InvalidVault);
    let data = SplAccount::unpack(&escrow.try_borrow_data()?)
        .map_err(|_| error!(ErrorCode::InvalidVault))?;
    require!(
        data.state == spl_token::state::AccountState::Initialized,
        ErrorCode::InvalidVault
    );
    require_keys_eq!(data.mint, coupon.settlement_mint, ErrorCode::InvalidVault);
    require_keys_eq!(
        data.owner,
        coupon.coupon_authority,
        ErrorCode::WrongAuthority
    );
    let accounted = coupon
        .funded_total_base
        .checked_sub(coupon.paid_total_base)
        .ok_or(ErrorCode::Overflow)?;
    require!(
        data.amount == accounted && outgoing <= data.amount,
        ErrorCode::InsufficientReserve
    );
    Ok(())
}
fn coupon_per_bond_base(bond: &Bond) -> Result<u64> {
    let periods_per_year: u128 = match bond.frequency {
        CouponFrequency::Semiannual => 2,
    };
    let numerator = u128::from(bond.face_value_base)
        .checked_mul(u128::from(bond.annual_coupon_bps))
        .ok_or(ErrorCode::Overflow)?;
    let denominator = 10_000u128
        .checked_mul(periods_per_year)
        .ok_or(ErrorCode::Overflow)?;
    u64::try_from(numerator / denominator).map_err(|_| error!(ErrorCode::Overflow))
}

fn read_registry_entry(info: &AccountInfo<'_>) -> Result<RegistryEntry> {
    let data = info.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    RegistryEntry::try_deserialize(&mut slice).map_err(|_| error!(ErrorCode::InvalidRegistryEntry))
}

fn read_position(info: &AccountInfo<'_>) -> Result<Position> {
    let data = info.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    Position::try_deserialize(&mut slice).map_err(|_| error!(ErrorCode::InvalidPosition))
}

fn create_snapshot_entry<'info>(
    payer: &AccountInfo<'info>,
    target: &AccountInfo<'info>,
    system: &AccountInfo<'info>,
    entry: &SnapshotEntry,
) -> Result<()> {
    let bump_seed = [entry.bump];
    let seeds: &[&[u8]] = &[
        SNAPSHOT_ENTRY,
        entry.snapshot.as_ref(),
        entry.holder.as_ref(),
        &bump_seed,
    ];
    let minimum = Rent::get()?.minimum_balance(SnapshotEntry::SPACE);
    if target.lamports() == 0 {
        let ix = system_instruction::create_account(
            &payer.key(),
            &target.key(),
            minimum,
            SnapshotEntry::SPACE as u64,
            &crate::ID,
        );
        invoke_signed(
            &ix,
            &[payer.clone(), target.clone(), system.clone()],
            &[seeds],
        )?;
    } else {
        let shortfall = minimum.saturating_sub(target.lamports());
        if shortfall > 0 {
            invoke(
                &system_instruction::transfer(&payer.key(), &target.key(), shortfall),
                &[payer.clone(), target.clone(), system.clone()],
            )?;
        }
        invoke_signed(
            &system_instruction::allocate(&target.key(), SnapshotEntry::SPACE as u64),
            &[target.clone(), system.clone()],
            &[seeds],
        )?;
        invoke_signed(
            &system_instruction::assign(&target.key(), &crate::ID),
            &[target.clone(), system.clone()],
            &[seeds],
        )?;
    }
    let mut data = target.try_borrow_mut_data()?;
    let mut destination: &mut [u8] = &mut data;
    entry.try_serialize(&mut destination)?;
    Ok(())
}

fn check_closed_supply(
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
        mint_data.mint_authority == COption::None,
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
        assert_eq!(RecordDateSnapshot::SPACE, 176);
        assert_eq!(SnapshotEntry::SPACE, 176);
        assert_eq!(SettlementConfig::SPACE, 74);
        assert_eq!(CouponAuthority::SPACE, 41);
        assert_eq!(CouponPeriod::SPACE, 264);
        assert_eq!(ClaimRecord::SPACE, 97);
        assert!(Bond::SPACE >= 220);
    }
    #[test]
    fn maximum_holder_count_is_one_hundred() {
        assert_eq!(MAX_HOLDERS, 100);
    }
}
