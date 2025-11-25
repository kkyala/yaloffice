/**
 * Tavus Service
 *
 * Handles AI video avatar integration using Tavus PAL (Personalized AI Lives).
 * Tavus provides realistic AI avatars for video interviews with real-time interaction.
 *
 * Documentation: https://docs.tavus.io/
 */

import { config } from '../config/appConfig';

export interface TavusConversation {
    conversation_id: string;
    conversation_url: string;
    status: 'active' | 'ended';
}

export interface TavusPersona {
    persona_id: string;
    persona_name: string;
    avatar_url?: string;
}

export interface CreateConversationRequest {
    persona_id: string;
    persona_name?: string;
    context?: string;
    system_prompt?: string;
    conversational_context?: string;
    custom_greeting?: string;
    max_duration?: number;
    pipeline_mode?: string;
    properties?: {
        enable_recording?: boolean;
        enable_transcription?: boolean;
        participant_name?: string;
        [key: string]: any;
    };
    layers?: {
        perception?: {
            perception_tools?: any[];
            ambient_awareness_queries?: string[];
            perception_model?: string;
        };
        stt?: {
            participant_pause_sensitivity?: string;
            participant_interrupt_sensitivity?: string;
            smart_turn_detection?: boolean;
        };
    };
}

export interface ConversationEvent {
    event_type: 'started' | 'ended' | 'error' | 'transcript';
    timestamp: string;
    data?: any;
}

class TavusService {
    private apiKey: string;
    private apiUrl: string;

    constructor() {
        this.apiKey = config.tavus.apiKey || '';
        this.apiUrl = config.tavus.apiUrl;
    }

    /**
     * Check if Tavus is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey && config.tavus.pal.enabled;
    }

    /**
     * Get authentication headers
     */
    private getHeaders(): HeadersInit {
        return {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
        };
    }

