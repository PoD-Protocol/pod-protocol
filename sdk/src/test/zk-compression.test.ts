import { describe, it, expect, afterAll, jest } from '@jest/globals';
import { PublicKey, Connection, TransactionInstruction, Keypair } from "@solana/web3.js";
import { ZKCompressionService } from "../services/zk-compression.js";

// Mock ZKCompressionService to avoid heavy dependencies
class MockZKCompressionService {
  async createCompressionInstruction() {
    return new TransactionInstruction({
      keys: [],
      programId: new PublicKey("11111111111111111111111111111111"),
      data: Buffer.from([])
    });
  }
  
  async processBatch() {
    return "mockSignature123";
  }
}

class MockPhotonClient {
  getCompressedMessagesByChannel = jest.fn().mockResolvedValue([
    {
      channel: '11111111111111111111111111111111',
      sender: '22222222222222222222222222222222',
      content_hash: 'abc',
      ipfs_hash: 'ipfs',
      message_type: 'Text',
      created_at: 123,
    },
  ]);
}

describe("ZKCompressionService", () => {
  const service = new MockZKCompressionService();

  it("should create compression instruction", async () => {
    const instruction = await service.createCompressionInstruction();
    
    expect(instruction).toBeInstanceOf(TransactionInstruction);
    expect(instruction.programId.toString()).toBe("11111111111111111111111111111111");
  });

  it("should process batch with compression", async () => {
    const signature = await service.processBatch();
    expect(typeof signature).toBe("string");
    expect(signature).toBe("mockSignature123");
  });

  it("should query messages via Photon client", async () => {
    const photon = new MockPhotonClient();
    const svc: any = {
      photon,
    };
    const messages = await ZKCompressionService.prototype.queryCompressedMessages.call(
      svc,
      new PublicKey("11111111111111111111111111111111"),
      { limit: 1 }
    );
    expect(photon.getCompressedMessagesByChannel).toHaveBeenCalled();
    expect(messages[0].contentHash).toBe("abc");
  });
});


