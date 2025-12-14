import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from '../components/Icons';
import { aiService } from '../services/aiService';

interface ResumeScreeningChatScreenProps {
    currentUser: any;
    resumeText: string;
    onComplete: () => void;
    jobId?: number;
    jobTitle?: string;
}

const ResumeScreeningChatScreen: React.FC<ResumeScreeningChatScreenProps> = ({ currentUser, resumeText, onComplete, jobId, jobTitle }) => {
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const historyRef = useRef<HTMLDivElement>(null);
    const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);

    useEffect(() => {
        const initChat = async () => {
            try {
                const result = await aiService.startScreening(resumeText, currentUser.name);
                setMessages([
                    { sender: 'ai', text: result.greeting },
                    { sender: 'ai', text: result.firstQuestion }
                ]);
                setChatHistory([
                    { role: 'ai', content: result.greeting },
                    { role: 'ai', content: result.firstQuestion }
                ]);
            } catch (error) {
                console.error("Failed to start screening:", error);
                setMessages([{ sender: 'ai', text: "Sorry, I'm having trouble connecting. Please try again later." }]);
            } finally {
                setIsInitializing(false);
            }
        };

        if (resumeText && currentUser) {
            initChat();
        }
    }, [resumeText, currentUser]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userText = input.trim();

        // Update UI immediately
        setMessages(prev => [...prev, { sender: 'user', text: userText }]);
        setInput('');
        setIsLoading(true);

        try {
            // Update history for API
            const newHistory = [...chatHistory, { role: 'user', content: userText }];
            setChatHistory(newHistory);

            // Call API
            const result = await aiService.chatScreening(newHistory, userText);

            setMessages(prev => [...prev, { sender: 'ai', text: result.aiResponse }]);
            setChatHistory(prev => [...prev, { role: 'ai', content: result.aiResponse }]);

            if (result.isComplete) {
                // Finalize
                setMessages(prev => [...prev, { sender: 'ai', text: "Generating your assessment report..." }]);

                // Construct full transcript
                const transcript = newHistory.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n') + `\nAI: ${result.aiResponse}`;

                await aiService.finalizeScreening(transcript, currentUser.name, currentUser.id, jobTitle, jobId);

                setMessages(prev => [...prev, { sender: 'ai', text: "Assessment complete! Redirecting..." }]);
                setTimeout(() => {
                    onComplete();
                }, 2000);
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [messages]);

    if (isInitializing) {
        return (
            <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="loading-spinner"></div>
                <p style={{ marginLeft: '1rem' }}>Initializing AI Screening...</p>
            </div>
        );
    }

    return (
        <div className="ai-screening-chat">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>AI Resume Screening</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Chat with Yal to complete your profile assessment</p>
                </div>
                <button className="btn btn-outline-danger btn-sm" onClick={onComplete}>
                    End Screening
                </button>
            </header>

            <div className="ai-widget chat-widget" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                <div className="chat-history" ref={historyRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    {messages.map((msg, i) => (
                        <div key={i} className={`chat-message ${msg.sender}`} style={{
                            display: 'flex',
                            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: '1rem'
                        }}>
                            <div className={`chat-bubble ${msg.sender}`} style={{
                                maxWidth: '70%',
                                padding: '1rem',
                                borderRadius: '1rem',
                                backgroundColor: msg.sender === 'user' ? 'var(--primary-color)' : 'var(--surface-color)',
                                color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                                border: msg.sender === 'ai' ? '1px solid var(--border-color)' : 'none'
                            }}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="chat-message ai">
                            <div className="chat-bubble ai" style={{ backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '1rem' }}>
                                <span className="typing-indicator">...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="chat-input-area" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Type your answer..."
                        disabled={isLoading}
                        style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                    />
                    <button className="btn btn-primary" onClick={handleSend} disabled={isLoading}>
                        <SendIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResumeScreeningChatScreen;
