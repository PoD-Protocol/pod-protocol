import { BaseService, BaseServiceConfig } from './base.js';
import { IPFSService, IPFSStorageResult } from './ipfs.js';
import { PublicKey } from '@solana/web3.js';
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
    /** Compressed Token program */
    compressedTokenProgram?: PublicKey;
    /** Registered Program ID */
    registeredProgramId?: PublicKey;
    /** No-op Program */
    noopProgram?: PublicKey;
    /** Account Compression authority */
    accountCompressionAuthority?: PublicKey;
    /** Account Compression program */
    accountCompressionProgram?: PublicKey;
    /** Compressed token mint address */
    compressedTokenMint?: PublicKey;
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
 * SECURITY WARNING (CRIT-01): ZK Compression Service - EXPERIMENTAL
 *
 * This service integrates with Light Protocol for Zero-Knowledge compression.
 * WARNING: This code is EXPERIMENTAL and has NOT undergone a formal security audit.
 *
 * KNOWN SECURITY RISKS:
 * - Proof forgery vulnerabilities in ZK verification
 * - Data integrity issues with IPFS storage
 * - Potential for state corruption between on-chain and off-chain data
 * - Batch processing vulnerabilities
 *
 * DO NOT USE IN PRODUCTION without proper security review.
 *
 * ZK Compression Service for PoD Protocol
 * Handles compressed account creation, batch operations, and Light Protocol integration
 */
export declare class ZKCompressionService extends BaseService {
    private wallet?;
    private config;
    private rpc;
    private ipfsService;
    private batchQueue;
    private batchTimer?;
    private lastBatchResult?;
    private indexerClient;
    constructor(baseConfig: BaseServiceConfig, zkConfig: Partial<ZKCompressionConfig>, ipfsService: IPFSService, wallet?: any);
    /**
     * Broadcast a compressed message to a channel
     *
     * SECURITY WARNING: This function uses experimental ZK compression.
     * Validate all inputs and verify all cryptographic operations.
     */
    broadcastCompressedMessage(channelId: PublicKey, content: string, wallet: any, messageType?: string, attachments?: string[], metadata?: Record<string, any>, replyTo?: PublicKey): Promise<{
        signature: string;
        ipfsResult: IPFSStorageResult;
        compressedAccount: CompressedAccount;
    }>;
    /**
     * Join a channel with compressed participant data
     */
    joinChannelCompressed(channelId: PublicKey, participantId: PublicKey, wallet: any, displayName?: string, avatar?: string, permissions?: string[]): Promise<{
        signature: string;
        ipfsResult?: IPFSStorageResult;
        compressedAccount: CompressedAccount;
    }>;
    /**
     * Batch sync compressed messages to chain
     */
    batchSyncMessages(channelId: PublicKey, messageHashes: string[], wallet: any, syncTimestamp?: number): Promise<BatchCompressionResult>;
    /**
     * Query compressed accounts using Photon indexer
     */
    queryCompressedMessages(channelId: PublicKey, options?: {
        limit?: number;
        offset?: number;
        sender?: PublicKey;
        after?: Date;
        before?: Date;
    }): Promise<CompressedChannelMessage[]>;
    /**
     * Get channel statistics from compressed data
     */
    getChannelStats(channelId: PublicKey): Promise<{
        totalMessages: number;
        totalParticipants: number;
        storageSize: number;
        compressionRatio: number;
    }>;
    /**
     * Retrieve message content from IPFS and verify against on-chain hash
     */
    getMessageContent(compressedMessage: CompressedChannelMessage): Promise<{
        content: any;
        verified: boolean;
    }>;
    /**
     * Force process the current batch
     */
    flushBatch(): Promise<any>;
    /**
     * Get current batch queue status
     */
    getBatchStatus(): {
        queueSize: number;
        maxBatchSize: number;
        enableBatching: boolean;
        nextBatchIn?: number;
    };
    /**
     * Private: Process a single compressed message
     */
    private processCompressedMessage;
    /**
     * Private: Process the current batch
     */
    private processBatch;
    /**
     * Private: Start the batch timer
     */
    private startBatchTimer;
    /**
     * Private: Create compression instruction using Light Protocol
     */
    private createCompressionInstruction;
    /**
     * Cleanup: Stop batch timer
     */
    destroy(): void;
}
//# sourceMappingURL=zk-compression.d.ts.map