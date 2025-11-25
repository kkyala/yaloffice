import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { aiService } from '../services/aiService';

const AIContext = createContext({
    isReady: false,
    reportInvalidApiKey: () => {},
});

export const useAI = () => useContext(AIContext);

// FIX: Added an explicit props type for the provider to ensure 'children' is correctly typed.
type AIProviderProps = {
    children?: ReactNode;
};

export const AIProvider = ({ children }: AIProviderProps) => {
    // Check if the service was initialized correctly when the app loads.
    const [isReady] = useState(() => aiService.isInitialized());
    
    // If not ready, assume it's a configuration error.
    const [apiKeyError, setApiKeyError] = useState(!isReady);

    const reportInvalidApiKey = useCallback(() => {
        // This can be triggered by API calls if the key is valid on init but rejected by the server later.
        console.error("An API call failed due to an invalid API key.");
        setApiKeyError(true);
    }, []);

    if (apiKeyError) {
        return (
            <div className="error-overlay" style={{ lineHeight: '1.6' }}>
                <div style={{ maxWidth: '600px'}}>
                    <h1>AI Service Unavailable</h1>
                    <p>The AI service could not be initialized. This may be due to a missing API key or a configuration issue in the application's environment.</p>
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)'}}>
                        Please ensure the application is correctly configured by the administrator.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <AIContext.Provider value={{ isReady, reportInvalidApiKey }}>
            {children}
        </AIContext.Provider>
    );
};