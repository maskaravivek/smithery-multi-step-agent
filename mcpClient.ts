import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
    CallToolRequest,
    CallToolResultSchema
} from '@modelcontextprotocol/sdk/types.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { InMemoryOAuthClientProvider } from './oauthProvider.js';
import { openBrowser, waitForOAuthCallback, findAvailablePort } from './oauthUtils.js';

/**
 * MCP client with OAuth authentication
 */
export class InteractiveOAuthClient {
    private client: Client | null = null;

    constructor(private serverUrl: string, private startingPort: number = 8090) { }


    private async attemptConnection(oauthProvider: InMemoryOAuthClientProvider, callbackPort: number): Promise<void> {
        const baseUrl = new URL(this.serverUrl);
        const transport = new StreamableHTTPClientTransport(baseUrl, {
            authProvider: oauthProvider
        });

        try {
            await this.client!.connect(transport);
        } catch (error) {
            if (error instanceof UnauthorizedError) {
                const authCode = await waitForOAuthCallback(callbackPort);
                await transport.finishAuth(authCode);
                await this.attemptConnection(oauthProvider, callbackPort);
            } else {
                throw error;
            }
        }
    }

    /**
     * Connect to the MCP server
     */
    async connect(): Promise<void> {
        const callbackPort = await findAvailablePort(this.startingPort);
        const callbackUrl = `http://localhost:${callbackPort}/callback`;

        const clientMetadata = {
            client_name: 'MCP Agent Client',
            redirect_uris: [callbackUrl],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            token_endpoint_auth_method: 'client_secret_post',
            scope: 'mcp:tools'
        };

        const oauthProvider = new InMemoryOAuthClientProvider(
            callbackUrl,
            clientMetadata,
            (redirectUrl) => openBrowser(redirectUrl.toString())
        );

        this.client = new Client({
            name: 'mcp-agent-client',
            version: '1.0.0',
        }, { capabilities: {} });

        await this.attemptConnection(oauthProvider, callbackPort);
    }

    /**
     * Call a tool and return the result
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

    close(): void {
        // Client doesn't have a close method in the current implementation
    }
}
