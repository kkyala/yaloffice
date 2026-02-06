import axios from 'axios';
import { Readable } from 'stream';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export const whisperService = {
    /**
     * Transcribe Audio Buffer (Responsibility: Deepgram)
     */
    async transcribeAudio(audioBuffer: Buffer, mimetype: string = 'audio/wav'): Promise<string> {
        if (!DEEPGRAM_API_KEY) {
            throw new Error("DEEPGRAM_API_KEY is not set.");
        }

        try {
            const response = await axios.post(
                'https://api.deepgram.com/v1/listen?smart_format=true&model=nova-2',
                audioBuffer,
                {
                    headers: {
                        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                        'Content-Type': mimetype
                    }
                }
            );

            if (response.data && response.data.results && response.data.results.channels[0].alternatives[0]) {
                return response.data.results.channels[0].alternatives[0].transcript;
            }

            return "";

        } catch (error) {
            console.error('Deepgram STT Error:', error);
            throw new Error('Failed to transcribe audio via Deepgram');
        }
    }
};
