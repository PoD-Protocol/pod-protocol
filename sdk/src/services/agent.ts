import { PublicKey, Signer } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
const { BN } = anchor;
import { BaseService } from "./base";
import { AgentAccount, CreateAgentOptions, UpdateAgentOptions } from "../types";
import { findAgentPDA, retry, getAccountLastUpdated } from "../utils";
import { z } from "zod";
import { ValidationError, AppError } from "../errors";

const AgentRegistrationSchema = z.object({
  name: z.string().min(3),
  metadataUri: z.string().url(),
  capabilities: z.array(z.string()).nonempty(),
});

const MetadataSchema = z.object({}).passthrough();

function capabilitiesToBitmask(caps: string[]): number {
  const map: Record<string, number> = {
    TRADING: 1,
    ANALYSIS: 2,
    DATA_PROCESSING: 4,
    CONTENT_GENERATION: 8,
    CUSTOM_1: 16,
    CUSTOM_2: 32,
    CUSTOM_3: 64,
    CUSTOM_4: 128,
  };
  return caps.reduce((acc, c) => {
    const bit = map[c.toUpperCase()];
    return bit ? acc | bit : acc;
  }, 0);
}

/**
 * Agent-related operations service
 */
export class AgentService extends BaseService {
  async registerAgent(
    wallet: Signer,
    options: any,
  ): Promise<string> {
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    return retry(async () => {
      // Always prefer using the pre-initialized program if available
      let program;
      if (this.program) {
        // Program was pre-initialized with the wallet - use it directly
        program = this.program;
      } else {
        // This should not happen if client.initialize(wallet) was called properly
        throw new AppError(
          "NO_PROGRAM",
          500,
          "No program instance available. Ensure client.initialize(wallet) was called successfully.",
        );
      }

      try {
        const result = AgentRegistrationSchema.safeParse(options);
        if (!result.success) throw new ValidationError(result.error.issues);
        const meta = await fetch(result.data.metadataUri).then((r) => r.json());
        const metaRes = MetadataSchema.safeParse(meta);
        if (!metaRes.success) throw new ValidationError(metaRes.error.issues);
        const caps = capabilitiesToBitmask(result.data.capabilities);

        const tx = await (program.methods as any)
          .registerAgent(new BN(caps), result.data.metadataUri)
          .accounts({
            agentAccount: agentPDA,
            signer: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        return tx;
      } catch (error: any) {
        // Provide more specific error messages
        if (error.message?.includes("Account does not exist")) {
          throw new AppError(
            "ACCOUNT_NOT_FOUND",
            404,
            "Program account not found. Verify the program is deployed and the program ID is correct.",
          );
        }
        if (error.message?.includes("insufficient funds")) {
          throw new AppError(
            "INSUFFICIENT_FUNDS",
            400,
            "Insufficient SOL balance to pay for transaction fees and rent.",
          );
        }
        if (error.message?.includes("custom program error")) {
          throw new AppError(
            "PROGRAM_ERROR",
            500,
            `Program error: ${error.message}. Check program logs for details.`,
          );
        }
        throw new AppError(
          "AGENT_REGISTRATION_FAILED",
          500,
          `Agent registration failed: ${error.message}`,
        );
      }
    });
  }

  async updateAgent(
    wallet: Signer,
    options: UpdateAgentOptions,
  ): Promise<string> {
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    return retry(async () => {
      // Use the program if it was initialized with a wallet, otherwise create a fresh one
      let program;
      if (this.program) {
        // Program was pre-initialized with the wallet
        program = this.program;
      } else {
        // Fallback: create a fresh provider with the actual wallet for this transaction
        const provider = new anchor.AnchorProvider(
          this.connection,
          wallet as any,
          {
            commitment: this.commitment,
            skipPreflight: true,
          },
        );

        // Get the IDL directly (no dummy wallet involved)
        const idl = this.ensureIDL();

        // Create a new program instance with the proper wallet
        program = new anchor.Program(idl, provider);
      }

      const tx = await (program.methods as any)
        .updateAgent(
          options.capabilities !== undefined
            ? new BN(options.capabilities)
            : null,
          options.metadataUri !== undefined ? options.metadataUri : null,
        )
        .accounts({
          agentAccount: agentPDA,
          signer: wallet.publicKey,
        })
        .rpc();

      return tx;
    });
  }

  async getAgent(walletPublicKey: PublicKey): Promise<AgentAccount | null> {
    const [agentPDA] = findAgentPDA(walletPublicKey, this.programId);

    try {
      // Use the program if it was initialized, otherwise create a temporary one
      let program;
      if (this.program) {
        // Program was pre-initialized, use it
        program = this.program;
      } else {
        // For read operations, create a temporary program with a dummy wallet
        const dummyWallet = {
          publicKey: anchor.web3.PublicKey.default,
          signTransaction: async () => {
            throw new AppError("READ_ONLY", 400, "Read-only");
          },
          signAllTransactions: async () => {
            throw new AppError("READ_ONLY", 400, "Read-only");
          },
        };

        const provider = new anchor.AnchorProvider(
          this.connection,
          dummyWallet,
          {
            commitment: this.commitment,
          },
        );

        const idl = this.ensureIDL();
        program = new anchor.Program(idl, provider);
      }

      const agentAccount = this.getAccount("agentAccount");
      const account = await agentAccount.fetch(agentPDA);
      return {
        pubkey: agentPDA,
        capabilities: account.capabilities.toNumber(),
        metadataUri: account.metadataUri,
        reputation: account.reputation?.toNumber() || 0,
        lastUpdated: getAccountLastUpdated(account),
        bump: account.bump,
      };
    } catch (error: any) {
      if (error?.message?.includes("Account does not exist")) {
        return null;
      }
      throw error;
    }
  }

  async getAllAgents(limit: number = 100): Promise<AgentAccount[]> {
    try {
      // For read operations, create a temporary program with a dummy wallet
      const dummyWallet = {
        publicKey: anchor.web3.PublicKey.default,
        signTransaction: async () => {
          throw new AppError("READ_ONLY", 400, "Read-only");
        },
        signAllTransactions: async () => {
          throw new AppError("READ_ONLY", 400, "Read-only");
        },
      };

      const provider = new anchor.AnchorProvider(this.connection, dummyWallet, {
        commitment: this.commitment,
      });

      const idl = this.ensureIDL();
      const program = new anchor.Program(idl, provider);

      const agentAccount = this.getAccount("agentAccount");
      const accounts = await agentAccount.all();

      return accounts.slice(0, limit).map((acc: any) => ({
        pubkey: acc.publicKey,
        capabilities: acc.account.capabilities.toNumber(),
        metadataUri: acc.account.metadataUri,
        reputation: acc.account.reputation?.toNumber() || 0,
        lastUpdated: getAccountLastUpdated(acc.account),
        bump: acc.account.bump,
      }));
    } catch (error: any) {
      throw new AppError(
        "FETCH_FAILED",
        500,
        `Failed to fetch agents: ${error.message}`,
      );
    }
  }
}
