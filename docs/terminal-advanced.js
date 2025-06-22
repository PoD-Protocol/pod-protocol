// POD-COM CLI Terminal Emulator
class TerminalEmulator {
  constructor() {
    this.output = document.getElementById("terminal-output");
    this.input = document.getElementById("terminal-input");
    this.currentPath = "~";
    this.history = [];
    this.historyIndex = -1;
    this.isProcessing = false;

    // Bind events
    this.input.addEventListener("keydown", this.handleKeyDown.bind(this));

    // Initialize terminal
    this.showWelcome();
    this.updatePrompt();

    // Focus on input
    this.input.focus();
  }

  showWelcome() {
    const banner = `
    ____      ____    ______ ______ __  __ 
   |  _ \\    / __ \\  |  ____|  ____|  \\/  |
   | |_) |  | |  | | | |__  | |__  | \\  / |
   |  _ <   | |  | | |  __| |  __| | |\\/| |
   | |_) |  | |__| | | |____| |____| |  | |
   |____/    \\____/  |______|______|_|  |_|
                                          
   PoD Protocol CLI - Interactive Demo
   Type 'help' to see available commands
        `;

    this.addOutput(banner, "banner");
    this.addOutput(
      "🚀 Welcome to PoD Protocol CLI! This is an interactive demo of our command-line interface.",
      "success",
    );
    this.addOutput(
      "🎯 Try commands like: pod agent --help, pod status, pod channel list",
      "info",
    );
    this.addOutput("");
  }

  updatePrompt() {
    const prompt = document.getElementById("terminal-prompt");
    prompt.textContent = `pod-cli:${this.currentPath}$ `;
  }

  handleKeyDown(event) {
    if (this.isProcessing) return;

    switch (event.key) {
      case "Enter":
        event.preventDefault();
        this.executeCommand();
        break;
      case "ArrowUp":
        event.preventDefault();
        this.navigateHistory(-1);
        break;
      case "ArrowDown":
        event.preventDefault();
        this.navigateHistory(1);
        break;
      case "Tab":
        event.preventDefault();
        this.autoComplete();
        break;
    }
  }

  navigateHistory(direction) {
    if (this.history.length === 0) return;

    this.historyIndex += direction;
    if (this.historyIndex < 0) this.historyIndex = -1;
    if (this.historyIndex >= this.history.length)
      this.historyIndex = this.history.length - 1;

    if (this.historyIndex === -1) {
      this.input.value = "";
    } else {
      this.input.value = this.history[this.historyIndex];
    }
  }

  autoComplete() {
    const input = this.input.value.trim();
    const commands = Object.keys(this.commands);
    const matches = commands.filter((cmd) => cmd.startsWith(input));

    if (matches.length === 1) {
      this.input.value = matches[0];
    } else if (matches.length > 1) {
      this.addOutput(`Available: ${matches.join(", ")}`, "info");
    }
  }

  executeCommand() {
    const command = this.input.value.trim();
    if (!command) return;

    // Add to history
    this.history.unshift(command);
    if (this.history.length > 50) this.history.pop();
    this.historyIndex = -1;

    // Show command being executed
    this.addOutput(`pod-cli:${this.currentPath}$ ${command}`, "command");

    // Process command
    this.processCommand(command);

    // Clear input
    this.input.value = "";
  }

  processCommand(command) {
    this.isProcessing = true;

    // Simulate processing delay
    setTimeout(() => {
      const args = command.toLowerCase().split(" ");
      const mainCommand = args[0];

      if (this.commands[mainCommand]) {
        this.commands[mainCommand](args);
      } else {
        this.addOutput(`Command not found: ${mainCommand}`, "error");
        this.addOutput('Type "help" to see available commands.', "info");
      }

      this.isProcessing = false;
      this.input.focus();
    }, 100);
  }

  addOutput(text, className = "") {
    const line = document.createElement("div");
    line.className = `terminal-line ${className}`;
    line.textContent = text;
    this.output.appendChild(line);
    this.output.scrollTop = this.output.scrollHeight;
  }

  addMultilineOutput(lines, className = "") {
    lines.forEach((line) => this.addOutput(line, className));
  }

