import { expect, test, describe } from "bun:test";
import { IPFSService } from "../sdk/src/services/ipfs";
import { spawnSync } from "node:child_process";
import path from "path";

function rustHash(input: string): string {
  const result = spawnSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--manifest-path",
      path.join(__dirname, "rust-hasher", "Cargo.toml"),
      "--",
      input,
    ],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr);
  }
  return result.stdout.trim();
}

describe("Rust and JS hashing match", () => {
  const inputs = ["hello world", "OpenAI", ""];
  for (const input of inputs) {
    test(`hash '${input}'`, () => {
      const jsHash = IPFSService.createContentHash(input);
      const rust = rustHash(input);
      expect(jsHash).toBe(rust);
    });
  }
});
