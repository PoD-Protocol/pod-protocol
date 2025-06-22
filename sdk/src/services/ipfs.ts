import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { CID } from 'multiformats/cid';
import { BaseService, BaseServiceConfig } from './base.js';
import { createHash } from 'crypto';

/**
 * IPFS configuration options
 */
export interface IPFSConfig {
  /** IPFS node URL - defaults to Infura public gateway */
  url?: string;
  /** IPFS API endpoint - defaults to /api/v0 */
  apiPath?: string;
  /** Authorization headers for private IPFS nodes */
  headers?: Record<string, string>;
  /** Timeout for IPFS operations in milliseconds */
  timeout?: number;
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
 */
export class IPFSService extends BaseService {
  private client: IPFSHTTPClient;
  private config: IPFSConfig;

  constructor(baseConfig: BaseServiceConfig, ipfsConfig: IPFSConfig = {}) {
    super(baseConfig);
    
    this.config = {
      url: ipfsConfig.url || 'https://ipfs.infura.io:5001',
      apiPath: ipfsConfig.apiPath || '/api/v0',
      timeout: ipfsConfig.timeout || 30000,
      ...ipfsConfig,
    };

    this.client = create({
      url: this.config.url,
      apiPath: this.config.apiPath,
      timeout: this.config.timeout,
      headers: this.config.headers,
    });
  }

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
      const jsonString = JSON.stringify(data, null, 2);
      const result = await this.client.add(
        JSON.stringify(data),
        {
          cidVersion: 1,
          hashAlg: 'sha2-256',
        }
      ) as any;

      return {
        hash: result.cid.toString(),
        cid: result.cid,
        size: result.size || 0,
        url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
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
      const options: any = {
        pin: true,
        cidVersion: 1,
        hashAlg: 'sha2-256',
      };

      if (filename) {
        options.wrapWithDirectory = true;
        options.path = filename;
      }

      const result = await this.client.add(data, options) as any;

      return {
        hash: result.cid.toString(),
        cid: CID.parse(result.cid.toString()),
        size: result.size || 0,
        url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
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
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of this.client.cat(hash)) {
        chunks.push(chunk);
      }

      const data = Buffer.concat(chunks).toString('utf-8');
      return JSON.parse(data) as T;
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
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of this.client.cat(hash)) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to retrieve file from IPFS: ${error}`);
    }
  }

  /**
   * Pin content to IPFS node (prevent garbage collection)
   */
  async pinContent(hash: string): Promise<void> {
    try {
      await this.client.pin.add(hash);
    } catch (error) {
      throw new Error(`Failed to pin content: ${error}`);
    }
  }

  /**
   * Unpin content from IPFS node
   */
  async unpinContent(hash: string): Promise<void> {
    try {
      await this.client.pin.rm(hash);
    } catch (error) {
      throw new Error(`Failed to unpin content: ${error}`);
    }
  }

  /**
   * Get IPFS node info
   */
  async getNodeInfo(): Promise<any> {
    try {
      return await this.client.id();
    } catch (error) {
      throw new Error(`Failed to get IPFS node info: ${error}`);
    }
  }

  /**
   * Check if content exists on IPFS
   */
  async contentExists(hash: string): Promise<boolean> {
    try {
      const stats = await this.client.object.stat(CID.parse(hash));
      return stats.Hash.toString() === hash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a content hash for verification
   */
  static createContentHash(content: string): string {
    // Use SHA-256 to match the Rust program's content_hash ([u8; 32])
    const hash = createHash('sha256').update(content).digest('hex');
    return hash;
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