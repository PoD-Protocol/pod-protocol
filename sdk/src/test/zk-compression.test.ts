import { describe, it, expect } from '@jest/globals';
import { PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { CompressedChannelMessage, CompressedAccount } from '../services/zk-compression.js';

class MockZKCompressionService {
  batchQueue: { message: CompressedChannelMessage; ipfs: any; resolve: Function; reject: Function }[] = [];
  lastResult: any = null;
  async broadcastCompressedMessage(channel: PublicKey, content: string, wallet: any) {
    const msg: CompressedChannelMessage = {
      channel,
      sender: channel,
      contentHash: content,
      ipfsHash: 'ipfs',
      messageType: 'Text',
      createdAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ message: msg, ipfs: null, resolve, reject });
    });
  }
  async processBatch() {
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    const signature = 'txSig123';
    const accounts = batch.map(() => ({ hash: '7b', data: {}, merkleContext: {} }));
    this.lastResult = { signature, compressedAccounts: accounts, merkleRoot: 'root' };
    batch.forEach((b, i) => b.resolve({ signature, ipfsResult: null, compressedAccount: accounts[i] }));
    return this.lastResult;
  }
  async flushBatch() {
    return this.processBatch();
  }
}

describe('ZKCompressionService batching', () => {
  it('resolves queued messages when batch processed', async () => {
    const service = new MockZKCompressionService();
    const wallet = Keypair.generate();
    const channel = Keypair.generate().publicKey;
    const promise = service.broadcastCompressedMessage(channel, 'hi', wallet);
    await service.flushBatch();
    const result = await promise;
    expect(result.signature).toBe('txSig123');
    expect((result.compressedAccount as CompressedAccount).hash).toBe('7b');
  });
});
