#!/usr/bin/env node

/**
 * Fix TypeScript type instantiation issues by replacing program.methods
 * with (program.methods as any) across all service files
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

const files = [
  "/workspaces/POD-COM/sdk/src/services/channel.ts",
  "/workspaces/POD-COM/sdk/src/services/message.ts",
];

for (const file of files) {
  console.log(`Fixing ${file}...`);

  let content = readFileSync(file, "utf8");

  // Replace all instances of "program.methods" with "(program.methods as any)"
  // but not if it's already wrapped or is checking for existence
  content = content.replace(
    /(?<![(])(\s+const\s+\w+\s*=\s*await\s+)program\.methods/g,
    "$1(program.methods as any)",
  );

  content = content.replace(
    /(?<![(])(\s+return\s+await\s+)program\.methods/g,
    "$1(program.methods as any)",
  );

  writeFileSync(file, content);
  console.log(`Fixed ${file}`);
}

console.log("All files fixed!");
