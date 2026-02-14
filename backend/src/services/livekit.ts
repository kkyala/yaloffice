import { AccessToken, SipClient } from 'livekit-server-sdk';

// Configuration types
interface LiveKitConfig {
    url: string;
    apiKey: string;
    apiSecret: string;
}

// Environment variable reader with fallbacks
const getEnv = (key: string, defaultValue?: string): string => {
    // Basic fix for undefined access if process.env isn't ready (though it should be)
    if (!process || !process.env) return defaultValue || '';

    const value = process.env[key];
    if (value) return value;
    if (defaultValue !== undefined) return defaultValue;
    return '';
};

// ... 


// Local Configuration (Default)
const localConfig: LiveKitConfig = {
    url: getEnv('LIVEKIT_URL', 'ws://127.0.0.1:7880'),
    apiKey: getEnv('LIVEKIT_API_KEY', 'devkey'),
    apiSecret: getEnv('LIVEKIT_API_SECRET', 'secret')
};

// Cloud Configuration (SIP/Voice) - Falls back to local if not set or explicit fallback
const cloudConfig: LiveKitConfig = {
    url: getEnv('LIVEKIT_CLOUD_URL', localConfig.url),
    apiKey: getEnv('LIVEKIT_CLOUD_API_KEY', localConfig.apiKey),
    apiSecret: getEnv('LIVEKIT_CLOUD_API_SECRET', localConfig.apiSecret)
};

export class LiveKitManager {
    /**
     * Generate a token for the specified target environment ('local' or 'cloud')
     */
    static generateToken(
        identity: string,
        roomName: string,
        target: 'local' | 'cloud' = 'local',
        metadata?: string
    ): Promise<{ token: string; url: string }> {
        const config = target === 'cloud' ? cloudConfig : localConfig;

        if (!config.apiKey || !config.apiSecret) {
            return Promise.reject(new Error(`LiveKit credentials missing for ${target} environment`));
        }

        const at = new AccessToken(config.apiKey, config.apiSecret, {
            identity,
            metadata,
            ttl: 3600 // 1 hour
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        return at.toJwt().then(jwt => ({
            token: jwt,
            url: config.url
        }));
    }

    /**
     * Get configuration for specific target
     */
    static getConfig(target: 'local' | 'cloud' = 'local'): LiveKitConfig {
        return target === 'cloud' ? cloudConfig : localConfig;
    }

    /**
     * Create SIP participant using LiveKit dispatch rules (bypasses Twilio)
     * The dispatch rule 'SDR_jPnaj3zBZbwP' automatically routes to agent 'phone_yal_agent'
     */
    static async createSIPParticipant(
        phoneNumber: string,
        roomName: string,
        participantName: string = "Candidate"
    ) {
        const config = this.getConfig('cloud'); // Use cloud config for SIP

        // Format phone number to E.164
        let formattedPhone = phoneNumber.trim().replace(/[^\d+]/g, '');
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.length === 10 ? '+1' + formattedPhone : '+' + formattedPhone;
        }

        console.log(`[LiveKit SIP] Creating SIP participant for ${formattedPhone} in room ${roomName}`);
        console.log(`[LiveKit SIP] Using dispatch rule: SDR_jPnaj3zBZbwP → agent: phone_yal_agent`);

        try {
            // Convert WebSocket URL to HTTP for SIP API
            const httpUrl = config.url.replace('ws://', 'http://').replace('wss://', 'https://');

            const sipClient = new SipClient(httpUrl, config.apiKey, config.apiSecret);

            // IMPORTANT: createSipParticipant requires a TRUNK ID, not a dispatch rule ID
            // The trunk ID is used to make the call
            // The dispatch rule (configured in LiveKit Cloud) routes the call to the agent
            const trunkId = getEnv('LIVEKIT_SIP_TRUNK_ID');
            const dispatchRuleId = getEnv('LIVEKIT_SIP_DISPATCH_RULE_ID');

            if (!trunkId) {
                console.error('[LiveKit SIP] ❌ LIVEKIT_SIP_TRUNK_ID is required to make SIP calls');
                throw new Error('Missing LIVEKIT_SIP_TRUNK_ID in backend/.env');
            }

            console.log(`[LiveKit SIP] Using Trunk: ${trunkId}`);
            console.log(`[LiveKit SIP] Dispatch Rule: ${dispatchRuleId || 'Not specified (will use LiveKit Cloud default routing)'}`);

            // Create SIP participant - LiveKit will route via dispatch rule to phone_yal_agent
            const participant = await sipClient.createSipParticipant(
                trunkId,              // Trunk ID is required for making the call
                formattedPhone,       // Phone number to call
                roomName,             // LiveKit room
                {
                    participantIdentity: `phone-${formattedPhone.replace(/\+/g, '')}`,
                    participantName: participantName || "Candidate",
                    participantMetadata: JSON.stringify({
                        phoneNumber: formattedPhone,
                        dispatchRule: 'SDR_jPnaj3zBZbwP',  // Your dispatch rule
                        agentName: 'phone_yal_agent'        // Target agent
                    })
                }
            );

            console.log(`[LiveKit SIP] ✅ SIP call created: ${participant.sipCallId}`);

            // CRITICAL: Explicitly dispatch the agent to join the room
            // The dispatch rule alone might not trigger - we need to manually dispatch
            try {
                const { AgentDispatchClient } = await import('livekit-server-sdk');
                const agentClient = new AgentDispatchClient(httpUrl, config.apiKey, config.apiSecret);

                console.log(`[LiveKit SIP] 🤖 Dispatching agent 'phone_yal_agent' to room '${roomName}'...`);

                await agentClient.createDispatch(roomName, 'phone_yal_agent', {
                    metadata: JSON.stringify({
                        sessionType: 'phone_screening',
                        phoneNumber: formattedPhone,
                        trunkId: trunkId
                    })
                });

                console.log(`[LiveKit SIP] ✅ Agent dispatched successfully`);
            } catch (dispatchError: any) {
                console.error(`[LiveKit SIP] ⚠️  Agent dispatch failed (agent may auto-join via dispatch rule): ${dispatchError.message}`);
                // Don't throw - the dispatch rule might still work automatically
            }
            console.log(`[LiveKit SIP] Dispatch rule will route to agent: phone_yal_agent`);
            return participant;
        } catch (error: any) {
            console.error('[LiveKit SIP] ❌ Failed to create SIP participant:', error);
            throw new Error(`SIP call failed: ${error.message}`);
        }
    }
}
