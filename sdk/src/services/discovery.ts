import { PublicKey, GetProgramAccountsFilter } from "@solana/web3.js";
import { BaseService } from "./base";
import {
  AgentAccount,
  MessageAccount,
  ChannelAccount,
  MessageStatus,
  ChannelVisibility,
  MessageType,
} from "../types";
import {
  hasCapability,
  getCapabilityNames,
  formatPublicKey,
  isValidPublicKey,
  getAccountTimestamp,
  getAccountCreatedAt,
  getAccountLastUpdated,
} from "../utils";

/**
 * Search and discovery service for finding agents, channels, and messages
 */

export interface SearchFilters {
  limit?: number;
  offset?: number;
  sortBy?: "relevance" | "recent" | "popular" | "reputation";
  sortOrder?: "asc" | "desc";
}

export interface AgentSearchFilters extends SearchFilters {
  capabilities?: number[];
  minReputation?: number;
  maxReputation?: number;
  metadataContains?: string;
  lastActiveAfter?: number;
  lastActiveBefore?: number;
}

export interface MessageSearchFilters extends SearchFilters {
  sender?: PublicKey;
  recipient?: PublicKey;
  status?: MessageStatus[];
  messageType?: MessageType[];
  createdAfter?: number;
  createdBefore?: number;
  payloadContains?: string;
}

export interface ChannelSearchFilters extends SearchFilters {
  creator?: PublicKey;
  visibility?: ChannelVisibility[];
  nameContains?: string;
  descriptionContains?: string;
  minParticipants?: number;
  maxParticipants?: number;
  maxFeePerMessage?: number;
  hasEscrow?: boolean;
  createdAfter?: number;
  createdBefore?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  searchParams: any;
  executionTime: number;
}

export interface RecommendationOptions {
  forAgent?: PublicKey;
  limit?: number;
  includeReason?: boolean;
}

export interface Recommendation<T> {
  item: T;
  score: number;
  reason?: string;
}

