use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::associated_token::{self, AssociatedToken};
use anchor_spl::token::{
    self, burn, mint_to, transfer, Burn, Mint, MintTo, Token, TokenAccount, Transfer,
};
use mpl_token_metadata::types::{DataV2, CollectionDetails};
use mpl_token_metadata::instructions::{
    CreateMetadataAccountV3, CreateMetadataAccountV3InstructionArgs,
};
use mpl_token_metadata::ID as TOKEN_METADATA_PROGRAM_ID;

// declare_id!("GzxTdMYV51xQkJ5DTzWXij2kXZMibXWCg6JZJULEouXS");
declare_id!("A1DwTAisxvTXSAKDFQnvtY1uVXjLgiuw2pYqQF2pk3VH");

#[program]
pub mod spl_token {
    use super::*;

    pub fn create_token_mint(ctx: Context<CreateTokenMint>) -> Result<()> {
        Ok(())
    }

    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        mint_to(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.receiver_token_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info()
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        let cpi_accounts = Burn {
            from: ctx.accounts.from_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

        burn(cpi_ctx, amount);
        Ok(())
    }
    
    pub fn create_token_metadata(
        ctx: Context<CreateTokenMetadata>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let accounts = ctx.accounts;
    
        // Step 1: Build the instruction
        let metadata_instruction = CreateMetadataAccountV3 {
            metadata: accounts.metadata.key(),
            mint: accounts.mint.key(),
            mint_authority: accounts.mint_authority.key(),
            payer: accounts.payer.key(),
            update_authority: (accounts.mint_authority.key(), true),
            system_program: accounts.system_program.key(),
            rent: Some(accounts.rent.key()),
        };
    
        // Step 2: Construct args with collection_details = None
        let args = CreateMetadataAccountV3InstructionArgs {
            data: DataV2 {
                name,
                symbol,
                uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            is_mutable: true,
            collection_details: None,
        };
    
        // Step 3: Build and invoke the instruction
        let ix = metadata_instruction.instruction(args);
    
        invoke(
            &ix,
            &[
                accounts.metadata.to_account_info(),
                accounts.mint.to_account_info(),
                accounts.mint_authority.to_account_info(),
                accounts.payer.to_account_info(),
                accounts.system_program.to_account_info(),
                accounts.rent.to_account_info(),
            ],
        )?;
    
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateTokenMint<'info> {
    #[account(
        init,
        payer = payer,
        mint::decimals = 9,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: This is a trusted PDA or external signer for minting; validated externally
    pub mint_authority: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = recipient,
    )]
    pub token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: This is a trusted PDA or external signer for minting; validated externally
    pub mint_authority: AccountInfo<'info>,

    /// CHECK: Only used for ATA derivation
    pub recipient: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = sender,
        associated_token::mint = mint,
        associated_token::authority = receiver,
    )]
    pub receiver_token_account: Account<'info, TokenAccount>,

    /// CHECK: Only used for ATA derivation
    pub receiver: AccountInfo<'info>,

    pub mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub from_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct CreateTokenMetadata<'info> {
    /// CHECK: This is a PDA derived from the metadata program, validated via address derivation
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub mint_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,


    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,   

    /// CHECK: Verified in client side
    pub token_metadata_program: UncheckedAccount<'info>, // keep this
}