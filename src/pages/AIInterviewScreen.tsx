

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAI } from '../context/AIProvider';
import { aiService } from '../services/aiService';
import { aiLiveService } from '../services/AILiveService';
import { config } from '../config/appConfig';
import { MicOnIcon, MicOffIcon, VideoOnIcon, VideoOffIcon, PhoneOffIcon, RobotIcon, CheckCircleIcon } from '../components/Icons';
// FIX: Import LiveServerMessage and GeminiBlob directly from @google/genai
import type { LiveServerMessage, Blob as GeminiBlob } from '@google/genai';
// FIX: Import AVAILABLE_LIVE_MODELS directly from AILiveService
import { AVAILABLE_LIVE_MODELS } from '../services/AILiveService';


// --- TYPE DEFINITIONS ---
// FIX: Added jobId to candidate type to allow lookup of job title.
type Candidate = { id: number; name: string; role: string; jobId: number; interview_config?: { mode?: 'chat' | 'audio' | 'video'; interviewStatus?: 'pending' | 'started' | 'finished'; questionCount?: number; difficulty?: string; customQuestions?: string[]; postInterviewInstructions?: string; }; };
type AIInterviewScreenProps = { currentUser: any; interviewingCandidate: Candidate | null; currentApplicationId: number | null; onSaveInterviewResults: (applicationId: number, score: number, transcript: string) => Promise<void>; onStartInterviewSession: (applicationId: number) => Promise<{ success: boolean }>; onNavigate: (page: string, parent: string, context?: { candidateId?: number, applicationId?: number }) => void; jobsData?: any[] };
type Message = { id: number; sender: 'user' | 'ai' | 'system'; text: string; };
type InterviewState = 'welcome' | 'in-progress' | 'analyzing' | 'finished';
type ParticipantStatus = 'idle' | 'thinking' | 'speaking' | 'listening';
type LiveSession = {
    close: () => void;
    sendRealtimeInput: (input: { media?: GeminiBlob; text?: string }) => void; // Using GeminiBlob
};
// FIX: Added SessionState type for managing live session status
type SessionState = 'idle' | 'connecting' | 'active' | 'error';


// --- SUB-COMPONENTS ---

const WelcomeScreen = ({ candidate, jobTitle, onStart, isLoading }) => (
    <div className="interview-welcome-container">
        <h1>AI Interview Session</h1>
        <p>Get ready for your AI-powered interview for the <strong>{jobTitle}</strong> position.</p>
        <div className="device-check-panel">
            <h2>Device Check</h2>
            <div className="device-check-item">
                <CheckCircleIcon className="device-check-icon" />
                <span className="device-check-status">Microphone Ready</span>
                <div className="mic-level-indicator"><div className="mic-level-fill" /></div>
            </div>
            <div className="device-check-item">
                <CheckCircleIcon className="device-check-icon" />
                <span className="device-check-status">Camera Not Required</span> {/* Updated for audio-only */}
            </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onStart} disabled={isLoading}>
            {isLoading ? 'Starting...' : 'Start Interview'}
        </button>
    </div>
);

const InterviewInProgressScreen = ({ candidate, messages, aiStatus, userStatus, onEndInterview, isMicOn, toggleMic }) => { // Removed camera props
    const transcriptContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="interview-inprogress-container">
            <main className="interview-main-area">
                <div className="interview-video-area">
                    <div className="participant-view">
                        <div className={`participant-avatar ${aiStatus}`}>
                            {aiStatus === 'speaking' ? (
                                 <div className="ai-speaking-indicator">
                                    <div className="bar" /><div className="bar" /><div className="bar" /><div className="bar" />
                                </div>
                            ) : (
                                <RobotIcon className="robot-icon" />
                            )}
                            <span>{aiStatus.charAt(0).toUpperCase() + aiStatus.slice(1)}</span>
                        </div>
                        <div className="participant-info-label">AI Interviewer</div>
                    </div>
                    <div className="participant-view">
                        {/* No camera view for audio-only interview */}
                        <div className="participant-avatar">
                            <img src={`https://i.pravatar.cc/80?u=${candidate.name}`} alt={candidate.name} style={{borderRadius: '50%'}} />
                                <span>{userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}</span>
                        </div>
                        <div className="participant-info-label">{candidate.name}</div>
                    </div>
                </div>
                <aside className="interview-transcript-area">
                    <h3 className="transcript-header">Live Transcript</h3>
                    <div className="transcript-body" ref={transcriptContainerRef}>
                        {messages.map(msg => (
                            <div key={msg.id} className={`transcript-message ${msg.sender}`}>
                                <div className="message-sender">{msg.sender === 'ai' ? 'AI Interviewer' : 'You'}</div>
                                <div className={`message-bubble ${msg.sender}`}>{msg.text}</div>
                            </div>
                        ))}
                    </div>
                </aside>
            </main>
            <footer className="interview-controls">
                <button className={`control-btn ${isMicOn ? 'active' : ''}`} onClick={toggleMic}>
                    {isMicOn ? <MicOnIcon /> : <MicOffIcon />}
                </button>
                {/* Camera toggle removed for audio-only */}
                <button className="control-btn danger" onClick={onEndInterview}>
                    <PhoneOffIcon />
                </button>
            </footer>
        </div>
    );
};

