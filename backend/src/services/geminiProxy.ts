/**
 * Gemini Live Proxy Service
 *
 * Handles real-time bidirectional audio streaming between client and Gemini Live API.
 * Proxies PCM audio frames and receives transcripts + TTS audio.
 */

import WebSocket, { WebSocketServer } from 'ws';
import { interviewStore } from './interviewStore.js';
// import { avatarService } from './avatarService.js'; // TEMPORARILY DISABLED

interface GeminiMessage {
  type: string;
  transcript?: {
    text: string;
    isFinal: boolean;
    speaker: 'user' | 'model';
  };
  audio?: {
    data: string; // base64 encoded PCM
    mimeType?: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

const GEMINI_LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

/**
 * System prompt for Gemini Flash 2.0 AI Interviewer
 */
const INTERVIEW_SYSTEM_PROMPT = `You are the AI Interviewer for Yāl Office. Conduct a professional, friendly, and encouraging technical interview for the role provided in the input.

IMPORTANT SPEAKING STYLE:
- Speak slowly and clearly. Pause between sentences.
- Use a calm, measured pace - not rushed.
- Enunciate each word clearly for the candidate to understand.

Behaviours:
- Always ask one question at a time. Keep spoken output short and natural (2–3 short sentences max).
- Begin with a warm greeting, then the first question.
- If the candidate asks for the answer, do NOT provide it. Instead say encouraging guidance (e.g., "Nice question — try your best and explain your thought process.").
- If the candidate's answer is partial/incorrect, ask a targeted follow-up that helps them explain their thought process (e.g., "Can you explain what happens if X occurs?").
- Avoid scoring or stating pass/fail during the conversation. Do not reveal internal logic or score.
- Use plain language; emphasize clarity. When switching topics, briefly signal the change (e.g., "Now, moving on to backend architecture…").
- When the interview completes, conclude with appreciation ("Thanks — that concludes this interview. We'll share next steps soon.").
- Output MUST be only the interviewer utterance text (no metadata, no JSON, no analysis).`;

/**
 * Create a connection to Gemini Live API
 */
/**
 * Create a connection to Gemini Live API
 */
/**
 * Create a connection to Gemini Live API
 */
async function createGeminiConnection(
  sessionId: string,
  systemInstruction: string,
  modelName: string,
  onMessage: (msg: GeminiMessage) => void,
  onError: (err: Error) => void,
  onClose: () => void
): Promise<WebSocket | null> {
  console.log(`[Gemini] 🔍 createGeminiConnection called for session ${sessionId}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(`[Gemini] ❌ GEMINI_API_KEY not configured for session ${sessionId}`);
    onError(new Error('GEMINI_API_KEY not configured'));
    return null;
  }
  // Resolve abstract model names to specific versions
  let modelId = modelName;
  if (!modelId || modelId === 'standard' || modelId === 'default') {
    modelId = 'gemini-2.0-flash-exp';
  } else if (modelId === 'advanced' || modelId === 'voice-optimized') {
    modelId = 'gemini-2.5-flash-native-audio-preview-09-2025';
  } else {
    // Fallback for direct model names if needed, or default
    modelId = modelName || 'gemini-2.0-flash-exp';
  }

  const url = `${GEMINI_LIVE_URL}?key=${apiKey}`;

  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch (err: any) {
    console.error(`[Gemini] ❌ Failed to create WebSocket:`, err.message);
    onError(err);
    return null;
  }

  ws.on('open', () => {
    console.log(`[Gemini] Connected for session ${sessionId}`);

    // Send initial setup message
    const setupMessage = {
      setup: {
        model: `models/${modelId}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede"
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        }
      }
    };

    console.log(`[Gemini] Sending setup for session ${sessionId}`);
    ws.send(JSON.stringify(setupMessage));

