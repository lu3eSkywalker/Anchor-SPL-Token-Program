import BN from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getAccount } from "@solana/spl-token";
import type { SplToken } from "../target/types/spl_token";

describe("Test", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SplToken as anchor.Program<SplToken>;
  
  const mintKeypair = new web3.Keypair();

  it("create a Token Mint", async () => {
    // Generate keypair for the new account

    const txHash = await program.methods
      .createTokenMint()
      .accounts({
        mint: mintKeypair.publicKey,
        payer: program.provider.publicKey,
        mintAuthority: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([mintKeypair])
      .rpc();

    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // Confirm transaction
    await program.provider.connection.confirmTransaction(txHash);
    console.log(
      "This is the mint public key: ",
      mintKeypair.publicKey.toString()
    );
  });

  it("create a associated token account and mint tokens", async () => {
    // Create an ATA
    const ata = await anchor.utils.token.associatedAddress({
      mint: mintKeypair.publicKey,
      owner: program.provider.publicKey,
    });

    const amount_to_mint = new BN(10_000_000_000);

    const txHash = await program.methods
      .mintTokens(amount_to_mint)
      .accounts({
        mint: mintKeypair.publicKey,
        tokenAccount: ata,
        payer: program.provider.publicKey,
        mintAuthority: program.provider.publicKey,
        recipient: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .signers([])
      .rpc();

    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // Confirm transaction
    await program.provider.connection.confirmTransaction(txHash);

    const account = await getAccount(program.provider.connection, ata);

    //Assertion
    assert.equal(account.amount.toString(), 10000000000);
  });

  it("transfer tokens", async () => {
    const amount_to_transfer = new BN(5_000_000_000);

    const senderATA = await anchor.utils.token.associatedAddress({
      mint: mintKeypair.publicKey,
      owner: program.provider.publicKey,
    });

    const receiverATA = await anchor.utils.token.associatedAddress({
      mint: mintKeypair.publicKey,
      owner: new web3.PublicKey("FoCbH4NR8xmCuDZyNCWQmfz9z82PmhWbmBoHZT1qbAD1"),
    });

    const receiverPublicKey = new web3.PublicKey(
      "FoCbH4NR8xmCuDZyNCWQmfz9z82PmhWbmBoHZT1qbAD1"
    );

    const txHash = await program.methods
      .transferTokens(amount_to_transfer)
      .accounts({
        sender: program.provider.publicKey,
        senderTokenAccount: senderATA,
        receiverTokenAccount: receiverATA,
        receiver: receiverPublicKey,
        mint: mintKeypair.publicKey,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .signers([])
      .rpc();

    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // Confirm transaction
    await program.provider.connection.confirmTransaction(txHash);

    const senderAccount = await getAccount(program.provider.connection, senderATA);
    const receiverAccount = await getAccount(program.provider.connection, receiverATA);
    // Assertions
    assert.equal(senderAccount.amount.toString(), 5000000000);
    assert.equal(receiverAccount.amount.toString(), 5000000000);
  });
  it("Burns the tokens", async () => {
    const userATA = await anchor.utils.token.associatedAddress({
      mint: mintKeypair.publicKey,
      owner: program.provider.publicKey,
    });

    const amount_to_burn = new BN(3_000_000_000);

    const txHash = await program.methods
      .burnTokens(amount_to_burn)
      .accounts({
        fromTokenAccount: userATA,
        mint: mintKeypair.publicKey,
        authority: program.provider.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([])
      .rpc();

    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // Confirm transaction
    await program.provider.connection.confirmTransaction(txHash);

    const account = await getAccount(program.provider.connection, userATA);

    // Assertion
    assert.equal(account.amount.toString(), 2000000000);

    console.log("This is the mintKeypair: ", mintKeypair.publicKey.toString());
  });
  it("adds metadata to the token", async () => {
    const TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
  
    const [metadataPDA] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        new web3.PublicKey(TOKEN_METADATA_PROGRAM_ID).toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      new web3.PublicKey(TOKEN_METADATA_PROGRAM_ID)
    );
  
    const tokenName = "Dogecoin";
    const tokenSymbol = "DOGE";
    const uri = "https://jsonkeeper.com/b/5HUH";
  
    const txHash = await program.methods
      .createTokenMetadata(tokenName, tokenSymbol, uri)
      .accounts({
        metadata: metadataPDA,
        mint: mintKeypair.publicKey,
        mintAuthority: program.provider.publicKey,
        payer: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenMetadataProgram: new web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
      })
      .signers([])
      .rpc();
  
    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);
  
    await program.provider.connection.confirmTransaction(txHash);
  });
  
});