const ConfirmationDialog = ({ onConfirm, onCancel }) => (
    <div className="modal-overlay">
        <div className="modal-content" style={{maxWidth: '450px', textAlign: 'center'}}>
            <div className="modal-body" style={{padding: '2rem'}}>
                <h2>End Interview?</h2>
                <p style={{color: 'var(--text-secondary)', margin: '1rem 0 2rem'}}>
                    Are you sure you want to end the session? Your responses will be submitted for analysis.
                </p>
                <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" style={{backgroundColor: 'var(--error-color)', borderColor: 'var(--error-color)'}} onClick={onConfirm}>End Interview</button>
                </div>
            </div>
        </div>
    </div>
);

// FIX: Added explicit types for props to allow optional properties and fix compile errors.
const FinishedScreen = ({ title, message, buttonText, onButtonClick }: { title: string; message?: string; buttonText?: string; onButtonClick?: () => void; }) => (
    <div className="finished-screen-overlay">
        <h2>{title}</h2>
        {message && <p>{message}</p>}
        {buttonText && <button className="btn btn-primary" onClick={onButtonClick}>{buttonText}</button>}
    </div>
);


// --- MAIN COMPONENT ---
export default function AIInterviewScreen({ currentUser, interviewingCandidate, currentApplicationId, onSaveInterviewResults, onStartInterviewSession, onNavigate, jobsData = [] }: AIInterviewScreenProps) {
    const { isReady, reportInvalidApiKey } = useAI();
    const [interviewState, setInterviewState] = useState<InterviewState>('welcome');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [aiStatus, setAIStatus] = useState<ParticipantStatus>('idle');
    const [userStatus, setUserStatus] = useState<ParticipantStatus>('idle');
    const [isMicOn, setIsMicOn] = useState(true);
    const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
    // FIX: Declare sessionState for live session management
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    
    // Refs for live session and audio processing
    const liveSessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    const currentFullTranscriptRef = useRef(''); // To accumulate full transcript

    const interviewConfig = interviewingCandidate?.interview_config;
    const isInterviewFinished = interviewConfig?.interviewStatus === 'finished';

    const jobTitle = useMemo(() => jobsData.find(j => j.id === interviewingCandidate?.jobId)?.title || interviewingCandidate?.role, [jobsData, interviewingCandidate]);

    const playGeminiAudio = useCallback(async (base64Audio: string) => {
        if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioCtx = outputAudioContextRef.current;
        const decodedBytes = aiLiveService.decode(base64Audio); // Use AILiveService.decode
        if (decodedBytes.length === 0) return;
        const audioBuffer = await aiLiveService.decodeAudioData(decodedBytes, audioCtx, 24000, 1); // Use AILiveService.decodeAudioData

        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.addEventListener('ended', () => {
            outputSourcesRef.current.delete(source);
            setAIStatus('idle'); // Set AI to idle after speaking
        });
        
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        outputSourcesRef.current.add(source);
        setAIStatus('speaking'); // Set AI to speaking
    }, []);

    const cleanupAudioResources = useCallback(() => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        
        if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close().catch(console.error);
        if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close().catch(console.error);

        for (const source of outputSourcesRef.current.values()) {
            try { source.stop(); } catch (e) {}
        }
        outputSourcesRef.current.clear();
        
        liveSessionRef.current?.close(); // Ensure live session is closed
        liveSessionRef.current = null;
        sessionPromiseRef.current = null; // Clear the promise ref too

        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        nextStartTimeRef.current = 0;
        currentFullTranscriptRef.current = '';
    }, []);

    const setupAudioInputStream = useCallback(() => {
        if (!mediaStreamRef.current || !liveSessionRef.current) return;

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const audioCtx = inputAudioContextRef.current;
        
        mediaStreamSourceRef.current = audioCtx.createMediaStreamSource(mediaStreamRef.current);
        
        scriptProcessorRef.current = audioCtx.createScriptProcessor(4096, 1, 1);
        
        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            if (!isMicOn) {
                setUserStatus('idle');
                return; // Only send if mic is on
            }
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob: GeminiBlob = { // Using GeminiBlob
                data: aiLiveService.encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)), // Using aiLiveService.encode
                mimeType: 'audio/pcm;rate=16000',
            };
            liveSessionRef.current?.sendRealtimeInput({ media: pcmBlob });
            setUserStatus('speaking'); // Assume speaking while sending audio
        };
        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(audioCtx.destination);
    }, [isMicOn]);
    
    // Ref for the promise of the live session to handle async creation
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);

    const onLiveSessionMessage = useCallback(async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
            setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.sender === 'ai') {
                    // Append to existing AI message if it's the last one
                    return [...prev.slice(0, -1), { ...lastMessage, text: lastMessage.text + message.serverContent.outputTranscription.text }];
                } else {
                    // Start a new AI message
                    return [...prev, { id: Date.now(), sender: 'ai', text: message.serverContent.outputTranscription.text }];
                }
            });
            currentFullTranscriptRef.current += `AI: ${message.serverContent.outputTranscription.text}\n`;
        }
        if (message.serverContent?.inputTranscription) {
             setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.sender === 'user') {
                    // Append to existing user message if it's the last one
                    return [...prev.slice(0, -1), { ...lastMessage, text: lastMessage.text + message.serverContent.inputTranscription.text }];
                } else {
                    // Start a new user message
                    return [...prev, { id: Date.now(), sender: 'user', text: message.serverContent.inputTranscription.text }];
                }
            });
            currentFullTranscriptRef.current += `USER: ${message.serverContent.inputTranscription.text}\n`;
            setUserStatus('listening'); // User is actively speaking
        }
        
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
            playGeminiAudio(base64Audio);
        }

        if (message.serverContent?.turnComplete) {
            // A turn is complete, reset user status (AI status is handled by playGeminiAudio)
            setUserStatus('idle');
            // Ensure any partial messages are finalized
            setMessages(prevMessages => {
                let updated = false;
                const newMessages = prevMessages.map(msg => {
                    if ((msg.sender === 'user' || msg.sender === 'ai') && msg.text.endsWith(' ')) {
                        updated = true;
                        return { ...msg, text: msg.text.trim() };
                    }
                    return msg;
                });
                return updated ? newMessages : prevMessages;
            });
        }
        
        if (message.serverContent?.interrupted) {
            for (const source of outputSourcesRef.current.values()) {
                try { source.stop(); } catch(e){}
            }
            outputSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setAIStatus('idle'); // Stop AI speaking immediately on interrupt
        }
    }, [playGeminiAudio]);

    const onLiveSessionError = useCallback((e: ErrorEvent) => {
        console.error("Gemini Live Session error:", e);
        setError("A session error occurred with the AI interviewer. Please try again.");
        // FIX: Use declared setSessionState
        setSessionState('error');
        cleanupAudioResources();
        if (e.message?.toLowerCase().includes('api key')) reportInvalidApiKey();
    }, [cleanupAudioResources, reportInvalidApiKey]);
    
    const onLiveSessionClose = useCallback(() => {
        console.log("Gemini Live Session closed.");
        // FIX: Use declared setSessionState
        setSessionState('idle');
        cleanupAudioResources();
    }, [cleanupAudioResources]);

    const startInterview = useCallback(async () => {
        if (!isReady || !interviewingCandidate || !currentApplicationId) return;
        setIsLoading(true);
        setError('');
        
        const startResult = await onStartInterviewSession(currentApplicationId);
        if (!startResult.success) {
            setError('Could not start the interview session. Please try again later.');
            setIsLoading(false);
            return;
        }

        try {
            // Get user media stream for microphone input
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const voiceConfig = aiService.getVoiceConfigForLanguage('en-US'); // Use aiService.getVoiceConfigForLanguage
            
            // Establish the Gemini Live session
            sessionPromiseRef.current = aiLiveService.createLiveSession( // Use aiLiveService.createLiveSession
                { 
                    onopen: () => {
                        // FIX: Use declared setSessionState
                        setSessionState('active');
                        setInterviewState('in-progress'); // Transition to in-progress state
                        setupAudioInputStream();
                        // Send initial prompt to Gemini Live (which will then speak it)
                        const initialPromptText = config.ai.interview.initialPrompt(
                            jobTitle,
                            interviewConfig?.questionCount || 5,
                            interviewConfig?.difficulty || 'Medium',
                            interviewConfig?.customQuestions || []
                        );
                        liveSessionRef.current?.sendRealtimeInput({ text: initialPromptText });
                        setIsLoading(false);
                        setAIStatus('speaking'); // AI will start speaking the prompt
                        setUserStatus('idle');
                    }, 
                    onmessage: onLiveSessionMessage, 
                    onerror: onLiveSessionError, 
                    onclose: onLiveSessionClose 
                },
                {
                    systemInstruction: config.ai.interview.systemInstruction,
                    // FIX: Access AVAILABLE_LIVE_MODELS from imported constant
                    model: AVAILABLE_LIVE_MODELS[0], // Use the defined live model
                    voiceConfig: voiceConfig,
                    enableVideo: false, // Explicitly false for audio-only screen
                }
            );

            // Once the promise resolves, store the actual live session object
            liveSessionRef.current = await sessionPromiseRef.current;
            
        } catch (err) {
            console.error("Failed to initialize the AI interviewer:", err);
            setError('Failed to initialize the AI interviewer. Check microphone permissions or API key.');
            if (err.message?.toLowerCase().includes('api key')) reportInvalidApiKey();
            // FIX: Use declared setSessionState
            setSessionState('error');
            setIsLoading(false);
            cleanupAudioResources();
        }
    }, [isReady, interviewingCandidate, currentApplicationId, onStartInterviewSession, reportInvalidApiKey, interviewConfig, jobTitle, setupAudioInputStream, onLiveSessionMessage, onLiveSessionError, onLiveSessionClose, setSessionState]);
    
    const finishInterview = useCallback(async () => {
        cleanupAudioResources(); // Close all audio and live session connections
        setInterviewState('analyzing');
        
        const fullTranscript = messages.map(msg => `${msg.sender.toUpperCase()}: ${msg.text}`).join('\n\n');

        try {
            const schema = { type: aiService.GoogleGenAIType.OBJECT, properties: { score: { type: aiService.GoogleGenAIType.NUMBER } }, required: ['score'] };
            const result = await aiService.generateJsonContent(`Analyze the following interview transcript for a ${jobTitle} role. Provide an overall score from 1.0 to 10.0. Respond ONLY with the JSON. Transcript:\n\n${fullTranscript}`, schema);
            if (currentApplicationId) await onSaveInterviewResults(currentApplicationId, result.score, fullTranscript);
        } catch (err) {
            setError('Failed to analyze the interview. Your progress has been saved, but no score/summary was generated.');
            if (currentApplicationId) await onSaveInterviewResults(currentApplicationId, 0, fullTranscript);
            if (err.message?.toLowerCase().includes('api key')) reportInvalidApiKey();
        } finally {
            if (interviewingCandidate) {
                const parentPage = currentUser?.role === 'Candidate' ? 'dashboard' : 'recruitment';
                onNavigate('interview-report', parentPage, { candidateId: interviewingCandidate.id, applicationId: currentApplicationId });
            }
        }
    }, [cleanupAudioResources, messages, interviewingCandidate, currentApplicationId, onSaveInterviewResults, onNavigate, currentUser, jobTitle, reportInvalidApiKey]);

    const toggleMic = () => {
        setIsMicOn(prev => !prev);
        // Live session sends audio based on isMicOn state in onaudioprocess.
        // No need to explicitly start/stop recognition here.
    };

    // Auto-cleanup on component unmount
    useEffect(() => {
        return () => {
            cleanupAudioResources();
        };
    }, [cleanupAudioResources]);

    if (!interviewingCandidate) return <FinishedScreen title="Loading Interview..." />;
    if (isInterviewFinished) return <FinishedScreen title="Interview Complete" message="You have already completed this interview." buttonText="View My Report" onButtonClick={() => onNavigate('interview-report', 'dashboard', { candidateId: interviewingCandidate.id, applicationId: currentApplicationId })} />;
    if (interviewState === 'analyzing') return <FinishedScreen title="Analyzing..." message="Please wait while we process your interview." />;
    
    return (
        <div className="ai-interview-page">
            {interviewState === 'welcome' ? (
                <WelcomeScreen candidate={interviewingCandidate} jobTitle={jobTitle} onStart={startInterview} isLoading={isLoading} />
            ) : (
                <InterviewInProgressScreen
                    candidate={interviewingCandidate}
                    messages={messages}
                    aiStatus={aiStatus}
                    userStatus={userStatus}
                    onEndInterview={() => setIsConfirmingEnd(true)}
                    isMicOn={isMicOn}
                    toggleMic={toggleMic}
                    // Camera props are intentionally omitted for this audio-only screen
                />
            )}
            {error && <div className="login-error" style={{position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 10}}>{error}</div>}
            {isConfirmingEnd && (
                <ConfirmationDialog 
                    onConfirm={() => {
                        setIsConfirmingEnd(false);
                        finishInterview();
                    }}
                    onCancel={() => setIsConfirmingEnd(false)}
                />
            )}
        </div>
    );
}