
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatIcon, SparklesIcon, MicOnIcon, AudioWaveIcon, VideoOnIcon, UploadCloudIcon, SendIcon, RobotIcon } from '../components/Icons';
import { aiService, type VoiceName, AVAILABLE_VOICES } from '../services/aiService';

type Job = {
    id: number;
    title: string;
    description: string;
};

// Helper to convert a file blob to a base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to read blob as base64 string.'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const AIInterviewPlatformScreen = ({ jobsData = [] }: { jobsData: Job[] }) => {
    return (
        <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
            <header className="page-header" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>AI Toolkit</h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
                    Explore our suite of AI-powered tools for recruitment and analysis.
                </p>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '2rem'
            }}>
                <ChatbotWidget />
                <TranscriptionWidget />
                <TextToSpeechWidget />
                <VideoAnalysisWidget />
            </div>
        </div>
    );
};

// --- WIDGETS ---

const WidgetContainer = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '500px', // Fixed height for uniformity
        overflow: 'hidden'
    }}>
        <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'var(--slate-50)'
        }}>
            <div style={{
                width: '36px', height: '36px',
                borderRadius: '8px',
                background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
                color: 'var(--color-primary)'
            }}>
                {icon}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>{title}</h3>
        </div>
        <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {children}
        </div>
    </div>
);

const ChatbotWidget = () => {
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useThinkingMode, setUseThinkingMode] = useState(false);
    const historyRef = useRef<HTMLDivElement>(null);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userText = input.trim();
        const userMessage = { sender: 'user' as const, text: userText };

        setMessages(prev => [...prev, userMessage, { sender: 'ai', text: '' }]);
        setInput('');
        setIsLoading(true);

        try {
            const stream = aiService.generateTextStream(userText, useThinkingMode);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setMessages(prev => {
                    const updatedMessages = [...prev];
                    updatedMessages[updatedMessages.length - 1].text = fullResponse;
                    return updatedMessages;
                });
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => {
                const updatedMessages = [...prev];
                updatedMessages[updatedMessages.length - 1].text = 'Sorry, I encountered an error. Please try again.';
                return updatedMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        historyRef.current?.scrollTo(0, historyRef.current.scrollHeight);
    }, [messages]);

    return (
        <WidgetContainer title="AI Assistant" icon={<RobotIcon style={{ width: '24px' }} />}>
            <div style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '0.5rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }} ref={historyRef}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--color-text-muted)', opacity: 0.7 }}>
                        <SparklesIcon style={{ width: '48px', height: '48px', marginBottom: '0.5rem' }} />
                        <p>Ask me anything regarding recruitment.</p>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} style={{
                            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%'
                        }}>
                            <div style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '1rem',
                                background: msg.sender === 'user' ? 'var(--color-primary)' : 'var(--slate-100)',
                                color: msg.sender === 'user' ? 'white' : 'var(--color-text-main)',
                                fontSize: '0.95rem',
                                lineHeight: '1.5',
                                boxShadow: 'var(--shadow-sm)',
                                borderTopRightRadius: msg.sender === 'user' ? '4px' : '1rem',
                                borderTopLeftRadius: msg.sender === 'user' ? '1rem' : '4px'
                            }}>
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={{ padding: '0.5rem 0 0' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-muted)'
                }}>
                    <input
                        type="checkbox"
                        id="thinkingMode"
                        checked={useThinkingMode}
                        onChange={e => setUseThinkingMode(e.target.checked)}
                        disabled={isLoading}
                    />
                    <label htmlFor="thinkingMode" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                        <SparklesIcon style={{ width: 14, height: 14, color: 'var(--color-secondary)' }} />
                        Enable Deep Thinking (Gemini 2.5)
                    </label>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        style={{
                            flex: 1,
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '0.75rem 1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleSend}
                        disabled={isLoading}
                        style={{ padding: '0 1rem', borderRadius: 'var(--radius-lg)' }}
                    >
                        <SendIcon style={{ width: '20px' }} />
                    </button>
                </div>
            </div>
        </WidgetContainer>
    );
};

