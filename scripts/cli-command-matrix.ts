#!/usr/bin/env node
/**
 * CLI command matrix tester for PoD Protocol
 *
 * Usage:
 *   node scripts/cli-command-matrix.ts [--keypair path] [--endpoint url]
 *
 * The script enumerates common CLI commands with sample options,
 * executes each combination using child_process.exec and summarizes
 * exit codes. Provide a dummy keypair and optional devnet RPC endpoint
 * for isolated testing.
 */
import { exec } from "child_process";
import { promisify } from "util";
import { table } from "table";

const execAsync = promisify(exec);

interface CommandSpec {
  base: string;
  options: string[];
}

function combinations(opts: string[]): string[][] {
  const result: string[][] = [];
  const total = 1 << opts.length;
  for (let i = 0; i < total; i++) {
    const combo: string[] = [];
    for (let j = 0; j < opts.length; j++) {
      if (i & (1 << j)) combo.push(opts[j]);
    }
    result.push(combo);
  }
  return result;
}

async function runCommand(cmd: string, globalOpts: string) {
  try {
    const { stdout, stderr } = await execAsync(
      `node cli/dist/index.js ${globalOpts} ${cmd}`,
      { timeout: 30000 },
    );
    return { exitCode: 0, stdout, stderr };
  } catch (error: any) {
    return {
      exitCode: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? error.message,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  let keypair = "";
  let endpoint = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--keypair" && args[i + 1]) {
      keypair = args[i + 1];
      i++;
    } else if (args[i] === "--endpoint" && args[i + 1]) {
      endpoint = args[i + 1];
      i++;
    }
  }

  const globalOpts =
    `--network devnet ${keypair ? `--keypair ${keypair}` : ""}`.trim();

  if (endpoint) {
    await runCommand(`config set-endpoint ${endpoint}`, globalOpts);
  }

  const specs: CommandSpec[] = [
    { base: "status", options: [] },
    {
      base: "agent register",
      options: ["--capabilities 1", "--metadata https://example.com/meta.json"],
    },
    {
      base: "agent info 11111111111111111111111111111111111111111111",
      options: [],
    },
    {
      base: "agent update",
      options: ["--capabilities 2", "--metadata https://example.com/new.json"],
    },
    { base: "agent list", options: ["--limit 1"] },

    {
      base: "message send",
      options: [
        "--recipient 11111111111111111111111111111111111111111111",
        "--payload hello",
        "--type text",
      ],
    },
    { base: "message info 1", options: [] },
    { base: "message status", options: ["--message 1", "--status delivered"] },
    {
      base: "message list",
      options: [
        "--agent 11111111111111111111111111111111111111111111",
        "--limit 1",
        "--filter delivered",
      ],
    },

    {
      base: "channel create",
      options: ["--name test", "--description example", "--visibility public"],
    },
    {
      base: "channel info 11111111111111111111111111111111111111111111",
      options: [],
    },
    { base: "channel list", options: ["--limit 1"] },
    {
      base: "channel join 11111111111111111111111111111111111111111111",
      options: [],
    },
    {
      base: "channel leave 11111111111111111111111111111111111111111111",
      options: [],
    },
    {
      base: 'channel broadcast 11111111111111111111111111111111111111111111 "hi"',
      options: ["--type text"],
    },
    {
      base: "channel invite 11111111111111111111111111111111111111111111 11111111111111111111111111111111111111111111",
      options: [],
    },
    {
      base: "channel participants 11111111111111111111111111111111111111111111",
      options: ["--limit 1"],
    },
    {
      base: "channel messages 11111111111111111111111111111111111111111111",
      options: ["--limit 1"],
    },

    {
      base: "escrow deposit",
      options: [
        "--channel 11111111111111111111111111111111111111111111",
        "--lamports 1000",
      ],
    },
    {
      base: "escrow withdraw",
      options: [
        "--channel 11111111111111111111111111111111111111111111",
        "--lamports 1000",
      ],
    },
    {
      base: "escrow balance",
      options: ["--channel 11111111111111111111111111111111111111111111"],
    },
    { base: "escrow list", options: ["--limit 1"] },

    { base: "config show", options: [] },
  ];

  const results: Array<{ command: string; exit: number }> = [];

  for (const spec of specs) {
    const combos = combinations(spec.options);
    for (const combo of combos) {
      const cmd = `${spec.base} ${combo.join(" ")}`.trim();
      const res = await runCommand(cmd, globalOpts);
      results.push({ command: cmd, exit: res.exitCode });
    }
  }

  if (endpoint) {
    await runCommand("config clear-endpoint", globalOpts);
  }

  const data = [["Command", "Exit", "Result"]];
  for (const r of results) {
    data.push([r.command, String(r.exit), r.exit === 0 ? "PASS" : "FAIL"]);
  }
  console.log(table(data));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
