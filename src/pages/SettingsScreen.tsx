
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const SettingsScreen = ({ currentUser }) => {
    const isAdmin = currentUser?.role === 'Admin';
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('general');

    const fetchConfig = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const { data, error } = await api.get('/admin/config');
            if (error) {
                console.error("Fetch config error:", error);
                setMessage('Failed to load configurations.');
            } else {
                setConfigs(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, [currentUser]);

    const handleSave = async (key: string, value: string) => {
        setMessage('');
        const { error } = await api.post('/admin/config', { key, value });
        if (error) {
            setMessage(`Error saving ${key}: ${error.message || error}`);
        } else {
            setMessage(`Saved ${key} successfully.`);
            fetchConfig(); // Refresh
        }
    };

    const groupedConfigs = configs.reduce((acc, config) => {
        const group = config.group || 'General';
        if (!acc[group]) acc[group] = [];
        acc[group].push(config);
        return acc;
    }, {} as Record<string, any[]>);

    if (!isAdmin) {
        return (
            <div style={{ padding: '2rem', paddingTop: '2.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--slate-800)', letterSpacing: '-0.03em' }}>User Settings</h1>
                <p>Profile settings and preferences would go here.</p>
                {/* Standard user settings placeholder */}
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', paddingTop: '2.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--slate-800)', letterSpacing: '-0.03em' }}>System Configuration</h1>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>Manage environment variables and API keys.</p>

            {message && (
                <div style={{
                    padding: '1rem', marginBottom: '1rem', borderRadius: '8px',
                    background: message.includes('Error') || message.includes('Failed') ? '#fee2e2' : '#dcfce7',
                    color: message.includes('Error') || message.includes('Failed') ? '#b91c1c' : '#15803d'
                }}>
                    {message}
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                {Object.keys(groupedConfigs).map(group => (
                    <button
                        key={group}
                        onClick={() => setActiveTab(group)}
                        style={{
                            padding: '0.5rem 1rem',
                            border: 'none',
                            background: activeTab === group ? '#e0f2fe' : 'transparent',
                            color: activeTab === group ? '#0284c7' : '#64748b',
                            borderRadius: '20px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        {group}
                    </button>
                ))}
            </div>

            {loading ? <p>Loading...</p> : (
                <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
                    {groupedConfigs[activeTab]?.map((config) => (
                        <ConfigItem key={config.key} config={config} onSave={handleSave} />
                    ))}
                    {(!groupedConfigs[activeTab] || groupedConfigs[activeTab].length === 0) && (
                        <p>No configurations in this group.</p>
                    )}
                </div>
            )}

            <div style={{ marginTop: '3rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                <p><strong>Note:</strong> Sensitive values are masked. Updating a value will overwrite the existing one immediately. Backend services may auto-refresh, or require a restart.</p>
            </div>
        </div>
    );
};

const ConfigItem = ({ config, onSave }) => {
    const [value, setValue] = useState(config.value || '');
    const [isDirty, setIsDirty] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    const handleChange = (e) => {
        setValue(e.target.value);
        setIsDirty(true);
    };

    const handleSaveClick = async () => {
        await onSave(config.key, value);
        setIsDirty(false);
    };

    return (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontWeight: '600', color: '#334155' }}>{config.key}</label>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Last updated: {new Date(config.updated_at).toLocaleDateString()}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>{config.description}</p>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <input
                        type={config.is_secret && !showSecret ? "password" : "text"}
                        value={value}
                        onChange={handleChange}
                        className="config-input"
                        placeholder="Not set"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem'
                        }}
                    />
                    {config.is_secret && (
                        <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                opacity: 0.5
                            }}
                        >
                            {showSecret ? '👁️' : '🔒'}
                        </button>
                    )}
                </div>
                <button
                    onClick={handleSaveClick}
                    disabled={!isDirty}
                    style={{
                        background: isDirty ? '#0f172a' : '#e2e8f0',
                        color: isDirty ? 'white' : '#94a3b8',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0 1.5rem',
                        fontWeight: '600',
                        cursor: isDirty ? 'pointer' : 'default',
                        transition: 'all 0.2s'
                    }}
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default SettingsScreen;