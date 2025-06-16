import BN from "bn.js";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
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

    const amount_to_mint = new BN(1_000_000_000);

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
    console.log("This is the associated token account: ", ata.toBase58());
  });
});
