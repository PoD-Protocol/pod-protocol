# PoD Protocol Troubleshooting Guide

> **Comprehensive guide for resolving common issues in PoD Protocol development and deployment**

---

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Build Issues](#build-issues)
- [Deployment Problems](#deployment-problems)
- [Runtime Errors](#runtime-errors)
- [SDK Issues](#sdk-issues)
- [CLI Problems](#cli-problems)
- [Network and Connection Issues](#network-and-connection-issues)
- [ZK Compression Issues](#zk-compression-issues)
- [IPFS Integration Problems](#ipfs-integration-problems)
- [Performance Issues](#performance-issues)
- [Security and Access Issues](#security-and-access-issues)
- [Development Environment Issues](#development-environment-issues)
- [Testing Problems](#testing-problems)
- [Monitoring and Debugging](#monitoring-and-debugging)

---

## Quick Diagnostics

### System Health Check

Run this comprehensive health check script to identify common issues:

```bash
#!/bin/bash
# Save as scripts/health-check.sh

echo "🔍 PoD Protocol Health Check"
echo "============================="

# Check Rust installation
echo "📦 Checking Rust..."
if command -v rustc &> /dev/null; then
    echo "✅ Rust: $(rustc --version)"
else
    echo "❌ Rust not installed"
fi

# Check Solana CLI
echo "🔗 Checking Solana CLI..."
if command -v solana &> /dev/null; then
    echo "✅ Solana: $(solana --version)"
    echo "📍 Cluster: $(solana config get | grep 'RPC URL' | awk '{print $3}')"
    echo "💰 Balance: $(solana balance)"
else
    echo "❌ Solana CLI not installed"
fi

# Check Anchor
echo "⚓ Checking Anchor..."
if command -v anchor &> /dev/null; then
    echo "✅ Anchor: $(anchor --version)"
else
    echo "❌ Anchor not installed"
fi

# Check Node.js/Bun
echo "📦 Checking Runtime..."
if command -v bun &> /dev/null; then
    echo "✅ Bun: $(bun --version)"
elif command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ No JavaScript runtime found"
fi

# Check project structure
echo "📁 Checking Project Structure..."
if [ -f "Anchor.toml" ]; then
    echo "✅ Anchor.toml found"
else
    echo "❌ Anchor.toml missing"
fi

if [ -d "programs/pod-com" ]; then
    echo "✅ Program directory found"
else
    echo "❌ Program directory missing"
fi

if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json missing"
fi

# Check dependencies
echo "📚 Checking Dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ Node modules installed"
else
    echo "⚠️ Node modules not installed - run 'bun install'"
fi

if [ -d "target" ]; then
    echo "✅ Rust target directory exists"
else
    echo "⚠️ Rust target directory missing - run 'anchor build'"
fi

echo "============================="
echo "🏁 Health check complete"
```

### Quick Fix Commands

```bash
# Reset everything and start fresh
./scripts/reset-environment.sh

# Clean and rebuild
anchor clean
cargo clean
rm -rf node_modules
bun install
anchor build

# Reset Solana configuration
solana config set --url devnet
solana airdrop 5
```

---

## Build Issues

### Anchor Build Failures

#### Issue: `error: failed to resolve dependencies`

**Symptoms:**
```
Error: failed to resolve dependencies
Couldn't find crate `anchor_lang`
```

**Solutions:**

1. **Update Rust and Anchor:**
```bash
rustup update
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

2. **Clean and rebuild:**
```bash
anchor clean
cargo clean
anchor build
```

3. **Check Cargo.toml dependencies:**
```toml
# programs/pod-com/Cargo.toml
[dependencies]
anchor-lang = "0.28.0"
anchor-spl = "0.28.0"
```

#### Issue: `error: linking with 'cc' failed`

**Symptoms:**
```
error: linking with 'cc' failed: exit status: 1
```

**Solutions:**

1. **Install build essentials:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install build-essential

# macOS
xcode-select --install

# Arch Linux
sudo pacman -S base-devel
```

2. **Update linker configuration:**
```bash
# Add to ~/.cargo/config.toml
[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=lld"]
```

#### Issue: Program size too large

**Symptoms:**
```
Error: Program binary is too large
```

**Solutions:**

1. **Enable release optimizations:**
```toml
# Cargo.toml
[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1
[profile.release.build-override]
opt-level = 3
incremental = false
codegen-units = 1
```

2. **Remove debug symbols:**
```bash
anchor build --release
strip target/deploy/pod_com.so
```

3. **Optimize code:**
```rust
// Use smaller data types
pub struct OptimizedAccount {
    pub data: [u8; 32],  // Instead of String
    pub flags: u8,       // Instead of multiple bools
}
```

### TypeScript Build Issues

#### Issue: Module resolution errors

**Symptoms:**
```
Error: Cannot find module '@solana/web3.js'
```

**Solutions:**

1. **Install dependencies:**
```bash
bun install
# or
npm install
```

2. **Check tsconfig.json:**
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

3. **Clear cache:**
```bash
rm -rf node_modules/.cache
rm -rf dist
bun run build
```

---

## Deployment Problems

### Insufficient Funds

**Symptoms:**
```
Error: Insufficient funds for transaction
```

**Solutions:**

1. **Check balance:**
```bash
solana balance
```

2. **Request airdrop (devnet/testnet):**
```bash
solana airdrop 5
```

3. **For mainnet, transfer SOL:**
```bash
# Transfer from another wallet
solana transfer <RECIPIENT> <AMOUNT> --from <SOURCE_KEYPAIR>
```

### Program Account Already Exists

**Symptoms:**
```
Error: Account already exists
```

**Solutions:**

1. **Upgrade existing program:**
```bash
anchor upgrade target/deploy/pod_com.so --program-id <PROGRAM_ID>
```

2. **Use different program ID:**
```bash
# Generate new keypair
solana-keygen new --outfile target/deploy/pod_com-keypair.json
anchor deploy
```

3. **Close existing program (if you own it):**
```bash
solana program close <PROGRAM_ID> --bypass-warning
```

### RPC Rate Limiting

**Symptoms:**
```
Error: 429 Too Many Requests
```

**Solutions:**

1. **Use different RPC endpoint:**
```bash
# Switch to different provider
solana config set --url https://api.mainnet-beta.solana.com

# Or use premium RPC
solana config set --url https://your-premium-rpc.com
```

2. **Add retry logic:**
```typescript
async function sendTransactionWithRetry(
  connection: Connection,
  transaction: Transaction,
  signers: Signer[],
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await connection.sendTransaction(transaction, signers);
    } catch (error) {
      if (error.message.includes('429') && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

---

## Runtime Errors

### Custom Program Errors

#### Issue: `Custom program error: 0x1770`

**Diagnosis:**
```bash
# Convert error code to understand the error
node -e "console.log(parseInt('1770', 16))" # Outputs: 6000
```

**Solutions:**

1. **Check error definitions:**
```rust
// programs/pod-com/src/errors.rs
#[error_code]
pub enum CustomError {
    #[msg("Invalid agent name")]           // 6000
    InvalidAgentName,
    #[msg("Agent already exists")]         // 6001
    AgentAlreadyExists,
    #[msg("Insufficient permissions")]     // 6002
    InsufficientPermissions,
}
```

2. **Add better error handling:**
```rust
pub fn register_agent(
    ctx: Context<RegisterAgent>,
    args: RegisterAgentArgs,
) -> Result<()> {
    // Validate input
    require!(!args.name.is_empty(), CustomError::InvalidAgentName);
    require!(args.name.len() <= 32, CustomError::InvalidAgentName);
    
    // Check if agent already exists
    let agent_account = &ctx.accounts.agent_account;
    require!(!agent_account.is_initialized, CustomError::AgentAlreadyExists);
    
    // Continue with logic...
    Ok(())
}
```

### Account Validation Errors

#### Issue: `Account not owned by program`

**Symptoms:**
```
Error: Account not owned by program
```

**Solutions:**

1. **Check account ownership:**
```rust
#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        has_one = wallet @ CustomError::UnauthorizedAccess
    )]
    pub agent_account: Account<'info, AgentAccount>,
    pub wallet: Signer<'info>,
}
```

2. **Verify PDA derivation:**
```rust
let (agent_pda, bump) = Pubkey::find_program_address(
    &[b"agent", wallet.key().as_ref()],
    ctx.program_id
);
require_keys_eq!(agent_account.key(), agent_pda, CustomError::InvalidPDA);
```

### Transaction Simulation Failures

#### Issue: `Transaction simulation failed`

**Diagnosis:**
```bash
# Get detailed error information
solana confirm <TRANSACTION_SIGNATURE> --verbose
```

**Solutions:**

1. **Check account states:**
```typescript
// Verify accounts exist and have correct data
const agentAccount = await connection.getAccountInfo(agentPubkey);
if (!agentAccount) {
  throw new Error('Agent account does not exist');
}
```

2. **Validate instruction data:**
```typescript
// Ensure all required accounts are provided
const instruction = await program.methods
  .updateAgent(args)
  .accounts({
    agentAccount: agentPubkey,
    wallet: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .instruction();
```

---

## SDK Issues

### Connection Problems

#### Issue: `Connection refused`

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:8899
```

**Solutions:**

1. **Check if validator is running:**
```bash
# Start local validator
solana-test-validator --reset

# Or check if remote endpoint is accessible
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' \
  https://api.devnet.solana.com
```

2. **Update connection configuration:**
```typescript
const connection = new Connection(
  process.env.ANCHOR_PROVIDER_URL || 'https://api.devnet.solana.com',
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  }
);
```

### Serialization Errors

#### Issue: `Failed to deserialize account`

**Symptoms:**
```
Error: Failed to deserialize account data
```

**Solutions:**

1. **Check account discriminator:**
```typescript
// Verify account type
const accountInfo = await connection.getAccountInfo(accountPubkey);
if (accountInfo && accountInfo.data.length >= 8) {
  const discriminator = accountInfo.data.slice(0, 8);
  console.log('Account discriminator:', discriminator);
}
```

2. **Update IDL:**
```bash
# Regenerate IDL after program changes
anchor build
cp target/idl/pod_com.json sdk/src/idl/
```

3. **Handle version compatibility:**
```typescript
// Add version checking
interface VersionedAccount {
  version: number;
  data: any;
}

function deserializeAccount(data: Buffer): VersionedAccount {
  const version = data.readUInt8(8); // After discriminator
  
  switch (version) {
    case 1:
      return deserializeV1(data);
    case 2:
      return deserializeV2(data);
    default:
      throw new Error(`Unsupported account version: ${version}`);
  }
}
```

### Transaction Confirmation Issues

#### Issue: `Transaction not confirmed`

**Symptoms:**
```
Error: Transaction was not confirmed in 60.00 seconds
```

**Solutions:**

1. **Increase timeout:**
```typescript
const connection = new Connection(endpoint, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 120000, // 2 minutes
});
```

2. **Use manual confirmation:**
```typescript
async function confirmTransaction(
  connection: Connection,
  signature: string,
  commitment: Commitment = 'confirmed'
): Promise<void> {
  const start = Date.now();
  const timeout = 60000; // 60 seconds
  
  while (Date.now() - start < timeout) {
    const status = await connection.getSignatureStatus(signature);
    
    if (status.value?.confirmationStatus === commitment) {
      return;
    }
    
    if (status.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Transaction confirmation timeout');
}
```

---

## CLI Problems

### Configuration Issues

#### Issue: `Config file not found`

**Symptoms:**
```
Error: Configuration file not found
```

**Solutions:**

1. **Initialize configuration:**
```bash
pod config init
# or
pod config setup
```

2. **Manual configuration:**
```bash
# Create config directory
mkdir -p ~/.config/pod-protocol

# Create config file
cat > ~/.config/pod-protocol/config.json << EOF
{
  "endpoint": "https://api.devnet.solana.com",
  "commitment": "confirmed",
  "programId": "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
  "wallet": "~/.config/solana/id.json"
}
EOF
```

### Command Execution Errors

#### Issue: `Command not found`

**Symptoms:**
```
bash: pod: command not found
```

**Solutions:**

1. **Install CLI globally:**
```bash
npm install -g @pod-protocol/cli
# or
bun install -g @pod-protocol/cli
```

2. **Use local installation:**
```bash
# From project root
bun run cli --help
# or
npx @pod-protocol/cli --help
```

3. **Build from source:**
```bash
cd cli
bun run build
bun link
```

---

## Network and Connection Issues

### RPC Endpoint Problems

#### Issue: `Network request failed`

**Diagnosis:**
```bash
# Test RPC endpoint
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  https://api.devnet.solana.com
```

**Solutions:**

1. **Use alternative endpoints:**
```bash
# Devnet alternatives
solana config set --url https://api.devnet.solana.com
solana config set --url https://devnet.helius-rpc.com

# Mainnet alternatives
solana config set --url https://api.mainnet-beta.solana.com
solana config set --url https://solana-api.projectserum.com
```

2. **Implement endpoint failover:**
```typescript
const ENDPOINTS = [
  'https://api.devnet.solana.com',
  'https://devnet.helius-rpc.com',
  'https://api.devnet.solana.com',
];

async function createConnection(): Promise<Connection> {
  for (const endpoint of ENDPOINTS) {
    try {
      const connection = new Connection(endpoint);
      await connection.getVersion(); // Test connection
      return connection;
    } catch (error) {
      console.warn(`Failed to connect to ${endpoint}:`, error.message);
    }
  }
  throw new Error('All RPC endpoints failed');
}
```

### Firewall and Proxy Issues

#### Issue: `Connection blocked by firewall`

**Solutions:**

1. **Configure proxy:**
```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

2. **Use different ports:**
```typescript
// Some firewalls block port 8899
const connection = new Connection('https://api.devnet.solana.com:443');
```

---

## ZK Compression Issues

### Light Protocol Integration

#### Issue: `Light Protocol not initialized`

**Symptoms:**
```
Error: Light Protocol client not initialized
```

**Solutions:**

1. **Install Light Protocol dependencies:**
```bash
bun add @lightprotocol/compressed-token
bun add @lightprotocol/stateless.js
```

2. **Initialize Light Protocol:**
```typescript
import { createRpc } from '@lightprotocol/stateless.js';

const lightRpc = createRpc(
  process.env.PHOTON_RPC_URL || 'https://devnet.helius-rpc.com',
  process.env.ANCHOR_PROVIDER_URL || 'https://api.devnet.solana.com'
);
```

### Photon Indexer Issues

#### Issue: `Photon indexer not responding`

**Diagnosis:**
```bash
# Test Photon indexer
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getCompressedAccountsByOwner","params":["<OWNER_PUBKEY>"]}' \
  https://devnet.helius-rpc.com
```

**Solutions:**

1. **Use alternative indexer:**
```typescript
const PHOTON_ENDPOINTS = [
  'https://devnet.helius-rpc.com',
  'https://rpc-devnet.helius.xyz',
];
```

2. **Implement fallback to regular RPC:**
```typescript
async function getCompressedAccounts(owner: PublicKey) {
  try {
    return await lightRpc.getCompressedAccountsByOwner(owner);
  } catch (error) {
    console.warn('Photon indexer failed, falling back to regular RPC');
    return await connection.getProgramAccounts(programId, {
      filters: [{ memcmp: { offset: 8, bytes: owner.toBase58() } }]
    });
  }
}
```

---

## IPFS Integration Problems

### IPFS Node Issues

#### Issue: `IPFS daemon not running`

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5001
```

**Solutions:**

1. **Start IPFS daemon:**
```bash
# Initialize IPFS (first time only)
ipfs init

# Start daemon
ipfs daemon
```

2. **Use IPFS gateway:**
```typescript
// Fallback to public gateway
const IPFS_GATEWAYS = [
  'http://localhost:8080',
  'https://ipfs.io',
  'https://gateway.pinata.cloud',
];

async function fetchFromIPFS(hash: string): Promise<string> {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}/ipfs/${hash}`);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`Gateway ${gateway} failed:`, error.message);
    }
  }
  throw new Error('All IPFS gateways failed');
}
```

### Content Upload Issues

#### Issue: `Failed to upload to IPFS`

**Solutions:**

1. **Check IPFS configuration:**
```bash
# Check IPFS config
ipfs config show

# Enable CORS for web access
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
```

2. **Use pinning service:**
```typescript
import { PinataSDK } from 'pinata-web3';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

async function uploadToPinata(content: string): Promise<string> {
  const upload = await pinata.upload.json({
    content,
    timestamp: Date.now(),
  });
  return upload.IpfsHash;
}
```

---

## Performance Issues

### Slow Transaction Processing

#### Issue: `Transactions taking too long`

**Diagnosis:**
```typescript
// Measure transaction time
const start = Date.now();
const signature = await connection.sendTransaction(transaction, [wallet]);
const confirmation = await connection.confirmTransaction(signature);
const duration = Date.now() - start;
console.log(`Transaction took ${duration}ms`);
```

**Solutions:**

1. **Optimize transaction size:**
```typescript
// Batch multiple instructions
const transaction = new Transaction();
instructions.forEach(ix => transaction.add(ix));

// Use versioned transactions for larger capacity
const versionedTx = new VersionedTransaction(
  new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions,
  }).compileToV0Message()
);
```

2. **Use priority fees:**
```typescript
const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1000, // Adjust based on network congestion
});

transaction.add(priorityFeeInstruction);
```

### High Memory Usage

#### Issue: `Out of memory errors`

**Solutions:**

1. **Optimize account fetching:**
```typescript
// Use pagination for large datasets
async function getAllAccounts(programId: PublicKey) {
  const accounts = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const batch = await connection.getProgramAccounts(programId, {
      dataSlice: { offset, length: limit },
    });
    
    if (batch.length === 0) break;
    accounts.push(...batch);
    offset += limit;
  }
  
  return accounts;
}
```

2. **Implement caching:**
```typescript
class AccountCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 30000; // 30 seconds
  
  async get(pubkey: PublicKey): Promise<any> {
    const key = pubkey.toBase58();
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const data = await connection.getAccountInfo(pubkey);
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
}
```

---

## Security and Access Issues

### Wallet Connection Problems

#### Issue: `Wallet not connected`

**Solutions:**

1. **Check wallet installation:**
```typescript
// Check if wallet is available
if (typeof window !== 'undefined' && window.solana) {
  const wallet = window.solana;
  if (wallet.isPhantom) {
    console.log('Phantom wallet detected');
  }
} else {
  console.error('No Solana wallet found');
}
```

2. **Handle connection errors:**
```typescript
async function connectWallet() {
  try {
    const response = await window.solana.connect();
    console.log('Connected to wallet:', response.publicKey.toString());
    return response.publicKey;
  } catch (error) {
    if (error.code === 4001) {
      console.error('User rejected the request');
    } else {
      console.error('Failed to connect wallet:', error);
    }
    throw error;
  }
}
```

### Permission Errors

#### Issue: `Unauthorized access`

**Solutions:**

1. **Implement proper access control:**
```rust
#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        has_one = wallet @ CustomError::UnauthorizedAccess,
        constraint = agent_account.is_active @ CustomError::AgentNotActive
    )]
    pub agent_account: Account<'info, AgentAccount>,
    pub wallet: Signer<'info>,
}
```

2. **Add role-based permissions:**
```rust
#[account]
pub struct AgentAccount {
    pub wallet: Pubkey,
    pub role: AgentRole,
    pub permissions: u64, // Bitfield for permissions
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum AgentRole {
    User,
    Moderator,
    Admin,
}

fn check_permission(agent: &AgentAccount, required: u64) -> Result<()> {
    require!(
        agent.permissions & required != 0,
        CustomError::InsufficientPermissions
    );
    Ok(())
}
```

---

## Development Environment Issues

### IDE and Editor Problems

#### Issue: `Rust analyzer not working`

**Solutions:**

1. **Install Rust analyzer:**
```bash
# VS Code
code --install-extension rust-lang.rust-analyzer

# Vim/Neovim
# Add to your config
```

2. **Configure workspace:**
```json
// .vscode/settings.json
{
  "rust-analyzer.linkedProjects": [
    "./programs/pod-com/Cargo.toml"
  ],
  "rust-analyzer.cargo.target": "bpf-unknown-unknown"
}
```

### Version Conflicts

#### Issue: `Version mismatch errors`

**Solutions:**

1. **Lock dependency versions:**
```toml
# Cargo.toml
[dependencies]
anchor-lang = "=0.28.0"
anchor-spl = "=0.28.0"
```

2. **Use consistent Node.js version:**
```bash
# Use .nvmrc file
echo "18.17.0" > .nvmrc
nvm use
```

---

## Testing Problems

### Test Failures

#### Issue: `Tests failing intermittently`

**Solutions:**

1. **Add proper test isolation:**
```typescript
describe('Agent Tests', () => {
  let connection: Connection;
  let program: Program<PodCom>;
  
  beforeEach(async () => {
    // Reset state for each test
    connection = new Connection('http://localhost:8899', 'confirmed');
    // Create fresh accounts for each test
  });
  
  afterEach(async () => {
    // Cleanup test data
  });
});
```

2. **Use deterministic test data:**
```typescript
// Use fixed seeds for reproducible tests
const testSeed = Buffer.from('test-seed-12345');
const testKeypair = Keypair.fromSeed(testSeed.slice(0, 32));
```

### Test Environment Setup

#### Issue: `Test validator not starting`

**Solutions:**

1. **Clean test environment:**
```bash
# Remove old test ledger
rm -rf .anchor/test-ledger

# Start fresh validator
solana-test-validator --reset --quiet
```

2. **Configure test validator:**
```bash
# Start with specific configuration
solana-test-validator \
  --reset \
  --ledger .anchor/test-ledger \
  --bpf-program HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps target/deploy/pod_com.so
```

---

## Monitoring and Debugging

### Logging and Debugging

#### Enable Debug Logging

```rust
// Add to program
use anchor_lang::prelude::*;

#[program]
pub mod pod_com {
    use super::*;
    
