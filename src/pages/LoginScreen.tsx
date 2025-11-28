import React, { useState } from 'react';
import { YaalOfficeLogo } from '../components/Icons';

export default function LoginScreen({ onLogin, onSignup }) {
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [mobile, setMobile] = useState('');
    const [role, setRole] = useState('Candidate');
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setAuthError('');
        setSuccessMessage('');
        const trimmedEmail = email.trim();

        if (isSigningUp) {
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
                // After successful signup, switch to the login view and show a success message.
                setIsSigningUp(false);
                setSuccessMessage('Sign up successful! Please check your email for a confirmation link before logging in.');
                // Clear form fields for a clean login experience
                setFullName('');
                setEmail('');
                setPassword('');
                setMobile('');
            } else if (result) {
                setAuthError(result.error);
            }
        } else {
            const result = await onLogin({ email: trimmedEmail, password });
            if (result && !result.success) {
                setAuthError(result.error);
            }
        }
        setIsLoading(false);
    };

    const handleToggleForm = (e) => {
        e.preventDefault();
        setIsSigningUp(!isSigningUp);
        setAuthError('');
        setSuccessMessage('');
    };

    return (
        <div className="login-container" style={{
            background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
            position: 'fixed', /* Use fixed to cover everything */
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
            zIndex: 1000 /* Ensure it's on top */
        }}>
            {/* Ambient Background Effects */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '-10%',
                width: '50%',
                height: '50%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                filter: 'blur(60px)',
                borderRadius: '50%'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                right: '-10%',
                width: '50%',
                height: '50%',
                background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
                filter: 'blur(60px)',
                borderRadius: '50%'
            }} />

            <div className="login-box glass-panel" style={{
                maxWidth: '380px',
                width: '90%',
                padding: '2.5rem',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(20px)',
                backgroundColor: 'rgba(30, 41, 59, 0.7)'
            }}>
                <div className="login-header" style={{ marginBottom: '2rem' }}>
                    <div className="login-logo-container" style={{
                        marginBottom: '1.5rem',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            display: 'flex'
                        }}>
                            <YaalOfficeLogo style={{ width: '40px', height: '40px' }} />
                        </div>
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        color: '#fff',
                        marginBottom: '0.5rem'
                    }}>
                        {isSigningUp ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                        {isSigningUp ? 'Join Yāl Office today.' : 'Sign in to continue to Yāl Office.'}
                    </p>
                </div>
                <form onSubmit={handleSubmit}>
                    {successMessage && <div className="success-message" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}>{successMessage}</div>}
                    {authError && <div className="login-error" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>{authError}</div>}

                    {isSigningUp && (
                        <div className="form-group">
                            <label htmlFor="full-name" style={{ color: '#e2e8f0' }}>Full Name</label>
                            <input
                                id="full-name"
                                name="name"
                                autoComplete="name"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g., Alex Bennett"
                                required
                                style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="email" style={{ color: '#e2e8f0' }}>Email address</label>
                        <input
                            id="email"
                            name="email"
                            autoComplete="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password" style={{ color: '#e2e8f0' }}>Password</label>
                        <input
                            id="password"
                            name="password"
                            autoComplete={isSigningUp ? "new-password" : "current-password"}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                        />
                    </div>
                    {isSigningUp && (
                        <>
                            <div className="form-group">
                                <label htmlFor="mobile-number" style={{ color: '#e2e8f0' }}>Mobile Number</label>
                                <input
                                    id="mobile-number"
                                    name="mobile"
                                    autoComplete="tel"
                                    type="tel"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    placeholder="e.g., (555) 123-4567"
                                    required
                                    style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="role-select" style={{ color: '#e2e8f0' }}>Sign up as:</label>
                                <select
                                    id="role-select"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    required
                                    style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
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

                    <button type="submit" className="btn btn-primary btn-full" disabled={isLoading} style={{ marginTop: '1rem', padding: '0.85rem' }}>
                        {isLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                    </button>
                </form>
                <div className="login-footer" style={{ marginTop: '2rem' }}>
                    <p style={{ color: '#94a3b8' }}>
                        {isSigningUp ? 'Already have an account?' : "Don't have an account?"}
                        <a href="#" onClick={handleToggleForm} style={{ color: '#818cf8', marginLeft: '0.5rem' }}>
                            {isSigningUp ? 'Log In' : 'Sign Up'}
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}