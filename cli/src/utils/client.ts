import { PodComClient } from "@pod-protocol/sdk";
import { getNetworkEndpoint, loadKeypair } from "./config.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl-async";

function zeroize(buf: Uint8Array): void {
  buf.fill(0);
}

export async function createClient(
  network?: string,
  wallet?: any,
): Promise<PodComClient> {
  const client = new PodComClient({
    endpoint: getNetworkEndpoint(network),
    commitment: "confirmed",
    zkCompression: {
      lightRpcUrl: process.env.LIGHT_RPC_URL,
      compressionRpcUrl: process.env.COMPRESSION_RPC_URL,
      proverUrl: process.env.PROVER_URL,
      photonIndexerUrl: process.env.PHOTON_INDEXER_URL,
      lightSystemProgram: process.env.LIGHT_SYSTEM_PROGRAM
        ? new PublicKey(process.env.LIGHT_SYSTEM_PROGRAM)
        : undefined,
      nullifierQueuePubkey: process.env.LIGHT_NULLIFIER_QUEUE
        ? new PublicKey(process.env.LIGHT_NULLIFIER_QUEUE)
        : undefined,
      cpiAuthorityPda: process.env.LIGHT_CPI_AUTHORITY
        ? new PublicKey(process.env.LIGHT_CPI_AUTHORITY)
        : undefined,
      compressedTokenProgram: process.env.LIGHT_COMPRESSED_TOKEN_PROGRAM
        ? new PublicKey(process.env.LIGHT_COMPRESSED_TOKEN_PROGRAM)
        : undefined,
      registeredProgramId: process.env.LIGHT_REGISTERED_PROGRAM_ID
        ? new PublicKey(process.env.LIGHT_REGISTERED_PROGRAM_ID)
        : undefined,
      noopProgram: process.env.LIGHT_NOOP_PROGRAM
        ? new PublicKey(process.env.LIGHT_NOOP_PROGRAM)
        : undefined,
      accountCompressionAuthority: process.env.LIGHT_ACCOUNT_COMPRESSION_AUTHORITY
        ? new PublicKey(process.env.LIGHT_ACCOUNT_COMPRESSION_AUTHORITY)
        : undefined,
      accountCompressionProgram: process.env.LIGHT_ACCOUNT_COMPRESSION_PROGRAM
        ? new PublicKey(process.env.LIGHT_ACCOUNT_COMPRESSION_PROGRAM)
        : undefined,
    },
  });
  await client.initialize(wallet);
  return client;
}

export function getWallet(keypairPath?: string): any {
  const tmpKeypair = loadKeypair(keypairPath);
  const publicKey = tmpKeypair.publicKey;
  zeroize(tmpKeypair.secretKey);

  // Return wallet-like interface that Anchor expects
  return {
    publicKey,
    signTransaction: async (tx: any) => {
      const signer = loadKeypair(keypairPath);
      tx.partialSign(signer);
      zeroize(signer.secretKey);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      const signer = loadKeypair(keypairPath);
      txs.forEach((tx) => {
        tx.partialSign(signer);
      });
      zeroize(signer.secretKey);
      return txs;
    },
  };
}

export function getKeypair(keypairPath?: string): Keypair {
  return loadKeypair(keypairPath);
}
