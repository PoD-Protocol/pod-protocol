/**
 * Comprehensive utilities for PoD Protocol JavaScript SDK
 * This file provides feature parity with the TypeScript SDK
 */

// Import removed - Web3.js v2.0 uses different import patterns
import CryptoJS from 'crypto-js';

// Re-export from specific utility files
export * from './pda.js';
export * from './crypto.js';
export * from './secureMemory.js';

// Advanced security and blockchain utilities
export * from './advanced-security.js';
export * from './blockchain-progress.js';
export * from './multichain-defi.js';

// Message Type constants and utilities
export const MessageType = {
  Text: 'Text',
  Data: 'Data', 
  Command: 'Command',
  Response: 'Response',
  Custom: 'Custom'
};

/**
 * Convert MessageType to numeric ID
 * 
 * @param {string} messageType - Message type string
 * @param {number} [customValue] - Custom value for Custom type
 * @returns {number} Numeric message type ID
 */
export function getMessageTypeId(messageType, customValue) {
  switch (messageType) {
    case MessageType.Text:
      return 0;
    case MessageType.Data:
      return 1;
    case MessageType.Command:
      return 2;
    case MessageType.Response:
      return 3;
    case MessageType.Custom:
      return 4 + (customValue || 0);
    default:
      throw new Error(`Unknown message type: ${messageType}`);
  }
}

/**
 * Convert numeric ID back to MessageType
 * 
 * @param {number} id - Message type ID
 * @returns {Object} Message type and custom value
 */
export function getMessageTypeFromId(id) {
  if (id === 0) return { type: MessageType.Text };
  if (id === 1) return { type: MessageType.Data };
  if (id === 2) return { type: MessageType.Command };
  if (id === 3) return { type: MessageType.Response };
  if (id >= 4) return { type: MessageType.Custom, customValue: id - 4 };

  throw new Error(`Unknown message type ID: ${id}`);
}

/**
 * Convert MessageType to program format
 * 
 * @param {string} messageType - Message type string
 * @param {number} [customValue] - Custom value for Custom type
 * @returns {Object} Program format message type
 */
export function convertMessageTypeToProgram(messageType, customValue) {
  switch (messageType) {
    case MessageType.Text:
      return { text: {} };
    case MessageType.Data:
      return { data: {} };
    case MessageType.Command:
      return { command: {} };
    case MessageType.Response:
      return { response: {} };
    case MessageType.Custom:
      return { custom: customValue || 0 };
    default:
      return { text: {} };
  }
}

/**
 * Convert program format back to MessageType
 * 
 * @param {Object} programType - Program format message type
 * @returns {Object} Message type and custom value
 */
export function convertMessageTypeFromProgram(programType) {
  if (programType.text !== undefined) return { type: MessageType.Text };
  if (programType.data !== undefined) return { type: MessageType.Data };
  if (programType.command !== undefined) return { type: MessageType.Command };
  if (programType.response !== undefined) return { type: MessageType.Response };
  if (programType.custom !== undefined)
    return { type: MessageType.Custom, customValue: programType.custom };
  return { type: MessageType.Text };
}

/**
 * Get message type ID from object format
 * 
 * @param {Object} msg - Message object
 * @returns {number} Message type ID
 */
export function getMessageTypeIdFromObject(msg) {
  if (msg.text !== undefined) return 0;
  if (msg.data !== undefined) return 1;
  if (msg.command !== undefined) return 2;
  if (msg.response !== undefined) return 3;
  if (typeof msg.custom === 'number') return 4 + msg.custom;
  return 0;
}

/**
 * Retry function with exponential backoff
 * 
 * @param {Function} fn - Function to retry
 * @param {number} [maxAttempts=3] - Maximum retry attempts
 * @param {number} [baseDelay=1000] - Base delay in milliseconds
 * @returns {Promise} Result of function
 */
