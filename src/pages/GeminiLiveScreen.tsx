
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAI } from '../context/AIProvider';
import { aiService, type VoiceName, AVAILABLE_VOICES } from '../services/aiService';
// FIX: Import AVAILABLE_LIVE_MODELS from AILiveService
import { aiLiveService, AVAILABLE_LIVE_MODELS } from '../services/AILiveService';
import { MicOnIcon, MicOffIcon, VideoOnIcon, VideoOffIcon, ScreenShareIcon, RobotIcon, PhoneOffIcon } from '../components/Icons';
import { config } from '../config/appConfig';
import type { LiveServerMessage, Blob } from '@google/genai';

// --- TYPE DEFINITIONS ---
type SessionState = 'idle' | 'connecting' | 'active' | 'error';
type Transcript = { id: number; sender: 'user' | 'gemini'; text: string };
type LiveSession = {
  close: () => void;
  sendRealtimeInput: (input: { media: Blob }) => void;
};

// --- AUDIO & MEDIA HELPERS (as per guidelines) ---
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- COMPONENT ---
export default function GeminiLiveScreen() {
    const { isReady, reportInvalidApiKey } = useAI();

    // Session and UI State
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [systemInstruction, setSystemInstruction] = useState(config.ai.interview.systemInstruction);
    const [isMicOn, setIsMicOn] = useState(true);
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [currentTurn, setCurrentTurn] = useState({ user: '', gemini: '' });
    const [error, setError] = useState('');
    const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');

    // Refs
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);

    const cleanUp = useCallback(() => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        
        if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close().catch(console.error);
        if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close().catch(console.error);

        for (const source of outputSourcesRef.current.values()) {
            try { source.stop(); } catch (e) {}
        }
        outputSourcesRef.current.clear();
        
        sessionPromiseRef.current = null;
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        
        setSessionState('idle');
    }, []);

    const stopSession = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session: LiveSession = await sessionPromiseRef.current;
                session.close();
            } catch (err) {
                console.error("Error closing session:", err);
            }
        }
        cleanUp();
    }, [cleanUp]);
    
    const startSession = async () => {
        if (!isReady || sessionState === 'connecting' || sessionState === 'active') return;
        setError('');
        setSessionState('connecting');
        setTranscripts([]);
        setCurrentTurn({ user: '', gemini: '' });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const voiceConfig = aiService.getVoiceConfigForLanguage('en-US', selectedVoice);
            // FIX: Call aiLiveService.createLiveSession instead of aiService.createLiveSession
            sessionPromiseRef.current = aiLiveService.createLiveSession(
                { onopen, onmessage, onerror, onclose },
                {
                    systemInstruction,
                    model: AVAILABLE_LIVE_MODELS[0],
                    voiceConfig,
                }
            );
            
            sessionPromiseRef.current.catch(err => {
                setError(err.message);
                setSessionState('error');
                if (err.message?.toLowerCase().includes('api key')) reportInvalidApiKey();
            });

        } catch (err) {
            console.error("Failed to get media devices:", err);
            setError("Could not access microphone. Please check permissions.");
            setSessionState('error');
        }
    };

    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);
    
    useEffect(() => {
        if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = 0;
        }
    }, [transcripts, currentTurn]);

    const onopen = () => {
        setSessionState('active');
        setupAudioInputStream();
    };

    const onmessage = async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
            setCurrentTurn(prev => ({ ...prev, gemini: prev.gemini + message.serverContent.outputTranscription.text }));
        }
        if (message.serverContent?.inputTranscription) {
            setCurrentTurn(prev => ({ ...prev, user: prev.user + message.serverContent.inputTranscription.text }));
        }
        if (message.serverContent?.turnComplete) {
            const finalInput = currentTurn.user;
            const finalOutput = currentTurn.gemini;
            
            const newTranscripts: Transcript[] = [];
            if (finalInput.trim()) newTranscripts.push({ id: Date.now(), sender: 'user', text: finalInput.trim() });
            if (finalOutput.trim()) newTranscripts.push({ id: Date.now() + 1, sender: 'gemini', text: finalOutput.trim() });

            if (newTranscripts.length > 0) {
                setTranscripts(prev => [...newTranscripts, ...prev]);
            }
            setCurrentTurn({ user: '', gemini: '' });
        }
        
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
            playAudio(base64Audio);
        }

        if (message.serverContent?.interrupted) {
            for (const source of outputSourcesRef.current.values()) {
                try { source.stop(); } catch(e){}
            }
            outputSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
        }
    };

    const onerror = (e: ErrorEvent) => {
        console.error("Session error:", e);
        setError("A session error occurred. Please try again.");
        setSessionState('error');
        cleanUp();
    };
    
    const onclose = () => cleanUp();

    const setupAudioInputStream = () => {
        if (!mediaStreamRef.current) return;
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        inputAudioContextRef.current = audioCtx;
        
        const source = audioCtx.createMediaStreamSource(mediaStreamRef.current);
        mediaStreamSourceRef.current = source;
        
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;
        
        processor.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromiseRef.current?.then((session: LiveSession) => {
                if (isMicOn) session.sendRealtimeInput({ media: pcmBlob });
            });
        };
        source.connect(processor);
        processor.connect(audioCtx.destination);
    };

    const playAudio = async (base64Audio: string) => {
        if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioCtx = outputAudioContextRef.current;
        const decodedBytes = decode(base64Audio);
        if (decodedBytes.length === 0) return;
        const audioBuffer = await decodeAudioData(decodedBytes, audioCtx, 24000, 1);

        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.addEventListener('ended', () => {
            outputSourcesRef.current.delete(source);
        });
        
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        outputSourcesRef.current.add(source);
    };

    const renderContentArea = () => {
        if (sessionState === 'idle' || sessionState === 'connecting' || sessionState === 'error') {
            return (
                <div className="initial-view-prompt">
                    <h2>Gemini Live Interview</h2>
                    <p>Start a real-time, voice-based interview simulation.</p>
                     {sessionState === 'error' && <p className="login-error">{error}</p>}
                </div>
            );
        }
        return (
             <div className="initial-view-prompt">
                <RobotIcon style={{ width: '80px', height: '80px', color: 'var(--primary-color)'}}/>
                <h2>Session Active</h2>
                <p>Start talking to Gemini. Your conversation will appear on the right.</p>
             </div>
        );
    };

    return (
        <div className="gemini-live-page">
            <main className="gemini-live-main">
                <div className="live-content-area">
                    {renderContentArea()}
                     <div className="live-controls">
                        <button className={`control-btn ${isMicOn ? 'active' : ''}`} onClick={() => setIsMicOn(p => !p)} disabled={sessionState !== 'active'}>
                            {isMicOn ? <MicOnIcon /> : <MicOffIcon />}
                        </button>
                         <button className="btn btn-primary" onClick={sessionState === 'active' ? stopSession : startSession} disabled={sessionState === 'connecting'}>
                            {sessionState === 'connecting' ? 'Connecting...' : sessionState === 'active' ? 'End Session' : 'Start Session'}
                         </button>
                    </div>
                </div>
                <div className="live-transcript-container">
                    <div className="transcript-list" ref={transcriptContainerRef}>
                         {transcripts.map((t) => (
                            <div key={t.id} className={`transcript-turn ${t.sender}`}>
                                <div className="transcript-sender">{t.sender === 'gemini' ? 'Gemini' : 'You'}</div>
                                <div className="transcript-text">{t.text}</div>
                            </div>
                        ))}
                         {currentTurn.user && (
                            <div className="transcript-turn user">
                                <div className="transcript-sender">You</div>
                                <div className="transcript-text" style={{ fontStyle: 'italic', color: '#666' }}>{currentTurn.user}</div>
                            </div>
                        )}
                        {currentTurn.gemini && (
                            <div className="transcript-turn gemini">
                                <div className="transcript-sender">Gemini</div>
                                <div className="transcript-text" style={{ fontStyle: 'italic', color: '#666' }}>{currentTurn.gemini}</div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <aside className="gemini-live-sidebar">
                <h3>Session Configuration</h3>
                <div className="form-group">
                    <label htmlFor="system-instructions">System Instructions</label>
                    <textarea id="system-instructions" rows={8} value={systemInstruction} onChange={e => setSystemInstruction(e.target.value)} disabled={sessionState === 'active'} />
                </div>
                <div className="form-group">
                    <label htmlFor="voice-select">Voice</label>
                    <select id="voice-select" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value as VoiceName)} disabled={sessionState === 'active'}>
                        {AVAILABLE_VOICES.map(voice => <option key={voice}>{voice}</option>)}
                    </select>
                </div>
            </aside>
        </div>
    );
}