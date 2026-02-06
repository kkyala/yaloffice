import axios from 'axios';

// Configuration from environment variables
const RESUME_AI_URL = process.env.RESUME_AI_URL || 'http://ollama-deepseek:11434';
const INTERVIEW_AI_URL = process.env.INTERVIEW_AI_URL || 'http://ollama-gemma:11434';

// DeepSeek Model dedicated to Resume Parsing (Strict JSON)
const RESUME_MODEL = 'deepseek-r1:7b';

// Gemma Model dedicated to Conversational Interviewing
const INTERVIEW_MODEL = 'gemma2:9b';

export const ollamaService = {

    /**
     * Parse Resume and Score Candidate (Responsibility: DeepSeek)
     * Strictly JSON output, no conversation.
     */
    async parseAndScoreResume(resumeText: string, jobDescription: string): Promise<any> {
        try {
            const prompt = `
        You are a strict Resume Extraction AI. 
        Analyze the following Resume against the Job Description.
        
        JOB DESCRIPTION:
        ${jobDescription}
        
        RESUME:
        ${resumeText}
        
        OUTPUT FORMAT:
        Return ONLY a JSON object with this structure:
        {
          "candidateName": "string",
          "email": "string",
          "phone": "string",
          "skills": ["string"],
          "experience_summary": "string",
          "match_score": number (0-100),
          "gap_analysis": "string"
        }
        Do NOT output any markdown, explanations, or thinking. JUST THE JSON.
      `;

            const response = await axios.post(`${RESUME_AI_URL}/api/generate`, {
                model: RESUME_MODEL,
                prompt: prompt,
                stream: false,
                format: "json", // Enforce JSON mode
                options: {
                    temperature: 0.1, // Deterministic
                    num_ctx: 4096
                }
            });

            // Parse output
            const jsonStr = response.data.response;
            return JSON.parse(jsonStr);

        } catch (error) {
            console.error('Ollama DeepSeek Error:', error);
            throw new Error('Failed to parse resume with DeepSeek');
        }
    },

    /**
     * Generate Interview Questions or Follow-ups (Responsibility: Gemma)
     * Conversational, reasoning allowed.
     */
    async generateInterviewResponse(
        candidateInput: string,
        history: { role: string; content: string }[],
        jobContext: string
    ): Promise<string> {
        try {
            // Format history for context
            const contextStr = history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n');

            const prompt = `
        You are an expert Technical Interviewer AI.
        Role Context: ${jobContext}
        
        Conversation History:
        ${contextStr}
        
        Candidate just said: "${candidateInput}"
        
        Your Goal:
        1. Evaluate the answer concisely.
        2. Ask a relevant follow-up question OR move to the next topic.
        3. Keep responses professional but conversational.
        4. Do NOT verify the previous answer explicitly unless it was wrong.
        
        Respond as the Interviewer:
      `;

            const response = await axios.post(`${INTERVIEW_AI_URL}/api/generate`, {
                model: INTERVIEW_MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7, // Creative/Conversational
                    num_ctx: 4096
                }
            });

            return response.data.response.trim();

        } catch (error) {
            console.error('Ollama Gemma Error:', error);
            // Fallback
            return "That's interesting. Could you elaborate further on your experience with that technology?";
        }
    },

    /**
     * Analyze Completed Interview (Responsibility: DeepSeek)
     * Detailed scoring and feedback JSON.
     */
    async analyzeInterview(transcriptText: string, jobTitle: string, resumeText?: string): Promise<any> {
        try {
            const prompt = `
        You are an Expert Interview Evaluator.
        Analyze the following interview transcript for the role of "${jobTitle}".
        ${resumeText ? `Candidate Resume Context: ${resumeText.substring(0, 1000)}...` : ''}

        TRANSCRIPT:
        ${transcriptText}

        OUTPUT FORMAT:
        Return ONLY a JSON object with this structure:
        {
          "score": number (0-100),
          "summary": "string",
          "strengths": ["string"],
          "weaknesses": ["string"],
          "suggestion": "string"
        }
        Do NOT output any markdown. JUST THE JSON.
      `;

            const response = await axios.post(`${RESUME_AI_URL}/api/generate`, {
                model: RESUME_MODEL,
                prompt: prompt,
                stream: false,
                format: "json",
                options: {
                    temperature: 0.2, // Low temp for consistent scoring
                    num_ctx: 4096
                }
            });

            return JSON.parse(response.data.response);
        } catch (error) {
            console.error('Ollama Analysis Error:', error);
            // Fallback
            return {
                score: 0,
                summary: "Analysis failed due to AI service error.",
                strengths: [],
                weaknesses: []
            };
        }
    }
};