    // Send initial prompt to kickstart conversation
    setTimeout(() => {
      const startMsg = {
        clientContent: {
          turns: [{
            role: 'user',
            parts: [{ text: 'Hello, I am ready for the interview.' }]
          }],
          turnComplete: true
        }
      };
      ws.send(JSON.stringify(startMsg));
    }, 500);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.serverContent) {
        const content = message.serverContent;

        // Log input transcription (user's speech recognized by Gemini)
        if (content.inputTranscription) {
          console.log(`[Gemini] 📝 User speech recognized: "${content.inputTranscription.text}"`);
          onMessage({ type: 'transcript', transcript: { text: content.inputTranscription.text, isFinal: true, speaker: 'user' } });
        }

        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              console.log(`[Gemini] 🔊 Received AI audio chunk`);
              onMessage({ type: 'audio', audio: { data: part.inlineData.data, mimeType: part.inlineData.mimeType } });
            }
            if (part.text) {
              console.log(`[Gemini] 💬 AI text response: "${part.text.substring(0, 50)}..."`);
              onMessage({ type: 'transcript', transcript: { text: part.text, isFinal: content.turnComplete || false, speaker: 'model' } });
            }
          }
        }

        if (content.turnComplete) {
          console.log(`[Gemini] ✅ Turn complete`);
        }
      }

      // Handle setup complete
      if (message.setupComplete) {
        console.log(`[Gemini] 🎉 Setup complete for session ${sessionId}`);
      }
    } catch (err) {
      console.error('[Gemini] Failed to parse message:', err);
    }
  });

  ws.on('error', (err) => {
    console.error(`[Gemini] WebSocket error:`, err);
    onError(err);
  });

  ws.on('close', () => onClose());

  return ws;
}

/**
 * Setup WebSocket server for Gemini Live proxy
 */
export function setupGeminiProxyWS(wss: WebSocketServer): void {
  const geminiConnections = new Map<WebSocket, WebSocket>();

  wss.on('connection', (clientWs, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId') || 'default';

    console.log(`[Proxy] Client connected for session ${sessionId}`);

    let geminiWs: WebSocket | null = null;

    clientWs.on('message', async (data, isBinary) => {
      // Parse message. In 'ws', data is Buffer.
      // We first try to parse it as JSON to see if it's a control message (start/text).
      // If parsing fails or it's binary audio data, we treat it as such.

      let parsedMsg: any = null;
      let isJson = false;

      try {
        const str = data.toString();
        // Check if it looks like JSON before parsing to avoid unnecessary overhead for audio
        if (str.trim().startsWith('{')) {
          parsedMsg = JSON.parse(str);
          isJson = true;
        }
      } catch (e) {
        // Not JSON
      }

      // 1. Handle "Start" Command (Session Init)
      if (isJson && parsedMsg.type === 'start' && parsedMsg.config) {
        console.log(`[Proxy] Received start command for session ${sessionId}`);

        // Initialize Gemini Connection
        const systemInstruction = parsedMsg.config.systemInstruction || INTERVIEW_SYSTEM_PROMPT;
        const requestedModel = parsedMsg.config.model;

        geminiWs = await createGeminiConnection(
          sessionId,
          systemInstruction,
          requestedModel,
          (geminiMsg) => {
            if (clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify(geminiMsg));
          },
          (err) => {
            if (clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'error', error: { message: err.message } }));
          },
          () => {
            if (clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'gemini_closed' }));
          }
        );

        if (geminiWs) {
          geminiConnections.set(clientWs, geminiWs);
        }
        return;
      }

      // 2. Forward Data to Gemini (if connected)
      if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
        if (isJson && parsedMsg.type === 'text') {
          // Text Input
          console.log(`[Proxy] Forwarding text to Gemini: "${parsedMsg.text?.substring(0, 50)}..."`);
          geminiWs.send(JSON.stringify({
            clientContent: {
              turns: [{ role: 'user', parts: [{ text: parsedMsg.text }] }],
              turnComplete: true
            }
          }));
        } else if (Buffer.isBuffer(data)) {
          // Audio Data (Binary)
          const audioBytes = data.length;
          // Log every 50th audio packet to avoid flooding
          if (Math.random() < 0.02) {
            console.log(`[Proxy] Forwarding audio to Gemini: ${audioBytes} bytes`);
          }

          geminiWs.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: 'audio/pcm;rate=16000',
                data: data.toString('base64')
              }]
            }
          }));
        } else {
          // Fallback for non-buffer audio (shouldn't happen with standard ws client sending bytes)
          console.warn('[Proxy] Received unexpected non-buffer data from client');
        }
      }
    });

    clientWs.on('close', () => {
      console.log(`[Proxy] Client disconnected for session ${sessionId}`);
      if (geminiWs) geminiWs.close();
      geminiConnections.delete(clientWs);
    });
  });
}
