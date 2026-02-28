import React, { useState, useEffect } from 'react';
import { XIcon } from './Icons';
import { z } from 'zod';

// Define validation schemas
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const profileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    mobile: z.string().min(10, "Mobile number must be at least 10 digits").optional().or(z.literal('')),
    role: z.string().optional(),
    linkedin_url: z.string().url("Invalid LinkedIn URL").optional().or(z.literal('')),
    city: z.string().optional(),
    state: z.string().optional(),
    bio: z.string().max(200, "Bio must be less than 200 characters").optional(),
});

type ProfileModalProps = {
    user: any;
    onClose: () => void;
    onChangePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
    onUpdateProfile?: (data: any) => Promise<{ success: boolean; error?: string }>;
    initialTab?: string;
};

export default function ProfileModal({ user, onClose, onChangePassword, onUpdateProfile, initialTab = 'basic' }: ProfileModalProps) {
    // Map 'profile' to 'basic' for backward compatibility
    const resolveTab = (tab: string) => {
        if (tab === 'profile') return 'basic';
        return ['basic', 'professional', 'password'].includes(tab) ? tab : 'basic';
    };

    const [activeTab, setActiveTab] = useState(resolveTab(initialTab));

    // Form States
    const [formData, setFormData] = useState({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        role: user.role || '',
        bio: user.bio || '',
        linkedin_url: user.linkedin_url || '',
        city: user.city || '',
        state: user.state || ''
    });

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setFormData({
            name: user.name || '',
            email: user.email || '',
            mobile: user.mobile || '',
            role: user.role || '',
            bio: user.bio || '',
            linkedin_url: user.linkedin_url || '',
            city: user.city || '',
            state: user.state || ''
        });
    }, [user]);

    useEffect(() => {
        setActiveTab(resolveTab(initialTab));
        setError('');
        setSuccessMessage('');
        setFieldErrors({});
    }, [initialTab]);

    const handleTabClick = (tab: string) => {
        setActiveTab(tab);
        setError('');
        setSuccessMessage('');
        setFieldErrors({});
    };

    const validateForm = (schema: any, data: any) => {
        try {
            schema.parse(data);
            setFieldErrors({});
            return true;
        } catch (err: any) {
            if (err instanceof z.ZodError) {
                const errors: Record<string, string> = {};
                (err as any).errors.forEach((e: any) => {
                    if (e.path[0]) errors[e.path[0] as string] = e.message;
                });
                setFieldErrors(errors);
            }
            return false;
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validate all data even if on specific tab
        if (!validateForm(profileSchema, formData)) {
            // Check where the error is and switch tab
            // Note: We can't easily access the errors from validateForm because it updates state.
            // But we can re-run check or check fieldErrors in setTimeout? 
            // Better: re-run parse here to determine tab.
            try {
                profileSchema.parse(formData);
            } catch (err: any) {
                if (err instanceof z.ZodError) {
                    const firstErrorPath = err.errors[0]?.path[0] as string;
                    if (['name', 'email', 'mobile', 'role'].includes(firstErrorPath)) {
                        setActiveTab('basic');
                    } else {
                        setActiveTab('professional');
                    }
                }
            }
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        if (onUpdateProfile) {
            const result = await onUpdateProfile(formData);
            if (result.success) {
                setSuccessMessage('Profile updated successfully!');
            } else {
                setError(result.error || 'Failed to update profile.');
            }
        }
        setIsLoading(false);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = passwordSchema.safeParse(password);
        if (!result.success) {
            setFieldErrors({ password: (result.error as z.ZodError).errors[0].message });
            return;
        }
        if (password !== confirmPassword) {
            setFieldErrors({ confirmPassword: 'Passwords do not match' });
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        const apiResult = await onChangePassword(password);
        if (apiResult.success) {
            setSuccessMessage('Password updated successfully!');
            setPassword('');
            setConfirmPassword('');
        } else {
            setError(apiResult.error || 'Failed to update password.');
        }
        setIsLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
                maxWidth: '700px', width: '95%',
                background: 'var(--bg-surface, #ffffff)',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                padding: '2.5rem',
                maxHeight: '90vh', overflowY: 'auto',
                position: 'relative',
                border: 'none',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '1.5rem', right: '1.5rem',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--text-secondary)'
                    }}
                    aria-label="Close"
                >
                    <XIcon style={{ width: 24, height: 24 }} />
                </button>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>My Profile</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your account details and security.</p>
                </div>

                <div className="profile-modal-tabs" style={{
                    display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)',
                    marginBottom: '2rem'
                }}>
                    <button
                        className={activeTab === 'basic' ? 'active' : ''}
                        onClick={() => handleTabClick('basic')}
                        style={{
                            background: 'none', border: 'none',
                            borderBottom: activeTab === 'basic' ? '2px solid var(--primary-color)' : '2px solid transparent',
                            padding: '0.75rem 0', fontWeight: '600',
                            color: activeTab === 'basic' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        Basic Info
                    </button>
                    <button
                        className={activeTab === 'professional' ? 'active' : ''}
                        onClick={() => handleTabClick('professional')}
                        style={{
                            background: 'none', border: 'none',
                            borderBottom: activeTab === 'professional' ? '2px solid var(--primary-color)' : '2px solid transparent',
                            padding: '0.75rem 0', fontWeight: '600',
                            color: activeTab === 'professional' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        Professional Info
                    </button>
                    <button
                        className={activeTab === 'password' ? 'active' : ''}
                        onClick={() => handleTabClick('password')}
                        style={{
                            background: 'none', border: 'none',
                            borderBottom: activeTab === 'password' ? '2px solid var(--primary-color)' : '2px solid transparent',
                            padding: '0.75rem 0', fontWeight: '600',
                            color: activeTab === 'password' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        Password
                    </button>
                </div>

                <div className="modal-body" style={{ padding: 0, flex: 1 }}>
                    {(error || successMessage) && (
                        <div style={{
                            marginBottom: '1.5rem', padding: '1rem 1.25rem',
                            borderRadius: '8px',
                            background: error ? '#fef2f2' : '#f0fdf4',
                            color: error ? '#ef4444' : '#16a34a',
                            border: `1px solid ${error ? '#fecaca' : '#bbf7d0'}`,
                            display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500'
                        }}>
                            {successMessage && <span>✓</span>}
                            {error && <span>⚠</span>}
                            {error || successMessage}
                        </div>
                    )}

                    {/* BASIC INFO TAB */}
                    {activeTab === 'basic' && (
                        <form id="profile-form" onSubmit={handleProfileUpdate}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={fieldErrors.name ? 'input-error' : ''}
                                        style={{
                                            width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                                            border: fieldErrors.name ? '1px solid #ef4444' : '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)'
                                        }}
                                    />
                                    {fieldErrors.name && <span className="error-text" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{fieldErrors.name}</span>}
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Role</label>
                                    <input
                                        type="text"
                                        value={formData.role}
                                        disabled
                                        style={{
                                            width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                                            border: '1px solid transparent', background: 'var(--bg-secondary)',
                                            color: 'var(--text-disabled)', cursor: 'not-allowed', opacity: 0.7
                                        }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        style={{
                                            width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                                            border: '1px solid transparent', background: 'var(--bg-secondary)',
                                            color: 'var(--text-disabled)', cursor: 'not-allowed', opacity: 0.7
                                        }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={formData.mobile}
                                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                        className={fieldErrors.mobile ? 'input-error' : ''}
                                        style={{
                                            width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                                            border: fieldErrors.mobile ? '1px solid #ef4444' : '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)'
                                        }}
                                    />
                                    {fieldErrors.mobile && <span className="error-text" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{fieldErrors.mobile}</span>}
                                </div>
                            </div>
                        </form>
                    )}

                    {/* PROFESSIONAL INFO TAB */}
                    {activeTab === 'professional' && (
                        <form id="profile-form" onSubmit={handleProfileUpdate}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>City</label>
                                    <input
                                        type="text"
                                        value={formData.city || ''}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        style={{
                                            width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                                            border: '1px solid var(--border-color)', background: 'var(--bg-secondary)'
                                        }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>State</label>
                                    <input
                                        type="text"
                                        value={formData.state || ''}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        style={{
                                            width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                                            border: '1px solid var(--border-color)', background: 'var(--bg-secondary)'
                                        }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>LinkedIn URL</label>
                                    <input
                                        type="url"
                                        value={formData.linkedin_url || ''}
                                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                                        placeholder="https://linkedin.com/in/username"
                                        style={{
                                            width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                                            border: '1px solid var(--border-color)', background: 'var(--bg-secondary)'
                                        }}
                                    />
                                </div>
                                {/* Empty cell or spacer */}
                                <div></div>

                                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Bio</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        rows={3}
                                        style={{
                                            width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                                            border: fieldErrors.bio ? '1px solid #ef4444' : '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)', resize: 'vertical'
                                        }}
                                    />
                                    {fieldErrors.bio && <span className="error-text" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{fieldErrors.bio}</span>}
                                </div>
                            </div>
                        </form>
                    )}

                    {/* PASSWORD TAB */}
                    {activeTab === 'password' && (
                        <form id="password-form" onSubmit={handlePasswordSubmit}>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>New Password</label>
                                <input
                                    type="password"
                                    id="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                                        border: fieldErrors.password ? '1px solid #ef4444' : '1px solid var(--border-color)',
                                        background: 'var(--bg-secondary)'
                                    }}
                                />
                                {fieldErrors.password && <span className="error-text" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{fieldErrors.password}</span>}
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Confirm New Password</label>
                                <input
                                    type="password"
                                    id="confirm-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                                        border: fieldErrors.confirmPassword ? '1px solid #ef4444' : '1px solid var(--border-color)',
                                        background: 'var(--bg-secondary)'
                                    }}
                                />
                                {fieldErrors.confirmPassword && <span className="error-text" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{fieldErrors.confirmPassword}</span>}
                            </div>
                        </form>
                    )}
                </div>

                <div className="modal-footer" style={{
                    marginTop: '2.5rem', paddingTop: '1.5rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'flex-end', gap: '1rem'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                            background: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--text-primary)'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form={activeTab === 'password' ? 'password-form' : 'profile-form'}
                        className="btn btn-primary"
                        disabled={isLoading}
                        style={{
                            padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)', fontWeight: '600'
                        }}
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
