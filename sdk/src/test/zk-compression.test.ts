import { describe, it, expect } from "bun:test";
import { PublicKey, Connection, TransactionInstruction, Keypair } from "@solana/web3.js";
import { ZKCompressionService, CompressedChannelMessage } from "../services/zk-compression";
import { IPFSService } from "../services/ipfs";
import { BaseServiceConfig } from "../services/base";
import { CompressedTokenProgram } from "@lightprotocol/compressed-token";

class MockRpc {
  async sendTransaction() { return "mockSig"; }
  async getStateTreeInfos() { return [{ tree: Keypair.generate().publicKey }]; }
}

describe("ZKCompressionService", () => {
  const baseConfig: BaseServiceConfig = {
    connection: new Connection("http://localhost:8899"),
    programId: new PublicKey("11111111111111111111111111111111"),
    commitment: "confirmed"
  } as any;
  const ipfs = new IPFSService(baseConfig, {});

  const service = new ZKCompressionService(
    baseConfig,
    { compressedTokenMint: Keypair.generate().publicKey },
    ipfs,
  );
  (service as any).rpc = new MockRpc();
  // Use jest.spyOn or similar approach to mock without modifying the original
  const compressSpy = jest.spyOn(CompressedTokenProgram, 'compress')
    .mockImplementation(async () => new TransactionInstruction({}));

  // Remember to restore after tests
  afterAll(() => {
    compressSpy.mockRestore();
  });

  const sampleMsg: CompressedChannelMessage = {
    channel: Keypair.generate().publicKey,
    sender: Keypair.generate().publicKey,
    contentHash: "abc",
    ipfsHash: "ipfs",
    messageType: "Text",
    createdAt: Date.now()
  };

  it("creates compression instruction", async () => {
    const ix = await (service as any).createCompressionInstruction(sampleMsg.channel, sampleMsg, Keypair.generate().publicKey);
    expect(ix).toBeInstanceOf(TransactionInstruction);
  });

  it("processes batch", async () => {
    (service as any).batchQueue = [sampleMsg];
    const result = await (service as any).processBatch({ publicKey: Keypair.generate().publicKey });
    expect(result.signature).toBe("mockSig");
    expect(result.compressedAccounts.length).toBe(1);
  });
});
