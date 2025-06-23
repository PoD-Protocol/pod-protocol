import { describe, it, expect } from "bun:test";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  ZKCompressionService,
  CompressedChannelMessage,
} from "../services/zk-compression.ts";
import { IPFSService } from "../services/ipfs.ts";
import { BaseServiceConfig } from "../services/base.ts";

function createService() {
  const connection = new Connection("http://localhost:8899");
  const base: BaseServiceConfig = {
    connection,
    programId: new PublicKey("11111111111111111111111111111111"),
    commitment: "confirmed",
  } as any;
  const ipfs = {} as any;
  const svc = new ZKCompressionService(base, { enableBatching: false }, ipfs);
  (svc as any).rpc = { sendTransaction: async () => "sig-test" };
  return svc;
}

describe("ZKCompressionService batch", () => {
  it("processes queued messages and returns result", async () => {
    const svc = createService();
    const wallet = {
      publicKey: new PublicKey("11111111111111111111111111111111"),
    };

    const msg1: CompressedChannelMessage = {
      channel: new PublicKey("11111111111111111111111111111111"),
      sender: wallet.publicKey,
      contentHash: IPFSService.createContentHash("m1"),
      ipfsHash: "ipfs1",
      messageType: "text",
      createdAt: Date.now(),
    };
    const msg2: CompressedChannelMessage = {
      channel: msg1.channel,
      sender: wallet.publicKey,
      contentHash: IPFSService.createContentHash("m2"),
      ipfsHash: "ipfs2",
      messageType: "text",
      createdAt: Date.now(),
    };

    (svc as any).batchQueue.push(msg1, msg2);

    const expectedRoot = IPFSService.createContentHash(
      msg1.contentHash + msg2.contentHash,
    );
    const res = await (svc as any).processBatch(wallet);

    expect(res.signature).toBe("sig-test");
    expect(res.compressedAccounts.length).toBe(2);
    expect(res.merkleRoot).toBe(expectedRoot);
  });
});
