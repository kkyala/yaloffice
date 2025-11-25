import React, { useState, useEffect } from 'react';
import { YaalOfficeLogo } from './Icons';

export default function ApiKeyModal({ onApiKeySubmit, initialError = '' }) {
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState(initialError);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setError(initialError);
    }, [initialError]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!apiKey.trim()) {
            setError('API Key cannot be empty.');
            return;
        }
        setIsLoading(true);
        setError('');
        
        const success = onApiKeySubmit(apiKey);

        if (!success) {
            setError('Initialization failed. The API key might be invalid or improperly formatted.');
        }
        setIsLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <YaalOfficeLogo />
                    <h1>AI Service Configuration</h1>
                    <p>To use AI features, please provide your Google AI API key.</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="api-key">Gemini API Key</label>
                        <input 
                            id="api-key" 
                            type="password" 
                            value={apiKey} 
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your key here"
                            required 
                            autoFocus
                        />
                    </div>
                    {error && <p style={{ color: 'var(--status-closed)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>
                        Your key is stored only in this browser session and is never sent to our servers.
                    </p>
                    <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
                        {isLoading ? 'Verifying...' : 'Save & Initialize'}
                    </button>
                </form>
            </div>
        </div>
    );
}