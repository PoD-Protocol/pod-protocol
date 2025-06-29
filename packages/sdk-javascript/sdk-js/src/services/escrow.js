/**
 * Escrow service for PoD Protocol SDK
 */

import { BaseService } from './base.js';
import { SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { findAgentPDA, findEscrowPDA } from '../utils/pda.js';

/**
 * Service for managing escrow deposits and payments in the PoD Protocol
 * 
 * @class EscrowService
 * @extends BaseService
 */
export class EscrowService extends BaseService {
  /**
   * Deposit funds into escrow for a channel
   * @param {Object} options - Deposit options
   * @param {Object} wallet - Depositor's wallet
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.escrow.deposit({
   *   channel: channelPDA,
   *   amount: 5000000 // lamports
   * }, wallet);
   * ```
   */
  async deposit(options, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    // Derive PDAs
    const [agentPDA] = await findAgentPDA(wallet.publicKey, this.programId);

    // Derive escrow PDA
    const [escrowPDA] = await findEscrowPDA(options.channel, wallet.publicKey, this.programId);

    return this.retry(async () => {
      const tx = await this.program.methods
        .depositEscrow(new BN(options.amount))
        .accounts({
          escrowAccount: escrowPDA,
          channel: options.channel,
          depositor: wallet.publicKey,
          depositorAgent: agentPDA,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Withdraw funds from escrow
   * @param {Object} options - Withdrawal options  
   * @param {Object} wallet - Depositor's wallet
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.escrow.withdraw({
   *   channel: channelPDA,
   *   amount: 1000000 // lamports
   * }, wallet);
   * ```
   */
  async withdraw(options, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    // Derive PDAs
    const [agentPDA] = await findAgentPDA(wallet.publicKey, this.programId);

    // Derive escrow PDA
    const [escrowPDA] = await findEscrowPDA(options.channel, wallet.publicKey, this.programId);

    return this.retry(async () => {
      const tx = await this.program.methods
        .withdrawEscrow(new BN(options.amount))
        .accounts({
          escrowAccount: escrowPDA,
          channel: options.channel,
          depositor: wallet.publicKey,
          depositorAgent: agentPDA,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Get escrow account by channel and depositor
   * @param {string} channel - Channel public key
   * @param {string} depositor - Depositor's public key
   * @returns {Promise<Object|null>} Escrow account data
   * 
   * @example
   * ```javascript
   * const escrow = await client.escrow.get(channelPDA, depositorAddress);
   * if (escrow) {
   *   console.log('Escrow balance:', escrow.balance);
   * }
   * ```
   */
  async get(channel, depositor) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const [escrowPDA] = await findEscrowPDA(channel, depositor, this.programId);
      const escrowAccount = await this.program.account.escrowAccount.fetch(escrowPDA);
      
      return {
        pubkey: escrowPDA,
        ...escrowAccount,
        // Convert BN to number for JavaScript compatibility
        balance: escrowAccount.balance.toNumber(),
        createdAt: escrowAccount.createdAt.toNumber(),
        lastUpdated: escrowAccount.lastUpdated.toNumber()
      };
    } catch (error) {
      if (error.message?.includes('Account does not exist')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List escrow accounts by depositor
   * @param {string} depositor - Depositor's public key
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Maximum number of results
   * @returns {Promise<Object[]>} Array of escrow accounts
   * 
   * @example
   * ```javascript
   * const escrows = await client.escrow.getByDepositor(depositorAddress, { limit: 20 });
   * ```
   */
  async getByDepositor(depositor, options = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.escrowAccount.all();
      let escrows = accounts
        .filter(account => account.account.depositor.equals(depositor))
        .map(account => ({
          channel: account.account.channel,
          depositor: account.account.depositor,
          balance: account.account.balance?.toNumber() || 0,
          amount: account.account.balance?.toNumber() || 0,
          createdAt: account.account.createdAt?.toNumber() || Date.now(),
          lastUpdated: account.account.lastUpdated?.toNumber() || Date.now(),
          bump: account.account.bump
        }));

      // Sort by creation date (newest first)
      escrows.sort((a, b) => b.createdAt - a.createdAt);

      if (options.limit) {
        escrows = escrows.slice(0, options.limit);
      }

      return escrows;
    } catch (error) {
      throw new Error(`Failed to get escrows by depositor: ${error.message}`);
    }
  }

  /**
   * List escrow accounts by channel
   * @param {string} channel - Channel public key
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Maximum number of results
   * @returns {Promise<Object[]>} Array of escrow accounts
   * 
   * @example
   * ```javascript
   * const escrows = await client.escrow.getByChannel(channelPDA, { limit: 20 });
   * ```
   */
  async getByChannel(channel, options = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.escrowAccount.all();
      let escrows = accounts
        .filter(account => account.account.channel.equals(channel))
        .map(account => ({
          channel: account.account.channel,
          depositor: account.account.depositor,
          balance: account.account.balance?.toNumber() || 0,
          amount: account.account.balance?.toNumber() || 0,
          createdAt: account.account.createdAt?.toNumber() || Date.now(),
          lastUpdated: account.account.lastUpdated?.toNumber() || Date.now(),
          bump: account.account.bump
        }));

      // Sort by creation date (newest first)
      escrows.sort((a, b) => b.createdAt - a.createdAt);

      if (options.limit) {
        escrows = escrows.slice(0, options.limit);
      }

      return escrows;
    } catch (error) {
      throw new Error(`Failed to get escrows by channel: ${error.message}`);
    }
  }

  /**
   * Get total escrow balance for a channel
   * @param {string} channel - Channel public key
   * @returns {Promise<number>} Total balance in lamports
   * 
   * @example
   * ```javascript
   * const totalBalance = await client.escrow.getTotalBalance(channelPDA);
   * console.log('Total escrow balance:', totalBalance);
   * ```
   */
  async getTotalBalance(channel) {
    const escrows = await this.getByChannel(channel);
    return escrows.reduce((total, escrow) => total + escrow.balance, 0);
  }

  /**
   * Check if depositor has sufficient escrow balance for a channel
   * 
   * @param {string} channel - Channel public key
   * @param {string} depositor - Depositor's public key
   * @param {number} requiredAmount - Required amount in lamports
   * @returns {Promise<boolean>} True if sufficient balance
   * 
   * @example
   * ```javascript
   * const hasSufficientBalance = await client.escrow.hasSufficientBalance(
   *   channelPDA, 
   *   depositorAddress, 
   *   1000000
   * );
   * ```
   */
  async hasSufficientBalance(channel, depositor, requiredAmount) {
    const escrow = await this.get(channel, depositor);
    return escrow ? escrow.balance >= requiredAmount : false;
  }

  /**
   * Create escrow deposit instruction for advanced transaction building
   * @param {Object} options - Deposit options
   * @param {string} channel - Channel public key
   * @param {string} depositor - Depositor's public key
   * @param {number} amount - Amount to deposit in lamports
   * @returns {Promise<Object>} Deposit instruction
   */
  async createEscrowInstruction(options, channel, depositor, amount) {
    // ... existing implementation
  }
}