export class DiscoveryService extends BaseService {
  /**
   * Search for agents with advanced filtering
   */
  async searchAgents(
    filters: AgentSearchFilters = {},
  ): Promise<SearchResult<AgentAccount>> {
    const startTime = Date.now();

    try {
      const programFilters: GetProgramAccountsFilter[] = [
        {
          memcmp: {
            offset: 0,
            bytes: this.getDiscriminator("agentAccount"),
          },
        },
      ];

      // Add capability filters
      if (filters.capabilities && filters.capabilities.length > 0) {
        // Filter by capabilities after fetching accounts
        // Capabilities are stored as a u64 bitmask in the agent account
        // We'll implement in-memory filtering based on the decoded account data
      }

      const accounts = await this.connection.getProgramAccounts(
        this.programId,
        {
          filters: programFilters,
          commitment: this.commitment,
        },
      );

      let agents: AgentAccount[] = accounts.map((acc) => {
        const account = this.ensureInitialized().coder.accounts.decode(
          "agentAccount",
          acc.account.data,
        );
        return {
          pubkey: acc.pubkey,
          capabilities: account.capabilities.toNumber(),
          metadataUri: account.metadataUri,
          reputation: account.reputation?.toNumber() || 0,
          lastUpdated: getAccountLastUpdated(account),
          bump: account.bump,
        };
      });

      // Apply in-memory filters
      agents = this.applyAgentFilters(agents, filters);

      // Apply sorting
      agents = this.sortAgents(agents, filters);

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedAgents = agents.slice(offset, offset + limit);

      return {
        items: paginatedAgents,
        total: agents.length,
        hasMore: offset + limit < agents.length,
        searchParams: filters,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      throw new Error(`Agent search failed: ${error.message}`);
    }
  }

  /**
   * Search for messages with advanced filtering
   */
  async searchMessages(
    filters: MessageSearchFilters = {},
  ): Promise<SearchResult<MessageAccount>> {
    const startTime = Date.now();

    try {
      const programFilters: GetProgramAccountsFilter[] = [
        {
          memcmp: {
            offset: 0,
            bytes: this.getDiscriminator("messageAccount"),
          },
        },
      ];

      // Add sender filter
      if (filters.sender) {
        programFilters.push({
          memcmp: {
            offset: 8 + 32, // After discriminator and first field
            bytes: filters.sender.toBase58(),
          },
        });
      }

      // Add recipient filter
      if (filters.recipient) {
        programFilters.push({
          memcmp: {
            offset: 8 + 32 + 32, // After discriminator, sender, and recipient
            bytes: filters.recipient.toBase58(),
          },
        });
      }

      const accounts = await this.connection.getProgramAccounts(
        this.programId,
        {
          filters: programFilters,
          commitment: this.commitment,
        },
      );

      let messages: MessageAccount[] = accounts.map((acc) => {
        const account = this.ensureInitialized().coder.accounts.decode(
          "messageAccount",
          acc.account.data,
        );
        return {
          pubkey: acc.pubkey,
          sender: account.sender,
          recipient: account.recipient,
          payload: account.payload || "",
          payloadHash: account.payloadHash,
          messageType: this.convertMessageTypeFromProgram(account.messageType),
          status: this.convertMessageStatusFromProgram(account.status),
          timestamp: getAccountTimestamp(account),
          createdAt: getAccountCreatedAt(account),
          expiresAt: account.expiresAt?.toNumber() || 0,
          bump: account.bump,
        };
      });

      // Apply in-memory filters
      messages = this.applyMessageFilters(messages, filters);

      // Apply sorting
      messages = this.sortMessages(messages, filters);

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedMessages = messages.slice(offset, offset + limit);

      return {
        items: paginatedMessages,
        total: messages.length,
        hasMore: offset + limit < messages.length,
        searchParams: filters,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      throw new Error(`Message search failed: ${error.message}`);
    }
  }

  /**
   * Search for channels with advanced filtering
   */
  async searchChannels(
    filters: ChannelSearchFilters = {},
  ): Promise<SearchResult<ChannelAccount>> {
    const startTime = Date.now();

    try {
      const programFilters: GetProgramAccountsFilter[] = [
        {
          memcmp: {
            offset: 0,
            bytes: this.getDiscriminator("channelAccount"),
          },
        },
      ];

      // Add creator filter
      if (filters.creator) {
        programFilters.push({
          memcmp: {
            offset: 8, // After discriminator
            bytes: filters.creator.toBase58(),
          },
        });
      }

      const accounts = await this.connection.getProgramAccounts(
        this.programId,
        {
          filters: programFilters,
          commitment: this.commitment,
        },
      );

      let channels: ChannelAccount[] = accounts.map((acc) => {
        const account = this.ensureInitialized().coder.accounts.decode(
          "channelAccount",
          acc.account.data,
        );
        return {
          pubkey: acc.pubkey,
          creator: account.creator,
          name: account.name,
          description: account.description,
          visibility: this.convertChannelVisibilityFromProgram(
            account.visibility,
          ),
          maxParticipants: account.maxParticipants,
          participantCount: account.currentParticipants,
          currentParticipants: account.currentParticipants,
          feePerMessage: account.feePerMessage?.toNumber() || 0,
          escrowBalance: account.escrowBalance?.toNumber() || 0,
          createdAt: getAccountCreatedAt(account),
          isActive: true,
          bump: account.bump,
        };
      });

      // Apply in-memory filters
      channels = this.applyChannelFilters(channels, filters);

      // Apply sorting
      channels = this.sortChannels(channels, filters);

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedChannels = channels.slice(offset, offset + limit);

      return {
        items: paginatedChannels,
        total: channels.length,
        hasMore: offset + limit < channels.length,
        searchParams: filters,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      throw new Error(`Channel search failed: ${error.message}`);
    }
  }

  /**
   * Get recommended agents based on similarity and activity
   */
  async getRecommendedAgents(
    options: RecommendationOptions = {},
  ): Promise<Recommendation<AgentAccount>[]> {
    const agents = await this.searchAgents({ limit: 100 });

    const recommendations: Recommendation<AgentAccount>[] = agents.items.map(
      (agent) => {
        let score = 0;
        const reasons: string[] = [];

        // Score based on reputation
        score += Math.min(agent.reputation / 100, 1) * 0.3;
        if (agent.reputation > 50) {
          reasons.push("High reputation");
        }

        // Score based on capabilities diversity
        const capabilityCount = getCapabilityNames(agent.capabilities).length;
        score += Math.min(capabilityCount / 4, 1) * 0.2;
        if (capabilityCount >= 3) {
          reasons.push("Versatile capabilities");
        }

        // Score based on recent activity
        const daysSinceUpdate =
          (Date.now() - agent.lastUpdated * 1000) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) {
          score += 0.3;
          reasons.push("Recently active");
        } else if (daysSinceUpdate < 30) {
          score += 0.1;
        }

        // Random factor for discovery
        score += Math.random() * 0.2;

        return {
          item: agent,
          score,
          reason: options.includeReason ? reasons.join(", ") : undefined,
        };
      },
    );

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  /**
   * Get recommended channels for an agent
   */
  async getRecommendedChannels(
    options: RecommendationOptions = {},
  ): Promise<Recommendation<ChannelAccount>[]> {
    const channels = await this.searchChannels({
      limit: 100,
      visibility: [ChannelVisibility.Public],
    });

    const recommendations: Recommendation<ChannelAccount>[] =
      channels.items.map((channel) => {
        let score = 0;
        const reasons: string[] = [];

        // Score based on participant count
        const participantRatio =
          channel.participantCount / channel.maxParticipants;
        if (participantRatio > 0.1 && participantRatio < 0.8) {
          score += 0.3;
          reasons.push("Active community");
        }

        // Score based on low fees
        if (channel.feePerMessage === 0) {
          score += 0.2;
          reasons.push("No fees");
        } else if (channel.feePerMessage < 1000) {
          // Less than 0.000001 SOL
          score += 0.1;
          reasons.push("Low fees");
        }

        // Score based on escrow balance (indicates activity)
        if (channel.escrowBalance > 0) {
          score += 0.2;
          reasons.push("Funded channel");
        }

        // Score based on recent creation (discovery factor)
        const daysSinceCreation =
          (Date.now() - channel.createdAt * 1000) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) {
          score += 0.2;
          reasons.push("New channel");
        }

        // Random factor for discovery
        score += Math.random() * 0.1;

        return {
          item: channel,
          score,
          reason: options.includeReason ? reasons.join(", ") : undefined,
        };
      });

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  /**
   * Find similar agents based on capabilities
   */
  async findSimilarAgents(
    targetAgent: AgentAccount,
    limit: number = 10,
  ): Promise<AgentAccount[]> {
    const agents = await this.searchAgents({ limit: 200 });

    const similarities = agents.items
      .filter((agent) => !agent.pubkey.equals(targetAgent.pubkey))
      .map((agent) => {
        const similarity = this.calculateCapabilitySimilarity(
          targetAgent.capabilities,
          agent.capabilities,
        );
        return { agent, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities.map((item) => item.agent);
  }

  /**
   * Get trending channels based on recent activity
   */
  async getTrendingChannels(limit: number = 10): Promise<ChannelAccount[]> {
    const channels = await this.searchChannels({ limit: 100 });

    // Score channels based on multiple factors
    const scoredChannels = channels.items.map((channel) => {
      let trendScore = 0;

      // Growth rate (participants / days since creation)
      const daysSinceCreation = Math.max(
        1,
        (Date.now() - channel.createdAt * 1000) / (1000 * 60 * 60 * 24),
      );
      const growthRate = channel.participantCount / daysSinceCreation;
      trendScore += growthRate * 10;

      // Participation ratio
      const participationRatio =
        channel.participantCount / channel.maxParticipants;
      trendScore += participationRatio * 20;

      // Escrow activity
      if (channel.escrowBalance > 0) {
        trendScore += Math.log(channel.escrowBalance) * 0.1;
      }

      return { channel, trendScore };
    });

    return scoredChannels
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit)
      .map((item) => item.channel);
  }

  // ============================================================================
  // Filter and Sort Helper Methods
  // ============================================================================

  private applyAgentFilters(
    agents: AgentAccount[],
    filters: AgentSearchFilters,
  ): AgentAccount[] {
    return agents.filter((agent) => {
      // Capability filter
      if (filters.capabilities && filters.capabilities.length > 0) {
        const hasRequiredCapabilities = filters.capabilities.some((cap) =>
          hasCapability(agent.capabilities, cap),
        );
        if (!hasRequiredCapabilities) return false;
      }

      // Reputation filters
      if (
        filters.minReputation !== undefined &&
        agent.reputation < filters.minReputation
      ) {
        return false;
      }
      if (
        filters.maxReputation !== undefined &&
        agent.reputation > filters.maxReputation
      ) {
        return false;
      }

      // Metadata filter
      if (filters.metadataContains) {
        const searchTerm = filters.metadataContains.toLowerCase();
        if (!agent.metadataUri.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      // Time-based filters
      if (
        filters.lastActiveAfter !== undefined &&
        agent.lastUpdated * 1000 < filters.lastActiveAfter
      ) {
        return false;
      }
      if (
        filters.lastActiveBefore !== undefined &&
        agent.lastUpdated * 1000 > filters.lastActiveBefore
      ) {
        return false;
      }

      return true;
    });
  }

  private applyMessageFilters(
    messages: MessageAccount[],
    filters: MessageSearchFilters,
  ): MessageAccount[] {
    return messages.filter((message) => {
      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(message.status)) return false;
      }

      // Message type filter
      if (filters.messageType && filters.messageType.length > 0) {
        if (!filters.messageType.includes(message.messageType)) return false;
      }

      // Payload content filter
      if (filters.payloadContains) {
        const searchTerm = filters.payloadContains.toLowerCase();
        if (!message.payload.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      // Time-based filters
      if (
        filters.createdAfter !== undefined &&
        message.createdAt * 1000 < filters.createdAfter
      ) {
        return false;
      }
      if (
        filters.createdBefore !== undefined &&
        message.createdAt * 1000 > filters.createdBefore
      ) {
        return false;
      }

      return true;
    });
  }

  private applyChannelFilters(
    channels: ChannelAccount[],
    filters: ChannelSearchFilters,
  ): ChannelAccount[] {
    return channels.filter((channel) => {
      // Visibility filter
      if (filters.visibility && filters.visibility.length > 0) {
        if (!filters.visibility.includes(channel.visibility)) return false;
      }

      // Name filter
      if (filters.nameContains) {
        const searchTerm = filters.nameContains.toLowerCase();
        if (!channel.name.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      // Description filter
      if (filters.descriptionContains) {
        const searchTerm = filters.descriptionContains.toLowerCase();
        if (!channel.description.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      // Participant count filters
      if (
        filters.minParticipants !== undefined &&
        channel.participantCount < filters.minParticipants
      ) {
        return false;
      }
      if (
        filters.maxParticipants !== undefined &&
        channel.participantCount > filters.maxParticipants
      ) {
        return false;
      }

      // Fee filter
      if (
        filters.maxFeePerMessage !== undefined &&
        channel.feePerMessage > filters.maxFeePerMessage
      ) {
        return false;
      }

      // Escrow filter
      if (filters.hasEscrow !== undefined) {
        const hasEscrow = channel.escrowBalance > 0;
        if (filters.hasEscrow !== hasEscrow) return false;
      }

      // Time-based filters
      if (
        filters.createdAfter !== undefined &&
        channel.createdAt * 1000 < filters.createdAfter
      ) {
        return false;
      }
      if (
        filters.createdBefore !== undefined &&
        channel.createdAt * 1000 > filters.createdBefore
      ) {
        return false;
      }

      return true;
    });
  }

  private sortAgents(
    agents: AgentAccount[],
    filters: AgentSearchFilters,
  ): AgentAccount[] {
    const sortBy = filters.sortBy || "relevance";
    const sortOrder = filters.sortOrder || "desc";

    const sorted = [...agents].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "reputation":
          comparison = a.reputation - b.reputation;
          break;
        case "recent":
          comparison = a.lastUpdated - b.lastUpdated;
          break;
        case "relevance":
        default:
          // Combine reputation and recent activity for relevance
          comparison =
            a.reputation * 0.7 +
            a.lastUpdated * 0.3 -
            (b.reputation * 0.7 + b.lastUpdated * 0.3);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }

  private sortMessages(
    messages: MessageAccount[],
    filters: MessageSearchFilters,
  ): MessageAccount[] {
    const sortBy = filters.sortBy || "recent";
    const sortOrder = filters.sortOrder || "desc";

    const sorted = [...messages].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "recent":
          comparison = a.timestamp - b.timestamp;
          break;
        case "relevance":
        default:
          comparison = a.timestamp - b.timestamp;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }

  private sortChannels(
    channels: ChannelAccount[],
    filters: ChannelSearchFilters,
  ): ChannelAccount[] {
    const sortBy = filters.sortBy || "popular";
    const sortOrder = filters.sortOrder || "desc";

    const sorted = [...channels].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "popular":
          comparison = a.participantCount - b.participantCount;
          break;
        case "recent":
          comparison = a.createdAt - b.createdAt;
          break;
        case "relevance":
        default:
          // Combine popularity and recent activity
          comparison =
            a.participantCount * 0.7 +
            a.createdAt * 0.3 -
            (b.participantCount * 0.7 + b.createdAt * 0.3);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }

  private calculateCapabilitySimilarity(caps1: number, caps2: number): number {
    // Calculate Jaccard similarity for capability sets
    const intersection = caps1 & caps2;
    const union = caps1 | caps2;

    if (union === 0) return 0;

    // Count the number of set bits
    const intersectionCount = this.countSetBits(intersection);
    const unionCount = this.countSetBits(union);

    return intersectionCount / unionCount;
  }

  private countSetBits(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  private getDiscriminator(accountType: string): string {
    // Discriminators generated from Anchor IDL for PoD Protocol account types
    const discriminators: Record<string, string> = {
      agentAccount: "6RdcqmKGhkRy", // Agent account discriminator
      messageAccount: "6RdcqmKGhkRz", // Message account discriminator
      channelAccount: "6RdcqmKGhkRA", // Channel account discriminator
      escrowAccount: "6RdcqmKGhkRB", // Escrow account discriminator
      channelParticipant: "6RdcqmKGhkRC", // Channel participant discriminator
      channelInvitation: "6RdcqmKGhkRD", // Channel invitation discriminator
      channelMessage: "6RdcqmKGhkRE", // Channel message discriminator
    };
    return discriminators[accountType] || "";
  }

  private convertMessageTypeFromProgram(programType: any): MessageType {
    if (programType.text !== undefined) return MessageType.Text;
    if (programType.data !== undefined) return MessageType.Data;
    if (programType.command !== undefined) return MessageType.Command;
    if (programType.response !== undefined) return MessageType.Response;
    if (programType.custom !== undefined) return MessageType.Custom;
    return MessageType.Text;
  }

  private convertMessageStatusFromProgram(programStatus: any): MessageStatus {
    if (programStatus.pending) return MessageStatus.Pending;
    if (programStatus.delivered) return MessageStatus.Delivered;
    if (programStatus.read) return MessageStatus.Read;
    if (programStatus.failed) return MessageStatus.Failed;
    return MessageStatus.Pending;
  }

  private convertChannelVisibilityFromProgram(
    programVisibility: any,
  ): ChannelVisibility {
    if (programVisibility.public !== undefined) return ChannelVisibility.Public;
    if (programVisibility.private !== undefined)
      return ChannelVisibility.Private;
    return ChannelVisibility.Public;
  }
}
