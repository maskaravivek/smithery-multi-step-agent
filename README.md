# Smithery Multi-Step Agent

A 3-step content generation agent that demonstrates Smithery's orchestration capabilities using Model Context Protocol (MCP) servers.

## Workflow: Research → Draft → Translate

This agent showcases a modular workflow where each step is a discrete, testable component:

1. **Research**: Uses Exa Search MCP to gather information
2. **Draft**: Generates content based on research (using LLM)
3. **Translate**: Translates the draft using DeepL Translation MCP

## Smithery Orchestration

Smithery orchestrates multi-step workflows by chaining tool calls via MCP servers. Each step is invoked independently, enabling:

- **Robust automation**: Each component can be tested and monitored separately
- **Fallback mechanisms**: If translation fails, the agent returns the original draft
- **Independent scaling**: Each MCP server can be scaled independently
- **Clear separation of concerns**: Research, drafting, and translation are separate services

## Project Structure

```
├── index.ts           # Main CLI application with mode selection
├── agent.ts           # 3-step ContentGenerationAgent class
├── mcpClient.ts       # MCP client with OAuth authentication
├── oauthProvider.ts   # OAuth client provider implementation
├── oauthUtils.ts      # OAuth utility functions (browser, callback)
├── demo.ts           # Demo script showing happy path scenario
└── package.json      # Dependencies and scripts
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Demo (Happy Path)
```bash
npm run demo
```

### 3. Interactive Mode
```bash
npm run agent
```

Then choose:
- **Option 1**: Agent Workflow (Research → Draft → Translate)
- **Option 2**: Interactive MCP Client (manual tool calls)

## Features

### 🤖 3-Step Agent Workflow
- Automated research using Exa Search
- AI-powered content drafting
- Multi-language translation with fallback
- Complete error handling and logging

### 🔐 OAuth Authentication
- Supports multiple MCP servers simultaneously
- Browser-based OAuth flow
- Secure token management
- Automatic reconnection handling

### 🛠 Modular Architecture
- Each step is independently testable
- Clean separation between OAuth, MCP client, and agent logic
- Easy to extend with new steps or tools

### 🔄 Fallback Mechanisms
- If translation fails, returns content in original language
- Graceful degradation ensures workflow completion
- Comprehensive error reporting

## Usage Examples

### Agent Workflow
```bash
npm run agent
# Choose option 1
# Enter: "latest developments in renewable energy"
# Target language: "fr"
```

### Interactive MCP Client
```bash
npm run agent
# Choose option 2
# Commands: list, call search {"query": "AI trends"}, quit
```

### Direct Demo
```bash
npm run demo
# Runs predefined workflow with AI/ML query
```

## Environment Variables

```bash
# Optional: Override default MCP server URL
MCP_SERVER_URL=https://your-custom-mcp-server.com
```

## Development

```bash
# Watch mode for development
npm run dev

# Build TypeScript
npm run build

# Clean build artifacts
npm run clean
```

## Error Handling

The agent implements comprehensive error handling:

- **Research Step**: Fallback to empty results if search fails
- **Draft Step**: Error propagation with detailed logging
- **Translation Step**: Returns original text if translation fails
- **OAuth Flow**: Automatic retry and user guidance

## MCP Servers Used

1. **Exa Search**: `https://server.smithery.ai/exa/mcp`
   - Tool: `search`
   - Purpose: Web research and information gathering

2. **DeepL Translation**: `https://server.smithery.ai/@DeepLcom/deepl-mcp-server/mcp`
   - Tool: `translate`
   - Purpose: Multi-language translation

## Next Steps

- Add more MCP tools (summarization, image generation, etc.)
- Implement persistent token storage
- Add workflow configuration files
- Create unit tests for each component
- Add monitoring and analytics
