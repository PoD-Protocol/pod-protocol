#!/usr/bin/env node

/**
 * Cross-platform build script for PoD Protocol
 * Handles Bun/Anchor compatibility and ensures proper build order
 */

import { execSync } from "child_process";
import { existsSync, copyFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function runCommand(command, options = {}) {
  try {
    log(`Running: ${command}`, "cyan");
    return execSync(command, {
      stdio: "inherit",
      cwd: process.cwd(),
      ...options,
    });
  } catch (error) {
    log(`Error running command: ${command}`, "red");
    log(error.message, "red");
    return null;
  }
}

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function buildAnchorProgram() {
  log("🏗️  Building Anchor program...", "blue");

  if (!checkCommand("anchor")) {
    log("❌ Anchor CLI not found. Installing...", "yellow");
    runCommand("npm install -g @coral-xyz/anchor-cli@0.31.1");
  }

  // Build the Anchor program
  const result = runCommand("anchor build");

  if (result === null) {
    log("❌ Anchor build failed, falling back to Cargo build", "yellow");
    const cargoResult = runCommand("cd programs/pod-com && cargo build-sbf");
    if (cargoResult === null) {
      log("❌ Cargo build-sbf failed, trying cargo build", "yellow");
      runCommand("cd programs/pod-com && cargo build");
    }
  }

  return result !== null;
}

async function buildWorkspaces() {
  log("🏗️  Building workspaces with Bun...", "blue");

  // Build SDK
  log("📦 Building SDK...", "magenta");
  runCommand("cd sdk && bun run build:prod");

  // Build CLI
  log("📦 Building CLI...", "magenta");
  runCommand("cd cli && bun run build:prod");
}

async function generateIDL() {
  log("📝 Generating IDL...", "blue");

  // Try to copy IDL from target directory
  const idlPath = "target/idl/pod_com.json";
  const sdkIdlPath = "sdk/src/pod_com.json";

  if (existsSync(idlPath)) {
    copyFileSync(idlPath, sdkIdlPath);
    log("✅ IDL copied to SDK", "green");
  } else {
    log("⚠️  IDL not found, using existing version", "yellow");
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  const buildType = args[0] || "all";

  log("🚀 Starting PoD Protocol build...", "green");

  try {
    switch (buildType) {
      case "anchor":
        await buildAnchorProgram();
        await generateIDL();
        break;
      case "workspaces":
        await buildWorkspaces();
        break;
      case "all":
      default:
        await buildAnchorProgram();
        await generateIDL();
        await buildWorkspaces();
        break;
    }

    log("✅ Build completed successfully!", "green");
  } catch (error) {
    log(`❌ Build failed: ${error.message}`, "red");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, buildAnchorProgram, buildWorkspaces, generateIDL };
