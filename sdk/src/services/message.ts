import {
  PublicKey,
  Signer,
  GetProgramAccountsFilter,
  SystemProgram,
} from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
import { BaseService } from "./base";
import { z } from "zod";
import { AppError, MessageExpiredError } from "../errors";
import {
  MessageAccount,
  SendMessageOptions,
  MessageType,
  MessageStatus,
} from "../types";
import {
  findAgentPDA,
  findMessagePDA,
  hashPayload,
  retry,
  convertMessageTypeToProgram,
  convertMessageTypeFromProgram,
  getAccountTimestamp,
  getAccountCreatedAt,
} from "../utils";

const MessageSchema = z.object({
  id: z.string().uuid(),
  sender: z.string().min(1),
  recipient: z.string().min(1),
  body: z.string().nonempty(),
  ttlSeconds: z.number().int().positive(),
});

const messageStore = new Map<string, any>();
const db = {
  save: async (msg: any) => {
    messageStore.set(msg.id, msg);
  },
  find: async (id: string) => messageStore.get(id),
};

/**
 * Message-related operations service
 */
export class MessageService extends BaseService {
  async sendMessage(
    wallet: Signer,
    options: SendMessageOptions,
  ): Promise<string> {
    const msg = MessageSchema.parse(options as any);
    const expiresAt = new Date(Date.now() + msg.ttlSeconds * 1000);
    await db.save({ ...msg, expiresAt });

    const program = this.ensureInitialized();

    // Derive sender agent PDA
    const [senderAgentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Hash the payload
    const payloadHash = await hashPayload(options.payload);

    // Convert message type
    const messageTypeObj = this.convertMessageType(
      options.messageType,
      options.customValue,
    );

    // Find message PDA
    const [messagePDA] = findMessagePDA(
      senderAgentPDA,
      options.recipient,
      payloadHash,
      messageTypeObj,
      this.programId,
    );

    return retry(async () => {
      const tx = await (program.methods as any)
        .sendMessage(
          options.recipient,
          Array.from(payloadHash),
          messageTypeObj
        )
        .accounts({
          messageAccount: messagePDA,
          senderAgent: senderAgentPDA,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([wallet])
        .rpc({ commitment: this.commitment });

      return tx;
    });
  }

  async updateMessageStatus(
    wallet: Signer,
    messagePDA: PublicKey,
    newStatus: MessageStatus,
  ): Promise<string> {
    return retry(async () => {
      const methods = this.getProgramMethods();
      const tx = await methods
        .updateMessageStatus(this.convertMessageStatus(newStatus))
        .accounts({
          messageAccount: messagePDA,
          authority: wallet.publicKey,
        })
        .signers([wallet])
        .rpc({ commitment: this.commitment });

      return tx;
    });
  }

  async getMessage(id: string): Promise<any> {
    const msg = await db.find(id);
    if (!msg || msg.expiresAt < new Date()) throw new MessageExpiredError(id);
    return msg;
  }

  async getAgentMessages(
    agentPublicKey: PublicKey,
    limit: number = 50,
    statusFilter?: MessageStatus,
  ): Promise<MessageAccount[]> {
    try {
      const filters: GetProgramAccountsFilter[] = [
        {
          memcmp: {
            offset: 8 + 32,
            bytes: agentPublicKey.toBase58(),
          },
        },
      ];

      if (statusFilter !== undefined) {
        const statusBytes = this.convertMessageStatus(statusFilter);
        filters.push({
          memcmp: {
            offset: 8 + 32 + 32 + 4 + 200,
            bytes: statusBytes,
          },
        });
      }

      const accounts = await this.connection.getProgramAccounts(
        this.programId,
        {
          filters,
          commitment: this.commitment,
        },
      );

      return accounts.slice(0, limit).map((acc) => {
        const account = this.ensureInitialized().coder.accounts.decode(
          "messageAccount",
          acc.account.data,
        );
        return this.convertMessageAccountFromProgram(account, acc.pubkey);
      });
    } catch (error: any) {
      throw new AppError(
        "FETCH_AGENT_MESSAGES_FAILED",
        500,
        `Failed to fetch agent messages: ${error.message}`,
        error,
      );
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private convertMessageType(
    messageType: MessageType,
    customValue?: number,
  ): any {
    return convertMessageTypeToProgram(messageType, customValue);
  }

  private convertMessageTypeFromProgram(programType: any): MessageType {
    const result = convertMessageTypeFromProgram(programType);
    return result.type;
  }

  private convertMessageStatus(status: MessageStatus): any {
    switch (status) {
      case MessageStatus.Pending:
        return { pending: {} };
      case MessageStatus.Delivered:
        return { delivered: {} };
      case MessageStatus.Read:
        return { read: {} };
      case MessageStatus.Failed:
        return { failed: {} };
      default:
        throw new AppError(
          "UNKNOWN_STATUS",
          400,
          `Unknown message status: ${status}`,
        );
    }
  }

  private convertMessageStatusFromProgram(programStatus: any): MessageStatus {
    if (programStatus.pending) return MessageStatus.Pending;
    if (programStatus.delivered) return MessageStatus.Delivered;
    if (programStatus.read) return MessageStatus.Read;
    if (programStatus.failed) return MessageStatus.Failed;
    throw new AppError(
      "UNKNOWN_STATUS",
      400,
      `Unknown program status: ${JSON.stringify(programStatus)}`,
    );
  }

  private convertMessageAccountFromProgram(
    account: any,
    publicKey: PublicKey,
  ): MessageAccount {
    return {
      pubkey: publicKey,
      sender: new PublicKey(account.sender),
      recipient: new PublicKey(account.recipient),
      payload: account.payload || account.content || "",
      payloadHash: account.payloadHash,
      messageType: this.convertMessageTypeFromProgram(account.messageType),
      status: this.convertMessageStatusFromProgram(account.status),
      timestamp: getAccountTimestamp(account),
      createdAt: getAccountCreatedAt(account),
      expiresAt: account.expiresAt?.toNumber() || 0,
      bump: account.bump,
    };
  }
}
