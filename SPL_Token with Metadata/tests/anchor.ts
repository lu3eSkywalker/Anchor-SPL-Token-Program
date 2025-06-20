import * as anchor from "@coral-xyz/anchor";
import BN, { min } from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
// import type { StakeWithTokenReward } from "../target/types/stake_with_token_reward";
import { SplTokenMintAndMetadata } from "../target/types/spl_token_mint_and_metadata";

describe("Test", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .SplTokenMintAndMetadata as anchor.Program<SplTokenMintAndMetadata>;

  const METADATA_SEED = "metadata";
  const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

  const payer = program.provider.wallet.publicKey;
  // Mint PDA
  const [mint] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    program.programId
  );

  const [authority] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("authority")],
    program.programId
  );
  // Metadata PDA
  const [metadataAddress] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  it("creates a Token Mint", async () => {
    const metadata = {
      name: "Dogecoin",
      symbol: "DOGE",
      uri: "https://www.jsonkeeper.com/b/5HUH",
      decimals: 9,
    };

    const txHash = await program.methods
      .createTokenMint(metadata)
      .accounts({
        metadata: metadataAddress,
        mint: mint,
        authority: authority,
        payer: program.provider.publicKey,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID
      })
      .rpc();

    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);
  });

  it("mints token to a program owner", async () => {
    const tokens_to_mint = new BN(10_000_000_000);

    const destination = await anchor.utils.token.associatedAddress({
      mint: mint,
      owner: program.provider.publicKey
    });

    const txHash = await program.methods
      .mintTokens(tokens_to_mint)
      .accounts({
        mint,
        authority,
        destination,
        destinationOwner: program.provider.publicKey,
        payer: program.provider.publicKey,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .rpc();

    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // Confirm transaction
    await program.provider.connection.confirmTransaction(txHash);

    const userATA = await getAccount(program.provider.connection, destination);

    // Assertion
    assert.equal(userATA.amount.toString(), 10000000000);
  });


  it("mints token to a user", async () => {
    const tokens_to_mint = new BN(10_000_000_000);

    const userAddress = new web3.PublicKey("HVw1Z2KFYfKjdL2UThi5RGBvSUpsF4zdsPrucV8TggQm");

    const destination = await getAssociatedTokenAddress(
      mint,
      userAddress
    );

    // Create associated token account if it doesn't exist
    const ataIx = createAssociatedTokenAccountInstruction(
      program.provider.publicKey, // payer
      destination,                // ata to be created
      userAddress,                  // token account owner
      mint                        // mint
    );

    const tx = new web3.Transaction().add(ataIx);

    await program.provider.sendAndConfirm(tx);

    const txHash = await program.methods
      .mintTokens(tokens_to_mint)
      .accounts({
        mint,
        authority,
        destination,
        destinationOwner: userAddress,
        payer: program.provider.publicKey,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .rpc();

    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // Confirm transaction
    await program.provider.connection.confirmTransaction(txHash);

    const userATA = await getAccount(program.provider.connection, destination);

    // Assertion
    assert.equal(userATA.amount.toString(), 10000000000);
  });

  it("transfer the tokens", async () => {
    const tokens_to_transfer = new BN(5_000_000_000);

    const senderTokenAccount = await anchor.utils.token.associatedAddress({
      mint: mint,
      owner: program.provider.publicKey
    });

    const receiverAddress = new web3.PublicKey("5YLbUx2MGaHvSV1de5Kr1dVWPupbf63Mm5a9VhtvqoNt");

    const receiverDestination = await getAssociatedTokenAddress(
      mint,
      receiverAddress
    );

    const ataTx = createAssociatedTokenAccountInstruction(
      program.provider.publicKey,
      receiverDestination,
      receiverAddress,
      mint
    )

    const tx = new web3.Transaction().add(ataTx);

    await program.provider.sendAndConfirm(tx);

    const txHash = await program.methods
      .transferTokens(tokens_to_transfer)
      .accounts({
        sender: program.provider.publicKey,
        senderTokenAccount: senderTokenAccount,
        receiverTokenAccount: receiverDestination,
        receiver: receiverAddress,
        mint: mint,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .rpc();

      console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

      // Confirm transaction
      await program.provider.connection.confirmTransaction(txHash);

      const senderATA = await getAccount(program.provider.connection, senderTokenAccount);
      const receiverATA = await getAccount(program.provider.connection, receiverDestination);

      // Assertion
      assert.equal(senderATA.amount.toString(), 5000000000);
      assert.equal(receiverATA.amount.toString(), 5000000000);
  })

  it("burn the tokens", async () => {
    const tokens_to_burn = new BN(1_000_000_000);

    const fromTokenAccount = await anchor.utils.token.associatedAddress({
      mint,
      owner: program.provider.publicKey
    });

    const txHash = await program.methods
      .burnTokens(tokens_to_burn)
      .accounts({
        fromTokenAccount: fromTokenAccount,
        mint: mint,
        authority: program.provider.publicKey,
        tokenProgram: new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      })
      .rpc();

    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // Confirm transaction
    await program.provider.connection.confirmTransaction(txHash);

    const userATA = await getAccount(program.provider.connection, fromTokenAccount);

    // Assertion
    assert.equal(userATA.amount.toString(), 4000000000);
  });
});