    pub fn debug_instruction(ctx: Context<DebugContext>) -> Result<()> {
        msg!("Debug: Instruction called by {}", ctx.accounts.signer.key());
        msg!("Debug: Account data: {:?}", ctx.accounts.target_account.data);
        Ok(())
    }
}
```

```typescript
// Enable SDK logging
process.env.DEBUG = 'pod-protocol:*';

// Add custom logging
import debug from 'debug';
const log = debug('pod-protocol:sdk');

log('Sending transaction:', signature);
```

#### Monitor Program Logs

```bash
# Monitor all program logs
solana logs

# Monitor specific program
solana logs HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps

# Monitor with filters
solana logs | grep "Program log"
```

### Performance Monitoring

```typescript
// Add performance monitoring
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  startTimer(operation: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      this.metrics.get(operation)!.push(duration);
    };
  }
  
  getStats(operation: string) {
    const times = this.metrics.get(operation) || [];
    return {
      count: times.length,
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
    };
  }
}

// Usage
const monitor = new PerformanceMonitor();
const endTimer = monitor.startTimer('register_agent');

try {
  await client.agents.register(options, wallet);
} finally {
  endTimer();
}

console.log('Register agent stats:', monitor.getStats('register_agent'));
```

---

## Getting Help

### Community Resources

- **GitHub Issues**: [Report bugs and request features](https://github.com/Dexploarer/PoD-Protocol/issues)
- **Discord**: Join our developer community for real-time help
- **Documentation**: Check the [API Reference](./API_REFERENCE.md) and [Developer Guide](./DEVELOPER_GUIDE.md)
- **Stack Overflow**: Tag questions with `pod-protocol` and `solana`

### Creating Bug Reports

When reporting issues, include:

1. **Environment information:**
```bash
# Run and include output
./scripts/health-check.sh
```

2. **Error logs:**
```bash
# Include relevant logs
solana logs --output json > error-logs.json
```

3. **Reproduction steps:**
```bash
# Minimal reproduction case
git clone https://github.com/your-username/pod-protocol-issue
cd pod-protocol-issue
bun install
bun run reproduce-issue
```

4. **Expected vs actual behavior**

### Emergency Support

For critical production issues:

- **Email**: emergency@pod-protocol.com
- **Discord**: @emergency-support
- **Phone**: Available for enterprise customers

---

This troubleshooting guide covers the most common issues encountered when developing with PoD Protocol. If you encounter an issue not covered here, please check our [GitHub Issues](https://github.com/Dexploarer/PoD-Protocol/issues) or create a new issue with detailed information about your problem.