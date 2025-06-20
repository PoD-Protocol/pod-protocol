#!/usr/bin/env node
import { execSync } from 'child_process';

const commands = [
  'node cli/dist/index.js --help',
  'node cli/dist/index.js agent register --capabilities 1 --metadata test --dry-run',
  'node cli/dist/index.js agent list --limit 1 --dry-run',
  'node cli/dist/index.js channel list --limit 1 --dry-run',
  'node cli/dist/index.js message list --limit 1 --dry-run',
  'node cli/dist/index.js escrow list --limit 1 --dry-run',
  'node cli/dist/index.js config show',
  'node cli/dist/index.js status',
];

for (const cmd of commands) {
  console.log(`\n$ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`Command succeeded: ${cmd}`);
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    console.error(err.message);
    process.exit(1);
  }
}
