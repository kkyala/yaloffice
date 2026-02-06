/**
 * Ollama Service - Local LLM Integration
 * 
 * Provides integration with locally-hosted Ollama models:
 * - DeepSeek-R1 Distill 7B: Resume parsing, screening, structured extraction
 * - Gemma 2 9B Instruct: Interview conversations, evaluations, summaries
 */

import axios, { AxiosInstance } from 'axios';

// ========================================================================================
// TYPES
// ========================================================================================

export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OllamaGenerateRequest {
    model: string;
    prompt: string;
    stream?: boolean;
    format?: 'json';
    options?: {
        temperature?: number;
        top_p?: number;
        num_predict?: number;
    };
}

export interface OllamaChatRequest {
    model: string;
    messages: OllamaMessage[];
    stream?: boolean;
    format?: 'json';
    options?: {
        temperature?: number;
        top_p?: number;
    };
}

export interface OllamaResponse {
    model: string;
    response: string;
    done: boolean;
}

export interface OllamaChatResponse {
    model: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

// ========================================================================================
// OLLAMA SERVICE CLASS
// ========================================================================================

class OllamaService {
    private deepseekClient: AxiosInstance;
    private gemmaClient: AxiosInstance;

    // Model identifiers
    private readonly DEEPSEEK_MODEL = 'deepseek-r1:7b';
    private readonly GEMMA_MODEL = 'gemma2:9b-instruct-q8_0';

    constructor() {
        // Initialize clients for both Ollama instances
        const deepseekUrl = process.env.RESUME_AI_URL || 'http://ollama-deepseek:11434';
        const gemmaUrl = process.env.INTERVIEW_AI_URL || 'http://ollama-gemma:11434';

        this.deepseekClient = axios.create({
            baseURL: deepseekUrl,
            timeout: 120000, // 2 minutes for complex reasoning tasks
            headers: { 'Content-Type': 'application/json' }
        });

        this.gemmaClient = axios.create({
            baseURL: gemmaUrl,
            timeout: 60000, // 1 minute for conversational tasks
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('[OllamaService] Initialized');
        console.log(`[OllamaService] DeepSeek URL: ${deepseekUrl}`);
        console.log(`[OllamaService] Gemma URL: ${gemmaUrl}`);
    }

    // ========================================================================================
    // DEEPSEEK METHODS (Resume Parsing & Screening)
    // ========================================================================================

    /**
     * Generate structured content using DeepSeek (for resume parsing, screening)
     */
    async generateWithDeepSeek(prompt: string, expectJson: boolean = true): Promise<string> {
        try {
            const request: OllamaGenerateRequest = {
                model: this.DEEPSEEK_MODEL,
                prompt,
                stream: false,
                options: {
                    temperature: 0.1, // Low temperature for deterministic outputs
                    top_p: 0.9
                }
            };

            if (expectJson) {
                request.format = 'json';
            }

            const response = await this.deepseekClient.post<OllamaResponse>('/api/generate', request);

            if (!response.data || !response.data.response) {
                throw new Error('Empty response from DeepSeek');
            }

            return response.data.response;
        } catch (error: any) {
            console.error('[OllamaService] DeepSeek generation error:', error.message);
            throw new Error(`DeepSeek generation failed: ${error.message}`);
        }
    }

    /**
     * Chat-based generation with DeepSeek
     */
    async chatWithDeepSeek(messages: OllamaMessage[], expectJson: boolean = true): Promise<string> {
        try {
            const request: OllamaChatRequest = {
                model: this.DEEPSEEK_MODEL,
                messages,
                stream: false,
                options: {
                    temperature: 0.1,
                    top_p: 0.9
                }
            };

            if (expectJson) {
                request.format = 'json';
            }

            const response = await this.deepseekClient.post<OllamaChatResponse>('/api/chat', request);

            if (!response.data || !response.data.message || !response.data.message.content) {
                throw new Error('Empty response from DeepSeek chat');
            }

            return response.data.message.content;
        } catch (error: any) {
            console.error('[OllamaService] DeepSeek chat error:', error.message);
            throw new Error(`DeepSeek chat failed: ${error.message}`);
        }
    }

    // ========================================================================================
    // GEMMA METHODS (Interview Conversations & Evaluations)
    // ========================================================================================

    /**
     * Generate conversational content using Gemma (for interviews)
     */
    async generateWithGemma(prompt: string, expectJson: boolean = false): Promise<string> {
        try {
            const request: OllamaGenerateRequest = {
                model: this.GEMMA_MODEL,
                prompt,
                stream: false,
                options: {
                    temperature: 0.7, // Higher temperature for more natural conversation
                    top_p: 0.95
                }
            };

            if (expectJson) {
                request.format = 'json';
            }

            const response = await this.gemmaClient.post<OllamaResponse>('/api/generate', request);

            if (!response.data || !response.data.response) {
                throw new Error('Empty response from Gemma');
            }

            return response.data.response;
        } catch (error: any) {
            console.error('[OllamaService] Gemma generation error:', error.message);
            throw new Error(`Gemma generation failed: ${error.message}`);
        }
    }

    /**
     * Chat-based generation with Gemma
     */
    async chatWithGemma(messages: OllamaMessage[], expectJson: boolean = false): Promise<string> {
        try {
            const request: OllamaChatRequest = {
                model: this.GEMMA_MODEL,
                messages,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.95
                }
            };

            if (expectJson) {
                request.format = 'json';
            }

            const response = await this.gemmaClient.post<OllamaChatResponse>('/api/chat', request);

            if (!response.data || !response.data.message || !response.data.message.content) {
                throw new Error('Empty response from Gemma chat');
            }

            return response.data.message.content;
        } catch (error: any) {
            console.error('[OllamaService] Gemma chat error:', error.message);
            throw new Error(`Gemma chat failed: ${error.message}`);
        }
    }

    // ========================================================================================
    // UTILITY METHODS
    // ========================================================================================

    /**
     * Parse JSON response from Ollama, handling markdown code blocks
     */
    parseJsonResponse(response: string): any {
        let cleaned = response.trim();

        // Remove markdown code blocks
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
        }

        try {
            return JSON.parse(cleaned);
        } catch (error) {
            // Try to extract JSON object from text
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Failed to parse JSON from Ollama response');
        }
    }

