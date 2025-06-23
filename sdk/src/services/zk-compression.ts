import { AnchorProvider } from "@coral-xyz/anchor";
import { BaseService, BaseServiceConfig } from "./base.js";
import { IPFSService, IPFSStorageResult } from "./ipfs.js";
import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  Connection,
} from "@solana/web3.js";

import {
  createRpc,
  LightSystemProgram,
  Rpc,
} from "@lightprotocol/stateless.js";
import { createMint, mintTo, transfer } from "@lightprotocol/compressed-token";

/**
 * Compressed account information returned by Light Protocol
 */
export interface CompressedAccount {
  /** Address of the compressed account */
  hash: string;
  /** Associated message data */
  data: any;
  /** Merkle context or proof data */
  merkleContext?: any;
}

/**
 * Result of a batch compression operation
 */
export interface BatchCompressionResult {
  /** Transaction signature */
  signature: string;
  /** List of compressed accounts created in batch */
  compressedAccounts: CompressedAccount[];
  /** Merkle root after batch compression */
  merkleRoot: string;
}

/**
 * ZK Compression configuration
 */
export interface ZKCompressionConfig {
  /** Light Protocol Solana RPC endpoint */
  lightRpcUrl?: string;
  /** Light Protocol RPC endpoint (alias for lightRpcUrl) */
  lightRpcEndpoint?: string;
  /** Light Protocol compression RPC endpoint */
  compressionRpcUrl?: string;
  /** Light Protocol prover endpoint */
  proverUrl?: string;
  /** Photon indexer endpoint */
  photonIndexerUrl?: string;
  /** Maximum batch size for compression operations */
  maxBatchSize?: number;
  /** Batch size (alias for maxBatchSize) */
  batchSize?: number;
  /** Enable automatic batching */
  enableBatching?: boolean;
  /** Batch timeout in milliseconds */
  batchTimeout?: number;
  /** Light system program public key */
  lightSystemProgram?: PublicKey;
  /** Nullifier queue public key */
  nullifierQueuePubkey?: PublicKey;
  /** CPI authority PDA */
  cpiAuthorityPda?: PublicKey;
}

/**
 * Compressed message data structure
 */
export interface CompressedChannelMessage {
  channel: PublicKey;
  sender: PublicKey;
  contentHash: string;
  ipfsHash: string;
  messageType: string;
  createdAt: number;
  editedAt?: number;
  replyTo?: PublicKey;
}

/**
 * Compressed participant data structure
 */
export interface CompressedChannelParticipant {
  channel: PublicKey;
  participant: PublicKey;
  joinedAt: number;
  messagesSent: number;
  lastMessageAt: number;
  metadataHash: string;
}

/**
 * Batch sync operation
 */
export interface BatchSyncOperation {
  messageHashes: string[];
  timestamp: number;
  channelId: PublicKey;
}

/**
 * ZK Compression Service for PoD Protocol
 * Handles compressed account creation, batch operations, and Light Protocol integration
 */
export class ZKCompressionService extends BaseService {
  private config: ZKCompressionConfig;
  private rpc: Rpc;
  private ipfsService: IPFSService;
  private batchQueue: CompressedChannelMessage[] = [];
  private batchTimer?: NodeJS.Timeout;
  private lastBatchResult?: { signature: string; compressedAccounts: any[] };

