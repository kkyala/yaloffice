import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from '../components/Icons';
import { aiService } from '../services/aiService';

const CandidateAIChatScreen = () => {
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([
        { sender: 'ai', text: "Hello! I'm Yāl Office's AI Assistant. How can I help you with your job search today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const historyRef = useRef<HTMLDivElement>(null);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userText = input.trim();
        const userMessage = { sender: 'user' as const, text: userText };
        
        setMessages(prev => [...prev, userMessage, { sender: 'ai', text: '' }]);
        setInput('');
        setIsLoading(true);

        try {
            // Candidates use the standard gemini-2.5-flash model.
            const stream = aiService.generateTextStream(userText, false);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setMessages(prev => {
                    const updatedMessages = [...prev];
                    if (updatedMessages.length > 0) {
                        updatedMessages[updatedMessages.length - 1].text = fullResponse;
                    }
                    return updatedMessages;
                });
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => {
                const updatedMessages = [...prev];
                if (updatedMessages.length > 0) {
                    updatedMessages[updatedMessages.length - 1].text = 'Sorry, I encountered an error. Please try again.';
                }
                return updatedMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <>
            <header className="page-header">
                <h1>AI Assistant</h1>
            </header>
            <div className="ai-widget chat-widget" style={{height: 'calc(100vh - 200px)', paddingBottom: 0}}>
                <div className="chat-history" ref={historyRef}>
                    {messages.map((msg, i) => (
                        <div key={i} className={`chat-message ${msg.sender}`}>
                            <div className={`chat-bubble ${msg.sender}`}>{msg.text}</div>
                        </div>
                    ))}
                </div>
                <div className="chat-input-area" style={{padding: '1rem 0'}}>
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSend()} 
                        placeholder="Ask about jobs, interviews, or career advice..." 
                        disabled={isLoading} 
                    />
                    <button className="btn btn-primary" onClick={handleSend} disabled={isLoading} aria-label="Send message">
                        <SendIcon />
                    </button>
                </div>
            </div>
        </>
    );
};

export default CandidateAIChatScreen;