    /**
     * Create a new conversational AI session for interview
     *
     * @param jobTitle - The job title for context
     * @param candidateName - Name of the candidate
     * @param interviewConfig - Interview configuration (questions, difficulty, etc.)
     * @returns Conversation details with URL to embed
     */
    async createInterviewConversation(
        jobTitle: string,
        candidateName: string,
        interviewConfig: {
            questionCount?: number;
            difficulty?: string;
            customQuestions?: string[];
        } = {}
    ): Promise<TavusConversation> {
        if (!this.isConfigured()) {
            throw new Error('Tavus is not configured. Please set VITE_TAVUS_API_KEY in .env.local');
        }

        // Build conversational context for the AI interviewer
        const conversationalContext = this.buildInterviewContext(jobTitle, candidateName, interviewConfig);

        // Get replica ID - use configured one or fetch first available
        let replicaId = config.tavus.pal.defaultPersonaId;

        // If the configured ID doesn't look like a UUID, try to get one from the API
        if (!replicaId || replicaId.length < 32) {
            try {
                // Try custom replicas first
                const replicas = await this.listReplicas();
                if (replicas.length > 0) {
                    replicaId = replicas[0].replica_id;
                    console.log('Using custom replica:', replicaId);
                } else {
                    // Try stock replicas
                    const stockReplicas = await this.listStockReplicas();
                    if (stockReplicas.length > 0) {
                        replicaId = stockReplicas[0].replica_id;
                        console.log('Using stock replica:', replicaId);
                    } else {
                        throw new Error('No replicas available. Please create a replica in your Tavus dashboard or check your API key permissions.');
                    }
                }
            } catch (err) {
                console.error('Error fetching replicas:', err);
                throw new Error('Failed to fetch Tavus replicas. Please check your API key and try again.');
            }
        }

        // Tavus v2 API only accepts specific fields
        const requestBody = {
            replica_id: replicaId,
            conversational_context: conversationalContext,
            custom_greeting: `Hello ${candidateName}! I'm your AI interviewer for the ${jobTitle} position. Let's begin the interview.`,
            conversation_name: `Interview: ${candidateName} - ${jobTitle}`,
        };

        try {
            const response = await fetch(`${this.apiUrl}/conversations`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `Failed to create Tavus conversation: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
                );
            }

            const data = await response.json();
            return {
                conversation_id: data.conversation_id,
                conversation_url: data.conversation_url,
                status: 'active',
            };
        } catch (error) {
            console.error('Error creating Tavus conversation:', error);
            throw error;
        }
    }

    /**
     * Build interview context for the AI avatar
     */
    private buildInterviewContext(
        jobTitle: string,
        candidateName: string,
        interviewConfig: {
            questionCount?: number;
            difficulty?: string;
            customQuestions?: string[];
        }
    ): string {
        const { questionCount = 5, difficulty = 'Medium', customQuestions = [] } = interviewConfig;

        let context = `You are conducting a professional interview for a ${jobTitle} position with ${candidateName}. `;
        context += `This is an AI-powered interview to assess the candidate's qualifications and fit for the role.\n\n`;
        context += `Interview Details:\n`;
        context += `- Position: ${jobTitle}\n`;
        context += `- Candidate: ${candidateName}\n`;
        context += `- Number of questions: ${questionCount}\n`;
        context += `- Difficulty level: ${difficulty}\n\n`;

        if (customQuestions.length > 0) {
            context += `Custom Questions to Ask:\n`;
            customQuestions.forEach((q, i) => {
                context += `${i + 1}. ${q}\n`;
            });
            context += `\n`;
        }

        context += `Guidelines:\n`;
        context += `- Begin with a friendly greeting and introduction\n`;
        context += `- Ask questions one at a time and listen to complete responses\n`;
        context += `- Be encouraging but professional\n`;
        context += `- If asked for hints, encourage the candidate to try their best\n`;
        context += `- Keep the conversation natural and engaging\n`;
        context += `- Do not provide scores during the interview\n`;
        context += `- End with thanking the candidate for their time`;

        return context;
    }

    /**
     * Build system prompt for the AI interviewer
     */
    private buildSystemPrompt(jobTitle: string, candidateName: string): string {
        return `You are a professional AI interviewer conducting a structured interview for a ${jobTitle} position. ` +
               `The candidate's name is ${candidateName}. You are friendly, encouraging, and professional. ` +
               `Your role is to assess the candidate's qualifications through thoughtful questions and active listening. ` +
               `Ask questions one at a time, wait for complete responses, and transition smoothly between topics. ` +
               `If the candidate asks for help or hints, politely encourage them to answer to the best of their ability. ` +
               `Do not provide scores or detailed feedback during the interview.`;
    }

    /**
     * End a conversation
     */
    async endConversation(conversationId: string): Promise<void> {
        if (!this.isConfigured()) {
            throw new Error('Tavus is not configured');
        }

        try {
            const response = await fetch(`${this.apiUrl}/conversations/${conversationId}/end`, {
                method: 'POST',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to end conversation: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error ending Tavus conversation:', error);
            throw error;
        }
    }

    /**
     * Get conversation details
     */
    async getConversation(conversationId: string): Promise<TavusConversation> {
        if (!this.isConfigured()) {
            throw new Error('Tavus is not configured');
        }

        try {
            const response = await fetch(`${this.apiUrl}/conversations/${conversationId}`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to get conversation: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
                conversation_id: data.conversation_id,
                conversation_url: data.conversation_url,
                status: data.status,
            };
        } catch (error) {
            console.error('Error getting Tavus conversation:', error);
            throw error;
        }
    }

    /**
     * Get conversation transcript
     */
    async getConversationTranscript(conversationId: string): Promise<string> {
        if (!this.isConfigured()) {
            throw new Error('Tavus is not configured');
        }

        try {
            const response = await fetch(`${this.apiUrl}/conversations/${conversationId}/transcript`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to get transcript: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.transcript || '';
        } catch (error) {
            console.error('Error getting Tavus transcript:', error);
            throw error;
        }
    }

    /**
     * List stock replicas available from Tavus
     */
    async listStockReplicas(): Promise<Array<{ replica_id: string; replica_name: string }>> {
        if (!this.isConfigured()) {
            throw new Error('Tavus is not configured');
        }

        try {
            const response = await fetch(`${this.apiUrl}/replicas/stock`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                console.warn(`Failed to list stock replicas: ${response.status}`);
                return [];
            }

            const data = await response.json();
            return data.data || data.replicas || [];
        } catch (error) {
            console.error('Error listing stock replicas:', error);
            return [];
        }
    }

    /**
     * List available replicas
     */
    async listReplicas(): Promise<Array<{ replica_id: string; replica_name: string }>> {
        if (!this.isConfigured()) {
            throw new Error('Tavus is not configured');
        }

        try {
            const response = await fetch(`${this.apiUrl}/replicas`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to list replicas: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.data || data.replicas || [];
        } catch (error) {
            console.error('Error listing Tavus replicas:', error);
            throw error;
        }
    }

    /**
     * List available personas
     */
    async listPersonas(): Promise<TavusPersona[]> {
        if (!this.isConfigured()) {
            throw new Error('Tavus is not configured');
        }

        try {
            const response = await fetch(`${this.apiUrl}/personas`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to list personas: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.personas || [];
        } catch (error) {
            console.error('Error listing Tavus personas:', error);
            throw error;
        }
    }

    /**
     * Generate embed URL for Tavus conversation
     * This URL can be used in an iframe to display the AI avatar
     */
    getEmbedUrl(conversationUrl: string): string {
        return conversationUrl;
    }
}

export const tavusService = new TavusService();
