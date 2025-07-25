import { InteractiveOAuthClient } from './mcpClient.js';

/**
 * Smithery Orchestration Brief:
 * 
 * Smithery orchestrates multi-step workflows by chaining tool calls via MCP (Model Context Protocol) servers.
 * Each step (tool) is invoked independently, and results are passed to the next step, allowing for:
 * - Robust, testable automation
 * - Fallback-enabled workflows
 * - Independent component scaling
 * - Clear separation of concerns
 * 
 * The agent pattern follows: Input → Tool1 → Tool2 → ... → Output
 * With each step being a discrete, composable unit.
 */

export interface AgentResult {
    success: boolean;
    data?: any;
    error?: string;
    step?: string;
}

export class ContentGenerationAgent {
    // Initialize both clients with different ports to avoid conflicts
    private exaClient: InteractiveOAuthClient;
    private deepLClient: InteractiveOAuthClient;

    constructor(
        private exaSearchUrl: string,
        private deepLTranslateUrl: string
    ) {
        // Use different callback ports for each client to avoid OAuth conflicts
        this.exaClient = new InteractiveOAuthClient(exaSearchUrl, 8090);
        this.deepLClient = new InteractiveOAuthClient(deepLTranslateUrl, 8091);
    }

    /**
     * Initialize connections to both MCP servers
     */
    async initialize(): Promise<void> {
        console.log('Initializing agent connections...');
        await this.exaClient.connect();
        await this.deepLClient.connect();
        console.log('Agent initialization complete');
    }

    /**
     * Step 1: Research using MCP search tool
     */
    async research(query: string): Promise<AgentResult> {
        console.log(`Step 1: Research - "${query}"`);
        
        try {
            const result = await this.exaClient.callToolDirect('web_search_exa', { 
                query,
                num_results: 5
            });

            return {
                success: true,
                data: result,
                step: 'research'
            };
        } catch (error) {
            console.error('Research step failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown research error',
                step: 'research'
            };
        }
    }

    /**
     * Step 2: Draft content using LLM (simulated for demo)
     */
    async draft(researchData: any): Promise<AgentResult> {
        console.log('Step 2: Draft - Generating content...');
        
        try {
            // Extract meaningful content from research results
            let researchSummary = '';
            if (researchData && researchData.content) {
                researchData.content.forEach((item: any) => {
                    if (item.type === 'text') {
                        researchSummary += item.text + '\n';
                    }
                });
            }

            // For demo purposes, create a simple draft
            const draft = `
# Research Summary

Based on the latest research findings, here are the key insights:

${researchSummary}

## Key Points:
- Research indicates important developments in the field
- Multiple sources confirm the growing significance
- Experts recommend staying informed about these trends

## Conclusion:
The research provides valuable insights that can inform decision-making and strategy development.
            `.trim();

            return {
                success: true,
                data: draft,
                step: 'draft'
            };
        } catch (error) {
            console.error('Draft step failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown draft error',
                step: 'draft'
            };
        }
    }

    /**
     * Step 3: Translate using MCP translation tool (with fallback)
     */
    async translate(text: string, targetLanguage: string = 'es'): Promise<AgentResult> {
        console.log(`Step 3: Translate to ${targetLanguage}...`);
        
        try {
            const result = await this.deepLClient.callToolDirect('translate-text', {
                text,
                targetLang: targetLanguage
            });
            
            return {
                success: true,
                data: result,
                step: 'translate'
            };
        } catch (error) {
            console.error('Translation step failed, applying fallback...', error);
            
            // Fallback: return original text with warning
            const fallbackResult = {
                original_text: text,
                translated_text: text,
                warning: 'Translation failed, returning original text',
                target_language: targetLanguage,
                fallback_applied: true
            };

            return {
                success: true, // Still consider it successful due to fallback
                data: fallbackResult,
                step: 'translate',
                error: `Translation failed but fallback applied: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Complete workflow: Research → Draft → Translate
     */
    async executeWorkflow(query: string, targetLanguage: string = 'es'): Promise<AgentResult> {
        console.log('Starting 3-step content generation workflow...');
        console.log(`Query: "${query}"`);
        console.log(`Target Language: ${targetLanguage}`);

        try {
            // Step 1: Research
            const researchResult = await this.research(query);
            if (!researchResult.success) {
                return researchResult;
            }

            // Step 2: Draft
            const draftResult = await this.draft(researchResult.data);
            if (!draftResult.success) {
                return draftResult;
            }

            // Step 3: Translate
            const translateResult = await this.translate(draftResult.data as string, targetLanguage);
            
            console.log('Workflow completed successfully!');

            return {
                success: true,
                data: {
                    query,
                    targetLanguage,
                    research: researchResult.data,
                    draft: draftResult.data,
                    translation: translateResult.data,
                    workflow_status: 'complete'
                },
                step: 'workflow'
            };

        } catch (error) {
            console.error('Workflow failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown workflow error',
                step: 'workflow'
            };
        }
    }

    /**
     * Cleanup connections
     */
    async cleanup(): Promise<void> {
        this.exaClient.close();
        this.deepLClient.close();
    }
}