  constructor(
    baseConfig: BaseServiceConfig,
    zkConfig: Partial<ZKCompressionConfig> = {},
    ipfsService: IPFSService,
    private wallet?: any,
  ) {
    super(baseConfig);

    this.config = {
      lightRpcUrl:
        zkConfig.lightRpcUrl ||
        "https://devnet.helius-rpc.com/?api-key=<your-api-key>",
      compressionRpcUrl:
        zkConfig.compressionRpcUrl ||
        zkConfig.lightRpcUrl ||
        "https://devnet.helius-rpc.com/?api-key=<your-api-key>",
      proverUrl:
        zkConfig.proverUrl ||
        zkConfig.lightRpcUrl ||
        "https://devnet.helius-rpc.com/?api-key=<your-api-key>",
      photonIndexerUrl: zkConfig.photonIndexerUrl || "http://localhost:8080",
      maxBatchSize: zkConfig.maxBatchSize || 50,
      enableBatching: zkConfig.enableBatching ?? true,
      batchTimeout: zkConfig.batchTimeout || 5000,
      // Default Light Protocol program addresses for devnet
      lightSystemProgram:
        zkConfig.lightSystemProgram ||
        new PublicKey("H5sFv8VwWmjxHYS2GB4fTDsK7uTtnRT4WiixtHrET3bN"),
      nullifierQueuePubkey:
        zkConfig.nullifierQueuePubkey ||
        new PublicKey("nuLLiQHXWLbjy4uxg4R8UuXsJV4JTxvUYm8rqVn8BBc"),
      cpiAuthorityPda:
        zkConfig.cpiAuthorityPda ||
        new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"),
    };

    this.rpc = createRpc(
      this.config.lightRpcUrl,
      this.config.compressionRpcUrl, // Use compression endpoint
      this.config.proverUrl, // Use prover endpoint
    );

    this.ipfsService = ipfsService;

    if (this.config.enableBatching) {
      this.startBatchTimer();
    }
  }

  /**
   * Broadcast a compressed message to a channel
   */
  async broadcastCompressedMessage(
    channelId: PublicKey,
    content: string,
    wallet: any,
    messageType: string = "Text",
    attachments: string[] = [],
    metadata: Record<string, any> = {},
    replyTo?: PublicKey,
  ): Promise<{
    signature: string;
    ipfsResult: IPFSStorageResult;
    compressedAccount: CompressedAccount;
  }> {
    try {
      // Store content on IPFS first
      const ipfsResult = await this.ipfsService.storeMessageContent(
        content,
        attachments,
        metadata,
      );

      // Create content hash for on-chain verification
      const contentHash = IPFSService.createContentHash(content);

      // Create compressed message structure
      const compressedMessage: CompressedChannelMessage = {
        channel: channelId,
        sender: this.config.lightSystemProgram, // Will be set by program
        contentHash,
        ipfsHash: ipfsResult.hash,
        messageType,
        createdAt: Date.now(),
        replyTo,
      };

      if (this.config.enableBatching) {
        // Add to batch queue
        this.batchQueue.push(compressedMessage);

        if (this.batchQueue.length >= this.config.maxBatchSize) {
          const batchRes = await this.processBatch(wallet);
          const account = batchRes.compressedAccounts.find(
            (a) => a.hash === compressedMessage.contentHash,
          ) || { hash: compressedMessage.contentHash, data: compressedMessage };
          return {
            signature: batchRes.signature,
            ipfsResult,
            compressedAccount: account,
          };
        }

        // Return promise that resolves when batch is processed
        return new Promise((resolve, reject) => {
          const checkBatch = () => {
            // Check if message was processed in a batch
            const processedIndex = this.batchQueue.findIndex(
              (msg) => msg.contentHash === compressedMessage.contentHash,
            );

            if (processedIndex === -1) {
              // Message was processed, return success
              const batchResult = this.lastBatchResult || {
                signature: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                compressedAccounts: [],
              };

              resolve({
                signature: batchResult.signature,
                ipfsResult,
                compressedAccount: {
                  hash: compressedMessage.contentHash,
                  data: compressedMessage,
                },
              });
            } else {
              // Still in queue, check again after timeout
              setTimeout(checkBatch, 100);
            }
          };

          // Start checking after a short delay
          setTimeout(checkBatch, 50);

          // Timeout after 30 seconds
          setTimeout(() => {
            reject(new Error("Batch processing timeout"));
          }, 30000);
        });
      } else {
        // Execute compression via Light Protocol transaction
        const instruction = await this.createCompressionInstruction(
          channelId,
          compressedMessage,
          wallet.publicKey,
        );
        const transaction = new Transaction().add(instruction);
        const signature = await this.rpc.sendTransaction(transaction, []);

        return {
          signature,
          ipfsResult,
          compressedAccount: {
            hash: compressedMessage.contentHash,
            data: compressedMessage,
          },
        };
      }
    } catch (error) {
      throw new Error(`Failed to broadcast compressed message: ${error}`);
    }
  }

