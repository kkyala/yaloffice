
import React from 'react';

const ScreeningInterviewScreen = ({ onStartScreening }) => {
    return (
        <div style={{ padding: '2rem' }}>
            <h1>Screening Interview</h1>
            <p>Welcome to your screening interview. Please click the button below to begin.</p>
            <button onClick={onStartScreening} className="btn btn-primary">Start Screening</button>
        </div>
    );
};

export default ScreeningInterviewScreen;
