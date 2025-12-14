
export type Blob = {
    mimeType: string;
    data: string;
};

export type LiveServerMessage = {
    serverContent?: {
        modelTurn?: {
            parts: {
                text?: string;
                inlineData?: {
                    mimeType: string;
                    data: string;
                };
            }[];
        };
        turnComplete?: boolean;
        interrupted?: boolean;
        outputTranscription?: {
            text: string;
        };
        inputTranscription?: {
            text: string;
        };
    };
    setupComplete?: boolean;
};
