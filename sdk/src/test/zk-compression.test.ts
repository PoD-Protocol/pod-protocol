import { describe, it, expect, vi } from "bun:test";
import { ZKCompressionService } from "../services/zk-compression.js";
import { IPFSService } from "../services/ipfs.js";
import { PhotonClient } from "../services/photon.js";
import { LightSystemProgram } from "@lightprotocol/stateless.js";
import { PublicKey, Connection, TransactionInstruction } from "@solana/web3.js";

const dummyKey = new PublicKey("11111111111111111111111111111111");

function createService() {
  return new ZKCompressionService(
    {
      connection: new Connection("http://localhost:8899"),
      programId: dummyKey,
      commitment: "processed",
    },
    { photonIndexerUrl: "http://localhost:8080", enableBatching: false },
    {} as IPFSService,
    { publicKey: dummyKey }
  );
}

describe("ZKCompressionService", () => {
  it("delegates queries to Photon client", async () => {
    const svc = createService();
    const photonMock = {
      getCompressedMessagesByChannel: vi
        .fn()
        .mockResolvedValue([
          {
            channel: dummyKey.toString(),
            sender: dummyKey.toString(),
            content_hash: "h",
            ipfs_hash: "i",
            message_type: "Text",
            created_at: 1,
          },
        ]),
      getChannelStats: vi.fn(),
    } as any;
    (svc as any).photon = photonMock;
    const msgs = await svc.queryCompressedMessages(dummyKey);
    expect(photonMock.getCompressedMessagesByChannel).toHaveBeenCalled();
    expect(msgs.length).toBe(1);
    expect(msgs[0].contentHash).toBe("h");
  });

  it("uses LightSystemProgram.compress when creating instructions", async () => {
    const svc = createService();
    const rpcMock = {
      getStateTreeInfos: vi.fn().mockResolvedValue([
        { tree: dummyKey, queue: dummyKey, treeType: 0, nextTreeInfo: null },
      ]),
    } as any;
    (svc as any).rpc = rpcMock;
    const compressSpy = vi
      .spyOn(LightSystemProgram, "compress")
      .mockResolvedValue(
        new TransactionInstruction({ keys: [], programId: dummyKey, data: Buffer.alloc(0) })
      );

    await (svc as any).createCompressionInstruction(
      dummyKey,
      {
        channel: dummyKey,
        sender: dummyKey,
        contentHash: "h",
        ipfsHash: "i",
        messageType: "Text",
        createdAt: 1,
      },
      dummyKey
    );

    expect(compressSpy).toHaveBeenCalled();
  });
});
