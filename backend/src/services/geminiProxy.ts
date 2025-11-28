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
function createGeminiConnection(
  sessionId: string,
  onMessage: (msg: GeminiMessage) => void,
  onError: (err: Error) => void,
  onClose: () => void
): WebSocket | null {
  console.log(`[Gemini] 🔍 createGeminiConnection called for session ${sessionId}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(`[Gemini] ❌ GEMINI_API_KEY not configured for session ${sessionId}`);
    onError(new Error('GEMINI_API_KEY not configured'));
    return null;
  }
  console.log(`[Gemini] ✅ API key found for session ${sessionId}`);

  const session = interviewStore.get(sessionId);
  console.log(`[Gemini] Session data for ${sessionId}:`, session ? 'found' : 'not found');

  // Use the live-capable model
  const model = 'gemini-2.0-flash-exp';

  const url = `${GEMINI_LIVE_URL}?key=${apiKey}`;
  console.log(`[Gemini] Creating WebSocket connection to Gemini for session ${sessionId}`);

  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
    console.log(`[Gemini] ✅ WebSocket object created for session ${sessionId}, readyState: ${ws.readyState}`);
  } catch (err: any) {
    console.error(`[Gemini] ❌ Failed to create WebSocket for session ${sessionId}:`, err.message);
    onError(err);
    return null;
  }

  ws.on('open', () => {
    console.log(`[Gemini] Connected for session ${sessionId}`);

    // Send initial setup message
    // Note: responseModalities must be array for Live API
    const setupMessage = {
      setup: {
        model: `models/${model}`,
        generationConfig: {
          responseModalities: ['AUDIO'], // Must be an array
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // Good default voice
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: INTERVIEW_SYSTEM_PROMPT }]
        }
      }
    };

    console.log(`[Gemini] Sending setup for session ${sessionId}, model: ${model}`);
    console.log(`[Gemini] Setup message: ${JSON.stringify(setupMessage, null, 2)}`);
    ws.send(JSON.stringify(setupMessage));

    // Send initial prompt after setup - always send to start interaction
    setTimeout(() => {
      if (session) {
        const initialPrompt = {
          clientContent: {
            turns: [{
              role: 'user',
              parts: [{
                text: `Begin: "role":"${session.jobTitle}", "questionCount":${session.questionCount}, "difficulty":"${session.difficulty}", "custom": ${JSON.stringify(session.customQuestions || [])}`
              }]
            }],
            turnComplete: true
          }
        };
        console.log(`[Gemini] Sending initial prompt for session ${sessionId}`);
        ws.send(JSON.stringify(initialPrompt));
      } else {
        // Send generic start if no session context
        const startMsg = {
          clientContent: {
            turns: [{
              role: 'user',
              parts: [{ text: 'Hello, please begin the interview.' }]
            }],
            turnComplete: true
          }
        };
        console.log(`[Gemini] Sending generic start for session ${sessionId}`);
        ws.send(JSON.stringify(startMsg));
      }
    }, 300);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      // Log all messages for debugging
      console.log(`[Gemini] Received message type:`, Object.keys(message).join(', '));

      // Handle setup complete
      if (message.setupComplete) {
        console.log(`[Gemini] Setup complete for session ${sessionId}`);
      }

      // Handle different message types from Gemini
      if (message.serverContent) {
        const content = message.serverContent;
        console.log(`[Gemini] Full serverContent:`, JSON.stringify(content, null, 2));
        console.log(`[Gemini] Server content - turnComplete: ${content.turnComplete}, hasParts: ${!!content.modelTurn?.parts}`);

        // Handle transcript
        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              console.log(`[Gemini] Audio chunk received - size: ${part.inlineData.data.length} bytes`);
              onMessage({
                type: 'audio',
                audio: {
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType
                }
              });
            }
            if (part.text) {
              console.log(`[Gemini] Text received: "${part.text.substring(0, 50)}..."`);
              onMessage({
                type: 'transcript',
                transcript: {
                  text: part.text,
                  isFinal: content.turnComplete || false,
                  speaker: 'model'
                }
              });
            }
          }
        }

        // Handle input transcript (what user said)
        if (content.inputTranscript) {
          console.log(`[Gemini] User transcript: "${content.inputTranscript}"`);
          onMessage({
            type: 'transcript',
            transcript: {
              text: content.inputTranscript,
              isFinal: true,
              speaker: 'user'
            }
          });
        }
      }

      if (message.error) {
        console.error(`[Gemini] Error:`, message.error);
        onMessage({
          type: 'error',
          error: {
            message: message.error.message || 'Unknown error',
            code: message.error.code || 'UNKNOWN'
          }
        });
      }
    } catch (err) {
      console.error('[Gemini] Failed to parse message:', err);
    }
  });

  ws.on('error', (err) => {
    console.error(`[Gemini] WebSocket error for session ${sessionId}:`, err);
    onError(err);
  });

  ws.on('close', (code, reason) => {
    console.log(`[Gemini] Connection closed for session ${sessionId}, code: ${code}, reason: ${reason?.toString() || 'none'}`);
    onClose();
  });

  return ws;
}

/**
 * Setup WebSocket server for Gemini Live proxy
 */
export function setupGeminiProxyWS(wss: WebSocketServer): void {
  // Map of client connections to Gemini connections
  const geminiConnections = new Map<WebSocket, WebSocket>();
  // TEMPORARILY DISABLED: Buffer to collect audio chunks for avatar generation
  // const audioBuffers = new Map<WebSocket, Buffer[]>();

  wss.on('connection', (clientWs, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId') || 'default';

    console.log(`[Proxy] Client connected for session ${sessionId}`);

    // TEMPORARILY DISABLED: Initialize audio buffer for this client
    // audioBuffers.set(clientWs, []);

    // Create Gemini connection for this client
    const geminiWs = createGeminiConnection(
      sessionId,
      // On Gemini message -> forward to client
      async (msg) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          // TEMPORARILY DISABLED: Avatar generation
          // if (msg.type === 'audio' && msg.audio?.data) {
          //   const audioBuffer = Buffer.from(msg.audio.data, 'base64');
          //   const buffers = audioBuffers.get(clientWs) || [];
          //   buffers.push(audioBuffer);
          //   audioBuffers.set(clientWs, buffers);
          // }

          // Forward message to client
          clientWs.send(JSON.stringify(msg));
        }
      },
      // On error
      (err) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'error',
            error: { message: err.message, code: 'GEMINI_ERROR' }
          }));
        }
      },
      // On close
      () => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ type: 'gemini_closed' }));
        }
      }
    );

    if (geminiWs) {
      geminiConnections.set(clientWs, geminiWs);
      console.log(`[Proxy] ✅ Gemini WebSocket stored for session ${sessionId}, readyState: ${geminiWs.readyState}`);
    } else {
      console.error(`[Proxy] ❌ geminiWs is null/undefined for session ${sessionId} - connection failed!`);
    }

    // Handle messages from client (audio frames or text)
    let audioFrameCount = 0;
    let lastAudioLog = Date.now();
    let firstMessage = true;

    clientWs.on('message', (data) => {
      // Log first message to diagnose issue
      if (firstMessage) {
        const length = Buffer.isBuffer(data) ? data.length : (data instanceof ArrayBuffer ? data.byteLength : 'unknown');
        console.log(`[Proxy] 🔍 First message received - type: ${typeof data}, isBuffer: ${Buffer.isBuffer(data)}, isArrayBuffer: ${data instanceof ArrayBuffer}, length: ${length}`);
        firstMessage = false;
      }

      const geminiWs = geminiConnections.get(clientWs);
      if (!geminiWs) {
        console.log(`[Proxy] ❌ Cannot send audio - No Gemini WebSocket found in map for session ${sessionId}`);
        return;
      }
      if (geminiWs.readyState !== WebSocket.OPEN) {
        console.log(`[Proxy] ❌ Cannot send audio - Gemini WebSocket not OPEN for session ${sessionId}, readyState: ${geminiWs.readyState}`);
        return;
      }

      try {
        // Check if binary (audio) or JSON (control message)
        // WebSocket 'ws' library returns Buffer for binary data
        if (Buffer.isBuffer(data)) {
          audioFrameCount++;
          const now = Date.now();

          // Log every 2 seconds
          if (now - lastAudioLog > 2000) {
            console.log(`[Proxy] ✅ Forwarding audio to Gemini - frames: ${audioFrameCount}, bytes: ${data.length}`);
            lastAudioLog = now;
          }

          // Binary audio data - send as realtime input
          const audioMessage = {
            realtimeInput: {
              mediaChunks: [{
                mimeType: 'audio/pcm;rate=16000',
                data: data.toString('base64')
              }]
            }
          };
          geminiWs.send(JSON.stringify(audioMessage));
        } else {
          // JSON control message
          const message = JSON.parse(data.toString());

          if (message.type === 'audio') {
            // Audio data in JSON format
            const audioMessage = {
              realtimeInput: {
                mediaChunks: [{
                  mimeType: 'audio/pcm;rate=16000',
                  data: message.data
                }]
              }
            };
            geminiWs.send(JSON.stringify(audioMessage));
          } else if (message.type === 'text') {
            // Text input
            const textMessage = {
              clientContent: {
                turns: [{
                  role: 'user',
                  parts: [{ text: message.text }]
                }],
                turnComplete: true
              }
            };
            geminiWs.send(JSON.stringify(textMessage));
          } else if (message.type === 'end_turn') {
            // Signal end of user turn
            const endMessage = {
              clientContent: {
                turnComplete: true
              }
            };
            geminiWs.send(JSON.stringify(endMessage));
          } else if (message.type === 'keepalive') {
            // Keepalive ping - just log it, no need to forward to Gemini
            console.log(`[Proxy] Received keepalive ping for session ${sessionId}`);
          }
        }
      } catch (err) {
        console.error('[Proxy] Error processing client message:', err);
      }
    });

    // Handle client disconnect
    clientWs.on('close', () => {
      console.log(`[Proxy] Client disconnected for session ${sessionId}`);
      const geminiWs = geminiConnections.get(clientWs);
      if (geminiWs) {
        geminiWs.close();
        geminiConnections.delete(clientWs);
      }
      // TEMPORARILY DISABLED: Clean up audio buffer
      // audioBuffers.delete(clientWs);
    });

    clientWs.on('error', (err) => {
      console.error(`[Proxy] Client WebSocket error:`, err);
    });
  });
}
