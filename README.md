# Smithery Multi-Step Agent

A 3-step content generation agent that demonstrates Smithery's orchestration capabilities using Model Context Protocol (MCP) servers.

## Install dependencies

```bash
npm install
```

## Running the app

Set environment variables:

```bash
export OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
```

Build and run the app:

```bash
npm run build && npm run start
```

Once the agent starts, enter a research topic (eg. "AWS CDK") and set an output language (eg. `es`) of your choice.

> Note: You will be prompted to authenticate to the different MCP servers before the agent continues with the execution.