    // ========================================================================================
    // INTERVIEW-SPECIFIC METHODS (for interview.ts compatibility)
    // ========================================================================================

    /**
     * Generate interview response (conversational)
     * Uses: Gemma 2 9B Instruct
     */
    async generateInterviewResponse(
        candidateResponse: string,
        transcriptHistory: any[],
        jobTitle: string
    ): Promise<string> {
        const messages: OllamaMessage[] = [
            {
                role: 'system',
                content: `You are an expert interviewer for the position: ${jobTitle}. Conduct a professional interview by asking relevant questions based on the conversation history and the candidate's responses.`
            }
        ];

        // Add history
        for (const entry of transcriptHistory) {
            messages.push({
                role: entry.role === 'candidate' ? 'user' : 'assistant',
                content: entry.content
            });
        }

        // Add current response if not empty
        if (candidateResponse && candidateResponse.trim()) {
            messages.push({
                role: 'user',
                content: candidateResponse
            });
        }

        return await this.chatWithGemma(messages, false);
    }

    /**
     * Analyze complete interview transcript
     * Uses: DeepSeek-R1 7B (for structured analysis)
     */
    async analyzeInterview(
        transcriptText: string,
        jobTitle: string,
        resumeText?: string
    ): Promise<{
        summary: string;
        score: number;
        strengths: string[];
        weaknesses: string[];
        skills_analysis?: any[];
    }> {
        const prompt = `You are an expert HR analyst. Analyze this interview transcript for the position: ${jobTitle}.

${resumeText ? `Candidate Resume:\n${resumeText}\n\n` : ''}Interview Transcript:
${transcriptText}

Provide a comprehensive analysis in JSON format:
{
  "summary": "<Executive summary of the interview and candidate performance>",
  "score": <Overall score 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "skills_analysis": [
    {"skill": "<skill name>", "score": <0-100>, "reason": "<brief reason>"},
    {"skill": "<skill name>", "score": <0-100>, "reason": "<brief reason>"}
  ]
}

Return ONLY the JSON object.`;

        const response = await this.generateWithDeepSeek(prompt, true);
        return this.parseJsonResponse(response);
    }

    /**
     * Check if Ollama services are healthy
     */
    async healthCheck(): Promise<{ deepseek: boolean; gemma: boolean }> {
        const results = { deepseek: false, gemma: false };

        try {
            await this.deepseekClient.get('/api/tags');
            results.deepseek = true;
        } catch (error) {
            console.error('[OllamaService] DeepSeek health check failed');
        }

        try {
            await this.gemmaClient.get('/api/tags');
            results.gemma = true;
        } catch (error) {
            console.error('[OllamaService] Gemma health check failed');
        }

        return results;
    }
}

export const ollamaService = new OllamaService();
