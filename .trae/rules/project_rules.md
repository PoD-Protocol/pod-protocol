# Trae IDE Configuration for PoD-Protocol

## Project Identity

**PoD Protocol (Prompt or Die)** - AI Agent Communication Protocol built on Solana blockchain. This project enables secure, scalable communication between AI agents with features like direct messaging, channels, escrow systems, and reputation management.

## Core Technology Stack

- **Blockchain**: Solana with Anchor framework
- **Core Program**: Rust/Anchor for on-chain logic
- **SDK/CLI**: TypeScript with Bun runtime
- **ZK Compression**: Light Protocol for 99% cost reduction
- **Storage**: IPFS for off-chain content
- **Indexing**: Photon indexer for compressed data
- **Testing**: Anchor test framework + Vitest

## Development Rules for Trae AI

### 1. Protocol-First Development
**ALWAYS understand the blockchain context before coding**
- This is a Solana program with strict account structure requirements
- All state changes must go through Program Derived Addresses (PDAs)
- Cross-Program Invocation (CPI) rules apply for external interactions
- Gas optimization is critical - use ZK compression when possible

### 2. Architecture Awareness
**Monorepo structure must be respected**
```
programs/pod-com/    # Rust Solana program (core protocol)
sdk/                 # TypeScript SDK for developers  
cli/                 # Command-line interface tools
tests/               # Integration tests
scripts/             # Development and deployment scripts
```

### 3. Technology-Specific Patterns

#### Rust/Anchor Program Development
- Use `#[program]` module for instruction handlers
- All accounts must be validated with proper `Account<>` types
- Use `#[account]` attribute for account structs
- Implement proper error handling with custom errors
- Follow Anchor security patterns (ownership checks, etc.)

#### TypeScript SDK/CLI Development
- Use Bun as the runtime (not Node.js)
- Follow workspace structure with proper dependencies
- Implement proper connection handling for Solana RPC
- Use `@solana/web3.js` for blockchain interactions
- Handle account serialization/deserialization properly

### 4. ZK Compression Integration
**Always consider compression for cost optimization**
- Use Light Protocol for message compression
- Implement Photon indexer integration for querying
- Batch operations when possible
- Store large content on IPFS, only hashes on-chain

## Essential Commands

### Build Commands
```bash
anchor build                 # Build Solana program
bun run build:all           # Build program + SDK + CLI  
cargo build --release       # Build Rust components only
```

### Testing Commands
```bash
anchor test                  # Full integration tests (deploys locally)
anchor test --skip-deploy   # Test without redeployment
bun test                     # All workspace tests
cargo test                   # Rust unit tests only
```

### Development Commands
```bash
bun run dev                  # Development mode
anchor clean                 # Clean build artifacts
bun run clean               # Clean all artifacts
```

### ZK Compression Commands
```bash
./scripts/setup-photon-indexer.sh    # Setup indexer
./scripts/dev-with-zk.sh            # Start with ZK compression
pod zk message broadcast <channel>   # Send compressed message
pod zk stats channel <id>           # View compression stats
```

## Account Structure (PDAs)

### Core Accounts
- **Agent Accounts**: Store agent metadata and capabilities
- **Message Accounts**: Direct messaging between agents  
- **Channel Accounts**: Group communication spaces
- **Participant Accounts**: Channel membership tracking
- **Escrow Accounts**: Fee and payment management

### Account Validation Rules
- All accounts must derive from proper seeds
- Ownership validation is mandatory
- Size constraints must be respected
- Rent-exemption must be maintained

## Code Quality Standards

### Rust Standards
- Use `cargo fmt` for formatting
- Run `cargo clippy -- -D warnings` for linting
- Handle all `Result` types properly
- Use proper error propagation with `?` operator
- Implement comprehensive unit tests

### TypeScript Standards
- Use Prettier for formatting (`bun run lint:fix`)
- Implement proper type definitions
- Handle async operations with proper error catching
- Use workspace dependencies appropriately
- Write integration tests for SDK functions

## Security Requirements

### Solana Program Security
- Validate all account ownership
- Check account discriminators
- Implement proper access controls
- Validate instruction data thoroughly
- Use secure random number generation
- Implement reentrancy protection

### SDK Security
- Validate all user inputs
- Implement proper signature verification
- Handle private keys securely
- Use secure connection to RPC endpoints
- Implement rate limiting for API calls

## Deployment Configuration

### Network Settings
- **Devnet**: `HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps`
- **Localnet**: Used for development/testing
- **Mainnet**: Production deployment ready

### Environment Variables
```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
```

## Trae Builder Mode Guidelines

When using Trae's Builder mode for automated tasks:

### For Rust Development
- Generate complete instruction handlers with proper validation
- Include error handling and custom error types
- Implement account constraint validation
- Add comprehensive unit tests

### For TypeScript Development  
- Generate SDK methods with proper type definitions
- Include error handling and connection management
- Implement proper serialization/deserialization
- Add integration test coverage

### For Integration
- Consider cross-program interactions
- Plan for ZK compression integration
- Design with gas optimization in mind
- Implement proper monitoring and logging

## Common Patterns

### Message Broadcasting Pattern
```rust
// Rust instruction handler
pub fn broadcast_message(ctx: Context<BroadcastMessage>, content: String) -> Result<()> {
    // Validate channel membership
    // Create message account
    // Emit event for indexers
    // Handle ZK compression if enabled
}
```

### SDK Integration Pattern
```typescript
// TypeScript SDK usage
const protocol = new PodProtocol(connection, wallet);
const channelId = await protocol.createChannel("AI Agents");
await protocol.broadcastMessage(channelId, "Hello from AI!");
```

## Trae Chat Integration

When using Trae's Chat mode for development assistance:

### Ask About
- "How do I implement a new instruction handler?"
- "What's the best way to handle PDA derivation?"
- "How can I optimize gas costs with ZK compression?"
- "Show me the pattern for SDK method implementation"

### Request Code Examples
- "Generate a new channel creation instruction"
- "Create a TypeScript method for message retrieval"
- "Show me proper error handling for Solana programs"
- "Generate tests for message broadcasting"

## AI Assistant Optimization

### Context Awareness
- Always mention you're working with Solana/Anchor
- Specify if you're working on Rust program or TypeScript SDK
- Include account structure requirements in requests
- Mention ZK compression optimization when relevant

### Code Generation Best Practices
- Request complete implementations (no stubs)
- Ask for proper error handling
- Include validation logic
- Request comprehensive test coverage
- Consider gas optimization patterns

