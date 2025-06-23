/**
 * Secure memory utilities for handling sensitive cryptographic data
 * in the PoD Protocol CLI
 */

import sodium from 'node-sodium';

/**
 * Secure buffer wrapper for sensitive data operations
 */
export class SecureBuffer {
  private buffer: Buffer;
  private locked: boolean = false;

  constructor(size: number) {
    // Allocate secure memory using sodium
    this.buffer = sodium.sodium_malloc(size);
    
    // Attempt to lock memory (may fail on some systems)
    try {
      sodium.sodium_mlock(this.buffer);
      this.locked = true;
    } catch (error) {
      // Memory locking not available, continue without it
      console.warn('Memory locking not available:', error);
    }
  }

  /**
   * Get the underlying buffer (use with caution)
   */
  getBuffer(): Buffer {
    return this.buffer;
  }

  /**
   * Write data to secure buffer
   */
  write(data: Buffer | Uint8Array | string, offset: number = 0): void {
    if (typeof data === 'string') {
      this.buffer.write(data, offset, 'utf8');
    } else {
      Buffer.from(data).copy(this.buffer, offset);
    }
  }

  /**
   * Read data from secure buffer
   */
  read(start?: number, end?: number): Buffer {
    return this.buffer.subarray(start, end);
  }

  /**
   * Compare two buffers in constant time
   */
  static secureCompare(a: Buffer, b: Buffer): boolean {
    return sodium.sodium_memcmp(a, b) === 0;
  }

  /**
   * Securely wipe the buffer
   */
  wipe(): void {
    sodium.sodium_memzero(this.buffer);
  }

  /**
   * Free secure memory
   */
  destroy(): void {
    try {
      this.wipe();
      
      if (this.locked) {
        sodium.sodium_munlock(this.buffer);
      }
      
      sodium.sodium_free(this.buffer);
    } catch (error) {
      console.error('Error destroying secure buffer:', error);
    }
  }
}

/**
 * Secure keypair loader with memory protection
 */
export class SecureKeypairLoader {
  private static async readKeypairFile(path: string): Promise<SecureBuffer> {
    const fs = await import('fs/promises');
    const fileData = await fs.readFile(path);
    
    // Parse the keypair array
    const keypairArray = JSON.parse(fileData.toString());
    
    if (!Array.isArray(keypairArray) || keypairArray.length !== 64) {
      throw new Error('Invalid keypair file format');
    }

    // Store in secure memory
    const secureBuffer = new SecureBuffer(64);
    secureBuffer.write(Buffer.from(keypairArray));
    
    return secureBuffer;
  }

  /**
   * Load a Solana keypair from file into secure memory
   */
  static async loadKeypair(path: string): Promise<{ publicKey: Buffer; secretKey: SecureBuffer }> {
    const secureBuffer = await this.readKeypairFile(path);
    const keypairData = secureBuffer.getBuffer();
    
    // Extract public and private keys
    const secretKey = new SecureBuffer(32);
    const publicKey = Buffer.alloc(32);
    
    // Copy secret key to secure buffer
    secretKey.write(keypairData.subarray(0, 32));
    
    // Copy public key (less sensitive)
    keypairData.subarray(32, 64).copy(publicKey);
    
    // Wipe the original buffer
    secureBuffer.destroy();
    
    return { publicKey, secretKey };
  }
}

/**
 * Secure hash computation for sensitive data
 */
export class SecureHasher {
  /**
   * Compute hash of sensitive data using secure memory
   */
  static async hashSensitiveData(data: Buffer | string): Promise<Buffer> {
    const inputData = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    
    // Use secure buffer for input data
    const secureInput = new SecureBuffer(inputData.length);
    secureInput.write(inputData);
    
    try {
      // Compute hash using sodium
      const hash = sodium.crypto_hash_sha256(secureInput.getBuffer());
      return hash;
    } finally {
      // Always clean up secure memory
      secureInput.destroy();
    }
  }

  /**
   * Generate secure random bytes
   */
  static generateSecureRandom(size: number): Buffer {
    return sodium.randombytes_buf(size);
  }
}

/**
 * Utility function to securely clear a regular buffer
 */
export function secureWipe(buffer: Buffer): void {
  sodium.sodium_memzero(buffer);
}

/**
 * Utility function for secure string handling
 */
export function withSecureString<T>(
  str: string,
  callback: (buffer: SecureBuffer) => T
): T {
  const secureBuffer = new SecureBuffer(Buffer.byteLength(str, 'utf8'));
  secureBuffer.write(str);
  
  try {
    return callback(secureBuffer);
  } finally {
    secureBuffer.destroy();
  }
}