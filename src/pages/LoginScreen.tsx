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
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <div className="login-logo-container">
                        <YaalOfficeLogo />
                    </div>
                    <h1>{isSigningUp ? 'Create an Account' : 'Sign In to Yāl Office'}</h1>
                    <p>{isSigningUp ? 'Get started with Yāl Office AI.' : 'Enter your credentials to access your account.'}</p>
                </div>
                <form onSubmit={handleSubmit}>
                    {successMessage && <div className="success-message">{successMessage}</div>}
                    {authError && <div className="login-error">{authError}</div>}
                    
                    {isSigningUp && (
                         <div className="form-group">
                            <label htmlFor="full-name">Full Name</label>
                            <input 
                                id="full-name" 
                                name="name"
                                autoComplete="name"
                                type="text" 
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g., Alex Bennett"
                                required 
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input 
                            id="email"
                            name="email"
                            autoComplete="email"
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input 
                            id="password" 
                            name="password"
                            autoComplete={isSigningUp ? "new-password" : "current-password"}
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required 
                        />
                    </div>
                    {isSigningUp && (
                        <>
                            <div className="form-group">
                                <label htmlFor="mobile-number">Mobile Number</label>
                                <input 
                                    id="mobile-number" 
                                    name="mobile"
                                    autoComplete="tel"
                                    type="tel" 
                                    value={mobile} 
                                    onChange={(e) => setMobile(e.target.value)}
                                    placeholder="e.g., (555) 123-4567"
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="role-select">Sign up as:</label>
                                <select 
                                    id="role-select" 
                                    value={role} 
                                    onChange={(e) => setRole(e.target.value)}
                                    required
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

                    <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
                        {isLoading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
                    </button>
                </form>
                <div className="login-footer">
                    <p>
                        {isSigningUp ? 'Already have an account?' : "Don't have an account?"}
                        <a href="#" onClick={handleToggleForm}>
                            {isSigningUp ? ' Log In' : ' Sign Up'}
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}