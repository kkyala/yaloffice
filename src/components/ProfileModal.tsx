
import React, { useState, useEffect } from 'react';
import { XIcon } from './Icons';

type ProfileModalProps = {
    user: any;
    onClose: () => void;
    onChangeUsername: (newName: string) => Promise<{ success: boolean; error?: string }>;
    onChangePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
    initialTab?: string;
};

export default function ProfileModal({ user, onClose, onChangeUsername, onChangePassword, initialTab = 'username' }: ProfileModalProps) {
    // Map 'profile' generic action to 'username' tab as default for now, or extend later
    const resolveTab = (tab: string) => (tab === 'profile' ? 'username' : tab);
    const [activeTab, setActiveTab] = useState(resolveTab(initialTab));
    
    // State for forms
    const [newName, setNewName] = useState(user.name || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // UI feedback state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // FIX: Add an effect to sync the internal state with the user prop.
    // This prevents stale data if the username is updated while the modal is open.
    useEffect(() => {
        setNewName(user.name || '');
    }, [user]);

    // Reset tab if initialTab prop changes while open
    useEffect(() => {
        setActiveTab(resolveTab(initialTab));
    }, [initialTab]);

    const handleUsernameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim() === user.name) {
            setError('New username is the same as the current one.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        const result = await onChangeUsername(newName.trim());
        if (result.success) {
            setSuccessMessage('Username updated successfully!');
        } else {
            setError(result.error || 'Failed to update username.');
        }
        setIsLoading(false);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        const result = await onChangePassword(newPassword);
        if (result.success) {
            setSuccessMessage('Password updated successfully!');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setError(result.error || 'Failed to update password.');
        }
        setIsLoading(false);
    };
    
    const handleTabClick = (tab: string) => {
        setActiveTab(tab);
        setError('');
        setSuccessMessage('');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>My Profile</h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close profile modal"><XIcon /></button>
                </div>
                
                <div className="profile-modal-tabs">
                    <button className={activeTab === 'username' ? 'active' : ''} onClick={() => handleTabClick('username')}>Change Username</button>
                    <button className={activeTab === 'password' ? 'active' : ''} onClick={() => handleTabClick('password')}>Change Password</button>
                </div>

                <div className="modal-body">
                    {error && <div className="login-error">{error}</div>}
                    {successMessage && <div className="success-message">{successMessage}</div>}

                    {activeTab === 'username' && (
                        <form id="username-form" onSubmit={handleUsernameSubmit}>
                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <input type="text" id="username" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                            </div>
                        </form>
                    )}

                    {activeTab === 'password' && (
                         <form id="password-form" onSubmit={handlePasswordSubmit}>
                            <div className="form-group">
                                <label htmlFor="new-password">New Password</label>
                                <input type="password" id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                            </div>
                             <div className="form-group">
                                <label htmlFor="confirm-password">Confirm New Password</label>
                                <input type="password" id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                        </form>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    {activeTab === 'username' && (
                        <button type="submit" form="username-form" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
                    {activeTab === 'password' && (
                        <button type="submit" form="password-form" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Update Password'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
