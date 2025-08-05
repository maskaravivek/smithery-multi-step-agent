import { InteractiveOAuthClient } from './mcpClient.js';
import { callWithRetry } from './utils.js';
import OpenAI from 'openai';

export interface AgentResult {
    success: boolean;
    data?: any;
    error?: string;
    step?: string;
    metadata?: any;
}

export class ContentGenerationAgent {
    // Initialize both clients with different ports to avoid conflicts
    private exaClient: InteractiveOAuthClient;
    private jigsawClient: InteractiveOAuthClient;
    private deepLClient: InteractiveOAuthClient;
    private openai: OpenAI;

    constructor(
        private _exaSearchUrl: string,
        private _jigsawSearchUrl: string,
        private _deepLTranslateUrl: string,
    ) {
        this.exaClient = new InteractiveOAuthClient(this._exaSearchUrl, 8090);
        this.jigsawClient = new InteractiveOAuthClient(this._jigsawSearchUrl, 8091);
        this.deepLClient = new InteractiveOAuthClient(this._deepLTranslateUrl, 8092);

        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    /**
     * Initialize connections to all MCP servers
     */
    async initialize(): Promise<void> {
        console.log('Initializing agent connections...');
        await this.exaClient.connect();
        await this.jigsawClient.connect();
        await this.deepLClient.connect();
        console.log('Agent initialization complete');
    }

    /**
     * Step 1: Research using MCP search tool
     */
    async research(query: string): Promise<AgentResult> {
        console.log(`Step 1: Research - "${query}"`);

        try {
            console.log('Calling EXA search tool for research...');
            const result = await callWithRetry(
                () => this.exaClient.callToolDirect('web_search_exa', {
                    query,
                    num_results: 5
                }),
                3,
                1000
            );

            return {
                success: true,
                data: result,
                step: 'research'
            };
        } catch (error: any) {
            console.error('Research step failed:', error);
            let errorType: 'transient' | 'permanent' = 'permanent';
            let retryable = false;

            if (error?.name === 'FetchError' || error?.message?.includes('timeout')) {
                errorType = 'transient';
                retryable = true;
            } else if (error?.message?.includes('token expired')) {
                errorType = 'transient';
                retryable = true;
            } else if (error?.message?.includes('invalid token') || error?.message?.includes('invalid payload')) {
                errorType = 'permanent';
                retryable = false;
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown research error',
                step: 'research',
                metadata: {
                    error_type: errorType,
                    retryable
                }
            };
        }
    }

    /**
     * Step 2: Draft content using OpenAI based on research data
     */
    async draft(researchData: any): Promise<AgentResult> {
        console.log('Step 2: Draft - Generating content with OpenAI...');

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

            // If no research data available, provide a fallback
            if (!researchSummary.trim()) {
                researchSummary = 'No specific research data available for analysis.';
            }

            // Create a comprehensive prompt for OpenAI
            const prompt = `Based on the following research data, please create a well-structured, informative article. The article should:

1. Summarize the key findings from the research
2. Identify the most important insights and trends
3. Provide analysis and context
4. Include actionable takeaways or recommendations
5. Be written in a professional, engaging tone

Research Data:
${researchSummary}

Please format the response as a markdown article with appropriate headings, bullet points, and structure.`;

            // Call OpenAI to generate content
            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional content writer and analyst. Create well-structured, insightful articles based on research data."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.7
            });

            const draft = completion.choices[0]?.message?.content || 'Failed to generate content';

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
     * Step 3: Translate using MCP translation tools (DeepL primary, Jigsaw fallback)
     */
    async translate(text: string, targetLanguage: string = 'es'): Promise<AgentResult> {
        console.log(`Step 3: Translate to ${targetLanguage}...`);

        try {
            // Try DeepL first
            console.log('Attempting translation with DeepL...');
            const result = await this.deepLClient.callToolDirect('translate-text', {
                text,
                targetLang: targetLanguage
            });

            return {
                success: true,
                data: result,
                step: 'translate'
            };
        } catch (deepLError) {
            console.error('DeepL translation failed, trying Jigsaw fallback...', deepLError);

            try {
                // Fallback to Jigsaw translation
                console.log('Attempting translation with Jigsaw...');
                const jigsawResult = await this.jigsawClient.callToolDirect('text-translation', {
                    text,
                    target_language: targetLanguage
                });

                return {
                    success: true,
                    data: {
                        ...jigsawResult,
                        fallback_used: 'jigsaw',
                        primary_error: deepLError instanceof Error ? deepLError.message : 'DeepL translation failed'
                    },
                    step: 'translate'
                };
            } catch (jigsawError) {
                console.error('Jigsaw translation also failed:', jigsawError);
                return {
                    success: false,
                    error: jigsawError instanceof Error ? jigsawError.message : 'Unknown translation error',
                    step: 'translate'
                };
            }
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
        this.jigsawClient.close();
        this.deepLClient.close();
    }
}
