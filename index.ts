#!/usr/bin/env node

import { createInterface } from 'node:readline';
import { ContentGenerationAgent } from './agent.js';

const EXA_SEARCH_MCP_URL = 'https://server.smithery.ai/exa/mcp';
const DEEPL_TRANSLATE_MCP_URL = 'https://server.smithery.ai/@DeepLcom/deepl-mcp-server/mcp';
const JIGSAW_TRANSLATE_MCP_URL = 'https://server.smithery.ai/@JigsawStack/translation/mcp';

async function main(): Promise<void> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const question = (query: string): Promise<string> => {
        return new Promise((resolve) => {
            rl.question(query, resolve);
        });
    };

    try {
        const query = await question('Enter your research query: ');
        const targetLang = await question('Enter target language (e.g., es, fr, de) [default: es]: ') || 'es';

        const agent = new ContentGenerationAgent(EXA_SEARCH_MCP_URL,
            JIGSAW_TRANSLATE_MCP_URL,
            DEEPL_TRANSLATE_MCP_URL);

        await agent.initialize();
        const result = await agent.executeWorkflow(query, targetLang);

        if (result.success) {
            console.log(JSON.stringify(result.data, null, 2));
        } else {
            console.error(`Error: ${result.error}`);
        }

        await agent.cleanup();

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
