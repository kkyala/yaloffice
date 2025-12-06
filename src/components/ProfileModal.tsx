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
    bio: z.string().max(200, "Bio must be less than 200 characters").optional(),
});

type ProfileModalProps = {
    user: any;
    onClose: () => void;
    onChangePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
    onUpdateProfile?: (data: any) => Promise<{ success: boolean; error?: string }>;
    initialTab?: string;
};

export default function ProfileModal({ user, onClose, onChangePassword, onUpdateProfile, initialTab = 'profile' }: ProfileModalProps) {
    const resolveTab = (tab: string) => (tab === 'profile' || tab === 'password' ? tab : 'profile');
    const [activeTab, setActiveTab] = useState(resolveTab(initialTab));

    // Form States
    const [formData, setFormData] = useState({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        role: user.role || '',
        bio: user.bio || '',
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
        if (!validateForm(profileSchema, formData)) return;

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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <h2>My Profile</h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close profile modal"><XIcon /></button>
                </div>

                <div className="profile-modal-tabs">
                    <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => handleTabClick('profile')}>Profile Details</button>
                    <button className={activeTab === 'password' ? 'active' : ''} onClick={() => handleTabClick('password')}>Password</button>
                </div>

                <div className="modal-body">
                    {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
                    {successMessage && <div className="success-message" style={{ marginBottom: '1rem' }}>{successMessage}</div>}

                    {activeTab === 'profile' && (
                        <form id="profile-form" onSubmit={handleProfileUpdate}>
                            <div className="form-grid-2-col">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={fieldErrors.name ? 'input-error' : ''}
                                    />
                                    {fieldErrors.name && <span className="error-text">{fieldErrors.name}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        style={{ backgroundColor: 'var(--light-bg)', cursor: 'not-allowed' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mobile</label>
                                    <input
                                        type="tel"
                                        value={formData.mobile}
                                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                        className={fieldErrors.mobile ? 'input-error' : ''}
                                    />
                                    {fieldErrors.mobile && <span className="error-text">{fieldErrors.mobile}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Role</label>
                                    <input
                                        type="text"
                                        value={formData.role}
                                        disabled
                                        style={{ backgroundColor: 'var(--light-bg)', cursor: 'not-allowed' }}
                                    />
                                </div>
                                <div className="form-group grid-col-span-2">
                                    <label>Bio</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        rows={3}
                                        className={fieldErrors.bio ? 'input-error' : ''}
                                    />
                                    {fieldErrors.bio && <span className="error-text">{fieldErrors.bio}</span>}
                                </div>
                            </div>
                        </form>
                    )}

                    {activeTab === 'password' && (
                        <form id="password-form" onSubmit={handlePasswordSubmit}>
                            <div className="form-group">
                                <label htmlFor="new-password">New Password</label>
                                <input
                                    type="password"
                                    id="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={fieldErrors.password ? 'input-error' : ''}
                                />
                                {fieldErrors.password && <span className="error-text">{fieldErrors.password}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirm-password">Confirm New Password</label>
                                <input
                                    type="password"
                                    id="confirm-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={fieldErrors.confirmPassword ? 'input-error' : ''}
                                />
                                {fieldErrors.confirmPassword && <span className="error-text">{fieldErrors.confirmPassword}</span>}
                            </div>
                        </form>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        type="submit"
                        form={activeTab === 'profile' ? 'profile-form' : 'password-form'}
                        className="btn btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
