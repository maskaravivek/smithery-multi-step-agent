#!/usr/bin/env node

import { createInterface } from 'node:readline';
import { ContentGenerationAgent } from './agent.js';

// Configuration
const EXA_SEARCH_MCP_URL = 'https://server.smithery.ai/exa/mcp';
const DEEPL_TRANSLATE_MCP_URL = 'https://server.smithery.ai/@DeepLcom/deepl-mcp-server/mcp';

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
        console.log('Smithery 3-Step Content Generation Agent');
        console.log('==========================================');

        // Get user input
        const query = await question('Enter your research query: ');
        const targetLang = await question('Enter target language (e.g., es, fr, de) [default: es]: ') || 'es';

        console.log('\nInitializing agent...');
        const agent = new ContentGenerationAgent(EXA_SEARCH_MCP_URL, DEEPL_TRANSLATE_MCP_URL);
        
        await agent.initialize();

        // Execute the complete workflow
        const result = await agent.executeWorkflow(query, targetLang);

        // Display results
        console.log('\nWORKFLOW RESULTS:');
        console.log('==================');
        
        if (result.success) {
            console.log('Status: SUCCESS');
            console.log('\nFinal Translation:');
            
            // Handle different response formats
            const translation = result.data?.translation;
            if (translation?.content) {
                // MCP content format
                translation.content.forEach((item: any) => {
                    if (item.type === 'text') {
                        console.log(item.text);
                    }
                });
            } else if (translation?.translated_text) {
                // Direct translated_text field
                console.log(translation.translated_text);
            } else if (translation?.success && translation?.data) {
                // Nested success/data format
                console.log(translation.data);
            } else {
                // Fallback: show full translation object
                console.log('Translation response:', JSON.stringify(translation, null, 2));
            }

            if (result.data?.translation?.fallback_applied) {
                console.log('\nNote: Translation fallback was applied');
            }
        } else {
            console.log('Status: FAILED');
            console.log(`Error in ${result.step}: ${result.error}`);
        }

        await agent.cleanup();

    } catch (error) {
        console.error('Agent workflow failed:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run the agent
main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
