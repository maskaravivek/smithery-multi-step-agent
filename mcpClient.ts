import { createInterface } from 'node:readline';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
    CallToolRequest,
    ListToolsRequest,
    CallToolResultSchema,
    ListToolsResultSchema
} from '@modelcontextprotocol/sdk/types.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { InMemoryOAuthClientProvider } from './oauthProvider.js';
import { openBrowser, waitForOAuthCallback, findAvailablePort } from './oauthUtils.js';

const CALLBACK_PORT_START = 8090;

/**
 * Interactive MCP client with OAuth authentication
 */
export class InteractiveOAuthClient {
    private client: Client | null = null;
    private readonly rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    constructor(private serverUrl: string, private startingPort: number = CALLBACK_PORT_START) { }

    private async question(query: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(query, resolve);
        });
    }

    private async attemptConnection(oauthProvider: InMemoryOAuthClientProvider, callbackPort: number): Promise<void> {
        console.log('🚢 Creating transport with OAuth provider...');
        const baseUrl = new URL(this.serverUrl);
        const transport = new StreamableHTTPClientTransport(baseUrl, {
            authProvider: oauthProvider
        });
        console.log('🚢 Transport created');

        try {
            console.log('🔌 Attempting connection (this will trigger OAuth redirect)...');
            await this.client!.connect(transport);
            console.log('✅ Connected successfully');
        } catch (error) {
            if (error instanceof UnauthorizedError) {
                console.log('🔐 OAuth required - waiting for authorization...');
                const authCode = await waitForOAuthCallback(callbackPort);
                await transport.finishAuth(authCode);
                console.log('🔐 Authorization code received:', authCode);
                console.log('🔌 Reconnecting with authenticated transport...');
                await this.attemptConnection(oauthProvider, callbackPort);
            } else {
                console.error('❌ Connection failed with non-auth error:', error);
                throw error;
            }
        }
    }

    /**
     * Connect without starting interactive loop (for programmatic use)
     */
    async connectWithoutLoop(): Promise<void> {
        console.log(`🔗 Attempting to connect to ${this.serverUrl}...`);

        // Find an available port for OAuth callback
        // Find available port starting from the specified starting port
        const callbackPort = await findAvailablePort(this.startingPort);
        const callbackUrl = `http://localhost:${callbackPort}/callback`;
        console.log(`🔌 Using callback URL: ${callbackUrl}`);

        const clientMetadata = {
            client_name: 'Simple OAuth MCP Client',
            redirect_uris: [callbackUrl],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            token_endpoint_auth_method: 'client_secret_post',
            scope: 'mcp:tools'
        };

        console.log('🔐 Creating OAuth provider...');
        const oauthProvider = new InMemoryOAuthClientProvider(
            callbackUrl,
            clientMetadata,
            (redirectUrl) => {
                console.log(`📌 OAuth redirect handler called - opening browser`);
                console.log(`Opening browser to: ${redirectUrl.toString()}`);
                openBrowser(redirectUrl.toString());
            }
        );
        console.log('🔐 OAuth provider created');

        console.log('👤 Creating MCP client...');
        this.client = new Client({
            name: 'simple-oauth-client',
            version: '1.0.0',
        }, { capabilities: {} });
        console.log('👤 Client created');

        console.log('🔐 Starting OAuth flow...');

        await this.attemptConnection(oauthProvider, callbackPort);
    }

    async connect(): Promise<void> {
        await this.connectWithoutLoop();
        await this.interactiveLoop();
    }

    async interactiveLoop(): Promise<void> {
        console.log('\n🎯 Interactive MCP Client with OAuth');
        console.log('Commands:');
        console.log('  list - List available tools');
        console.log('  call <tool_name> [args] - Call a tool');
        console.log('  agent - Run 3-step content generation agent');
        console.log('  quit - Exit the client');
        console.log();

        while (true) {
            try {
                const command = await this.question('mcp> ');

                if (!command.trim()) {
                    continue;
                }

                if (command === 'quit') {
                    break;
                } else if (command === 'list') {
                    await this.listTools();
                } else if (command.startsWith('call ')) {
                    await this.handleCallTool(command);
                } else {
                    console.log('❌ Unknown command. Try \'list\', \'call <tool_name>\', or \'quit\'');
                }
            } catch (error) {
                if (error instanceof Error && error.message === 'SIGINT') {
                    console.log('\n\n👋 Goodbye!');
                    break;
                }
                console.error('❌ Error:', error);
            }
        }
    }

    async listTools(): Promise<void> {
        if (!this.client) {
            console.log('❌ Not connected to server');
            return;
        }

        try {
            const request: ListToolsRequest = {
                method: 'tools/list',
                params: {},
            };

            const result = await this.client.request(request, ListToolsResultSchema);

            if (result.tools && result.tools.length > 0) {
                console.log('\n📋 Available tools:');
                result.tools.forEach((tool, index) => {
                    console.log(`${index + 1}. ${tool.name}`);
                    if (tool.description) {
                        console.log(`   Description: ${tool.description}`);
                    }
                    console.log();
                });
            } else {
                console.log('No tools available');
            }
        } catch (error) {
            console.error('❌ Failed to list tools:', error);
        }
    }

    private async handleCallTool(command: string): Promise<void> {
        const parts = command.split(/\s+/);
        const toolName = parts[1];

        if (!toolName) {
            console.log('❌ Please specify a tool name');
            return;
        }

        let toolArgs: Record<string, unknown> = {};
        if (parts.length > 2) {
            const argsString = parts.slice(2).join(' ');
            try {
                toolArgs = JSON.parse(argsString);
            } catch {
                console.log('❌ Invalid arguments format (expected JSON)');
                return;
            }
        }

        await this.callTool(toolName, toolArgs);
    }

    async callTool(toolName: string, toolArgs: Record<string, unknown>): Promise<void> {
        if (!this.client) {
            console.log('❌ Not connected to server');
            return;
        }

        try {
            const request: CallToolRequest = {
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: toolArgs,
                },
            };

            const result = await this.client.request(request, CallToolResultSchema);

            console.log(`\n🔧 Tool '${toolName}' result:`);
            if (result.content) {
                result.content.forEach((content) => {
                    if (content.type === 'text') {
                        console.log(content.text);
                    } else {
                        console.log(content);
                    }
                });
            } else {
                console.log(result);
            }
        } catch (error) {
            console.error(`❌ Failed to call tool '${toolName}':`, error);
        }
    }

    /**
     * Call a tool directly and return the result (for programmatic use)
     */
    async callToolDirect(toolName: string, toolArgs: Record<string, unknown>): Promise<any> {
        if (!this.client) {
            throw new Error('Not connected to server');
        }

        const request: CallToolRequest = {
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: toolArgs,
            },
        };

        const result = await this.client.request(request, CallToolResultSchema);
        return result;
    }

    /**
     * List tools directly and return the result (for programmatic use)
     */
    async listToolsDirect(): Promise<any> {
        if (!this.client) {
            throw new Error('Not connected to server');
        }

        const request: ListToolsRequest = {
            method: 'tools/list',
            params: {},
        };

        const result = await this.client.request(request, ListToolsResultSchema);
        return result;
    }

    close(): void {
        this.rl.close();
        if (this.client) {
            // Note: Client doesn't have a close method in the current implementation
        }
    }
}
