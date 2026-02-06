/**
 * LiveKit Service
 *
 * Handles real-time video communication for interviews using LiveKit.
 * This service manages room creation, token generation, and participant connections.
 */

import { config } from '../config/appConfig';

// Note: Token generation should ideally be done server-side for security.
// For this client-side implementation, we'll use a fetch to a backend endpoint.
// You'll need to implement a backend endpoint that generates tokens using livekit-server-sdk

export interface LiveKitRoomConfig {
    roomName: string;
    participantName: string;
    participantMetadata?: string;
    enableRecording?: boolean;
}

export interface LiveKitToken {
    token: string;
    url: string;
}

class LiveKitService {
    private url: string;

    constructor() {
        this.url = config.livekit.url || '';
    }

    /**
     * Check if LiveKit is configured
     */
    isConfigured(): boolean {
        return !!this.url;
    }

    /**
     * Generate a room name for an interview session
     */
    generateRoomName(applicationId: number, jobId: number): string {
        return `interview-${jobId}-${applicationId}-${Date.now()}`;
    }

    /**
     * Get LiveKit server URL
     */
    getServerUrl(): string {
        return this.url;
    }

    /**
     * Request an access token from the backend
     */
    async getAccessToken(roomConfig: LiveKitRoomConfig): Promise<LiveKitToken> {
        // Use relative URL on production (goes through tunnel), absolute on localhost
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const apiUrl = isProduction ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');
        const endpoint = '/api/livekit/token';
        const url = apiUrl.endsWith('/api') ? `${apiUrl}${endpoint.replace(/^\/api/, '')}` : `${apiUrl}${endpoint}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identity: roomConfig.participantName,
                roomName: roomConfig.roomName,
                participantMetadata: roomConfig.participantMetadata,
                enableRecording: roomConfig.enableRecording ?? config.livekit.roomSettings.enableRecording,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to get access token: ${response.statusText}`);
        }

        const data = await response.json();

        // Construct absolute WebSocket URL from relative path
        let livekitUrl = this.url || '/livekit';

        // If URL is relative (starts with /), construct full WebSocket URL
        if (livekitUrl.startsWith('/')) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            livekitUrl = `${protocol}//${window.location.host}${livekitUrl}`;
        }

        console.log("Connecting to LiveKit URL:", livekitUrl);

        return {
            token: data.token,
            url: livekitUrl,
        };
    }


    /**
     * Create a room configuration for an interview
     */
    createInterviewRoomConfig(
        applicationId: number,
        jobId: number,
        participantName: string,
        participantRole: 'candidate' | 'interviewer' | 'ai'
    ): LiveKitRoomConfig {
        return {
            roomName: this.generateRoomName(applicationId, jobId),
            participantName,
            participantMetadata: JSON.stringify({
                applicationId,
                jobId,
                role: participantRole,
                timestamp: new Date().toISOString(),
            }),
            enableRecording: config.livekit.roomSettings.enableRecording,
        };
    }

    /**
     * Get video quality constraints
     */
    getVideoConstraints() {
        return {
            width: config.livekit.roomSettings.videoQuality.width,
            height: config.livekit.roomSettings.videoQuality.height,
            frameRate: config.livekit.roomSettings.videoQuality.frameRate,
        };
    }

    /**
     * Validate room name format
     */
    isValidRoomName(roomName: string): boolean {
        // Room names should be alphanumeric with hyphens
        return /^[a-zA-Z0-9-_]+$/.test(roomName);
    }

    /**
     * Connect to a room (abstraction for fetching token)
     */
    async connectToRoom(applicationId: string, participantName: string): Promise<{ token: string; serverUrl: string }> {
        // Create a config
        // JobId is not readily available here, but we can pass a dummy or parse if needed. 
        // For now, let's use a simplified room name generation or pass explicit params.
        // Actually, let's just use applicationId as the unique identifier for now in the room name.
        const roomName = `interview-${applicationId}`;

        const roomConfig = {
            roomName,
            participantName,
            enableRecording: config.livekit.roomSettings.enableRecording
        };

        const { token, url } = await this.getAccessToken(roomConfig);
        return { token, serverUrl: url };
    }
}

export const livekitService = new LiveKitService();
