// Test SIP Call Creation
import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const LIVEKIT_CLOUD_URL = process.env.LIVEKIT_CLOUD_URL;
const LIVEKIT_CLOUD_API_KEY = process.env.LIVEKIT_CLOUD_API_KEY;
const LIVEKIT_CLOUD_API_SECRET = process.env.LIVEKIT_CLOUD_API_SECRET;
const LIVEKIT_SIP_TRUNK_ID = process.env.LIVEKIT_SIP_TRUNK_ID;

console.log('='.repeat(60));
console.log('Testing LiveKit SIP Call Creation');
console.log('='.repeat(60));
console.log(`Cloud URL: ${LIVEKIT_CLOUD_URL}`);
console.log(`API Key: ${LIVEKIT_CLOUD_API_KEY ? '✓ Set' : '✗ MISSING'}`);
console.log(`API Secret: ${LIVEKIT_CLOUD_API_SECRET ? '✓ Set' : '✗ MISSING'}`);
console.log(`SIP Trunk ID: ${LIVEKIT_SIP_TRUNK_ID || '✗ MISSING'}`);
console.log('='.repeat(60));

async function testSIPCall() {
    try {
        const httpUrl = LIVEKIT_CLOUD_URL.replace('wss://', 'https://');
        const sipClient = new SipClient(httpUrl, LIVEKIT_CLOUD_API_KEY, LIVEKIT_CLOUD_API_SECRET);

        const testPhone = '+16122062595';  // Use the phone number from the screenshot
        const testRoom = `test-sip-${Date.now()}`;

        console.log(`\n📞 Attempting to create SIP call...`);
        console.log(`   Phone: ${testPhone}`);
        console.log(`   Room: ${testRoom}`);
        console.log(`   Trunk: ${LIVEKIT_SIP_TRUNK_ID}`);

        const participant = await sipClient.createSipParticipant(
            LIVEKIT_SIP_TRUNK_ID,
            testPhone,
            testRoom,
            {
                participantIdentity: `test-phone-${Date.now()}`,
                participantName: 'Test Candidate',
                playDialtone: true,
                ringingTimeout: 30,
                maxCallDuration: 60
            }
        );

        console.log(`\n✅ SUCCESS! SIP Call Created:`);
        console.log(`   Call ID: ${participant.sipCallId}`);
        console.log(`   Participant ID: ${participant.participantId}`);
        console.log(`   Participant Identity: ${participant.participantIdentity}`);
        console.log(`\n⚠️  IMPORTANT: Check your phone - it should be ringing!`);
        console.log(`   If not ringing, check LiveKit Cloud dashboard for trunk configuration.`);

    } catch (error) {
        console.error(`\n❌ FAILED to create SIP call:`);
        console.error(`   Error: ${error.message}`);
        console.error(`\n   Full error:`, error);

        if (error.message.includes('not found')) {
            console.error(`\n💡 TIP: Trunk ID "${LIVEKIT_SIP_TRUNK_ID}" not found.`);
            console.error(`   Please verify in LiveKit Cloud dashboard that:`);
            console.error(`   1. This trunk exists`);
            console.error(`   2. It's configured for OUTBOUND calls`);
            console.error(`   3. It has the correct SIP provider settings`);
        }
    }
}

testSIPCall();
