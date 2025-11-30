import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { aiService } from '../services/aiService';
import { MicOnIcon, StopCircleIcon, Volume2Icon, CheckCircleIcon } from '../components/Icons';

// Speech Recognition Type Definition
interface IWindow extends Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
}

export default function ScreeningSessionScreen({ currentUser, onNavigate }) {
    const [status, setStatus] = useState<'idle' | 'starting' | 'speaking' | 'listening' | 'processing' | 'completed' | 'error'>('idle');
    const [transcript, setTranscript] = useState<{ role: string; content: string }[]>([]);
    const [currentText, setCurrentText] = useState('');
    const [resumeText, setResumeText] = useState('');
    const [error, setError] = useState('');
    const [report, setReport] = useState<any>(null);

    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

    useEffect(() => {
        if (!currentUser) return;
        fetchResumeAndStart();

        return () => {
            if (synthRef.current) synthRef.current.cancel();
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, [currentUser]);

    const fetchResumeAndStart = async () => {
        setStatus('starting');
        try {
            // 1. Fetch Resume
            const { data: resumeList, error: resumeError } = await api.get(`/resumes/${currentUser.id}`);
            if (resumeError || !resumeList || resumeList.length === 0) {
                setError('No resume found. Please upload a resume first.');
                setStatus('error');
                return;
            }

            const latestResume = resumeList[0];
            const parsedData = latestResume.parsed_data;

            // Convert parsed data to text for the AI
            const text = `
                Name: ${parsedData.personalInfo?.name}
                Summary: ${parsedData.summary}
                Experience: ${parsedData.experience?.map((e: any) => `${e.role} at ${e.company}`).join(', ')}
                Skills: ${parsedData.skills?.join(', ')}
            `;
            setResumeText(text);

            // 2. Start Screening Session
            const { greeting, firstQuestion } = await aiService.startScreening(text, currentUser.name || 'Candidate');

            setTranscript([
                { role: 'ai', content: greeting },
                { role: 'ai', content: firstQuestion }
            ]);

            // 3. Speak Greeting + Question
            await speakText(`${greeting} ${firstQuestion}`);

            // 4. Start Listening
            startListening();

        } catch (err: any) {
            console.error('Screening start error:', err);
            setError(err.message || 'Failed to start screening session.');
            setStatus('error');
        }
    };

    const speakText = (text: string): Promise<void> => {
        return new Promise((resolve) => {
            setStatus('speaking');
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => {
                resolve();
            };
            synthRef.current.speak(utterance);
        });
    };

    const startListening = () => {
        const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
        const SpeechRecognitionClass = SpeechRecognition || webkitSpeechRecognition;

        if (!SpeechRecognitionClass) {
            setError('Speech recognition not supported in this browser.');
            setStatus('error');
            return;
        }

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setStatus('listening');
        };

        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            setCurrentText(text);
            handleUserResponse(text);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'no-speech') {
                // Restart listening if no speech detected
                // recognition.start(); 
                // Actually better to let user manually restart or show UI
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const handleUserResponse = async (userText: string) => {
        setStatus('processing');

        const newHistory = [...transcript, { role: 'user', content: userText }];
        setTranscript(newHistory);

        try {
            const { aiResponse, isComplete } = await aiService.chatScreening(newHistory, userText);

            const updatedHistory = [...newHistory, { role: 'ai', content: aiResponse }];
            setTranscript(updatedHistory);

            await speakText(aiResponse);

            if (isComplete) {
                // Generate Report
                const transcriptText = updatedHistory.map(m => `${m.role}: ${m.content}`).join('\n');
                const { data: reportData } = await api.post('/ai/screening/report', {
                    transcript: transcriptText,
                    candidateName: currentUser.name,
                    applicationId: null // TODO: Pass application ID if available
                });
                setReport(reportData);
                setStatus('completed');
            } else {
                startListening();
            }

        } catch (err: any) {
            console.error('Chat error:', err);
            setError('Failed to process response.');
            setStatus('error');
        }
    };

    return (
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', alignItems: 'center', justifyContent: 'center' }}>

            {status === 'starting' && (
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                    <h2>Initializing AI Screening...</h2>
                </div>
            )}

            {status === 'error' && (
                <div style={{ textAlign: 'center', color: 'var(--error-color)' }}>
                    <h2>Error</h2>
                    <p>{error}</p>
                    <button className="btn btn-secondary" onClick={() => onNavigate('dashboard', 'dashboard')}>Back to Dashboard</button>
                </div>
            )}

            {(status === 'speaking' || status === 'listening' || status === 'processing') && (
                <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{
                            width: '120px', height: '120px', borderRadius: '50%',
                            backgroundColor: status === 'listening' ? 'var(--primary-color)' : 'var(--surface-color)',
                            border: '4px solid var(--primary-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto',
                            animation: status === 'listening' ? 'pulse 1.5s infinite' : 'none',
                            transition: 'all 0.3s'
                        }}>
                            {status === 'listening' ? <MicOnIcon style={{ width: '48px', height: '48px', color: 'white' }} /> : <Volume2Icon style={{ width: '48px', height: '48px', color: 'var(--primary-color)' }} />}
                        </div>
                    </div>

                    <h2 style={{ marginBottom: '1rem' }}>
                        {status === 'speaking' ? 'AI is speaking...' :
                            status === 'listening' ? 'Listening...' :
                                'Processing...'}
                    </h2>

                    <div className="transcript-box" style={{
                        height: '300px', overflowY: 'auto',
                        backgroundColor: 'var(--surface-color)',
                        padding: '1rem', borderRadius: '8px',
                        textAlign: 'left', border: '1px solid var(--border-color)'
                    }}>
                        {transcript.map((msg, i) => (
                            <div key={i} style={{ marginBottom: '1rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '16px',
                                    backgroundColor: msg.role === 'user' ? 'var(--primary-light-color)' : 'var(--light-bg)',
                                    color: msg.role === 'user' ? 'var(--primary-color)' : 'var(--text-color)'
                                }}>
                                    {msg.content}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {status === 'completed' && (
                <div style={{ textAlign: 'center', maxWidth: '600px' }}>
                    <CheckCircleIcon style={{ width: '64px', height: '64px', color: 'var(--success-color)', marginBottom: '1rem' }} />
                    <h2>Screening Complete!</h2>
                    <p style={{ marginBottom: '2rem' }}>Thank you for completing the initial screening. We have generated a report for the employer.</p>

                    {report && (
                        <div className="report-summary" style={{ textAlign: 'left', backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Screening Summary</h3>
                            <p><strong>Score:</strong> {report.score}/100</p>
                            <p><strong>Summary:</strong> {report.summary}</p>
                            <p><strong>Recommendation:</strong> {report.recommendation}</p>
                        </div>
                    )}

                    <button className="btn btn-primary btn-lg" onClick={() => onNavigate('dashboard', 'dashboard')}>Return to Dashboard</button>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.4); }
                    70% { box-shadow: 0 0 0 20px rgba(var(--primary-rgb), 0); }
                    100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0); }
                }
            `}</style>
        </div>
    );
}
