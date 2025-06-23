import { describe, it, expect } from "bun:test";
import { createHash } from "crypto";
import { IPFSService, ParticipantExtendedMetadata } from "../services/ipfs.ts";

function expectedHash(content: string): string {
  const digest = createHash("sha256").update(content, "utf8").digest("hex");
  const FIELD_MODULUS = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617",
  );
  const num = BigInt("0x" + digest) % FIELD_MODULUS;
  return num.toString(16).padStart(64, "0");
}

describe("IPFSService hashing", () => {
  it("creates BN254 field hash for content", () => {
    const content = "hello world";
    const actual = IPFSService.createContentHash(content);
    const expected = expectedHash(content);
    expect(actual).toBe(expected);
    expect(actual.length).toBe(64);
  });

  it("creates metadata hash deterministically", () => {
    const metadata: ParticipantExtendedMetadata = {
      displayName: "Alice",
      avatar: "avatar.png",
      permissions: ["send"],
      lastUpdated: 12345,
    };
    const metadataString = JSON.stringify({
      displayName: metadata.displayName || "",
      avatar: metadata.avatar || "",
      permissions: metadata.permissions || [],
      lastUpdated: metadata.lastUpdated,
    });
    const expected = expectedHash(metadataString);
    expect(IPFSService.createMetadataHash(metadata)).toBe(expected);
  });
});