const TranscriptionWidget = () => {
    const [transcript, setTranscript] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Ready to transcribe');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleToggleRecording = () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
        } else {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    mediaRecorderRef.current = new MediaRecorder(stream);
                    mediaRecorderRef.current.ondataavailable = (event) => {
                        audioChunksRef.current.push(event.data);
                    };
                    mediaRecorderRef.current.onstop = async () => {
                        setStatus('Transcribing...');
                        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                        try {
                            const base64Audio = await blobToBase64(audioBlob);
                            const result = await aiService.generateText(`Transcribe the following audio exactly:`, false);
                            setTranscript('This is a simulated transcription. The Gemini API for direct audio file transcription is not used in this demo widget, but the live interview uses real-time transcription.');
                        } catch (error) {
                            console.error(error);
                            setStatus('Transcription failed.');
                        } finally {
                            audioChunksRef.current = [];
                            setStatus('Ready to transcribe');
                        }
                    };
                    mediaRecorderRef.current.start();
                    setStatus('Recording... Click to stop.');
                    setIsRecording(true);
                })
                .catch(err => {
                    console.error("Mic access error:", err);
                    setStatus('Microphone access denied.');
                });
        }
    };

    // This effect handles the stop logic
    useEffect(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && !isRecording) {
            mediaRecorderRef.current.stop();
        }
    }, [isRecording]);


    return (
        <WidgetContainer title="Speech-to-Text" icon={<MicOnIcon style={{ width: '24px' }} />}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                    flex: 1,
                    background: 'var(--slate-50)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem',
                    border: '1px solid var(--color-border)',
                    overflowY: 'auto'
                }}>
                    {transcript ? (
                        <p style={{ margin: 0, lineHeight: '1.6' }}>{transcript}</p>
                    ) : (
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Transcription will appear here...</p>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: isRecording ? 'var(--status-error)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                        {status}
                    </span>
                    <button
                        className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => setIsRecording(!isRecording)}
                        style={{ minWidth: '150px' }}
                    >
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                </div>
            </div>
        </WidgetContainer>
    );
};

const TextToSpeechWidget = () => {
    const [text, setText] = useState('Hello! I am a Gemini-powered AI assistant. I can convert your text into speech.');
    const [voice, setVoice] = useState<VoiceName>('Zephyr');
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const handleSpeak = async () => {
        if (!text.trim() || isLoading) return;
        setIsLoading(true);
        try {
            const base64Audio = await aiService.generateSpeech(text, voice);
            const audioSrc = `data:audio/mpeg;base64,${base64Audio}`;
            if (audioRef.current) {
                audioRef.current.src = audioSrc;
                audioRef.current.play();
            }
        } catch (error) {
            console.error(error);
            alert('Failed to generate speech.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <WidgetContainer title="Text-to-Speech" icon={<AudioWaveIcon style={{ width: '24px' }} />}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    style={{
                        flex: 1,
                        resize: 'none',
                        padding: '1rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                        fontFamily: 'inherit',
                        lineHeight: '1.6'
                    }}
                ></textarea>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                    <select
                        value={voice}
                        onChange={e => setVoice(e.target.value as VoiceName)}
                        style={{ width: '100%' }}
                    >
                        {AVAILABLE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={handleSpeak} disabled={isLoading}>
                        {isLoading ? 'Generating...' : 'Speak'}
                    </button>
                </div>
                <audio ref={audioRef} style={{ display: 'none' }} />
            </div>
        </WidgetContainer>
    );
};

const VideoAnalysisWidget = () => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoSrc, setVideoSrc] = useState('');
    const [prompt, setPrompt] = useState('Summarize this video.');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoSrc(URL.createObjectURL(file));
        }
    };

    const handleAnalyze = async () => {
        if (!videoFile || !prompt.trim() || isLoading) return;
        setIsLoading(true);
        setResult('');

        try {
            const base64Data = await blobToBase64(videoFile);
            const videoPart = {
                inlineData: {
                    data: base64Data,
                    mimeType: videoFile.type,
                },
            };
            const analysisResult = await aiService.analyzeVideo(videoPart, prompt);
            setResult(analysisResult);
        } catch (error) {
            console.error(error);
            setResult(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <WidgetContainer title="Video Analysis" icon={<VideoOnIcon style={{ width: '24px' }} />}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
                <div style={{
                    flex: 1,
                    background: 'black',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {videoSrc ? (
                        <video controls src={videoSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <div
                            onClick={() => inputRef.current?.click()}
                            style={{
                                cursor: 'pointer',
                                textAlign: 'center',
                                padding: '2rem',
                                color: 'rgba(255,255,255,0.7)'
                            }}
                        >
                            <UploadCloudIcon style={{ width: '40px', height: '40px', marginBottom: '1rem', opacity: 0.8 }} />
                            <p style={{ margin: 0, fontWeight: 600 }}>Click to Upload Video</p>
                            <input type="file" accept="video/*" ref={inputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="What should I look for?"
                        style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={handleAnalyze} disabled={!videoFile || isLoading}>
                        {isLoading ? '...' : 'Analyze'}
                    </button>
                </div>

                {result && (
                    <div style={{
                        background: 'var(--slate-50)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-lg)',
                        fontSize: '0.9rem',
                        maxHeight: '100px',
                        overflowY: 'auto',
                        border: '1px solid var(--color-border)'
                    }}>
                        {result}
                    </div>
                )}
            </div>
        </WidgetContainer>
    );
};


export default AIInterviewPlatformScreen;