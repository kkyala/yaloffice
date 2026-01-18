import React, { useState, useEffect } from 'react';
import { z } from 'zod';

// Define validation schema
const settingsSchema = z.object({
    name: z.string().min(1, "Full Name is required"),
    mobile: z.string().min(10, "Mobile number must be at least 10 digits").optional().or(z.literal('')),
    linkedin: z.string().url("Invalid LinkedIn URL").optional().or(z.literal('')),
    city: z.string().optional(),
    state: z.string().optional(),
});

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
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

    const validateForm = () => {
        try {
            settingsSchema.parse({ name, mobile, linkedin, city, state });
            setFieldErrors({});
            return true;
        } catch (err: any) {
            if (err instanceof z.ZodError) {
                const errors: Record<string, string> = {};
                err.errors.forEach((e) => {
                    if (e.path[0]) errors[e.path[0] as string] = e.message;
                });
                setFieldErrors(errors);
            }
            return false;
        }
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

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
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2.5rem'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Account Settings</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Manage your personal profile and preferences</p>
                </div>
                <button
                    type="submit"
                    form="settings-form"
                    className="btn btn-primary"
                    disabled={isSaving}
                    style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                        borderRadius: '8px'
                    }}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div style={{
                background: 'var(--bg-surface, #ffffff)', // Fallback to white if variable missing
                borderRadius: '16px',
                padding: '2.5rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)', // Modern soft shadow
                border: '1px solid rgba(0,0,0,0.05)' // Very subtle border
            }}>
                <form id="settings-form" onSubmit={handleSaveChanges}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '4px', height: '24px', background: 'var(--primary-color)', borderRadius: '2px', display: 'inline-block' }}></span>
                            Personal Information
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: '1rem' }}>
                            Update your public profile details.
                        </p>
                    </div>

                    {feedback.message && (
                        <div style={{
                            marginBottom: '2rem',
                            padding: '1rem 1.25rem',
                            borderRadius: '8px',
                            background: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
                            color: feedback.type === 'error' ? '#ef4444' : '#16a34a',
                            border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontWeight: '500'
                        }}>
                            {feedback.type === 'success' && <span>✓</span>}
                            {feedback.type === 'error' && <span>⚠</span>}
                            {feedback.message}
                        </div>
                    )}

                    <fieldset disabled={isSaving} style={{ border: 'none', padding: 0, margin: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                            {/* Left Column */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className={fieldErrors.name ? 'input-error' : ''}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)',
                                            fontSize: '0.95rem',
                                            transition: 'border-color 0.2s',
                                        }}
                                        placeholder="John Doe"
                                    />
                                    {fieldErrors.name && <span className="error-text" style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{fieldErrors.name}</span>}
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Email Address</label>
                                    <input
                                        type="email"
                                        value={currentUser?.email || ''}
                                        readOnly disabled
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '8px',
                                            border: '1px solid transparent',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-disabled)',
                                            cursor: 'not-allowed',
                                            opacity: 0.7
                                        }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={mobile}
                                        onChange={e => setMobile(e.target.value)}
                                        placeholder="+1 (555) 000-0000"
                                        className={fieldErrors.mobile ? 'input-error' : ''}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)',
                                            fontSize: '0.95rem',
                                        }}
                                    />
                                    {fieldErrors.mobile && <span className="error-text" style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{fieldErrors.mobile}</span>}
                                </div>
                            </div>

                            {/* Right Column */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Role</label>
                                    <input
                                        type="text"
                                        value={currentUser?.role || ''}
                                        readOnly disabled
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '8px',
                                            border: '1px solid transparent',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-disabled)',
                                            cursor: 'not-allowed',
                                            opacity: 0.7
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>City</label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={e => setCity(e.target.value)}
                                            placeholder="New York"
                                            style={{
                                                width: '100%',
                                                padding: '0.875rem 1rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-secondary)',
                                                fontSize: '0.95rem',
                                            }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>State</label>
                                        <input
                                            type="text"
                                            value={state}
                                            onChange={e => setState(e.target.value)}
                                            placeholder="NY"
                                            style={{
                                                width: '100%',
                                                padding: '0.875rem 1rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-secondary)',
                                                fontSize: '0.95rem',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>LinkedIn URL</label>
                                    <input
                                        type="url"
                                        value={linkedin}
                                        onChange={e => setLinkedin(e.target.value)}
                                        placeholder="https://linkedin.com/in/username"
                                        className={fieldErrors.linkedin ? 'input-error' : ''}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)',
                                            fontSize: '0.95rem',
                                        }}
                                    />
                                    {fieldErrors.linkedin && <span className="error-text" style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{fieldErrors.linkedin}</span>}
                                </div>
                            </div>
                        </div>
                    </fieldset>
                </form>

                <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                        Need to change your password? <a href="#" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '500' }}>Update it here</a> or click your profile icon.
                    </p>
                </div>
            </div>
        </div>
    );
}