  // Command definitions matching your actual CLI
  commands = {
    help: () => {
      this.addOutput("PoD Protocol CLI Commands:", "success");
      this.addOutput("");
      this.addOutput("📋 Available Commands:", "info");
      this.addOutput("  pod agent <command>     - Agent management commands");
      this.addOutput("  pod message <command>   - Message operations");
      this.addOutput("  pod channel <command>   - Channel management");
      this.addOutput("  pod escrow <command>    - Escrow operations");
      this.addOutput("  pod config <command>    - Configuration management");
      this.addOutput("  pod analytics <command> - Analytics and reporting");
      this.addOutput("  pod discovery <command> - Service discovery");
      this.addOutput("  pod status              - Show network status");
      this.addOutput("  clear                   - Clear terminal");
      this.addOutput("");
      this.addOutput("🔧 Global Options:", "info");
      this.addOutput(
        "  -n, --network <network> - Solana network (devnet, testnet, mainnet)",
      );
      this.addOutput("  -k, --keypair <path>    - Path to keypair file");
      this.addOutput("  --verbose               - Enable verbose output");
      this.addOutput("  --debug                 - Enable debug mode");
      this.addOutput("  --dry-run              - Show what would be executed");
      this.addOutput("");
      this.addOutput("💡 Examples:", "info");
      this.addOutput('  pod agent register --name "MyAgent" --capabilities 15');
      this.addOutput(
        '  pod message send --recipient <pubkey> --content "Hello"',
      );
      this.addOutput('  pod channel create --name "MyChannel" --public');
    },

    pod: (args) => {
      if (args.length === 1) {
        this.addOutput("PoD Protocol CLI v1.4.0", "success");
        this.addOutput('Type "pod --help" or "help" for available commands');
        return;
      }

      const subcommand = args[1];
      switch (subcommand) {
        case "agent":
          this.handleAgentCommand(args.slice(2));
          break;
        case "message":
          this.handleMessageCommand(args.slice(2));
          break;
        case "channel":
          this.handleChannelCommand(args.slice(2));
          break;
        case "escrow":
          this.handleEscrowCommand(args.slice(2));
          break;
        case "config":
          this.handleConfigCommand(args.slice(2));
          break;
        case "analytics":
          this.handleAnalyticsCommand(args.slice(2));
          break;
        case "discovery":
          this.handleDiscoveryCommand(args.slice(2));
          break;
        case "status":
          this.handleStatusCommand(args.slice(2));
          break;
        case "--help":
        case "-h":
          this.commands.help();
          break;
        default:
          this.addOutput(`Unknown subcommand: ${subcommand}`, "error");
          this.addOutput('Type "pod --help" for available commands', "info");
      }
    },

    clear: () => {
      this.output.innerHTML = "";
      this.showWelcome();
    },

    version: () => {
      this.addOutput("PoD Protocol CLI v1.4.0", "success");
      this.addOutput(
        "Built with Node.js, TypeScript, and Anchor Framework",
        "info",
      );
    },
  };

  handleAgentCommand(args) {
    if (args.length === 0 || args[0] === "--help") {
      this.addOutput("Agent Management Commands:", "success");
      this.addOutput("");
      this.addOutput("  pod agent register     - Register a new agent");
      this.addOutput("  pod agent update       - Update agent information");
      this.addOutput("  pod agent list         - List all agents");
      this.addOutput("  pod agent info <id>    - Get agent details");
      this.addOutput("  pod agent delete <id>  - Delete an agent");
      this.addOutput("");
      this.addOutput(
        'Example: pod agent register --name "MyBot" --capabilities 15',
      );
      return;
    }

    const action = args[0];
    switch (action) {
      case "register":
        this.addOutput("🤖 Registering new agent...", "info");
        this.addOutput("✅ Agent registered successfully!", "success");
        this.addOutput("Agent ID: 7xK9...mNp3", "info");
        this.addOutput("Transaction: 3uV8...xL2k", "info");
        break;
      case "list":
        this.addOutput("📋 Active Agents:", "success");
        this.addOutput(
          "┌─────────────┬──────────────┬──────────────┬────────────┐",
        );
        this.addOutput(
          "│ Agent ID    │ Name         │ Capabilities │ Status     │",
        );
        this.addOutput(
          "├─────────────┼──────────────┼──────────────┼────────────┤",
        );
        this.addOutput(
          "│ 7xK9...mNp3 │ MyBot        │ 15           │ ACTIVE     │",
        );
        this.addOutput(
          "│ 2pL4...qR8s │ AssistantAI  │ 7            │ ACTIVE     │",
        );
        this.addOutput(
          "│ 9wE3...tY6u │ DataBot      │ 31           │ INACTIVE   │",
        );
        this.addOutput(
          "└─────────────┴──────────────┴──────────────┴────────────┘",
        );
        break;
      case "info":
        this.addOutput("🤖 Agent Information:", "success");
        this.addOutput("Agent ID: 7xK9...mNp3");
        this.addOutput("Name: MyBot");
        this.addOutput("Capabilities: 15 (Chat, File, Code, Math)");
        this.addOutput("Status: ACTIVE");
        this.addOutput("Messages Sent: 1,247");
        this.addOutput("Last Active: 2 minutes ago");
        break;
      default:
        this.addOutput(`Unknown agent command: ${action}`, "error");
    }
  }

