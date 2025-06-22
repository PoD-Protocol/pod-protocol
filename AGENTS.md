# AGENTS.md - PoD Protocol AI Agent Development Guide

> **Purpose**: This file guides AI agents (OpenAI Codex, Claude Code, etc.) in understanding and contributing to the PoD Protocol codebase effectively.

## 📋 **Project Overview**

**PoD Protocol** (Prompt or Die) is an AI Agent Communication Protocol built on Solana using ZK compression for 99% cost reduction. The protocol enables secure, scalable communication between AI agents with features like direct messaging, channels, escrow systems, and reputation management.

### **Key Technologies Stack**
- **Blockchain**: Solana + Anchor framework
- **ZK Compression**: Light Protocol for 5000x cost reduction
- **Backend**: Rust (Solana program) + TypeScript (SDK/CLI)
- **Frontend**: Next.js 14+ with App Router + Tailwind CSS
- **Indexing**: Photon indexer for compressed data
- **Storage**: IPFS for off-chain content
- **Deployment**: Vercel for frontend

## 🏗️ **Project Architecture**

```
PoD-Protocol-1/
├── programs/pod-com/          # Rust Solana program (core protocol)
├── sdk/                       # TypeScript SDK for developers
├── cli/                       # Command-line interface tools
├── frontend/                  # Next.js web application (TO BE CREATED)
├── tests/                     # Integration tests
├── scripts/                   # Development and deployment scripts
└── docs/                      # Documentation
```

### **Current Priority: ZK Compression Migration**
The project is transitioning from regular Solana accounts to ZK compressed accounts as the primary messaging system. This is the **highest priority** for all development work.

## 🎯 **Coding Standards & Conventions**

### **Rust (Solana Program)**
```rust
// Use explicit error handling with custom error types
#[error_code]
pub enum PodComError {
    #[msg("Agent not found")]
    AgentNotFound,
}

// Follow Anchor patterns for account contexts
#[derive(Accounts)]
pub struct BroadcastCompressedMessage<'info> {
    #[account(mut)]
    pub channel_account: Account<'info, ChannelAccount>,
    // ... other accounts
}

// Use descriptive function names with clear intent
pub fn broadcast_message_compressed(
    ctx: Context<BroadcastCompressedMessage>,
    content_hash: [u8; 32],
    ipfs_hash: String,
) -> Result<()> {
    // Implementation
}
```

### **TypeScript (SDK/CLI/Frontend)**
```typescript
// Use proper TypeScript interfaces for all data structures
export interface CompressedChannelMessage {
  channel: PublicKey;
  sender: PublicKey;
  contentHash: string;
  ipfsHash: string;
  messageType: string;
  createdAt: number;
}

// Follow async/await patterns with proper error handling
async function broadcastCompressedMessage(
  channelId: PublicKey,
  content: string
): Promise<CompressedMessageResult> {
  try {
    // Use Light Protocol SDK properly
    const result = await lightProtocolClient.compress(/* ... */);
    return result;
  } catch (error) {
    throw new Error(`Failed to broadcast compressed message: ${error}`);
  }
}

// Use proper service class patterns
export class ZKCompressionService extends BaseService {
  // Methods should be well-documented and follow consistent patterns
}
```

### **Frontend (Next.js + React)**
```tsx
// Use functional components with TypeScript
interface MessageComponentProps {
  message: CompressedChannelMessage;
  onReply?: (messageId: string) => void;
}

export function MessageComponent({ message, onReply }: MessageComponentProps) {
  // Use hooks appropriately
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <div className="p-4 border rounded-lg">
      {/* Component implementation */}
    </div>
  );
}
```

## 🧪 **Testing Guidelines**

### **Running Tests**
```bash
# Full integration tests (builds and deploys locally)
anchor test

# Run tests without redeployment (faster)
anchor test --skip-deploy

# TypeScript tests
bun test

# Rust unit tests only
cargo test
```

### **Test Writing Standards**
- **Integration tests** should cover end-to-end scenarios in `/tests/`
- **Unit tests** should test individual functions and methods
- **ZK compression tests** are critical priority - ensure all compressed operations work
- Always test error conditions and edge cases
- Use descriptive test names: `test_broadcast_compressed_message_with_invalid_channel`

### **Test Structure Example**
```typescript
describe("ZK Compression Service", () => {
  beforeEach(async () => {
    // Setup test environment
  });

  it("should broadcast compressed message successfully", async () => {
    // Test implementation
    expect(result.signature).toBeDefined();
    expect(result.compressedAccount).toBeDefined();
  });

  it("should handle compression errors gracefully", async () => {
    // Error case testing
  });
});
```

## 🔧 **Development Workflow**

### **Getting Started**
```bash
# Install dependencies
bun install

# Build everything
bun run build:all

# Start development with ZK compression
./scripts/dev-with-zk.sh

# Run linting
bun run lint
cargo fmt --check
cargo clippy -- -D warnings
```

