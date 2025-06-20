import { PodComClient, MessageType, MessageStatus } from "@pod-protocol/sdk";
import { GlobalOptions } from "../../utils/shared.js";
import { Keypair } from "@solana/web3.js";

export interface CommandContext {
  client: PodComClient;
  wallet: Keypair; // Or a more specific wallet interface type
  globalOpts: GlobalOptions;
}

export interface SendMessageOptions {
  recipient?: string;
  payload?: string;
  type?: MessageType;
  customValue?: string;
  interactive?: boolean;
}

export interface MessageInfoOptions {
  messageId: string;
}

export interface MessageStatusOptions {
  message?: string;
  status?: string;
}

export interface MessageListOptions {
  agent?: string;
  limit?: string;
  filter?: MessageStatus;
}
