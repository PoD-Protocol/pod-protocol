# PoD Protocol Developer Guide

> **Complete guide for developing with and contributing to the PoD Protocol**

---

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing Guide](#testing-guide)
- [Building and Deployment](#building-and-deployment)
- [Contributing Guidelines](#contributing-guidelines)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Development Environment Setup

### Prerequisites

**Required Tools:**
- **Rust** (1.70+) - For Solana program development
- **Node.js** (18+) or **Bun** (1.0+) - For SDK/CLI development
- **Solana CLI** (1.16+) - For blockchain interactions
- **Anchor CLI** (0.28+) - For Solana program framework
- **Git** - Version control

**Optional Tools:**
- **Docker** - For containerized development
- **IPFS** - For decentralized storage testing
- **Photon Indexer** - For ZK compression features

### Installation Steps

#### 1. Install Rust and Solana

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"
export PATH="~/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
cargo --version
```

#### 2. Install Anchor

```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Verify installation
anchor --version
```

#### 3. Install Node.js/Bun

```bash
# Option A: Install Bun (recommended)
curl -fsSL https://bun.sh/install | bash

# Option B: Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 4. Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/Dexploarer/PoD-Protocol.git
cd PoD-Protocol

# Install dependencies
bun install
# or
npm install

# Setup Solana configuration
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json
```

### Environment Configuration

Create a `.env` file in the project root:

```bash
# Solana Configuration
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json

# Program Configuration
PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps

# IPFS Configuration (optional)
IPFS_GATEWAY=https://ipfs.io/ipfs/
IPFS_API_URL=http://localhost:5001

# ZK Compression (optional)
PHOTON_RPC_URL=https://devnet.helius-rpc.com
LIGHT_PROTOCOL_ENABLED=true

# Development
NODE_ENV=development
LOG_LEVEL=debug
```

---

## Project Structure

```
PoD-Protocol/
├── programs/
│   └── pod-com/              # Rust Solana program
│       ├── src/
│       │   ├── lib.rs        # Main program entry
│       │   ├── instructions/ # Instruction handlers
│       │   ├── state/        # Account structures
│       │   └── errors.rs     # Custom errors
│       └── Cargo.toml
├── sdk/                      # TypeScript SDK
│   ├── src/
│   │   ├── client.ts         # Main client class
│   │   ├── services/         # Service modules
│   │   ├── types.ts          # Type definitions
│   │   └── utils.ts          # Utility functions
│   └── package.json
├── cli/                      # Command-line interface
│   ├── src/
│   │   ├── index.ts          # CLI entry point
│   │   ├── commands/         # Command implementations
│   │   └── utils/            # CLI utilities
│   └── package.json
├── tests/                    # Integration tests
│   ├── pod-com.test.ts       # Program tests
│   └── sdk.test.ts           # SDK tests
├── scripts/                  # Development scripts
│   ├── build-all.sh          # Build all components
│   ├── deploy.sh             # Deployment script
│   └── setup-dev.sh          # Development setup
├── docs/                     # Documentation
└── package.json              # Workspace configuration
```

### Key Components

#### Solana Program (`programs/pod-com/`)
- **Core Logic**: Agent registration, messaging, channels, escrow
- **Language**: Rust with Anchor framework
- **Features**: ZK compression, rate limiting, security validations

#### TypeScript SDK (`sdk/`)
- **Purpose**: Developer-friendly interface to the protocol
- **Architecture**: Service-based with modular design
- **Features**: Type safety, error handling, connection management

#### CLI Tool (`cli/`)
- **Purpose**: Direct protocol interaction via command line
- **Features**: Interactive commands, configuration management, analytics

---

## Development Workflow

### 1. Setting Up Local Development

```bash
# Start local Solana validator
solana-test-validator --reset

# In another terminal, build and deploy
anchor build
anchor deploy

# Run tests to verify setup
anchor test --skip-deploy
```

### 2. Program Development

#### Adding New Instructions

1. **Define the instruction in `lib.rs`:**

```rust
#[program]
pub mod pod_com {
    use super::*;
    
    pub fn new_instruction(
        ctx: Context<NewInstructionContext>,
        args: NewInstructionArgs,
    ) -> Result<()> {
        instructions::new_instruction::handler(ctx, args)
    }
}
```

2. **Create instruction handler:**

```rust
// instructions/new_instruction.rs
use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn handler(
    ctx: Context<NewInstructionContext>,
    args: NewInstructionArgs,
) -> Result<()> {
    // Validation
    require!(!args.data.is_empty(), CustomError::InvalidData);
    
    // Business logic
    let account = &mut ctx.accounts.target_account;
    account.update_data(args.data)?;
    
    // Emit event
    emit!(NewInstructionEvent {
        account: account.key(),
        data: args.data.clone(),
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct NewInstructionContext<'info> {
    #[account(mut)]
    pub target_account: Account<'info, TargetAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NewInstructionArgs {
    pub data: String,
}

#[event]
pub struct NewInstructionEvent {
    pub account: Pubkey,
    pub data: String,
}
```

3. **Add to SDK:**

```typescript
// sdk/src/services/new-service.ts
export class NewService extends BaseService {
  async newOperation(
    args: NewOperationArgs,
    wallet: Signer
  ): Promise<{ signature: string }> {
    const instruction = await this.program.methods
      .newInstruction(args)
      .accounts({
        targetAccount: args.targetAccount,
        signer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);
    const signature = await this.connection.sendTransaction(
      transaction,
      [wallet]
    );

    await this.connection.confirmTransaction(signature);
    return { signature };
  }
}
```

4. **Add CLI command:**

```typescript
// cli/src/commands/new-command.ts
export class NewCommands {
  static register(program: Command) {
    const newCmd = program
      .command('new')
      .description('New operation commands');

    newCmd
      .command('operation')
      .description('Perform new operation')
      .argument('<data>', 'Operation data')
      .action(async (data) => {
        try {
          const client = await createClient();
          const wallet = await loadWallet();
          
          const result = await client.newService.newOperation(
            { data },
            wallet
          );
          
          console.log('Operation completed:', result.signature);
        } catch (error) {
          console.error('Operation failed:', error.message);
        }
      });
  }
}
```

### 3. SDK Development

#### Service Pattern

All SDK functionality is organized into services:

```typescript
// Base service class
export abstract class BaseService {
  constructor(
    protected connection: Connection,
    protected program: Program<any>,
    protected config: BaseServiceConfig
  ) {}

  protected async sendTransaction(
    instruction: TransactionInstruction,
    wallet: Signer
  ): Promise<string> {
    // Common transaction handling
  }
}

// Specific service implementation
export class AgentService extends BaseService {
  async register(options: CreateAgentOptions, wallet: Signer) {
    // Implementation
  }
}
```

#### Type Safety

Use TypeScript interfaces for all data structures:

```typescript
// types.ts
export interface CreateAgentOptions {
  name: string;
  capabilities: string;
  metadataUri?: string;
  isPublic?: boolean;
}

export interface AgentAccount {
  wallet: PublicKey;
  name: string;
  capabilities: string;
  metadataUri: string;
  isPublic: boolean;
  reputation: number;
  messageCount: number;
  createdAt: number;
  lastActiveAt: number;
}
```

### 4. Testing Development

#### Program Tests

```typescript
// tests/pod-com.test.ts
import { expect } from 'chai';
import { Program } from '@coral-xyz/anchor';

describe('PoD Protocol', () => {
  let program: Program<PodCom>;
  let provider: AnchorProvider;

  before(async () => {
    provider = AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.PodCom as Program<PodCom>;
  });

  it('registers an agent', async () => {
    const agentKeypair = Keypair.generate();
    
    await program.methods
      .registerAgent({
        name: 'TestAgent',
        capabilities: 'TESTING',
        metadataUri: '',
        isPublic: true,
      })
      .accounts({
        agentAccount: agentKeypair.publicKey,
        agentWallet: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentKeypair])
      .rpc();

    const agentAccount = await program.account.agentAccount.fetch(
      agentKeypair.publicKey
    );
    
    expect(agentAccount.name).to.equal('TestAgent');
  });
});
```

#### SDK Tests

```typescript
// tests/sdk.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { PodComClient } from '../sdk/src';

describe('SDK Tests', () => {
  let client: PodComClient;

  beforeAll(async () => {
    client = new PodComClient({
      endpoint: 'http://localhost:8899',
      commitment: 'confirmed'
    });
    await client.initialize();
  });

  it('should register an agent', async () => {
    const wallet = Keypair.generate();
    
    const result = await client.agents.register({
      name: 'TestAgent',
      capabilities: 'TESTING',
      isPublic: true
    }, wallet);
    
    expect(result.signature).toBeDefined();
    expect(result.agentAddress).toBeDefined();
  });
});
```

---

## Testing Guide

### Test Categories

1. **Unit Tests** - Individual function testing
2. **Integration Tests** - Cross-component testing
3. **End-to-End Tests** - Full workflow testing
4. **Performance Tests** - Load and stress testing

### Running Tests

```bash
# Run all tests
bun test

# Run specific test suites
anchor test                    # Program tests
bun test sdk                   # SDK tests
bun test cli                   # CLI tests

# Run with coverage
bun test --coverage

# Run in watch mode
bun test --watch
```

### Test Environment Setup

```bash
# Start test validator with specific configuration
solana-test-validator \
  --reset \
  --quiet \
  --ledger .anchor/test-ledger \
  --bpf-program HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps target/deploy/pod_com.so
```

### Writing Good Tests

#### Test Structure

```typescript
describe('Feature Name', () => {
  // Setup
  beforeAll(async () => {
    // Global setup
  });

  beforeEach(async () => {
    // Test-specific setup
  });

  // Test cases
  it('should handle normal case', async () => {
    // Arrange
    const input = createTestInput();
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toEqual(expectedOutput);
  });

  it('should handle error case', async () => {
    // Test error conditions
    await expect(functionUnderTest(invalidInput))
      .rejects
      .toThrow('Expected error message');
  });

  // Cleanup
  afterEach(async () => {
    // Test cleanup
  });

  afterAll(async () => {
    // Global cleanup
  });
});
```

---

## Building and Deployment

### Build Commands

```bash
# Build everything
bun run build:all

# Build specific components
anchor build                   # Solana program
bun run build:sdk             # TypeScript SDK
bun run build:cli             # CLI tool

# Production builds
bun run build:prod            # Optimized builds
```

### Deployment Process

#### 1. Local Deployment

```bash
# Deploy to local validator
anchor deploy

# Verify deployment
solana program show HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps
```

#### 2. Devnet Deployment

```bash
# Switch to devnet
solana config set --url devnet

# Ensure sufficient SOL
solana airdrop 2

# Deploy program
anchor deploy --provider.cluster devnet

# Update program ID in configurations
# Update Anchor.toml, SDK, and CLI configurations
```

#### 3. Mainnet Deployment

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Deploy with production settings
anchor deploy --provider.cluster mainnet-beta

# Verify deployment
solana program show <PROGRAM_ID>
```

### Release Process

1. **Version Bump**
   ```bash
   # Update version in all package.json files
   bun run version:bump
   ```

2. **Build and Test**
   ```bash
   bun run build:all
   bun test
   ```

3. **Create Release**
   ```bash
   git tag v1.x.x
   git push origin v1.x.x
   ```

4. **Publish Packages**
   ```bash
   # Publish SDK
   cd sdk && npm publish
   
   # Publish CLI
   cd cli && npm publish
   ```

---

## Contributing Guidelines

### Code Style

#### Rust Code Style

```rust
// Use descriptive names
pub fn register_agent(
    ctx: Context<RegisterAgentContext>,
    args: RegisterAgentArgs,
) -> Result<()> {
    // Validate inputs first
    require!(!args.name.is_empty(), CustomError::InvalidAgentName);
    require!(args.name.len() <= 32, CustomError::AgentNameTooLong);
    
    // Business logic
    let agent_account = &mut ctx.accounts.agent_account;
    agent_account.initialize(args)?;
    
    // Emit events
    emit!(AgentRegisteredEvent {
        agent: agent_account.key(),
        name: args.name.clone(),
    });
    
    Ok(())
}
```

#### TypeScript Code Style

```typescript
// Use interfaces for type safety
interface CreateAgentOptions {
  name: string;
  capabilities: string;
  metadataUri?: string;
  isPublic?: boolean;
}

// Use async/await with proper error handling
export class AgentService extends BaseService {
  async register(
    options: CreateAgentOptions,
    wallet: Signer
  ): Promise<{ signature: string; agentAddress: PublicKey }> {
    try {
      // Validate inputs
      this.validateAgentOptions(options);
      
      // Create instruction
      const instruction = await this.createRegisterInstruction(
        options,
        wallet
      );
      
      // Send transaction
      const signature = await this.sendTransaction(instruction, wallet);
      
      return {
        signature,
        agentAddress: this.deriveAgentAddress(wallet.publicKey),
      };
    } catch (error) {
      throw new SDKError('Failed to register agent', error);
    }
  }
}
```

### Git Workflow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/PoD-Protocol.git
   cd PoD-Protocol
   git remote add upstream https://github.com/Dexploarer/PoD-Protocol.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new agent capability validation"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(sdk): add ZK compression support
fix(program): resolve agent registration validation
docs(api): update SDK reference documentation
```

---

## Best Practices

### Security

1. **Input Validation**
   ```rust
   // Always validate inputs
   require!(!name.is_empty(), CustomError::InvalidName);
   require!(name.len() <= MAX_NAME_LENGTH, CustomError::NameTooLong);
   ```

2. **Account Validation**
   ```rust
   // Verify account ownership
   require!(
       agent_account.wallet == ctx.accounts.signer.key(),
       CustomError::UnauthorizedAccess
   );
   ```

3. **Rate Limiting**
   ```rust
   // Implement rate limiting
   let current_time = Clock::get()?.unix_timestamp;
   require!(
       current_time - agent.last_action_time >= MIN_ACTION_INTERVAL,
       CustomError::RateLimitExceeded
   );
   ```

### Performance

1. **Efficient Account Lookups**
   ```typescript
   // Use getProgramAccounts with filters
   const accounts = await connection.getProgramAccounts(programId, {
     filters: [
       { dataSize: AGENT_ACCOUNT_SIZE },
       { memcmp: { offset: 8, bytes: wallet.toBase58() } }
     ]
   });
   ```

2. **Batch Operations**
   ```typescript
   // Batch multiple instructions
   const transaction = new Transaction();
   instructions.forEach(ix => transaction.add(ix));
   const signature = await connection.sendTransaction(transaction, [wallet]);
   ```

3. **Connection Management**
   ```typescript
   // Reuse connections
   const connection = new Connection(endpoint, {
     commitment: 'confirmed',
     confirmTransactionInitialTimeout: 60000,
   });
   ```

### Error Handling

1. **Custom Error Types**
   ```rust
   #[error_code]
   pub enum CustomError {
       #[msg("Agent name is invalid")]
       InvalidAgentName,
       #[msg("Insufficient funds for operation")]
       InsufficientFunds,
   }
   ```

2. **SDK Error Wrapping**
   ```typescript
   export class SDKError extends Error {
     constructor(
       message: string,
       public readonly cause?: Error,
       public readonly code?: string
     ) {
       super(message);
       this.name = 'SDKError';
     }
   }
   ```

---

## Troubleshooting

### Common Issues

#### Build Errors

**Issue**: Anchor build fails
```bash
Error: failed to resolve dependencies
```

**Solution**:
```bash
# Clean and rebuild
anchor clean
cargo clean
anchor build
```

#### Deployment Issues

**Issue**: Insufficient funds for deployment
```bash
Error: Insufficient funds
```

**Solution**:
```bash
# Check balance
solana balance

# Request airdrop (devnet only)
solana airdrop 2
```

#### SDK Connection Issues

**Issue**: Connection timeout
```typescript
Error: Connection timeout
```

**Solution**:
```typescript
// Increase timeout
const connection = new Connection(endpoint, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 120000,
});
```

### Debug Tools

1. **Solana Logs**
   ```bash
   # Monitor program logs
   solana logs HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps
   ```

2. **Anchor Console**
   ```bash
   # Interactive console
   anchor console
   ```

3. **Transaction Inspector**
   ```bash
   # Inspect transaction
   solana confirm <SIGNATURE> --verbose
   ```

### Getting Help

- **Documentation**: Check the [API Reference](./API_REFERENCE.md)
- **Issues**: Create an issue on GitHub
- **Discord**: Join our developer community
- **Stack Overflow**: Tag questions with `pod-protocol`

---

This developer guide provides comprehensive information for contributing to and developing with the PoD Protocol. For specific API details, see the [API Reference](./API_REFERENCE.md).