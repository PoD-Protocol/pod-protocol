import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { json } from '@helia/json';
import { CID } from 'multiformats/cid';
import { BaseService, BaseServiceConfig } from './base.js';
import keccak from 'keccak';
import type { JSON as HeliaJSON } from '@helia/json';

// Type for the actual Helia instance returned by createHelia (includes libp2p)
type HeliaInstance = Awaited<ReturnType<typeof createHelia>>;

/**
 * IPFS configuration options
 */
export interface IPFSConfig {
  /** Custom Helia node configuration */
  heliaConfig?: any;
  /** Timeout for IPFS operations in milliseconds */
  timeout?: number;
  /** Gateway URL for retrieving content */
  gatewayUrl?: string;
}

/**
 * Channel message content structure for IPFS storage
 */
export interface ChannelMessageContent {
  content: string;
  attachments?: string[];
  metadata?: Record<string, any>;
  timestamp: number;
  version: string;
}

/**
 * Participant extended metadata structure for IPFS storage
 */
export interface ParticipantExtendedMetadata {
  displayName?: string;
  avatar?: string;
  permissions?: string[];
  customData?: Record<string, any>;
  lastUpdated: number;
}

/**
 * IPFS storage result
 */
export interface IPFSStorageResult {
  hash: string;
  cid: CID;
  size: number;
  url: string;
}

/**
 * IPFS Service for handling off-chain storage of PoD Protocol data
 * Integrates with ZK compression for cost-effective data management
 * Uses Helia (modern IPFS implementation) instead of deprecated js-IPFS
 */
export class IPFSService extends BaseService {
  private helia: HeliaInstance | null = null;
  private fs: ReturnType<typeof unixfs> | null = null;
  private jsonStore: HeliaJSON | null = null;
  private config: IPFSConfig;
  private initPromise: Promise<void> | null = null;

  constructor(baseConfig: BaseServiceConfig, ipfsConfig: IPFSConfig = {}) {
    super(baseConfig);
    
    this.config = {
      timeout: ipfsConfig.timeout || 30000,
      gatewayUrl: ipfsConfig.gatewayUrl || 'https://ipfs.io/ipfs',
      ...ipfsConfig,
    };
  }

