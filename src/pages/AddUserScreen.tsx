import React, { useState } from 'react';

export default function AddUserScreen({ onSave, onCancel, userToEdit }) {
    const isEditing = !!userToEdit;
    
    const [name, setName] = useState(isEditing ? userToEdit.name : '');
    const [email, setEmail] = useState(isEditing ? userToEdit.email : '');
    const [role, setRole] = useState(isEditing ? userToEdit.role : 'Agent');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !email) {
            alert('Please fill out all fields.');
            return;
        }
        const userData = {
            ...(isEditing ? userToEdit : {}), // Persist id and other properties
            name,
            email,
            role,
        };
        onSave(userData);
    };

    return (
        <>
            <header className="page-header">
                <h1>{isEditing ? 'Edit User' : 'Add New User'}</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>
                        {isEditing ? 'Update User' : 'Save User'}
                    </button>
                </div>
            </header>
            <div className="settings-container">
                <div className="settings-section">
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="full-name">Full Name</label>
                                <input 
                                    type="text" 
                                    id="full-name" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input 
                                    type="email" 
                                    id="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter email address"
                                    required
                                />
                            </div>
                            <div className="form-group full-width">
                                <label htmlFor="role">Role</label>
                                <select 
                                    id="role" 
                                    value={role} 
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="Admin">Admin</option>
                                    <option value="Employer">Employer</option>
                                    <option value="Agent">Agent</option>
                                    <option value="Recruiter">Recruiter</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}