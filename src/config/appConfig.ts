export const config = {

    apiBaseUrl: 'http://localhost:8000/api',
    ai: {
        activeProvider: 'google',

        google: {
            // API Key is now sourced from process.env.API_KEY as per security guidelines.
            model: 'gemini-2.5-flash',
        },
        perplexity: {
            // This key is not currently used but is ready for future implementation.
            apiKey: 'YOUR_PERPLEXITY_API_KEY_HERE',
            model: 'llama-3-sonar-large-32k-online',
        },
        interview: {
            // New system instruction for a conversational, encouraging AI interviewer
            systemInstruction: "You are a friendly and professional interviewer. Your tone is soft, encouraging, and conversational. Your goal is to assess a candidate's skills by asking a series of questions. If the candidate asks for help, hints, or the answer (e.g., using 'what', 'how', 'where'), do not provide the answer. Instead, gently and proactively encourage them to attempt an answer. For example, say 'That's a good question, please give it your best shot,' or 'Just explain your thought process.' After they answer, smoothly transition to the next question. Do not score the candidate during the conversation.",

            // New function to generate the initial prompt to kick off the interview
            initialPrompt: (jobTitle: string, questionCount: number, difficulty: string, customQuestions: string[]) => {
                let prompt = `Please start an interview for a "${jobTitle}" role. Generate and ask ${questionCount} ${difficulty.toLowerCase()} questions relevant to this role. `;
                if (customQuestions && customQuestions.length > 0) {
                    prompt += `In addition to your generated questions, you must also ask the following custom questions: ${customQuestions.map(q => `"${q}"`).join(', ')}. `;
                }
                prompt += "Begin now by greeting the candidate and asking the very first question.";
                return prompt;
            },
        },
    },
    syndication: {
        channels: [
            { id: 1, name: 'LinkedIn', status: 'Active', enabled: true },
            { id: 2, name: 'Indeed', status: 'Active', enabled: true },
            { id: 3, name: 'Glassdoor', status: 'Active', enabled: false },
            { id: 4, name: 'Google Jobs', status: 'Active', enabled: true },
            { id: 5, name: 'Wellfound', status: 'On Hold', enabled: false },
        ]
    },
    // Tavus Configuration - AI Video Avatar Platform
    tavus: {
        apiKey: import.meta.env.VITE_TAVUS_API_KEY,
        apiUrl: 'https://tavusapi.com/v2',
        // Tavus PAL features
        pal: {
            enabled: true,
            // Default persona for AI interviewer
            defaultPersonaId: 'pe13ed370726', // AI Interviewer persona
            // Conversation settings
            conversationSettings: {
                language: 'en',
                voice: 'professional', // Options: professional, friendly, casual
                conversationStyle: 'interview', // Options: interview, casual, formal
            }
        }
    },
    // LiveKit Configuration - Real-time Video Communication
    livekit: {
        apiKey: import.meta.env.VITE_LIVEKIT_API_KEY,
        apiSecret: import.meta.env.VITE_LIVEKIT_API_SECRET,
        // url: import.meta.env.VITE_LIVEKIT_URL,
        // Room settings for video interviews
        roomSettings: {
            // Maximum duration for interview rooms (in seconds)
            maxDuration: 3600, // 1 hour
            // Enable recording by default
            enableRecording: true,
            // Video quality settings
            videoQuality: {
                width: 1280,
                height: 720,
                frameRate: 30
            }
        }
    }
};