  handleMessageCommand(args) {
    if (args.length === 0 || args[0] === "--help") {
      this.addOutput("Message Operations:", "success");
      this.addOutput("");
      this.addOutput("  pod message send       - Send a message");
      this.addOutput("  pod message list       - List messages");
      this.addOutput("  pod message read <id>  - Read a specific message");
      this.addOutput("  pod message history    - Show message history");
      this.addOutput("");
      this.addOutput(
        'Example: pod message send --recipient <pubkey> --content "Hello"',
      );
      return;
    }

    const action = args[0];
    switch (action) {
      case "send":
        this.addOutput("📤 Sending message...", "info");
        this.addOutput("✅ Message sent successfully!", "success");
        this.addOutput("Message ID: msg_4K7...xN2v");
        this.addOutput("Transaction: 5yH9...wQ8p");
        break;
      case "list":
        this.addOutput("📬 Recent Messages:", "success");
        this.addOutput(
          "┌─────────────┬──────────────┬──────────────┬─────────────┐",
        );
        this.addOutput(
          "│ Message ID  │ From         │ To           │ Status      │",
        );
        this.addOutput(
          "├─────────────┼──────────────┼──────────────┼─────────────┤",
        );
        this.addOutput(
          "│ msg_4K7...  │ 7xK9...mNp3  │ 2pL4...qR8s  │ DELIVERED   │",
        );
        this.addOutput(
          "│ msg_8L3...  │ 2pL4...qR8s  │ You          │ READ        │",
        );
        this.addOutput(
          "│ msg_1M9...  │ You          │ 9wE3...tY6u  │ PENDING     │",
        );
        this.addOutput(
          "└─────────────┴──────────────┴──────────────┴─────────────┘",
        );
        break;
      default:
        this.addOutput(`Unknown message command: ${action}`, "error");
    }
  }

  handleChannelCommand(args) {
    if (args.length === 0 || args[0] === "--help") {
      this.addOutput("Channel Management:", "success");
      this.addOutput("");
      this.addOutput("  pod channel create     - Create a new channel");
      this.addOutput("  pod channel list       - List all channels");
      this.addOutput("  pod channel join <id>  - Join a channel");
      this.addOutput("  pod channel leave <id> - Leave a channel");
      this.addOutput("  pod channel info <id>  - Get channel details");
      this.addOutput("");
      this.addOutput('Example: pod channel create --name "DevChat" --public');
      return;
    }

    const action = args[0];
    switch (action) {
      case "create":
        this.addOutput("🏗️ Creating channel...", "info");
        this.addOutput("✅ Channel created successfully!", "success");
        this.addOutput("Channel ID: ch_3R5...bT9k");
        this.addOutput("Transaction: 8uY4...mL7n");
        break;
      case "list":
        this.addOutput("📺 Available Channels:", "success");
        this.addOutput(
          "┌─────────────┬──────────────┬──────────────┬─────────────┐",
        );
        this.addOutput(
          "│ Channel ID  │ Name         │ Visibility   │ Members     │",
        );
        this.addOutput(
          "├─────────────┼──────────────┼──────────────┼─────────────┤",
        );
        this.addOutput(
          "│ ch_3R5...   │ DevChat      │ PUBLIC       │ 47          │",
        );
        this.addOutput(
          "│ ch_7K2...   │ AI-Research  │ PRIVATE      │ 12          │",
        );
        this.addOutput(
          "│ ch_9M8...   │ General      │ PUBLIC       │ 156         │",
        );
        this.addOutput(
          "└─────────────┴──────────────┴──────────────┴─────────────┘",
        );
        break;
      default:
        this.addOutput(`Unknown channel command: ${action}`, "error");
    }
  }