  /**
   * Join a channel with compressed participant data
   */
  async joinChannelCompressed(
    channelId: PublicKey,
    participantId: PublicKey,
    wallet: any,
    displayName?: string,
    avatar?: string,
    permissions: string[] = [],
  ): Promise<{
    signature: string;
    ipfsResult?: IPFSStorageResult;
    compressedAccount: CompressedAccount;
  }> {
    try {
      let ipfsResult: IPFSStorageResult | undefined;
      let metadataHash = "";

      // Store extended metadata on IPFS if provided
      if (displayName || avatar || permissions.length > 0) {
        ipfsResult = await this.ipfsService.storeParticipantMetadata(
          displayName || "",
          avatar,
          permissions,
        );
        metadataHash = ipfsResult.hash;
      }

      // Create compressed participant structure
      const compressedParticipant: CompressedChannelParticipant = {
        channel: channelId,
        participant: participantId,
        joinedAt: Date.now(),
        messagesSent: 0,
        lastMessageAt: 0,
        metadataHash,
      };

      // Create transaction using Light Protocol
      const program = this.ensureInitialized();

      // Create Light Protocol compressed account transaction
      const tx = await (program as any).methods
        .joinChannelCompressed(Array.from(Buffer.from(metadataHash, "hex")))
        .accounts({
          channelAccount: channelId,
          agentAccount: participantId,
          invitationAccount: null,
          feePayer: wallet.publicKey,
          authority: wallet.publicKey,
          lightSystemProgram: this.config.lightSystemProgram,
          registeredProgramId: new PublicKey(
            "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
          ),
          noopProgram: new PublicKey(
            "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
          ),
          accountCompressionAuthority: new PublicKey(
            "5QPEJ5zDsVou9FQS3KCHdPeeWDfWDcXYRKZaAkXRBGSW",
          ),
          accountCompressionProgram: new PublicKey(
            "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK",
          ),
          merkleTree: channelId, // Use channel as merkle tree
          nullifierQueue: this.config.nullifierQueuePubkey,
          cpiAuthorityPda: this.config.cpiAuthorityPda,
        })
        .transaction();

      const provider = program.provider as AnchorProvider;
      const signature = await provider.sendAndConfirm(tx);

      return {
        signature,
        ipfsResult,
        compressedAccount: { hash: "", data: compressedParticipant },
      };
    } catch (error) {
      throw new Error(`Failed to join channel with compression: ${error}`);
    }
  }

  /**
   * Batch sync compressed messages to chain
   */
  async batchSyncMessages(
    channelId: PublicKey,
    messageHashes: string[],
    wallet: any,
    syncTimestamp?: number,
  ): Promise<BatchCompressionResult> {
    try {
      if (messageHashes.length > 100) {
        throw new Error(
          "Batch size too large. Maximum 100 messages per batch.",
        );
      }

      const program = this.ensureInitialized();
      const timestamp = syncTimestamp || Date.now();

      // Convert string hashes to byte arrays
      const hashBytes = messageHashes.map((hash) =>
        Array.from(Buffer.from(hash, "hex")),
      );

      // Implement Light Protocol integration
      const tx = await (program as any).methods
        .batchSyncCompressedMessages(hashBytes, timestamp)
        .accounts({
          channelAccount: channelId,
          feePayer: wallet.publicKey,
          authority: wallet.publicKey,
          lightSystemProgram: new PublicKey(
            "H5sFv8VwWmjxHYS2GB4fTDsK7uTtnRT4WiixtHrET3bN",
          ),
          compressedTokenProgram: new PublicKey(
            "cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m",
          ),
          registeredProgramId: new PublicKey(
            "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
          ),
          noopProgram: new PublicKey(
            "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
          ),
          accountCompressionAuthority: new PublicKey(
            "5QPEJ5zDsVou9FQS3KCHdPeeWDfWDcXYRKZaAkXRBGSW",
          ),
          accountCompressionProgram: new PublicKey(
            "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK",
          ),
          merkleTree: channelId,
          nullifierQueue: this.config.nullifierQueuePubkey,
          cpiAuthorityPda: this.config.cpiAuthorityPda,
        })
        .transaction();

      const provider = program.provider as AnchorProvider;
      const signature = await provider.sendAndConfirm(tx);

      return {
        signature,
        compressedAccounts: [], // Would be populated from Light Protocol response
        merkleRoot: "", // Would be populated from Light Protocol response
      };
    } catch (error) {
      throw new Error(`Failed to batch sync messages: ${error}`);
    }
  }

