#!/usr/bin/env node

/**
 * Demo script showing the 3-step agent workflow
 * This demonstrates the "happy path" scenario
 */

import { ContentGenerationAgent } from './agent.js';

const EXA_SEARCH_MCP_URL = 'https://server.smithery.ai/exa/mcp';
const JIGSAW_TRANSLATE_MCP_URL = 'https://server.smithery.ai/@JigsawStack/translation/mcp';

async function demoHappyPath(): Promise<void> {
    console.log('🎯 DEMO: 3-Step Content Generation Agent');
    console.log('========================================');
    console.log();
    console.log('📋 Smithery Orchestration Overview:');
    console.log('Smithery orchestrates multi-step workflows by chaining tool calls via MCP servers.');
    console.log('Each step is a discrete, testable component that can be:');
    console.log('- Independently scaled and managed');
    console.log('- Easily swapped or updated');
    console.log('- Enhanced with fallback mechanisms');
    console.log('- Monitored and debugged separately');
    console.log();
    console.log('🚀 Workflow: Research → Draft → Translate');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Initialize the agent
        const agent = new ContentGenerationAgent(EXA_SEARCH_MCP_URL, JIGSAW_TRANSLATE_MCP_URL);
        await agent.initialize();

        // Demo query - adjust as needed
        const demoQuery = "What are the latest developments in artificial intelligence and machine learning";
        const targetLanguage = "es"; // Spanish

        console.log(`📝 Demo Query: "${demoQuery}"`);
        console.log(`🌐 Target Language: ${targetLanguage}`);
        console.log();

        // Execute the complete workflow
        const result = await agent.executeWorkflow(demoQuery, targetLanguage);

        // Display comprehensive results
        console.log('\n🎊 DEMO RESULTS SUMMARY:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (result.success) {
            console.log('✅ Overall Status: SUCCESS');
            console.log();

            // Show step-by-step breakdown
            console.log('📊 Step Breakdown:');
            console.log('1. Research: ✅ COMPLETED');
            console.log('2. Draft: ✅ COMPLETED');
            console.log('3. Translate: ✅ COMPLETED');

            if (result.data?.translation?.fallback_applied) {
                console.log('   ⚠️  Note: Translation fallback was applied');
            }

            console.log();
            console.log('📄 Final Translated Content:');
            console.log('─────────────────────────────');
            
            // Display the final translated content
            if (result.data?.translation?.content) {
                result.data.translation.content.forEach((item: any) => {
                    if (item.type === 'text') {
                        console.log(item.text);
                    }
                });
            } else if (result.data?.translation?.translated_text) {
                console.log(result.data.translation.translated_text);
            } else {
                console.log('Translation result:', JSON.stringify(result.data?.translation, null, 2));
            }

        } else {
            console.log('❌ Overall Status: FAILED');
            console.log(`💥 Failed at step: ${result.step}`);
            console.log(`🔍 Error: ${result.error}`);
        }

        await agent.cleanup();

        console.log();
        console.log('🎉 Demo completed! The agent workflow demonstrates:');
        console.log('• Modular, discrete steps (Research → Draft → Translate)');
        console.log('• Robust error handling with fallbacks');
        console.log('• OAuth authentication to multiple MCP servers');
        console.log('• Clean separation of concerns');
        console.log('• Easy testing and debugging capabilities');

    } catch (error) {
        console.error('❌ Demo failed with error:', error);
        process.exit(1);
    }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
    demoHappyPath().catch((error) => {
        console.error('Unhandled demo error:', error);
        process.exit(1);
    });
}

export { demoHappyPath };