  /**
   * Initialize Helia node and services
   */
  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.helia = await createHelia(this.config.heliaConfig);
        this.fs = unixfs(this.helia);
        this.jsonStore = json(this.helia);
      } catch (error) {
        throw new Error(`Failed to initialize Helia: ${error}`);
      }
    })();

    return this.initPromise;
  }

  /**
   * Ensure Helia is initialized
   

  /**
   * Store channel message content on IPFS
   */
  async storeMessageContent(
    content: string,
    attachments: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<IPFSStorageResult> {
    const messageContent: ChannelMessageContent = {
      content,
      attachments,
      metadata,
      timestamp: Date.now(),
      version: '1.0.0',
    };

    return this.storeJSON(messageContent);
  }

  /**
   * Store participant extended metadata on IPFS
   */
  async storeParticipantMetadata(
    displayName: string,
    avatar?: string,
    permissions: string[] = [],
    customData: Record<string, any> = {}
  ): Promise<IPFSStorageResult> {
    const participantMetadata: ParticipantExtendedMetadata = {
      displayName,
      avatar,
      permissions,
      customData,
      lastUpdated: Date.now(),
    };

    return this.storeJSON(participantMetadata);
  }

  /**
   * Store arbitrary JSON data on IPFS
   */
  async storeJSON(data: any): Promise<IPFSStorageResult> {
    try {
      await this.ensureInitialized();
      
      const cid = await this.jsonStore!.add(data);
      
      // Get size by encoding the data
      const jsonString = JSON.stringify(data);
      const size = new TextEncoder().encode(jsonString).length;

      return {
        hash: cid.toString(),
        cid,
        size,
        url: `${this.config.gatewayUrl}/${cid.toString()}`,
      };
    } catch (error) {
      throw new Error(`Failed to store data on IPFS: ${error}`);
    }
  }

  /**
   * Store raw file data on IPFS
   */
  async storeFile(
    data: Buffer | Uint8Array,
    filename?: string
  ): Promise<IPFSStorageResult> {
    try {
      await this.ensureInitialized();
      
      const cid = await this.fs!.addBytes(data);

      return {
        hash: cid.toString(),
        cid,
        size: data.length,
        url: `${this.config.gatewayUrl}/${cid.toString()}`,
      };
    } catch (error) {
      throw new Error(`Failed to store file on IPFS: ${error}`);
    }
  }

  /**
   * Retrieve JSON data from IPFS
   */
  async retrieveJSON<T = any>(hash: string): Promise<T> {
    try {
      await this.ensureInitialized();
      
      const cid = CID.parse(hash);
      const data = await this.jsonStore!.get(cid);
      
      return data as T;
    } catch (error) {
      throw new Error(`Failed to retrieve data from IPFS: ${error}`);
    }
  }

  /**
   * Retrieve message content from IPFS
   */
  async retrieveMessageContent(hash: string): Promise<ChannelMessageContent> {
    return this.retrieveJSON<ChannelMessageContent>(hash);
  }

  /**
   * Retrieve participant metadata from IPFS
   */
  async retrieveParticipantMetadata(hash: string): Promise<ParticipantExtendedMetadata> {
    return this.retrieveJSON<ParticipantExtendedMetadata>(hash);
  }

  /**
   * Retrieve raw file data from IPFS
   */
  async retrieveFile(hash: string): Promise<Buffer> {
    try {
      await this.ensureInitialized();
      
      const cid = CID.parse(hash);
      const data = await this.fs!.cat(cid);
      
      const chunks: Uint8Array[] = [];
      for await (const chunk of data) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to retrieve file from IPFS: ${error}`);
    }
  }

  /**
   * Pin content to ensure it stays available
   */
  async pinContent(hash: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const cid = CID.parse(hash);
      await this.helia!.pins.add(cid);
    } catch (error) {
      throw new Error(`Failed to pin content: ${error}`);
    }
  }

  /**
   * Unpin content to allow garbage collection
   */
  async unpinContent(hash: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const cid = CID.parse(hash);
      await this.helia!.pins.rm(cid);
    } catch (error) {
      throw new Error(`Failed to unpin content: ${error}`);
    }
  }

  /**
   * Get IPFS node info
   */
  async getNodeInfo(): Promise<any> {
    try {
      await this.ensureInitialized();
      return {
        id: this.helia!.libp2p.peerId.toString(),
        agentVersion: 'helia',
        protocolVersion: '1.0.0'
      };
    } catch (error) {
      throw new Error(`Failed to get IPFS node info: ${error}`);
    }
  }

  /**
   * Check if content exists on IPFS
   */
  async contentExists(hash: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const cid = CID.parse(hash);
      await this.fs!.stat(cid);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Store channel message content on IPFS
   */
  async storeChannelMessageContent(
    content: ChannelMessageContent
  ): Promise<IPFSStorageResult> {
    return this.storeJSON(content);
  }

  /**
   * Store participant extended metadata on IPFS
   */
  async storeParticipantExtendedMetadata(
    metadata: ParticipantExtendedMetadata
  ): Promise<IPFSStorageResult> {
    return this.storeJSON(metadata);
  }

  /**
   * Retrieve channel message content from IPFS
   */
  async retrieveChannelMessageContent(
    hash: string
  ): Promise<ChannelMessageContent> {
    return this.retrieveJSON<ChannelMessageContent>(hash);
  }

  /**
   * Retrieve participant extended metadata from IPFS
   */
  async retrieveParticipantExtendedMetadata(
    hash: string
  ): Promise<ParticipantExtendedMetadata> {
    return this.retrieveJSON<ParticipantExtendedMetadata>(hash);
  }

  /**
   * Cleanup resources
   */
  async stop(): Promise<void> {
    if (this.helia) {
      await this.helia.stop();
      this.helia = null;
      this.fs = null;
      this.jsonStore = null;
    }
  }

  /**
   * Create a content hash for verification
   * Matches the Rust program's hash_to_bn254_field_size_be function
   */
  static createContentHash(content: string): string {
    // Equivalent to `hash_to_bn254_field_size_be` in Rust:
    // https://github.com/Lightprotocol/light-protocol/blob/main/program-libs/hasher/src/hash_to_field_size.rs#L91

    // 1. Hash the UTF-8 bytes with Keccak256 and a bump seed (0xff).
    const keccakHash = keccak('keccak256')
      .update(Buffer.concat([Buffer.from(content, 'utf8'), Buffer.from([0xff])]))
      .digest();

    // 2. Zero the first byte so the result fits within the BN254 field.
    const fieldSizedHash = Buffer.from(keccakHash);
    fieldSizedHash[0] = 0;
    return fieldSizedHash.toString('hex');
  }
  
  /**
   * Create a metadata hash for participant data
   * Matches the Rust program's metadata hashing
   */
  static createMetadataHash(metadata: ParticipantExtendedMetadata): string {
    const metadataString = JSON.stringify({
      displayName: metadata.displayName || '',
      avatar: metadata.avatar || '',
      permissions: metadata.permissions || [],
      lastUpdated: metadata.lastUpdated
    });
    
    return this.createContentHash(metadataString);
  }

  /**
   * Batch store multiple content items
   */
  async batchStore(items: Array<{ content: any; filename?: string }>): Promise<IPFSStorageResult[]> {
    const results: IPFSStorageResult[] = [];
    
    for (const item of items) {
      if (typeof item.content === 'string' || Buffer.isBuffer(item.content)) {
        results.push(await this.storeFile(
          Buffer.isBuffer(item.content) ? item.content : Buffer.from(item.content),
          item.filename
        ));
      } else {
        results.push(await this.storeJSON(item.content));
      }
    }

    return results;
  }

  /**
   * Get gateway URL for content
   */
  getGatewayUrl(hash: string, gateway: string = 'https://ipfs.io/ipfs/'): string {
    return `${gateway}${hash}`;
  }

  /**
   * Validate IPFS hash format
   */
  static isValidIPFSHash(hash: string): boolean {
    try {
      CID.parse(hash);
      return true;
    } catch {
      return false;
    }
  }
}