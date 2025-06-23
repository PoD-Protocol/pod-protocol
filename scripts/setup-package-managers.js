#!/usr/bin/env node

/**
 * Setup script to handle Bun and Anchor compatibility
 * This script ensures Bun, Yarn, Anchor CLI and Rollup are available
 * for the PoD Protocol development environment
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

function runCommand(command, options = {}) {
  try {
    console.log(`Running: ${command}`);
    return execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'development' },
      ...options 
    });
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.message);
    if (options.exitOnError !== false) {
      process.exit(1);
    }
    return null;
  }
}

function checkPackageManager(manager) {
  try {
    execSync(`${manager} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkCommand(cmd) {
  try {
    const command = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${command} ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔧 Setting up package managers for PoD Protocol...');
  
  const hasBun = checkPackageManager('bun');
  const hasYarn = checkPackageManager('yarn');
  
  console.log(`Bun available: ${hasBun}`);
  console.log(`Yarn available: ${hasYarn}`);
  
  if (!hasYarn) {
    console.log('📦 Installing Yarn...');
    runCommand('npm install -g yarn');
  }

  if (!checkCommand('anchor')) {
    console.log('📦 Installing Anchor CLI...');
    runCommand('npm install -g @coral-xyz/anchor-cli@0.31.1');
  } else {
    const anchorVersion = execSync('anchor --version', { stdio: 'pipe' }).toString().trim();
    if (!anchorVersion.includes('0.31.1')) {
      console.log('📦 Updating Anchor CLI to required version...');
      runCommand('npm install -g @coral-xyz/anchor-cli@0.31.1');
    }
  }

  if (!checkCommand('rollup')) {
    console.log('📦 Installing Rollup...');
    runCommand('npm install -g rollup');
  }
  
  console.log('📦 Installing dependencies with Yarn (for Anchor compatibility)...');
  runCommand('yarn install', { exitOnError: false });
  
  // Install workspace dependencies with Bun for faster builds
  if (hasBun) {
    console.log('📦 Installing workspace dependencies with Bun...');
    runCommand('cd sdk && bun install', { exitOnError: false });
    runCommand('cd cli && bun install', { exitOnError: false });
  }
  
  console.log('✅ Package manager and tool setup complete!');
  console.log('📋 Usage:');
  console.log('  - Use "yarn" for Anchor commands (build, deploy, test)');
  console.log('  - Use "bun" for workspace development (faster builds)');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
