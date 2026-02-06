/**
 * AI Service - Backend Implementation
 *
 * AI Architecture:
 * - DeepSeek-R1 Distill 7B: Resume parsing, screening, structured extraction
 * - Gemma 2 9B Instruct: Interview conversations, evaluations, summaries
 * - Deepgram: Speech-to-Text (handled in agent/frontend)
 * - Backend Logic: Routing and business decisions
 *
 * NO Google Gemini, NO OpenAI, NO Google STT/TTS
 */

import dotenv from 'dotenv';
import mammoth from 'mammoth';
import { ollamaService } from './ollamaService.js';

dotenv.config();

// ========================================================================================
// TYPES
// ========================================================================================

export interface ResumeData {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    city?: string;
    state?: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  skills: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[] | string;
  }>;
  certifications?: string[];
}

export interface ResumeScreeningResult {
  matchScore: number;
  summary: string;
  experience: string[];
  skills: string[];
  education: string[];
}

export interface InterviewScore {
  score: number;
  feedback: string;
}

// ========================================================================================
// AI SERVICE CLASS
// ========================================================================================

class AIService {
  private initialized: boolean = false;

  /**
   * Initialize the AI Service (Ollama-based)
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Health check for Ollama services
    const health = await ollamaService.healthCheck();

    if (!health.deepseek) {
      console.warn('[AIService] DeepSeek Ollama service not available');
    }

    if (!health.gemma) {
      console.warn('[AIService] Gemma Ollama service not available');
    }

    this.initialized = true;
    console.log('[AIService] Initialized successfully (Ollama-based)');
    console.log(`[AIService] DeepSeek: ${health.deepseek ? '✓' : '✗'}, Gemma: ${health.gemma ? '✓' : '✗'}`);
  }

  /**
   * Normalize MIME types for document parsing
   */
  private normalizeMime(mime: string): string {
    if (!mime) return 'application/octet-stream';

    const lower = mime.toLowerCase();

    if (lower.includes('pdf')) return 'application/pdf';
    if (lower.includes('msword')) return 'application/msword';
    if (lower.includes('wordprocessingml')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (lower.startsWith('image/')) return mime;

    // Fallback for renamed Word files
    if (lower.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (lower.endsWith('.doc')) {
      return 'application/msword';
    }

    return mime;
  }

  /**
   * Clean base64 data
   */
  private cleanBase64(data: string): string {
    return data.replace(/\s+/g, '');
  }

  /**
   * Parse resume document (PDF, Word, Image)
   * Uses: DeepSeek-R1 Distill 7B
   */
  async parseResumeDocument(fileBase64: string, mimeType: string): Promise<ResumeData> {
    await this.initialize();

    const safeMime = this.normalizeMime(mimeType);
    let safeData = this.cleanBase64(fileBase64);

    const isWord =
      safeMime === 'application/msword' ||
      safeMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    let extractedText = '';

    if (isWord) {
      console.log(`[AIService] Parsing Word document. Mime: ${mimeType}, Size: ${safeData.length}`);
      try {
        const buffer = Buffer.from(safeData, 'base64');
        const result = await mammoth.extractRawText({ buffer: buffer });
        extractedText = result.value;
        console.log(`[AIService] Mammoth extraction success. Text length: ${extractedText.length}`);
        if (result.messages && result.messages.length > 0) {
          console.log('[AIService] Mammoth messages:', result.messages);
        }
      } catch (err) {
        console.error('[AIService] Mammoth extraction failed:', err);
      }
    } else {
      console.log(`[AIService] Parsing non-Word document. Mime: ${mimeType}`);
    }

    const schema = {
      personalInfo: {
        name: "string",
        email: "string",
        phone: "string",
        linkedin: "string",
        city: "string",
        state: "string"
      },
      summary: "string",
      experience: [{
        company: "string",
        role: "string",
        startDate: "string",
        endDate: "string",
        description: "string"
      }],
      education: [{
        institution: "string",
        degree: "string",
        year: "string"
      }],
      skills: ["string"],
      projects: [{
        name: "string",
        description: "string",
        technologies: ["string"]
      }],
      certifications: ["string"]
    };

    const prompt = isWord && extractedText
      ? `You are an expert resume parser. Extract structured information from this resume text and return ONLY valid JSON following this exact schema:

${JSON.stringify(schema, null, 2)}

Resume Content:
${extractedText}

Important Instructions:
- Extract ALL relevant information accurately
- Capture 'Academic Projects' or 'Key Projects' under the 'projects' array
- If information is missing, use null or empty array
- Return ONLY the JSON object, no explanation`
      : `You are an expert resume parser. This is a PDF/Image resume. Extract structured information and return ONLY valid JSON following this exact schema:

${JSON.stringify(schema, null, 2)}

Note: Since this is an image/PDF, extract all visible text carefully.
Capture 'Academic Projects' or 'Key Projects' under the 'projects' array.
Return ONLY the JSON object, no explanation.`;

    // For PDF/Images, we need OCR - DeepSeek can't process images directly
    // In production, you'd use an OCR service first, then pass text to DeepSeek
    if (!isWord || !extractedText) {
      throw new Error('PDF and Image resume parsing requires OCR preprocessing. Please convert to text first or use Word documents.');
    }

    const response = await ollamaService.generateWithDeepSeek(prompt, true);

    try {
      return ollamaService.parseJsonResponse(response);
    } catch (err) {
      console.error('[AIService] Failed to parse resume JSON:', err);
      throw new Error('Failed to parse resume data from AI response');
    }
  }

  /**
   * Screen resume against job description
   * Uses: DeepSeek-R1 Distill 7B (deterministic reasoning)
   */
  async screenResume(resumeText: string, jobDescription: string): Promise<ResumeScreeningResult> {
    await this.initialize();

    const prompt = `You are an expert HR screening AI. Analyze how well this resume matches the job description.

Job Description:
${jobDescription}

Resume:
${resumeText}

Provide a detailed screening analysis in JSON format:
{
  "matchScore": <number 0-100>,
  "summary": "<brief summary of candidate fit>",
  "experience": ["<relevant experience point 1>", "<relevant experience point 2>"],
  "skills": ["<matching skill 1>", "<matching skill 2>"],
  "education": ["<education detail 1>", "<education detail 2>"]
}

Return ONLY the JSON object.`;

    const response = await ollamaService.generateWithDeepSeek(prompt, true);
    return ollamaService.parseJsonResponse(response);
  }

  /**
   * Score interview response
   * Uses: Gemma 2 9B Instruct (conversational evaluation)
   */
  async scoreResponse(question: string, response: string): Promise<InterviewScore> {
    await this.initialize();

    const prompt = `You are an expert interview evaluator. Analyze this candidate's response to an interview question.

Question: "${question}"

Candidate's Response: "${response}"

Evaluate the response quality, relevance, clarity, and depth. Provide:
{
  "score": <number 1-10>,
  "feedback": "<constructive feedback about the response>"
}

Return ONLY the JSON object.`;

    const gemmaResponse = await ollamaService.generateWithGemma(prompt, true);
    return ollamaService.parseJsonResponse(gemmaResponse);
  }

  /**
   * Generate interview summary from transcript
   * Uses: Gemma 2 9B Instruct
   */
  async generateInterviewSummary(transcript: string): Promise<string> {
    await this.initialize();

    const prompt = `You are an expert HR analyst. Summarize this interview transcript in 2-3 professional paragraphs.

Interview Transcript:
${transcript}

Provide a concise summary highlighting:
- Key points discussed
- Candidate's strengths
- Areas of concern (if any)
- Overall impression

Return only the summary text, no JSON.`;

    return await ollamaService.generateWithGemma(prompt, false);
  }

  /**
   * Analyze video content
   * Note: Ollama models don't support video. This would require a different service.
   */
  async analyzeVideo(
    videoBase64: string,
    mimeType: string,
    analysisPrompt: string
  ): Promise<string> {
    throw new Error('Video analysis not supported with Ollama. Consider using a vision-capable API or frame extraction + image analysis.');
  }

  /**
   * Generate JSON content with structured schema
   * Uses: DeepSeek-R1 for structured outputs
   */
  async generateJsonContent(prompt: string, expectedFields: string[]): Promise<any> {
    await this.initialize();

    const enhancedPrompt = `${prompt}

Return a JSON object containing these fields: ${expectedFields.join(', ')}

Return ONLY valid JSON, no explanation.`;

    const response = await ollamaService.generateWithDeepSeek(enhancedPrompt, true);
    return ollamaService.parseJsonResponse(response);
  }

  /**
   * Start screening session
   * Uses: Gemma 2 9B Instruct (conversational)
   */
  async startScreening(resumeText: string, candidateName: string): Promise<{ greeting: string; firstQuestion: string }> {
    await this.initialize();

    const prompt = `You are an AI recruiter named 'Yal' at YalOffice. You are conducting an initial screening call with a candidate named ${candidateName}.

Their resume summary:
"${resumeText.substring(0, 3000)}..."

Generate a professional but friendly greeting and the FIRST screening question to verify their background and interest.

Return JSON:
{
  "greeting": "<warm greeting with your name and company>",
  "firstQuestion": "<first screening question about their background>"
}

Return ONLY the JSON object.`;

    const response = await ollamaService.generateWithGemma(prompt, true);
    return ollamaService.parseJsonResponse(response);
  }

  /**
   * Chat screening
   * Uses: Gemma 2 9B Instruct
   */
  async chatScreening(history: { role: string; content: string }[], userResponse: string): Promise<{ aiResponse: string; isComplete: boolean }> {
    await this.initialize();

    // Convert history to Ollama format
    const ollamaMessages = history
      .filter(h => h.content && h.content.trim())
      .map(h => ({
        role: h.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: h.content
      }));

    // Add system context at the beginning
    const messages = [
      {
        role: 'system' as const,
        content: 'You are Yal, an AI recruiter conducting a screening interview. Ask 3-4 relevant questions about the candidate\'s experience, skills, and motivation. After sufficient questions, politely conclude and set isComplete to true.'
      },
      ...ollamaMessages,
      {
        role: 'user' as const,
        content: `Candidate's response: "${userResponse}"

If this answers the previous question, acknowledge it and ask the next relevant question.
If you have asked 3-4 questions already, thank them and conclude the screening.

Return JSON:
{
  "aiResponse": "<your response or next question>",
  "isComplete": <true if screening is complete, false otherwise>
}

Return ONLY the JSON object.`
      }
    ];

    const response = await ollamaService.chatWithGemma(messages, true);
    return ollamaService.parseJsonResponse(response);
  }

  /**
   * Process resume through AI conversation and generate initial screening assessment
   * Uses: Gemma 2 9B Instruct
   */
  async processResumeScreening(resumeData: any, candidateName: string, candidateEmail: string, jobTitle?: string, jobId?: number): Promise<{
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    skillsAnalysis: any;
    transcript: string;
  }> {
    await this.initialize();

    const resumeText = this.formatResumeAsText(resumeData);

    const prompt = `You are an AI recruiter conducting an initial resume screening for ${candidateName} applying for: ${jobTitle || 'General Application'}.

Resume Details:
${resumeText}

Conduct a thorough analysis and provide a comprehensive assessment.

Return JSON with:
{
  "score": <Overall score 0-100>,
  "summary": "<Executive summary of candidate fit>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<concern 1>", "<concern 2>"],
  "skillsAnalysis": {
    "technical": ["<technical skill 1>", "<technical skill 2>"],
    "soft": ["<soft skill 1>", "<soft skill 2>"],
    "experienceLevel": "<entry/mid/senior>"
  },
  "transcript": "<Simulated brief conversation or notes from screening>"
}

Return ONLY the JSON object.`;

    const response = await ollamaService.generateWithGemma(prompt, true);
    const assessment = ollamaService.parseJsonResponse(response);

    // Ensure required fields exist with fallbacks
    return {
      score: assessment.score || 70,
      summary: assessment.summary || 'Initial screening completed based on resume review.',
      strengths: Array.isArray(assessment.strengths) ? assessment.strengths : ['Strong background', 'Relevant experience'],
      weaknesses: Array.isArray(assessment.weaknesses) ? assessment.weaknesses : ['Needs further evaluation'],
      skillsAnalysis: assessment.skillsAnalysis || { technical: [], soft: [], experienceLevel: 'mid-level' },
      transcript: assessment.transcript || `AI Screening Assessment for ${candidateName}:\n\nResume reviewed and initial assessment completed.`
    };
  }

  /**
   * Format resume data as text for AI processing
   */
  private formatResumeAsText(resumeData: any): string {
    let text = '';

    if (resumeData.personalInfo) {
      text += `Name: ${resumeData.personalInfo.name || 'N/A'}\n`;
      text += `Email: ${resumeData.personalInfo.email || 'N/A'}\n`;
      text += `Phone: ${resumeData.personalInfo.phone || 'N/A'}\n`;
      const loc = resumeData.personalInfo.location ||
        (resumeData.personalInfo.city ? `${resumeData.personalInfo.city}, ${resumeData.personalInfo.state || ''}` : '') || 'N/A';
      text += `Location: ${loc}\n`;
      text += `LinkedIn: ${resumeData.personalInfo.linkedin || 'N/A'}\n\n`;
    }

    if (resumeData.summary) {
      text += `Summary:\n${resumeData.summary}\n\n`;
    }

    if (resumeData.experience && Array.isArray(resumeData.experience)) {
      text += `Experience:\n`;
      resumeData.experience.forEach((exp: any, idx: number) => {
        text += `${idx + 1}. ${exp.role || 'N/A'} at ${exp.company || 'N/A'}`;
        if (exp.startDate || exp.endDate) {
          text += ` (${exp.startDate || 'N/A'} - ${exp.endDate || 'Present'})`;
        }
        text += '\n';
        if (exp.description) text += `   ${exp.description}\n`;
      });
      text += '\n';
    }

    if (resumeData.education && Array.isArray(resumeData.education)) {
      text += `Education:\n`;
      resumeData.education.forEach((edu: any, idx: number) => {
        text += `${idx + 1}. ${edu.degree || 'N/A'} from ${edu.school || edu.institution || 'N/A'}`;
        if (edu.year) text += ` (${edu.year})`;
        text += '\n';
      });
      text += '\n';
    }

    if (resumeData.skills && Array.isArray(resumeData.skills)) {
      text += `Skills: ${resumeData.skills.join(', ')}\n\n`;
    }

    if (resumeData.projects && Array.isArray(resumeData.projects)) {
      text += `Projects:\n`;
      resumeData.projects.forEach((proj: any, idx: number) => {
        text += `${idx + 1}. ${proj.name || 'N/A'}`;
        if (proj.technologies) {
          text += ` (${Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies})`;
        }
        text += '\n';
        if (proj.description) text += `   ${proj.description}\n`;
      });
    }

    return text;
  }

  /**
   * Generate screening report
   * Uses: Gemma 2 9B Instruct
   */
  async generateScreeningReport(transcript: string, candidateName: string): Promise<any> {
    await this.initialize();

    const prompt = `Generate a comprehensive screening report for candidate ${candidateName} based on this screening session transcript:

"${transcript}"

Provide JSON:
{
  "summary": "<Executive summary of candidate fit>",
  "skillsAssessment": "<Analysis of technical and soft skills>",
  "keyStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areasForImprovement": ["<concern 1>", "<concern 2>"],
  "recommendation": "<Proceed to Interview / Do Not Proceed> (with brief reasoning)",
  "score": <Overall score 0-100>
}

Return ONLY the JSON object.`;

    const response = await ollamaService.generateWithGemma(prompt, true);
    return ollamaService.parseJsonResponse(response);
  }

  /**
   * Generate generic text content
   * Uses: Gemma 2 9B Instruct for general text, DeepSeek for structured/reasoning tasks
   */
  async generateText(prompt: string, useDeepSeek: boolean = false): Promise<string> {
    await this.initialize();

    if (useDeepSeek) {
      return await ollamaService.generateWithDeepSeek(prompt, false);
    } else {
      return await ollamaService.generateWithGemma(prompt, false);
    }
  }
}

export const aiService = new AIService();
