import React, { useState, useRef, useEffect } from 'react';
import { ChatIcon, SendIcon, XIcon } from './Icons';
import { aiService } from '../services/aiService';

export default function FloatingAIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([
        { sender: 'ai', text: "Hello! I'm Yāl Office's AI Assistant. How can I help with your job search?" }
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
    
    // Reset chat to initial welcome message when opened, unless it's already in the initial state.
    useEffect(() => {
        if(isOpen) {
            if(messages.length === 1 && messages[0].sender === 'ai') return;
             setMessages([{ sender: 'ai', text: "Hello! I'm Yāl Office's AI Assistant. How can I help with your job search?" }]);
        }
    }, [isOpen, messages]);

    return (
        <div className="floating-chat-container">
            <div className={`chat-widget-window ${isOpen ? 'open' : ''}`}>
                <div className="chat-widget-header">
                    <h3><ChatIcon /> AI Assistant</h3>
                    <button onClick={() => setIsOpen(false)} aria-label="Close chat"><XIcon /></button>
                </div>
                <div className="chat-widget-body" ref={historyRef}>
                     {messages.map((msg, i) => (
                        <div key={i} className={`chat-message ${msg.sender}`}>
                            <div className={`chat-bubble ${msg.sender}`}>{msg.text}</div>
                        </div>
                    ))}
                </div>
                <div className="chat-widget-footer">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSend()} 
                        placeholder="Ask a question..." 
                        disabled={isLoading} 
                    />
                    <button className="btn btn-primary" onClick={handleSend} disabled={isLoading} aria-label="Send message">
                        <SendIcon />
                    </button>
                </div>
            </div>
            <button className="floating-chat-button" onClick={() => setIsOpen(prev => !prev)} aria-label="Toggle AI Assistant">
                {isOpen ? <XIcon /> : <ChatIcon />}
            </button>
        </div>
    );
}