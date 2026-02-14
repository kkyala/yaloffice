import { SipClient } from 'livekit-server-sdk';
import { LiveKitManager } from './livekit.js';

// Get Cloud Config for SIP/Telephony
const cloudConfig = LiveKitManager.getConfig('cloud');

// Twirp requires HTTP, not WS. Ensure we use the correct protocol.
const RAW_URL = cloudConfig.url || 'http://127.0.0.1:7880';
const LIVEKIT_HTTP_URL = RAW_URL.replace('ws://', 'http://').replace('wss://', 'https://');

const LIVEKIT_API_KEY = cloudConfig.apiKey;
const LIVEKIT_API_SECRET = cloudConfig.apiSecret;
const LIVEKIT_SIP_TRUNK_ID = process.env.LIVEKIT_SIP_TRUNK_ID || 'ST_QzjtLtrc35PP';

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.warn(`[SIP] LiveKit credentials missing for Cloud environment (using URL: ${LIVEKIT_HTTP_URL}), SIP Service will not function.`);
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

        // basic E.164 formatting
        let formattedPhone = phoneNumber.trim();
        if (!formattedPhone.startsWith('+')) {
            // Assume US if 10 digits, otherwise just prepend +
            if (formattedPhone.length === 10) {
                formattedPhone = '+1' + formattedPhone;
            } else {
                formattedPhone = '+' + formattedPhone;
            }
        }

        console.log(`[SIP] Initiating call to ${formattedPhone} (original: ${phoneNumber}) in room ${roomName} via trunk ${LIVEKIT_SIP_TRUNK_ID}`);

        try {
            const participant = await sipClient.createSipParticipant(
                LIVEKIT_SIP_TRUNK_ID,
                formattedPhone,
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
