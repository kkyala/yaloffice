import React, { useState } from 'react';
import AddUserScreen from './AddUserScreen';

export default function UserManagementScreen({ usersData, onSaveUser }) {
    const [view, setView] = useState('list'); // 'list', 'edit'
    const [currentUser, setCurrentUser] = useState(null);

    const handleEditClick = (user) => {
        setCurrentUser(user);
        setView('edit');
    };

    const handleCancel = () => {
        setCurrentUser(null);
        setView('list');
    };

    const handleSaveAndExit = (userData) => {
        onSaveUser(userData);
        setView('list');
    };

    if (view === 'edit') {
        return <AddUserScreen onSave={handleSaveAndExit} onCancel={handleCancel} userToEdit={currentUser} />;
    }

    return (
        <>
             <header className="page-header">
                <h1>User Management</h1>
                 <div className="header-actions">
                    {/* Add User button removed to enforce user creation via signup flow */}
                 </div>
             </header>
             <p style={{marginBottom: '1.5rem', color: 'var(--text-secondary)'}}>
                New users must be created through the public "Sign Up" page. You can edit existing user roles and information here.
             </p>
             <div className="table-container">
                <table className="jobs-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>{usersData.map((user) => (
                        <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td><span className={`status-badge status-${user.status.toLowerCase()}`}>{user.status}</span></td>
                            <td><a href="#" className="action-link" onClick={(e) => { e.preventDefault(); handleEditClick(user); }}>Edit</a></td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </>
    );
}