export async function retry(fn, maxAttempts = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if capabilities include a specific capability
 * 
 * @param {number} capabilities - Capabilities bitmask
 * @param {number} capability - Capability to check
 * @returns {boolean} True if capability is present
 */
export function hasCapability(capabilities, capability) {
  return (capabilities & capability) === capability;
}

/**
 * Add capability to capabilities bitmask
 * 
 * @param {number} capabilities - Current capabilities
 * @param {number} capability - Capability to add
 * @returns {number} Updated capabilities
 */
export function addCapability(capabilities, capability) {
  return capabilities | capability;
}

/**
 * Remove capability from capabilities bitmask
 * 
 * @param {number} capabilities - Current capabilities
 * @param {number} capability - Capability to remove
 * @returns {number} Updated capabilities
 */
export function removeCapability(capabilities, capability) {
  return capabilities & ~capability;
}

/**
 * Get capability names from bitmask
 * 
 * @param {number} capabilities - Capabilities bitmask
 * @returns {string[]} Array of capability names
 */
export function getCapabilityNames(capabilities) {
  const names = [];
  const AGENT_CAPABILITIES = {
    MESSAGING: 1,
    ANALYSIS: 2,
    TRADING: 4,
    LEARNING: 8,
    PREDICTION: 16,
    AUTOMATION: 32
  };

  Object.entries(AGENT_CAPABILITIES).forEach(([name, value]) => {
    if (hasCapability(capabilities, value)) {
      names.push(name);
    }
  });

  return names;
}

/**
 * Convert timestamp from various formats
 * 
 * @param {*} timestamp - Timestamp in various formats
 * @param {*} [fallback] - Fallback value
 * @returns {number} Unix timestamp in seconds
 */
export function convertTimestamp(timestamp, fallback) {
  if (timestamp === null || timestamp === undefined) {
    return fallback ? convertTimestamp(fallback) : Math.floor(Date.now() / 1000);
  }

  if (typeof timestamp === 'number') {
    return timestamp;
  }

  if (timestamp.toNumber && typeof timestamp.toNumber === 'function') {
    return timestamp.toNumber();
  }

  return Math.floor(Date.now() / 1000);
}

/**
 * Get account timestamp
 * 
 * @param {Object} account - Account object
 * @returns {number} Timestamp
 */
export function getAccountTimestamp(account) {
  return convertTimestamp(account.timestamp);
}

/**
 * Get account created timestamp
 * 
 * @param {Object} account - Account object
 * @returns {number} Created timestamp
 */
export function getAccountCreatedAt(account) {
  return convertTimestamp(account.createdAt || account.timestamp);
}

/**
 * Get account last updated timestamp
 * 
 * @param {Object} account - Account object
 * @returns {number} Last updated timestamp
 */
export function getAccountLastUpdated(account) {
  return convertTimestamp(account.lastUpdated || account.updatedAt || account.timestamp);
}

/**
 * Format public key for display
 * 
 * @param {string} pubkey - Public key
 * @param {number} [length=8] - Display length
 * @returns {string} Formatted public key
 */
export function formatAddress(pubkey, length = 8) {
  const keyStr = pubkey.toString ? pubkey.toString() : pubkey;
  if (keyStr.length <= length * 2) {
    return keyStr;
  }
  return `${keyStr.slice(0, length)}...${keyStr.slice(-length)}`;
}

/**
 * Format time duration in human readable format
 * 
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format bytes in human readable format
 * 
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted bytes
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate capabilities bitmask
 * 
 * @param {number} capabilities - Capabilities to validate
 * @returns {boolean} True if valid
 */
export function validateCapabilities(capabilities) {
  return Number.isInteger(capabilities) && capabilities >= 0 && capabilities <= 0xFFFFFFFF;
}

/**
 * Sleep for specified milliseconds
 * 
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after sleep
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Confirm transaction with retries
 * 
 * @param {Object} connection - Solana connection
 * @param {string} signature - Transaction signature
 * @param {number} [maxRetries=10] - Maximum retries
 * @param {number} [delay=1000] - Delay between retries
 * @returns {Promise} True if confirmed
 */
export async function confirmTransaction(connection, signature, maxRetries = 10, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const status = await connection.getSignatureStatus(signature);
      if (status?.value?.confirmationStatus === 'confirmed' || 
          status?.value?.confirmationStatus === 'finalized') {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

/**
 * Validates and normalizes client configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validated configuration
 */
export function validateConfig(config = {}) {
  const validated = {
    endpoint: config.endpoint || 'https://api.devnet.solana.com',
    commitment: config.commitment || 'confirmed',
    programId: config.programId,
    ipfs: config.ipfs || {},
    zkCompression: config.zkCompression || {},
    jitoRpcUrl: config.jitoRpcUrl
  };

  // Validate endpoint format
  if (typeof validated.endpoint !== 'string' || !validated.endpoint.startsWith('http')) {
    throw new Error('Invalid RPC endpoint format');
  }

  // Validate commitment level
  const validCommitments = ['processed', 'confirmed', 'finalized'];
  if (!validCommitments.includes(validated.commitment)) {
    throw new Error(`Invalid commitment level. Must be one of: ${validCommitments.join(', ')}`);
  }

  return validated;
}

/**
 * Loads program IDL with fallback support
 * @param {string} programId - Program ID
 * @returns {Promise<Object>} Program IDL
 */
export async function loadIDL(programId) {
  try {
    // Try to load IDL from multiple sources
    if (typeof window === 'undefined') {
      // Node.js environment
      try {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const idlPath = path.join(__dirname, '..', '..', 'pod_com.json');
        
        if (fs.existsSync(idlPath)) {
          const idlData = fs.readFileSync(idlPath, 'utf8');
          return JSON.parse(idlData);
        }
      } catch (fsError) {
        console.warn('Could not load IDL from file system:', fsError.message);
      }
    }
    
    // Fallback: Create a minimal IDL structure for basic functionality
    return createMinimalIDL();
  } catch (error) {
    console.warn('Failed to load IDL, using minimal fallback:', error);
    return createMinimalIDL();
  }
}

/**
 * Creates a minimal IDL for basic functionality
 * @returns {Object} Minimal IDL structure
 */
function createMinimalIDL() {
  return {
    version: "1.0.0",
    name: "pod_com",
    instructions: [
      {
        name: "registerAgent",
        accounts: [
          { name: "agentAccount", isMut: true, isSigner: false },
          { name: "signer", isMut: true, isSigner: true },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: [
          { name: "capabilities", type: "u32" },
          { name: "metadataUri", type: "string" }
        ]
      },
      {
        name: "updateAgent",
        accounts: [
          { name: "agentAccount", isMut: true, isSigner: false },
          { name: "signer", isMut: true, isSigner: true }
        ],
        args: [
          { name: "capabilities", type: { option: "u32" } },
          { name: "metadataUri", type: { option: "string" } }
        ]
      },
      {
        name: "sendMessage",
        accounts: [
          { name: "messageAccount", isMut: true, isSigner: false },
          { name: "sender", isMut: true, isSigner: true },
          { name: "recipient", isMut: false, isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: [
          { name: "payloadHash", type: { array: ["u8", 32] } },
          { name: "payload", type: "string" },
          { name: "messageType", type: "u8" },
          { name: "expiresAt", type: "i64" }
        ]
      },
      {
        name: "updateMessageStatus",
        accounts: [
          { name: "messageAccount", isMut: true, isSigner: false },
          { name: "signer", isMut: true, isSigner: true }
        ],
        args: [
          { name: "status", type: "string" }
        ]
      },
      {
        name: "createChannel",
        accounts: [
          { name: "channelAccount", isMut: true, isSigner: false },
          { name: "creator", isMut: true, isSigner: true },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: [
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "visibility", type: "u8" },
          { name: "maxMembers", type: "u32" }
        ]
      }
    ],
    accounts: [
      {
        name: "AgentAccount",
        type: {
          kind: "struct",
          fields: [
            { name: "capabilities", type: "u32" },
            { name: "metadataUri", type: "string" },
            { name: "reputation", type: "u32" },
            { name: "lastUpdated", type: "i64" },
            { name: "invitesSent", type: "u32" },
            { name: "lastInviteAt", type: "i64" },
            { name: "bump", type: "u8" }
          ]
        }
      },
      {
        name: "MessageAccount",
        type: {
          kind: "struct",
          fields: [
            { name: "sender", type: "publicKey" },
            { name: "recipient", type: "publicKey" },
            { name: "payloadHash", type: { array: ["u8", 32] } },
            { name: "payload", type: "string" },
            { name: "messageType", type: "u8" },
            { name: "timestamp", type: "i64" },
            { name: "expiresAt", type: "i64" },
            { name: "status", type: "string" },
            { name: "bump", type: "u8" }
          ]
        }
      },
      {
        name: "ChannelAccount",
        type: {
          kind: "struct",
          fields: [
            { name: "name", type: "string" },
            { name: "description", type: "string" },
            { name: "creator", type: "publicKey" },
            { name: "visibility", type: "u8" },
            { name: "maxMembers", type: "u32" },
            { name: "memberCount", type: "u32" },
            { name: "lastUpdated", type: "i64" },
            { name: "bump", type: "u8" }
          ]
        }
      }
    ],
    errors: [
      { code: 6000, name: "InvalidMetadataUriLength", msg: "Invalid metadata URI length" },
      { code: 6001, name: "Unauthorized", msg: "Unauthorized operation" },
      { code: 6002, name: "MessageExpired", msg: "Message has expired" },
      { code: 6003, name: "InvalidMessageStatusTransition", msg: "Invalid message status transition" },
      { code: 6004, name: "InsufficientAccounts", msg: "Insufficient accounts provided" },
      { code: 6005, name: "InvalidAccountData", msg: "Invalid account data" },
      { code: 6006, name: "InvalidInstructionData", msg: "Invalid instruction data" }
    ]
  };
} 