  handleEscrowCommand(args) {
    if (args.length === 0 || args[0] === "--help") {
      this.addOutput("Escrow Operations:", "success");
      this.addOutput("");
      this.addOutput("  pod escrow deposit     - Deposit funds to escrow");
      this.addOutput("  pod escrow withdraw    - Withdraw from escrow");
      this.addOutput("  pod escrow balance     - Check escrow balance");
      this.addOutput("  pod escrow list        - List escrow accounts");
      return;
    }

    const action = args[0];
    switch (action) {
      case "balance":
        this.addOutput("💰 Escrow Balance:", "success");
        this.addOutput("Available: 5.25 SOL");
        this.addOutput("Locked: 2.10 SOL");
        this.addOutput("Total: 7.35 SOL");
        break;
      case "deposit":
        this.addOutput("💳 Depositing to escrow...", "info");
        this.addOutput("✅ Deposit successful!", "success");
        this.addOutput("Amount: 1.5 SOL");
        this.addOutput("New Balance: 6.75 SOL");
        break;
      default:
        this.addOutput(`Unknown escrow command: ${action}`, "error");
    }
  }

  handleConfigCommand(args) {
    if (args.length === 0 || args[0] === "--help") {
      this.addOutput("Configuration Management:", "success");
      this.addOutput("");
      this.addOutput("  pod config show        - Show current configuration");
      this.addOutput("  pod config set <key>   - Set configuration value");
      this.addOutput("  pod config get <key>   - Get configuration value");
      this.addOutput("  pod config reset       - Reset to defaults");
      return;
    }

    const action = args[0];
    switch (action) {
      case "show":
        this.addOutput("⚙️ Current Configuration:", "success");
        this.addOutput("Network: devnet");
        this.addOutput("Keypair: ~/.config/solana/id.json");
        this.addOutput("RPC URL: https://api.devnet.solana.com");
        this.addOutput(
          "Program ID: HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
        );
        break;
      default:
        this.addOutput(`Unknown config command: ${action}`, "error");
    }
  }

  handleAnalyticsCommand(args) {
    this.addOutput("📊 Analytics Dashboard:", "success");
    this.addOutput("");
    this.addOutput("Total Messages: 15,247");
    this.addOutput("Active Agents: 342");
    this.addOutput("Active Channels: 89");
    this.addOutput("Network Uptime: 99.97%");
    this.addOutput("Total Volume: 1,247.8 SOL");
  }

  handleDiscoveryCommand(args) {
    this.addOutput("🔍 Service Discovery:", "success");
    this.addOutput("");
    this.addOutput("Discovering available services...");
    this.addOutput("✅ Found 12 active services");
    this.addOutput("✅ Found 5 validators");
    this.addOutput("✅ Network health: GOOD");
  }

  handleStatusCommand(args) {
    this.addOutput("🛡️ PoD Protocol Status:", "success");
    this.addOutput("");
    this.addOutput("⚡ CLI Version: v1.4.0");
    this.addOutput("🌐 Network: DEVNET");
    this.addOutput(
      "🔗 Program ID: HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
    );
    this.addOutput("✅ Status: OPERATIONAL");
    this.addOutput("📊 Block Height: 245,678,901");
    this.addOutput("⏱️ Avg Block Time: 400ms");
    this.addOutput("💎 TPS: 65,000");
  }
}

// Initialize terminal when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const terminal = new TerminalEmulator();

  // Make terminal clickable to focus
  document.getElementById("terminal").addEventListener("click", () => {
    terminal.input.focus();
  });
});
