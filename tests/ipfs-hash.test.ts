import { expect, test, describe } from "bun:test";
import { IPFSService } from "../sdk/src/services/ipfs";

describe("createContentHash", () => {
  const cases: Record<string, string> = {
    "hello world": "001e332a8d817b5fb3b49af17074488b700c13e2d2611e4aaec24704bcc6c60c",
    OpenAI: "002f5def325e554d0601b6a3fcb788ae8f071f39ef85baae22c27e11046a4202",
    "": "001a944cf13a9a1c08facb2c9e98623ef3254d2ddb48113885c3e8e97fec8db9",
  };

  for (const [input, expected] of Object.entries(cases)) {
    test(`hash for '${input}' matches Rust`, () => {
      expect(IPFSService.createContentHash(input)).toBe(expected);
    });
  }
});
