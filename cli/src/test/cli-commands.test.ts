import { spawn } from "bun";
import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, unlinkSync, copyFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = join(__dirname, "..", "index.ts");
const cwd = join(__dirname, "..", "..");
const fixtureKeypairPath = join(__dirname, "test-keypair.json");
const testKeypairPath = join(__dirname, "temp-keypair.json");

async function runCli(args: string[], timeoutMs = 10000) {
  const proc = spawn(["bun", cliPath, "--no-banner", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CI: "true" },
  });
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      proc.kill();
      throw new Error(`CLI command timed out after ${timeoutMs}ms`);
    }, timeoutMs);

    try {
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout, { signal: controller.signal }).text(),
        new Response(proc.stderr, { signal: controller.signal }).text(),
        proc.exited
      ]);
      clearTimeout(timeoutId);
      return { stdout, stderr, exitCode };
    } catch (error) {
      if (!controller.signal.aborted) {
        proc.kill();
      }
      throw new Error(`CLI process error: ${error}`);
    }
  } catch (error) {
    proc.kill();
    throw new Error(`CLI process error: ${error}`);
  }
}

describe("CLI Command Tests", () => {
  beforeAll(() => {
    copyFileSync(fixtureKeypairPath, testKeypairPath);
  });
  it("agent register dry run", async () => {
    const res = await runCli([
      "agent",
      "register",
      "--capabilities",
      "1",
      "--metadata",
      "test",
      "--dry-run",
      "--keypair",
      testKeypairPath,
    ]);
    expect(res.exitCode).toBe(0);
    expect(res.stderr).toContain("Dry run");
    expect(res.stderr).toContain("Agent registration");
  });

  it("message send dry run", async () => {
    const res = await runCli([
      "message",
      "send",
      "--recipient",
      "11111111111111111111111111111111",
      "--payload",
      "hello",
      "--dry-run",
      "--keypair",
      testKeypairPath,
    ]);
    expect(res.exitCode).toBe(0);
    expect(res.stderr).toContain("Dry run");
    expect(res.stderr).toContain("Message send");
  });

  it("channel create dry run", async () => {
    const res = await runCli([
      "channel",
      "create",
      "--name",
      "test",
      "--description",
      "test channel",
      "--visibility",
      "public",
      "--dry-run",
      "--keypair",
      testKeypairPath,
    ]);
    expect(res.exitCode).toBe(0);
    expect(res.stderr).toContain("Dry run");
    expect(res.stderr).toContain("Creating channel");
  });

  it("escrow deposit dry run", async () => {
    const res = await runCli([
      "escrow",
      "deposit",
      "--channel",
      "11111111111111111111111111111111",
      "--lamports",
      "1000",
      "--dry-run",
      "--keypair",
      testKeypairPath,
    ]);
    expect(res.exitCode).toBe(0);
    expect(res.stderr).toContain("Dry run");
    expect(res.stderr).toContain("Escrow deposit");
  });

  it("config show", async () => {
    const res = await runCli([
      "config",
      "show",
      "--keypair",
      testKeypairPath,
    ]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("POD-COM CLI Configuration");
  });

  it("status command", async () => {
    const res = await runCli([
      "status",
      "--keypair",
      testKeypairPath,
    ]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("PoD Protocol Status");
  });

  afterAll(() => {
    if (existsSync(testKeypairPath)) {
      try {
        unlinkSync(testKeypairPath);
      } catch {}
    }
  });
});
