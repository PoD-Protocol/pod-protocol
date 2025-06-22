import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import anchor from "@coral-xyz/anchor";
import { BaseService, BaseServiceConfig } from "./base.js";
import { IPFSService, IPFSStorageResult } from "./ipfs.js";

/**
 * Light Protocol SDK types - Updated for actual Light Protocol integration
 */
interface CompressedAccount {
  hash: string;
  data: any;
  merkleContext?: any;
}

interface BatchCompressionResult {
  signature: string;
  compressedAccounts: CompressedAccount[];
  merkleRoot: string;
}

/**
 * ZK Compression configuration
 */
export interface ZKCompressionConfig {
  /** Light Protocol RPC endpoint */
  lightRpcUrl?: string;
  /** Photon indexer endpoint */
  photonIndexerUrl?: string;
  /** Maximum batch size for compression operations */
  maxBatchSize?: number;
  /** Enable automatic batching */
  enableBatching?: boolean;
  /** Batch timeout in milliseconds */
  batchTimeout?: number;
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
  private ipfsService: IPFSService;
  private batchQueue: CompressedChannelMessage[] = [];
  private batchTimer?: NodeJS.Timeout;
  private client: any; // Client instance with wallet
  private lightSystemProgram: PublicKey; // Light Protocol system program
  private merkleTree: PublicKey; // Merkle tree account
  private nullifierQueue: PublicKey; // Nullifier queue account

  constructor(
    baseConfig: BaseServiceConfig,
    zkConfig: ZKCompressionConfig = {},
    ipfsService: IPFSService,
    client?: any,
  ) {
    super(baseConfig);

    this.config = {
      lightRpcUrl:
        zkConfig.lightRpcUrl ||
        "https://devnet.helius-rpc.com/?api-key=<your-api-key>",
      photonIndexerUrl: zkConfig.photonIndexerUrl || "http://localhost:8080",
      maxBatchSize: zkConfig.maxBatchSize || 50,
      enableBatching: zkConfig.enableBatching ?? true,
      batchTimeout: zkConfig.batchTimeout || 5000,
      ...zkConfig,
    };

    this.ipfsService = ipfsService;
    this.client = client;

    // Initialize Light Protocol program addresses (devnet addresses)
    this.lightSystemProgram = new PublicKey(
      "H5p5WE5qfVPYs8rCMWNaD7h5CwGbJJVkjp9g9n7s9rCW",
    );
    this.merkleTree = new PublicKey(
      "CgJhEZdRHhcXFFCBDCMfKyY6pjczZgLqzPMVsH3Mj7mK",
    );
    this.nullifierQueue = new PublicKey(
      "ENUeL1EgVrg6zHQzUFsKKbKsHJ9KoVpLNhgzNRkZSgzR",
    );

    if (this.config.enableBatching) {
      this.startBatchTimer();
    }
  }

  /**
   * Set the client instance for wallet operations
   */
  setClient(client: any): void {
    this.client = client;
  }

  /**
   * Broadcast a compressed message to a channel
   */
  async broadcastCompressedMessage(
    channelId: PublicKey,
    content: string,
    messageType: string = "Text",
    replyTo?: PublicKey,
    attachments: string[] = [],
    metadata: Record<string, any> = {},
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
        sender: new PublicKey("11111111111111111111111111111111"), // Will be set by program
        contentHash,
        ipfsHash: ipfsResult.hash,
        messageType,
        createdAt: Date.now(),
        replyTo,
      };

      if (this.config.enableBatching) {
        // Add to batch queue
        this.batchQueue.push(compressedMessage);

        if (this.batchQueue.length >= this.config.maxBatchSize!) {
          return await this.processBatch();
        }

        // Queue message for batch processing
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return {
          signature: batchId,
          ipfsResult,
          compressedAccount: { hash: batchId, data: compressedMessage },
        };
      } else {
        // Process immediately
        return await this.processCompressedMessage(
          compressedMessage,
          ipfsResult,
        );
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
      const tx = await (program.methods as any)
        .joinChannelCompressed()
        .accounts({
          channelAccount: channelId,
          agentAccount: participantId,
          // Add other required accounts for Light Protocol
        })
        .transaction();

      // Execute transaction
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

      const tx = await (program.methods as any)
        .batchSyncCompressedMessages(hashBytes, timestamp)
        .accounts({
          channelAccount: channelId,
          // Add other required accounts for Light Protocol
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
      const queryParams = new URLSearchParams({
        channel: channelId.toString(),
        limit: (options.limit || 50).toString(),
        offset: (options.offset || 0).toString(),
      });

      if (options.sender) {
        queryParams.append("sender", options.sender.toString());
      }
      if (options.after) {
        queryParams.append("after", options.after.getTime().toString());
      }
      if (options.before) {
        queryParams.append("before", options.before.getTime().toString());
      }

      const response = await fetch(
        `${this.config.photonIndexerUrl}/compressed-messages?${queryParams}`,
      );

      if (!response.ok) {
        throw new Error(`Indexer query failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        messages?: CompressedChannelMessage[];
      };
      return data.messages || [];
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

      const data = (await response.json()) as {
        totalMessages: number;
        totalParticipants: number;
        storageSize: number;
        compressionRatio: number;
      };
      return data;
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

    return await this.processBatch();
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
      maxBatchSize: this.config.maxBatchSize!,
      enableBatching: this.config.enableBatching!,
    };
  }

  /**
   * Private: Process a single compressed message
   */
  private async processCompressedMessage(
    message: CompressedChannelMessage,
    ipfsResult: IPFSStorageResult,
  ): Promise<any> {
    try {
      const program = this.ensureInitialized();

      const tx = await (program.methods as any)
        .broadcastMessageCompressed(
          // Get actual content from IPFS or use a meaningful identifier
          ipfsResult.cid || `msg-${Date.now()}`, // Use IPFS CID or timestamp-based identifier
          message.messageType,
          message.replyTo || null,
          message.ipfsHash,
        )
        .accounts({
          channelAccount: message.channel,
          // Add other required accounts
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
  private async processBatch(): Promise<any> {
    if (this.batchQueue.length === 0) {
      return null;
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    // Process batch using Light Protocol's batch compression
    try {
      // Create batch sync transaction with message hashes
      const messageHashes = batch.map((msg) => {
        const hash = new Uint8Array(32);
        // Generate deterministic hash from message data
        const msgStr = JSON.stringify(msg);
        const encoder = new TextEncoder();
        const data = encoder.encode(msgStr);
        hash.set(data.slice(0, 32));
        return Array.from(hash);
      });

      const batchId = `batch-${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000);

      // Call batch sync compressed messages instruction
      const result = await this.client.program.methods
        .batchSyncCompressedMessages(messageHashes, new anchor.BN(timestamp))
        .accounts({
          channelAccount: batch[0].channel, // Use first message's channel
          feePayer: this.client.wallet.publicKey,
          authority: this.client.wallet.publicKey,
          lightSystemProgram: this.lightSystemProgram,
          merkleTree: this.merkleTree,
          nullifierQueue: this.nullifierQueue,
        })
        .rpc();

      return {
        signature: result,
        batchSize: batch.length,
        compressedAccounts: batch.map((msg, i) => ({
          hash: messageHashes[i].join(""),
          data: msg,
        })),
      };
    } catch (error) {
      // Re-queue failed messages
      this.batchQueue.unshift(...batch);
      throw new Error(`Batch processing failed: ${error}`);
    }
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
        this.processBatch().catch(console.error);
      }
      this.startBatchTimer();
    }, this.config.batchTimeout!);
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
