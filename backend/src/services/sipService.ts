
import { SipClient } from 'livekit-server-sdk';

// Twirp requires HTTP, not WS. Ensure we use the correct protocol.
const RAW_URL = process.env.LIVEKIT_URL || 'http://127.0.0.1:7880';
const LIVEKIT_HTTP_URL = RAW_URL.replace('ws://', 'http://').replace('wss://', 'https://');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_SIP_TRUNK_ID = process.env.LIVEKIT_SIP_TRUNK_ID || 'ST_TBPgiLlt4CXP8';

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.warn("[SIP] LiveKit credentials missing, SIP Service will not function.");
}

// Initialize SipClient only if credentials exist to avoid crashes
const sipClient = (LIVEKIT_API_KEY && LIVEKIT_API_SECRET)
    ? new SipClient(LIVEKIT_HTTP_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    : null;

export const sipService = {
    /**
     * Initiates an outbound SIP call to the specific phone number
     * and connects them to the specified LiveKit room.
     */
    async initiatePhoneScreen(phoneNumber: string, roomName: string, candidateName: string = "Candidate") {
        if (!sipClient) {
            throw new Error("SIP Client not initialized (missing credentials)");
        }

        console.log(`[SIP] Initiating call to ${phoneNumber} in room ${roomName} via trunk ${LIVEKIT_SIP_TRUNK_ID}`);

        try {
            const participant = await sipClient.createSipParticipant(
                LIVEKIT_SIP_TRUNK_ID,
                phoneNumber,
                roomName,
                {
                    participantIdentity: `phone-${phoneNumber.replace(/\+/g, '')}`,
                    participantName: candidateName,
                }
            );

            console.log(`[SIP] Call initiated successfully. SIP Call ID: ${participant.sipCallId}`);
            return participant;
        } catch (error) {
            console.error("[SIP] Failed to initiate call:", error);
            throw error;
        }
    }
};
