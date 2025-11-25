/**
 * LiveKit-to-Gemini Adapter
 *
 * SIMPLIFIED APPROACH:
 * Since livekit-server-sdk doesn't support joining rooms as participants,
 * we use a hybrid approach:
 *
 * Flow:
 * 1. Frontend uses LiveKit for video/screen sharing only
 * 2. Audio data flows through WebSocket to backend (current approach)
 * 3. Backend forwards audio to Gemini
 * 4. Gemini responses sent back via WebSocket
 * 5. Transcripts displayed in UI
 *
 * This maintains LiveKit for:
 * - Candidate video feed
 * - Screen sharing capabilities
 * - Room management
 *
 * While using WebSocket for:
 * - Audio streaming to Gemini (lower latency)
 * - Transcripts
 * - Control messages
 *
 * NOTE: This file is kept for future enhancement when LiveKit adds
 * server-side participant support or we integrate a different solution.
 *
 * For now, the actual implementation is in geminiProxy.ts which handles
 * the WebSocket connection between frontend and Gemini Live API.
 */

// Placeholder exports to satisfy TypeScript
export const livekitGeminiAdapter = {
  // Future implementation placeholder
  info: 'LiveKit-Gemini adapter is not implemented yet. Audio flows through WebSocket directly.',

  // Reference to the actual implementation
  actualImplementation: 'See backend/src/services/geminiProxy.ts for current audio streaming'
};

// Export empty functions for compatibility
export async function startLiveKitGeminiAdapter() {
  throw new Error('LiveKit-Gemini adapter not implemented. Use WebSocket connection in geminiProxy.ts');
}

export async function stopLiveKitGeminiAdapter() {
  // No-op
}
