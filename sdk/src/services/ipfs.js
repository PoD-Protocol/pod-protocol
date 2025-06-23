import { create } from 'ipfs-http-client';
import { CID } from 'multiformats/cid';
import { BaseService } from './base.js';
import keccak from 'keccak';
/**
 * IPFS Service for handling off-chain storage of PoD Protocol data
 * Integrates with ZK compression for cost-effective data management
 */
export class IPFSService extends BaseService {
    constructor(baseConfig, ipfsConfig = {}) {
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
    async storeMessageContent(content, attachments = [], metadata = {}) {
        const messageContent = {
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
    async storeParticipantMetadata(displayName, avatar, permissions = [], customData = {}) {
        const participantMetadata = {
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
    async storeJSON(data) {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            const result = await this.client.add(JSON.stringify(data), {
                cidVersion: 1,
                hashAlg: 'sha2-256',
            });
            return {
                hash: result.cid.toString(),
                cid: result.cid,
                size: result.size || 0,
                url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
            };
        }
        catch (error) {
            throw new Error(`Failed to store data on IPFS: ${error}`);
        }
    }
    /**
     * Store raw file data on IPFS
     */
    async storeFile(data, filename) {
        try {
            const options = {
                pin: true,
                cidVersion: 1,
                hashAlg: 'sha2-256',
            };
            if (filename) {
                options.wrapWithDirectory = true;
                options.path = filename;
            }
            const result = await this.client.add(data, options);
            return {
                hash: result.cid.toString(),
                cid: CID.parse(result.cid.toString()),
                size: result.size || 0,
                url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
            };
        }
        catch (error) {
            throw new Error(`Failed to store file on IPFS: ${error}`);
        }
    }
    /**
     * Retrieve JSON data from IPFS
     */
    async retrieveJSON(hash) {
        try {
            const chunks = [];
            for await (const chunk of this.client.cat(hash)) {
                chunks.push(chunk);
            }
            const data = Buffer.concat(chunks).toString('utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            throw new Error(`Failed to retrieve data from IPFS: ${error}`);
        }
    }
    /**
     * Retrieve message content from IPFS
     */
    async retrieveMessageContent(hash) {
        return this.retrieveJSON(hash);
    }
    /**
     * Retrieve participant metadata from IPFS
     */
    async retrieveParticipantMetadata(hash) {
        return this.retrieveJSON(hash);
    }
    /**
     * Retrieve raw file data from IPFS
     */
    async retrieveFile(hash) {
        try {
            const chunks = [];
            for await (const chunk of this.client.cat(hash)) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        }
        catch (error) {
            throw new Error(`Failed to retrieve file from IPFS: ${error}`);
        }
    }
    /**
     * Pin content to IPFS node (prevent garbage collection)
     */
    async pinContent(hash) {
        try {
            await this.client.pin.add(hash);
        }
        catch (error) {
            throw new Error(`Failed to pin content: ${error}`);
        }
    }
    /**
     * Unpin content from IPFS node
     */
    async unpinContent(hash) {
        try {
            await this.client.pin.rm(hash);
        }
        catch (error) {
            throw new Error(`Failed to unpin content: ${error}`);
        }
    }
    /**
     * Get IPFS node info
     */
    async getNodeInfo() {
        try {
            return await this.client.id();
        }
        catch (error) {
            throw new Error(`Failed to get IPFS node info: ${error}`);
        }
    }
    /**
     * Check if content exists on IPFS
     */
    async contentExists(hash) {
        try {
            const stats = await this.client.object.stat(CID.parse(hash));
            return stats.Hash.toString() === hash;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Create a content hash for verification
     * Matches the Rust program's hash_to_bn254_field_size_be function
     */
    static createContentHash(content) {
        const keccakHash = keccak('keccak256')
            .update(Buffer.concat([Buffer.from(content, 'utf8'), Buffer.from([0xff])]))
            .digest();
        keccakHash[0] = 0;
        return keccakHash.toString('hex');
    }
    /**
     * Create a metadata hash for participant data
     * Matches the Rust program's metadata hashing
     */
    static createMetadataHash(metadata) {
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
    async batchStore(items) {
        const results = [];
        for (const item of items) {
            if (typeof item.content === 'string' || Buffer.isBuffer(item.content)) {
                results.push(await this.storeFile(Buffer.isBuffer(item.content) ? item.content : Buffer.from(item.content), item.filename));
            }
            else {
                results.push(await this.storeJSON(item.content));
            }
        }
        return results;
    }
    /**
     * Get gateway URL for content
     */
    getGatewayUrl(hash, gateway = 'https://ipfs.io/ipfs/') {
        return `${gateway}${hash}`;
    }
    /**
     * Validate IPFS hash format
     */
    static isValidIPFSHash(hash) {
        try {
            CID.parse(hash);
            return true;
        }
        catch {
            return false;
        }
    }
}
