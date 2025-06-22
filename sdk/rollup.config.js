import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.js",
      format: "cjs",
      sourcemap: true,
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
    },
  ],
  plugins: [
    json(),
    resolve({
      browser: false,
      preferBuiltins: true,
      exportConditions: ["node"],
      skip: ["ipfs-http-client", "multiformats"],
    }),
    commonjs({
      include: ["node_modules/**"],
    }),
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true,
      declarationDir: "dist",
      outputToFilesystem: true,
      exclude: ["**/*.test.ts", "node_modules/**"],
      noEmitOnError: false,
      compilerOptions: {
        composite: false,
        incremental: false,
        skipLibCheck: true,
      },
    }),
  ],
  external: [
    "@solana/web3.js",
    "@coral-xyz/anchor",
    "@solana/wallet-adapter-base",
    "ipfs-http-client",
    "multiformats",
    "@lightprotocol/stateless.js",
    "@lightprotocol/compressed-token",
  ],
};
