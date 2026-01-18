import React, { useState } from 'react';
import { YaalOfficeLogo } from '../components/Icons';

export default function LoginScreen({ onLogin, onSignup, onForgotPassword, onVerifyOtp }) {
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [mobile, setMobile] = useState('');
    const [role, setRole] = useState('Candidate');
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [rememberMe, setRememberMe] = useState(false);

    // Clear fields on mount to prevent browser autofill from populating the state, or load saved email
    React.useEffect(() => {
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        } else {
            setEmail('');
        }
        setPassword('');
    }, []);

    const [otp, setOtp] = useState('');
    const [showOtpVerify, setShowOtpVerify] = useState(false);

    const handleBackToLogin = (e) => {
        if (e) e.preventDefault();
        setIsResettingPassword(false);
        setIsSigningUp(false);
        setShowOtpVerify(false);
        setOtp('');
        setAuthError('');
        setSuccessMessage('');
    };

    const handleToggleForm = (e) => {
        e.preventDefault();
        setIsSigningUp(!isSigningUp);
        setIsResettingPassword(false);
        setShowOtpVerify(false);
        setOtp('');
        setAuthError('');
        setSuccessMessage('');
    };

    const handleForgotPasswordClick = (e) => {
        e.preventDefault();
        setIsResettingPassword(true);
        setIsSigningUp(false);
        setShowOtpVerify(false);
        setAuthError('');
        setSuccessMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (showOtpVerify) {
            // In verification link flow, the button acts as "Back to Sign In"
            handleBackToLogin(e);
            return;
        }

        setIsLoading(true);
        setAuthError('');
        setSuccessMessage('');
        const trimmedEmail = email.trim();

        if (isResettingPassword) {
            if (!trimmedEmail) {
                setAuthError('Please enter your email address.');
                setIsLoading(false);
                return;
            }
            const result = await onForgotPassword(trimmedEmail);
            if (result && result.success) {
                setSuccessMessage('Password reset link has been sent to your email.');
            } else {
                setAuthError(result?.error || 'Failed to send reset link.');
            }
        } else if (isSigningUp) {
            // Explicit validation to ensure all fields are filled for signup.
            if (!fullName.trim() || !trimmedEmail || !password || !role || !mobile.trim()) {
                setAuthError('All fields are required. Please complete the form to sign up.');
                setIsLoading(false);
                return;
            }
            if (password.length < 6) {
                setAuthError('Password must be at least 6 characters long.');
                setIsLoading(false);
                return;
            }
            const result = await onSignup({ email: trimmedEmail, password, fullName: fullName.trim(), role, mobileNumber: mobile.trim() });

            if (result && result.success) {
                if (result.autoLogin) {
                    // Already logged in (e.g. Email Confirm disabled in backend)
                    return;
                }
                // Need verification
                setIsSigningUp(false);
                setShowOtpVerify(true);
                // Success message is handled by render below
            } else if (result) {
                setAuthError(result.error);
            }
        } else {
            // LOGIN
            if (rememberMe) {
                localStorage.setItem('savedEmail', trimmedEmail);
            } else {
                localStorage.removeItem('savedEmail');
            }

            const result = await onLogin({ email: trimmedEmail, password });
            if (result && !result.success) {
                setAuthError(result.error);
            }
        }
        setIsLoading(false);
    };

    return (
        <div className="login-container" style={{
            background: '#ffffff',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
        }}>
            <div className="login-box" style={{
                maxWidth: '420px',
                width: '90%',
                padding: '3rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
            }}>
                <div className="login-header" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <div className="login-logo-container" style={{
                        marginBottom: '1.5rem',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <YaalOfficeLogo style={{ width: '120px', height: '120px' }} />
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        color: '#0f172a',
                        marginBottom: '0.75rem',
                        letterSpacing: '-0.025em'
                    }}>
                        {isResettingPassword ? 'Reset Password' : (isSigningUp ? 'Create Account' : 'Welcome to AI Recruitment Yal Hire')}
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                        {isResettingPassword
                            ? 'Enter your email to receive a password reset link.'
                            : (isSigningUp ? 'Please complete the form to create your account.' : 'Please login to access the dashboard.')}
                    </p>
                </div>
                <form onSubmit={handleSubmit}>
                    {successMessage && (
                        <div className="success-message" style={{
                            background: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            marginBottom: '1.5rem',
                            fontSize: '0.9rem'
                        }}>
                            {successMessage}
                        </div>
                    )}
                    {authError && (
                        <div className="login-error" style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            marginBottom: '1.5rem',
                            fontSize: '0.9rem'
                        }}>
                            {authError}
                        </div>
                    )}

                    {isSigningUp && !isResettingPassword && (
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label htmlFor="full-name" style={{ display: 'block', color: '#334155', fontWeight: '500', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Full Name</label>
                            <input
                                id="full-name"
                                name="name"
                                autoComplete="name"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. Adam Luis"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>
                    )}

                    {!isResettingPassword && (
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label htmlFor="email" style={{ display: 'block', color: '#334155', fontWeight: '500', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{isSigningUp ? 'Email Address' : 'Username'}</label>
                            <input
                                id="email"
                                name="email"
                                autoComplete="off"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={isSigningUp ? "you@example.com" : "e.g. adam.luis@yaloffice.com"}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>
                    )}

                    {showOtpVerify && (
                        <div className="form-group" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                            <div style={{
                                background: '#f0f9ff',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                border: '1px solid #bae6fd'
                            }}>
                                <svg style={{ width: '48px', height: '48px', color: '#0284c7', marginBottom: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <h3 style={{ color: '#0c4a6e', fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Check your email</h3>
                                <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                                    We've sent a verification link to <strong>{email}</strong>
                                </p>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '1rem' }}>
                                    Click the link in the email to activate your account and sign in.
                                </p>
                            </div>
                        </div>
                    )}

                    {!isResettingPassword && !showOtpVerify && (
                        <>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label htmlFor="password" style={{ display: 'block', color: '#334155', fontWeight: '500', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    autoComplete="new-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={isSigningUp ? "Create a password" : "Enter Password"}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        color: '#0f172a',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            {!isSigningUp && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#64748b' }}>
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            style={{ marginRight: '0.5rem', accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                                        />
                                        Remember Me
                                    </label>
                                    <a href="#" onClick={handleForgotPasswordClick} style={{ color: 'var(--primary-color)', fontSize: '0.9rem', fontWeight: '500', textDecoration: 'none' }}>Forgot Password?</a>
                                </div>
                            )}
                        </>
                    )}

                    {isSigningUp && !isResettingPassword && !showOtpVerify && (
                        <>
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label htmlFor="mobile-number" style={{ display: 'block', color: '#334155', fontWeight: '500', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Mobile Number</label>
                                <input
                                    id="mobile-number"
                                    name="mobile"
                                    autoComplete="tel"
                                    type="tel"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    placeholder="e.g., (555) 123-4567"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        color: '#0f172a',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label htmlFor="role-select" style={{ display: 'block', color: '#334155', fontWeight: '500', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Sign up as:</label>
                                <select
                                    id="role-select"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        color: '#0f172a',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                >
                                    <option value="Admin">Admin</option>
                                    <option value="Candidate">Candidate</option>
                                    <option value="Employer">Employer</option>
                                    <option value="Agent">Agent</option>
                                    <option value="Recruiter">Recruiter</option>
                                </select>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            marginTop: '0.5rem',
                            padding: '0.85rem',
                            backgroundColor: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            boxShadow: '0 4px 6px -1px var(--primary-glow)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(110%)'}
                        onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                    >
                        {isLoading ? 'Processing...' : (
                            showOtpVerify ? 'Back to Sign In' :
                                isResettingPassword ? 'Send Reset Link' :
                                    (isSigningUp ? 'Sign Up' : 'Sign In')
                        )}
                    </button>
                </form>
                <div className="login-footer" style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        {isResettingPassword ? (
                            <a href="#" onClick={handleBackToLogin} style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}>Back to Sign In</a>
                        ) : (
                            <>
                                {isSigningUp ? 'Already have an account?' : "Don't have an account?"}
                                <a href="#" onClick={handleToggleForm} style={{ color: 'var(--primary-color)', fontWeight: '600', marginLeft: '0.5rem', textDecoration: 'none' }}>
                                    {isSigningUp ? 'Sign In' : 'Sign Up'}
                                </a>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}