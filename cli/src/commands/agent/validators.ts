import { PublicKey } from "@solana/web3.js";

export const validateAgentAddress = (address: string): void => {
  try {
    new PublicKey(address);
  } catch {
    throw new Error(`Invalid agent address: ${address}`);
  }
};

export const validateCapabilities = (capabilities: string): number => {
  const numCaps = parseInt(capabilities, 10);
  if (isNaN(numCaps) || numCaps < 0 || numCaps > 255) {
    throw new Error(
      "Invalid capabilities: must be a number between 0 and 255",
    );
  }
  return numCaps;
};

export const validateMetadataUri = (uri: string): void => {
  if (uri && !isValidUri(uri)) {
    throw new Error(`Invalid metadata URI: ${uri}`);
  }
};

export const validateLimit = (limit: string): number => {
  const numLimit = parseInt(limit, 10);
  if (isNaN(numLimit) || numLimit <= 0) {
    throw new Error("Invalid limit: must be a positive number");
  }
  return numLimit;
};

const isValidUri = (uri: string): boolean => {
  try {
    new URL(uri);
    return true;
  } catch {
    return false;
  }
};

export const AgentValidators = {
  validateAgentAddress,
  validateCapabilities,
  validateMetadataUri,
  validateLimit,
};
