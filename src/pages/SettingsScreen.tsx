import React, { useState, useEffect } from 'react';

type SettingsScreenProps = {
    currentUser: any;
    onUpdateUserProfile: (profileData: any) => Promise<{ success: boolean; error?: string }>;
    onClearAllCandidates: () => Promise<{ success: boolean; error?: string }>;
};

export default function SettingsScreen({ currentUser, onUpdateUserProfile, onClearAllCandidates }: SettingsScreenProps) {
    // Profile form state
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    // UI Feedback state
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // Populate form with current user data
    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');
            setMobile(currentUser.mobile || '');
            setLinkedin(currentUser.linkedin_url || '');
            setCity(currentUser.city || '');
            setState(currentUser.state || '');
        }
    }, [currentUser]);

    // Timer to clear feedback messages
    useEffect(() => {
        if (feedback.message) {
            const timer = setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        const profilePayload = {
            name,
            mobile,
            linkedin_url: linkedin,
            city,
            state,
        };

        const result = await onUpdateUserProfile(profilePayload);

        if (result.success) {
            setFeedback({ type: 'success', message: 'Profile updated successfully!' });
        } else {
            setFeedback({ type: 'error', message: result.error || 'Failed to update profile.' });
        }
        setIsSaving(false);
    };

    return (
        <>
            <header className="page-header">
                <h1>Settings</h1>
            </header>
            <div className="settings-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <form onSubmit={handleSaveChanges}>
                    <div className="form-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0 }}>Account Information</h2>
                                <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>Manage your personal and contact details.</p>
                            </div>
                        </div>
                        
                        {feedback.message && (
                            <div className={feedback.type === 'error' ? 'login-error' : 'success-message'} style={{ marginBottom: '1.5rem' }}>
                                {feedback.message}
                            </div>
                        )}

                        <fieldset disabled={isSaving}>
                            <div className="form-grid-2-col">
                                <div className="form-group"><label>Full Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
                                <div className="form-group"><label>Mobile</label><input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="e.g., (555) 123-4567" /></div>
                                <div className="form-group"><label>Email</label><input type="email" value={currentUser?.email || ''} readOnly disabled style={{ cursor: 'not-allowed', backgroundColor: 'var(--light-bg)' }} /></div>
                                <div className="form-group"><label>Role</label><input type="text" value={currentUser?.role || ''} readOnly disabled style={{ cursor: 'not-allowed', backgroundColor: 'var(--light-bg)' }} /></div>
                                <div className="form-group grid-col-span-2"><label>LinkedIn Profile URL</label><input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/yourprofile" /></div>
                                <div className="form-group"><label>City</label><input type="text" value={city} onChange={e => setCity(e.target.value)} /></div>
                                <div className="form-group"><label>State</label><input type="text" value={state} onChange={e => setState(e.target.value)} /></div>
                            </div>
                        </fieldset>

                        <div className="modal-footer" style={{ padding: '1.5rem 0 0', borderTop: '1px solid var(--border-color)', marginTop: '1.5rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
                    To change your password, click your name in the top-right corner.
                </p>
            </div>
        </>
    );
}