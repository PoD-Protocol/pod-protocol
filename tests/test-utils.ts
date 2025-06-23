// Re-export commonly used utilities from SDK to eliminate duplication
export {
  findAgentPDA,
  findMessagePDA,
  findChannelPDA,
  findEscrowPDA,
  findInvitationPDA,
  findParticipantPDA,
  hashPayload,
  MessageType,
  getMessageTypeIdFromObject as getMessageTypeId,
} from "../sdk/src/utils";
export { MessageType as MessageTypeObject } from "../sdk/src/types";

import { PublicKey } from "@solana/web3.js";

// Legacy types for backward compatibility in tests
export type MessageStatus = {
  pending?: Record<string, never>;
  delivered?: Record<string, never>;
  read?: Record<string, never>;
  failed?: Record<string, never>;
};