### **Key Development Commands**
```bash
# Anchor commands
anchor build              # Build Solana program
anchor deploy            # Deploy to configured network
anchor clean             # Clean build artifacts

# Development
bun run dev              # Start development mode
bun run clean            # Clean all artifacts

# ZK Compression specific
./scripts/setup-photon-indexer.sh    # Setup indexer
pod zk message broadcast <channel> "content"  # Test compression
```

## 🚨 **Critical Implementation Priorities**

### **1. Light Protocol Integration (HIGHEST PRIORITY)**
- **Files to update**: `sdk/src/services/zk-compression.ts`
- **Current issue**: Placeholder interfaces and mock implementations
- **Required**: Replace with actual `@lightprotocol/stateless.js` integration

```typescript
// REPLACE placeholder interfaces with actual Light Protocol imports
import { createRpc, LightSystemProgram } from "@lightprotocol/stateless.js";
import { createMint, mintTo, transfer } from "@lightprotocol/compressed-token";

// REPLACE mock implementations with real Light Protocol calls
const connection: Rpc = createRpc(
  RPC_ENDPOINT,           // Solana RPC
  COMPRESSION_ENDPOINT,   // ZK compression RPC  
  PROVER_ENDPOINT        // Prover endpoint
);
```

### **2. Photon Indexer Integration**
- **Files to update**: `sdk/src/services/zk-compression.ts:267-307`
- **Current issue**: Basic fetch calls to generic endpoints
- **Required**: Proper Photon indexer client integration

### **3. Remove Hardcoded Placeholders**
- **CLI placeholders**: `cli/src/commands/zk-compression.ts:222` (hardcoded participant key)
- **Content hashing**: `sdk/src/services/ipfs.ts:270-280` (needs crypto hashing)
- **Batch processing**: `sdk/src/services/zk-compression.ts:428-444` (mock implementation)

## 📁 **File-Specific Guidelines**

### **Key Files and Their Purpose**
- `programs/pod-com/src/lib.rs` - Core Solana program with ZK compression
- `sdk/src/services/zk-compression.ts` - ZK compression service (NEEDS MAJOR WORK)
- `cli/src/commands/zk-compression.ts` - CLI commands for compression
- `sdk/src/services/analytics.ts` - Analytics with compressed data
- `sdk/src/client.ts` - Main SDK client
- `CLAUDE.md` - Project context for AI assistants

### **When Adding New Features**
1. **ZK Compression First**: All new messaging features should use compressed accounts
2. **Light Protocol Integration**: Use official Light Protocol SDK methods
3. **Cost Optimization**: Leverage 99% cost reduction through compression
4. **Photon Indexer**: Use for efficient querying of compressed data
5. **Testing**: Always add tests for new functionality

## 🚀 **Pull Request Guidelines**

### **PR Title Format**
- `feat(zk): Add compressed message batching`
- `fix(sdk): Resolve Light Protocol integration issue`
- `refactor(cli): Update commands to use ZK compression by default`

### **PR Description Template**
```markdown
## Summary
Brief description of changes

## ZK Compression Impact
- [ ] Uses ZK compression for cost savings
- [ ] Integrates with Light Protocol properly
- [ ] Includes Photon indexer support

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Breaking Changes
List any breaking changes
```

### **Code Review Checklist**
- [ ] Follows TypeScript/Rust coding standards
- [ ] Includes proper error handling
- [ ] Has comprehensive tests
- [ ] Uses Light Protocol SDK correctly
- [ ] Optimizes for ZK compression cost savings
- [ ] Updates documentation if needed

## 🔍 **Debugging & Common Issues**

### **ZK Compression Issues**
```bash
# Check Light Protocol connection
pod zk config indexer --test

# Verify IPFS connection  
pod zk config ipfs --test

# Test compression functionality
pod zk message broadcast <channel-id> "test message"
```

### **Common Error Patterns**
- **"Account does not exist"**: Usually program deployment issue
- **"Insufficient funds"**: Need SOL for transaction fees
- **"Invalid public key"**: Check address format validation
- **"Compression failed"**: Verify Light Protocol setup

### **Development Environment**
- **Network switching**: `solana config set --url devnet`
- **Get test SOL**: `solana airdrop 2`
- **Check balance**: `solana balance`
- **Program deployment**: Ensure correct program ID in configurations

## 📚 **Learning Resources**

### **Light Protocol Documentation**
- Official docs: https://docs.lightprotocol.com/
- ZK Compression guide: https://www.zkcompression.com/
- TypeScript client: https://www.zkcompression.com/developers/typescript-client

### **Solana Development**
- Anchor framework: https://www.anchor-lang.com/
- Solana cookbook: https://solanacookbook.com/

### **Project-Specific Documentation**
- `CLAUDE.md` - Comprehensive project context
- `docs/` directory - Detailed technical documentation
- `TODO.md` - Master task list and priorities

---

**Remember**: ZK compression is the core differentiator of PoD Protocol. All development should prioritize the 99% cost reduction and 5000x efficiency gains that ZK compression provides. When in doubt, optimize for compression first.

**Last Updated**: December 2024