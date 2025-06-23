import { describe, it, expect } from '@jest/globals';

class TestService {
  rpc: any;
  batchQueue: any[];
  constructor(rpc: any, batch: any[]) {
    this.rpc = rpc;
    this.batchQueue = batch;
  }
  async processBatch(): Promise<any> {
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    const [treeInfo] = await this.rpc.getStateTreeInfos();
    await this.rpc.compress({ treeInfo, batch });
    const signature = await this.rpc.sendTransaction({}, []);
    const txInfo = await this.rpc.getTransactionWithCompressionInfo(signature);
    const compressedAccounts =
      txInfo.compressionInfo.openedAccounts.map((acc: any) => ({
        hash: acc.account.hash.toString(),
        data: acc.account.data,
        merkleContext: acc.account.merkleContext,
      }));
    const merkleRoot = compressedAccounts[0].merkleContext.root.toString();
    return { signature, compressedAccounts, merkleRoot };
  }
}

describe('Light Protocol batching', () => {
  it('processBatch returns accounts from Light Protocol', async () => {
    const mockRpc = {
      getStateTreeInfos: async () => [{ tree: 'tree1' }],
      compress: async () => {},
      sendTransaction: async () => 'sig123',
      getTransactionWithCompressionInfo: async () => ({
        compressionInfo: {
          openedAccounts: [
            {
              account: { hash: 88n, data: { foo: 'bar' }, merkleContext: { root: 99n } },
            },
          ],
        },
      }),
    };
    const svc = new TestService(mockRpc, [
      { channel: 'c', sender: 's', contentHash: 'hash', ipfsHash: 'ipfs', messageType: 'Text', createdAt: 0 },
    ]);
    const result = await svc.processBatch();
    expect(result.signature).toBe('sig123');
    expect(result.compressedAccounts.length).toBe(1);
    expect(result.merkleRoot).toBe('99');
  });
});