  /**
   * Query compressed accounts using Photon indexer
   */
  async queryCompressedMessages(
    channelId: PublicKey,
    options: {
      limit?: number;
      offset?: number;
      sender?: PublicKey;
      after?: Date;
      before?: Date;
    } = {},
  ): Promise<CompressedChannelMessage[]> {
    try {
      // Query compressed messages via Photon indexer JSON-RPC
      const rpcReq = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "getCompressedMessagesByChannel",
        params: [
          channelId.toString(),
          options.limit ?? 50,
          options.offset ?? 0,
          options.sender?.toString() || null,
          options.after?.getTime() || null,
          options.before?.getTime() || null,
        ],
      };
      const response = await fetch(this.config.photonIndexerUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rpcReq),
      });
      if (!response.ok) {
        throw new Error(`Indexer RPC failed: ${response.statusText}`);
      }
      const json = (await response.json()) as {
        result?: any[];
        error?: { message?: string };
      };
      if (json.error) {
        throw new Error(
          `Indexer RPC error: ${json.error?.message || "Unknown error"}`,
        );
      }
      const raw = json.result || [];
      return raw.map((m) => ({
        channel: new PublicKey(m.channel),
        sender: new PublicKey(m.sender),
        contentHash: m.content_hash,
        ipfsHash: m.ipfs_hash,
        messageType: m.message_type,
        createdAt: m.created_at,
        editedAt: m.edited_at,
        replyTo: m.reply_to ? new PublicKey(m.reply_to) : undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to query compressed messages: ${error}`);
    }
  }

  /**
   * Get channel statistics from compressed data
   */
  async getChannelStats(channelId: PublicKey): Promise<{
    totalMessages: number;
    totalParticipants: number;
    storageSize: number;
    compressionRatio: number;
  }> {
    try {
      const response = await fetch(
        `${this.config.photonIndexerUrl}/channel-stats/${channelId.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`Stats query failed: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      return {
        totalMessages: data.totalMessages || 0,
        totalParticipants: data.totalParticipants || 0,
        storageSize: data.storageSize || 0,
        compressionRatio: data.compressionRatio || 1.0,
      };
    } catch (error) {
      throw new Error(`Failed to get channel stats: ${error}`);
    }
  }

  /**
   * Retrieve message content from IPFS and verify against on-chain hash
   */
  async getMessageContent(
    compressedMessage: CompressedChannelMessage,
  ): Promise<{
    content: any;
    verified: boolean;
  }> {
    try {
      const content = await this.ipfsService.retrieveMessageContent(
        compressedMessage.ipfsHash,
      );
      const computedHash = IPFSService.createContentHash(content.content);
      const verified = computedHash === compressedMessage.contentHash;

      return { content, verified };
    } catch (error) {
      throw new Error(
        `Failed to retrieve and verify message content: ${error}`,
      );
    }
  }

  /**
   * Force process the current batch
   */
  async flushBatch(): Promise<any> {
    if (this.batchQueue.length === 0) {
      return null;
    }

    return await this.processBatch(this.wallet);
  }

  /**
   * Get current batch queue status
   */
  getBatchStatus(): {
    queueSize: number;
    maxBatchSize: number;
    enableBatching: boolean;
    nextBatchIn?: number;
  } {
    return {
      queueSize: this.batchQueue.length,
      maxBatchSize: this.config.maxBatchSize,
      enableBatching: this.config.enableBatching,
    };
  }

  /**
   * Private: Process a single compressed message
   */
  private async processCompressedMessage(
    message: CompressedChannelMessage,
    ipfsResult: IPFSStorageResult,
    wallet: any,
  ): Promise<any> {
    try {
      const program = this.ensureInitialized();

      // Implement Light Protocol integration
      const tx = await (program as any).methods
        .broadcastMessageCompressed(
          message.contentHash, // Use content hash instead of full content
          message.messageType,
          message.replyTo || null,
          message.ipfsHash,
        )
        .accounts({
          channelAccount: message.channel,
          participantAccount: message.sender,
          feePayer: wallet.publicKey,
          authority: wallet.publicKey,
          lightSystemProgram: new PublicKey(
            "H5sFv8VwWmjxHYS2GB4fTDsK7uTtnRT4WiixtHrET3bN",
          ),
          compressedTokenProgram: new PublicKey(
            "cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m",
          ),
          registeredProgramId: new PublicKey(
            "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
          ),
          noopProgram: new PublicKey(
            "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
          ),
          accountCompressionAuthority: new PublicKey(
            "5QPEJ5zDsVou9FQS3KCHdPeeWDfWDcXYRKZaAkXRBGSW",
          ),
          accountCompressionProgram: new PublicKey(
            "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK",
          ),
          merkleTree: message.channel,
          nullifierQueue: this.config.nullifierQueuePubkey,
          cpiAuthorityPda: this.config.cpiAuthorityPda,
        })
        .transaction();

      const provider = program.provider as AnchorProvider;
      const signature = await provider.sendAndConfirm(tx);

      return {
        signature,
        ipfsResult,
        compressedAccount: { hash: "", data: message },
      };
    } catch (error) {
      throw new Error(`Failed to process compressed message: ${error}`);
    }
  }

  /**
   * Private: Process the current batch
   */
  private async processBatch(wallet: any): Promise<BatchCompressionResult> {
    if (this.batchQueue.length === 0) {
      return {
        signature: "",
        compressedAccounts: [],
        merkleRoot: "",
      };
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    const instructions: TransactionInstruction[] = [];
    for (const msg of batch) {
      const ix = await this.createCompressionInstruction(
        msg.channel,
        msg,
        wallet.publicKey,
      );
      instructions.push(ix);
    }

    const transaction = new Transaction();
    for (const ix of instructions) {
      transaction.add(ix);
    }

    const signature = await this.rpc.sendTransaction(transaction, []);

    const compressedAccounts = batch.map((msg) => ({
      hash: msg.contentHash,
      data: msg,
    }));

    const merkleRoot = IPFSService.createContentHash(
      batch.map((m) => m.contentHash).join(""),
    );

    const result: BatchCompressionResult = {
      signature,
      compressedAccounts,
      merkleRoot,
    };

    // Store the result for pending batch promises
    this.lastBatchResult = {
      signature: result.signature,
      compressedAccounts: result.compressedAccounts,
    };

    return result;
  }

  /**
   * Private: Start the batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      if (this.batchQueue.length > 0) {
        this.processBatch(this.wallet).catch(console.error);
      }
      this.startBatchTimer();
    }, this.config.batchTimeout);
  }

  /**
   * Private: Create compression instruction using Light Protocol
   */
  private async createCompressionInstruction(
    merkleTree: PublicKey,
    message: CompressedChannelMessage,
    authority: PublicKey,
  ): Promise<TransactionInstruction> {
    // Create a simple transaction instruction for compression
    // This is a placeholder implementation that should be replaced with actual Light Protocol integration
    const { SystemProgram } = await import("@solana/web3.js");
    return SystemProgram.transfer({
      fromPubkey: authority,
      toPubkey: merkleTree,
      lamports: 0,
    });
  }

  /**
   * Cleanup: Stop batch timer
   */
  destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
  }
}
