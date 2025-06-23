import { describe, it, expect, afterAll, beforeAll } from '@jest/globals';
import { PublicKey, Connection, TransactionInstruction, Keypair } from "@solana/web3.js";
import { createRequire } from "module";

// Stub node-domexception before loading Light Protocol packages
const require = createRequire(import.meta.url);
require.cache[require.resolve('node-domexception')] = {
  exports: { __esModule: true, default: globalThis.DOMException }
};

// Load ZKCompressionService dynamically so mocks can be applied first
let ZKCompressionService: any;

// Minimal IPFS service stub used for testing
const ipfsStub = {
  async storeMessageContent() {
    return { hash: "ipfsHash", cid: null as any, size: 0, url: "" };
  }
} as any;

// Helper to create a ZKCompressionService instance with stubbed RPC
function createService() {
  const connection = new Connection("https://api.devnet.solana.com");
  const programId = new PublicKey("11111111111111111111111111111111");
  const wallet = Keypair.generate();

  const service = new ZKCompressionService(
    { connection, programId, commitment: "confirmed" },
    { enableBatching: true, batchTimeout: 100000 },
    ipfsStub,
    wallet
  ) as any;

  // Stub out RPC calls to avoid network access
  service.rpc = {
    getStateTreeInfos: async () => [{}],
    sendTransaction: async () => "mockSignature123"
  };

  // Override private processBatch to return a mock result
  service.processBatch = async function () {
    if (this.batchQueue.length === 0) return null;
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    const result = {
      signature: "mockSignature123",
      compressedAccounts: batch.map((msg: any) => ({ hash: msg.contentHash, data: msg })),
      merkleRoot: ""
    };
    this.lastBatchResult = {
      signature: result.signature,
      compressedAccounts: result.compressedAccounts
    };
    return result;
  };

  return { service, wallet, programId };
}

describe("ZKCompressionService", () => {
  let service: any;
  let wallet: Keypair;
  let programId: PublicKey;

  beforeAll(async () => {
    ({ ZKCompressionService } = await import("../services/zk-compression"));
    ({ service, wallet, programId } = createService());
  });

  afterAll(() => {
    service.destroy();
  });

  it("should create compression instruction", async () => {
    const dummyMessage = {
      channel: programId,
      sender: programId,
      contentHash: "deadbeef",
      ipfsHash: "ipfsHash",
      messageType: "Text",
      createdAt: Date.now(),
    } as any;

    const instruction = await (service as any).createCompressionInstruction(
      programId,
      dummyMessage,
      wallet.publicKey
    );

    expect(instruction).toBeInstanceOf(TransactionInstruction);
    expect(instruction.programId).toBeInstanceOf(PublicKey);
  });

  it("should process batch with compression", async () => {
    const promise = service.broadcastCompressedMessage(programId, "hello", wallet);

    const batchResult = await service.flushBatch();
    expect(batchResult.signature).toBe("mockSignature123");

    const result = await promise;
    expect(result.signature).toBe("mockSignature123");
  });
});


