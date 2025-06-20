import { PodComClient } from "@pod-protocol/sdk";
import { GlobalOptions } from "../../utils/shared.js";
import { Keypair } from "@solana/web3.js";

export interface CommandContext {
  client: PodComClient;
  wallet: Keypair; // Or a more specific wallet interface type
  globalOpts: GlobalOptions;
}

export interface AgentRegisterOptions {
  capabilities?: string;
  metadata?: string;
  interactive?: boolean;
}

export interface AgentListOptions {
  limit?: string;
}

export interface AgentUpdateOptions {
  capabilities?: string;
  metadata?: string;
  agent?: string;
  interactive?: boolean;
}
