import React, { useState, useRef, useEffect } from 'react';
import { UploadCloudIcon, CheckCircleIcon, FileTextIcon } from '../components/Icons';
import { aiService } from '../services/aiService';
import ResumeScreeningChatScreen from './ResumeScreeningChatScreen';

// Generic Base64 converter (works for PDF, DOCX, DOC, Images)
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            } else {
                reject(new Error('Failed to convert file to base64'));
            }
        };
        reader.onerror = error => reject(error);
    });
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Define validation schema for resume data
import { z } from 'zod';

const resumeSchema = z.object({
    personalInfo: z.object({
        name: z.string().min(1, "Full Name is required"),
        email: z.string().email("Invalid email address"),
        phone: z.string().min(10, "Phone number must be at least 10 digits"),
        linkedin: z.string().url("Invalid LinkedIn URL").optional().or(z.literal('')),
        city: z.string().min(1, "City is required"),
        state: z.string().min(1, "State is required"),
    }),
    summary: z.string().optional(),
    experience: z.array(z.object({
        company: z.string().min(1, "Company name is required"),
        role: z.string().min(1, "Role is required"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string().optional(),
    })).optional(),
    education: z.array(z.object({
        institution: z.string().min(1, "Institution is required"),
        degree: z.string().optional(),
        year: z.string().optional(),
    })).optional(),
    projects: z.array(z.object({
        name: z.string().min(1, "Project name is required"),
        description: z.string().optional(),
        technologies: z.union([z.string(), z.array(z.string())]).optional(),
    })).optional(),
    skills: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
});

export default function MyResumeScreen({ currentUser, onSaveResume, resumeList = [], onNavigate }) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showScreeningChat, setShowScreeningChat] = useState(false);

    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<any>(null);
    const [parsingStatus, setParsingStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'partial_success' | 'error'>('idle');
    const [editMode, setEditMode] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        personalInfo: { name: '', email: '', phone: '', linkedin: '', city: '', state: '' },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: []
    });

    useEffect(() => {
        if (resumeList.length > 0 && !selectedVersionId && !isAnalyzing) {
            const latest = resumeList[0];
            setSelectedVersionId(latest.id);
            setParsedData(latest.parsed_data);
            setEditMode(false);
        } else if (resumeList.length === 0 && !isAnalyzing) {
            setParsedData(null);
            setEditMode(true);
        }
    }, [resumeList, selectedVersionId, isAnalyzing]);

    useEffect(() => {
        if (parsedData) {
            setFormData({
                personalInfo: {
                    name: parsedData.personalInfo?.name || '',
                    email: parsedData.personalInfo?.email || '',
                    phone: parsedData.personalInfo?.phone || '',
                    linkedin: parsedData.personalInfo?.linkedin || '',
                    city: parsedData.personalInfo?.city || '',
                    state: parsedData.personalInfo?.state || '',
                },
                summary: parsedData.summary || '',
                experience: parsedData.experience || [],
                education: parsedData.education || [],
                skills: parsedData.skills || [],
                projects: parsedData.projects || [],
                certifications: parsedData.certifications || []
            });
        } else {
            setFormData({
                personalInfo: { name: '', email: '', phone: '', linkedin: '', city: '', state: '' },
                summary: '',
                experience: [],
                education: [],
                skills: [],
                projects: [],
                certifications: []
            });
        }
    }, [parsedData]);

    const handleVersionSelect = (resume: any) => {
        setSelectedVersionId(resume.id);
        setParsedData(resume.parsed_data);
        setEditMode(false);
        setError('');
        setSuccessMessage('');
        setParsingStatus('idle');
    };

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    // ⭐ FIX: Now supports PDF + DOC + DOCX + IMAGES
    const handleFileSelect = (selectedFile: File) => {
        if (!selectedFile) return;

        const allowedTypes = [
            "application/pdf"
        ];

        const isAllowed = allowedTypes.includes(selectedFile.type);

        if (!isAllowed) {
            setError("Please upload a valid PDF file.");
            return;
        }

        setFile(selectedFile);
        setError("");
        setSuccessMessage("");
        setParsingStatus('idle');
        analyzeResume(selectedFile);
    };

    const analyzeResume = async (resumeFile: File) => {
        setParsingStatus('uploading');
        setIsAnalyzing(true);
        setError('');
        setSelectedVersionId(null);

        try {
            // Simulate upload phase
            await new Promise(resolve => setTimeout(resolve, 800));
            setParsingStatus('analyzing');

            const base64 = await fileToBase64(resumeFile);
            const result = await aiService.parseResumeDocument(base64, resumeFile.type);

            // Ensure personalInfo object exists
            if (!result.personalInfo) result.personalInfo = {};

            // Prioritize Parsed Data, Fallback to User Profile
            // This ensures the resume's content populates the form, but missing fields get filled from profile
            if (!result.personalInfo.name && currentUser?.name) result.personalInfo.name = currentUser.name;
            if (!result.personalInfo.email && currentUser?.email) result.personalInfo.email = currentUser.email;
            if (!result.personalInfo.phone && currentUser?.phone) result.personalInfo.phone = currentUser.phone;
            if (!result.personalInfo.city && currentUser?.city) result.personalInfo.city = currentUser.city;
            if (!result.personalInfo.state && currentUser?.state) result.personalInfo.state = currentUser.state;

            setParsedData(result);
            setEditMode(true);
            setParsingStatus('success');
            setSuccessMessage('Resume analyzed successfully! Please review and save.');
        } catch (err) {
            // ... (error handling remains same)
            console.error("Analysis failed:", err);
            setParsingStatus('partial_success'); // Treat as partial success (manual entry required)

            // Graceful Fallback: Populate with basic user details
            if (currentUser) {
                const fallbackData = {
                    personalInfo: {
                        name: currentUser.name || '',
                        email: currentUser.email || '',
                        phone: currentUser.phone || '',
                        location: currentUser.location || '',
                        linkedin: '',
                        portfolio: ''
                    },
                    summary: '',
                    experience: [],
                    education: [],
                    skills: [],
                    projects: [],
                    certifications: []
                };
                setParsedData(fallbackData);
                setEditMode(true);
                setSuccessMessage('AI Parsing low confidence. Please manually fill in the details below to proceed.');
            } else {
                setParsingStatus('error');
                setError('Failed to analyze resume. Please try again or fill in the details manually.');
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const validateForm = () => {
        try {
            resumeSchema.parse(formData);
            setFieldErrors({});
            return true;
        } catch (err: any) {
            if (err instanceof z.ZodError) {
                const errors: Record<string, string> = {};
                (err as z.ZodError).errors.forEach((e) => {
                    // Flatten nested paths for easier access
                    const path = e.path.join('.');
                    errors[path] = e.message;
                });
                setFieldErrors(errors);
                // Also set a general error message
                setError('Please fix the validation errors before saving.');
            }
            return false;
        }
    };

    const handleSave = async (): Promise<boolean> => {
        if (!validateForm()) return false;

        setIsSaving(true);
        setSuccessMessage('');
        setError('');
        const result = await onSaveResume(formData, file);

        if (result.success) {
            setSuccessMessage('Resume saved successfully! A new version has been created.');
            setEditMode(false);
            setParsingStatus('idle'); // Reset status after saving
            setIsSaving(false);
            return true;
        } else {
            setError(result.error || 'Failed to save details.');
            setIsSaving(false);
            return false;
        }
    };

    const renderExperience = () => (
        formData.experience.map((exp: any, index: number) => (
            <div key={index} className="resume-item">
                <div className="form-grid-2-col">
                    <div className="form-group"><label>Company</label><input type="text" value={exp.company} onChange={(e) => { const list = [...formData.experience]; list[index].company = e.target.value; setFormData({ ...formData, experience: list }); }} /></div>
                    <div className="form-group"><label>Role</label><input type="text" value={exp.role} onChange={(e) => { const list = [...formData.experience]; list[index].role = e.target.value; setFormData({ ...formData, experience: list }); }} /></div>
                    <div className="form-group"><label>Start Date</label><input type="text" value={exp.startDate} onChange={(e) => { const list = [...formData.experience]; list[index].startDate = e.target.value; setFormData({ ...formData, experience: list }); }} /></div>
                    <div className="form-group"><label>End Date</label><input type="text" value={exp.endDate} onChange={(e) => { const list = [...formData.experience]; list[index].endDate = e.target.value; setFormData({ ...formData, experience: list }); }} /></div>
                    <div className="form-group grid-col-span-2"><label>Description</label><textarea rows={3} value={exp.description} onChange={(e) => { const list = [...formData.experience]; list[index].description = e.target.value; setFormData({ ...formData, experience: list }); }} /></div>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={() => { const list = [...formData.experience]; list.splice(index, 1); setFormData({ ...formData, experience: list }); }}>Remove</button>
            </div>
        ))
    );

    const renderProjects = () => (
        formData.projects.map((proj: any, index: number) => (
            <div key={index} className="resume-item">
                <div className="form-grid-2-col">
                    <div className="form-group"><label>Project Name</label><input type="text" value={proj.name} onChange={(e) => { const list = [...formData.projects]; list[index].name = e.target.value; setFormData({ ...formData, projects: list }); }} /></div>
                    <div className="form-group"><label>Technologies</label><input type="text" value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies} onChange={(e) => { const list = [...formData.projects]; list[index].technologies = e.target.value.split(',').map((t: string) => t.trim()); setFormData({ ...formData, projects: list }); }} placeholder="React, Node.js, etc." /></div>
                    <div className="form-group grid-col-span-2"><label>Description</label><textarea rows={2} value={proj.description} onChange={(e) => { const list = [...formData.projects]; list[index].description = e.target.value; setFormData({ ...formData, projects: list }); }} /></div>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={() => { const list = [...formData.projects]; list.splice(index, 1); setFormData({ ...formData, projects: list }); }}>Remove</button>
            </div>
        ))
    );

    const renderEducation = () => (
        formData.education.map((edu: any, index: number) => (
            <div key={index} className="resume-item">
                <div className="form-grid-2-col">
                    <div className="form-group"><label>Institution</label><input type="text" value={edu.institution} onChange={(e) => { const list = [...formData.education]; list[index].institution = e.target.value; setFormData({ ...formData, education: list }); }} /></div>
                    <div className="form-group"><label>Degree</label><input type="text" value={edu.degree} onChange={(e) => { const list = [...formData.education]; list[index].degree = e.target.value; setFormData({ ...formData, education: list }); }} /></div>
                    <div className="form-group"><label>Year</label><input type="text" value={edu.year} onChange={(e) => { const list = [...formData.education]; list[index].year = e.target.value; setFormData({ ...formData, education: list }); }} /></div>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={() => { const list = [...formData.education]; list.splice(index, 1); setFormData({ ...formData, education: list }); }}>Remove</button>
            </div>
        ))
    );

    const formatResumeAsText = (data: any) => {
        let text = '';
        if (data.personalInfo) text += `Name: ${data.personalInfo.name}\n`;
        if (data.summary) text += `Summary: ${data.summary}\n`;
        if (data.experience) {
            text += 'Experience:\n';
            data.experience.forEach((exp: any) => text += `${exp.role} at ${exp.company}\n`);
        }
        if (data.skills) text += `Skills: ${data.skills.join(', ')}\n`;
        return text;
    };

    if (showScreeningChat && parsedData) {
        return (
            <ResumeScreeningChatScreen
                currentUser={currentUser}
                resumeText={formatResumeAsText(parsedData)}
                onComplete={() => {
                    setShowScreeningChat(false);
                    onNavigate('dashboard', 'dashboard');
                }}
            />
        );
    }

    return (
        <>
            <header className="page-header">
                <h1>My Resume</h1>
                <div className="header-actions">
                    {editMode ? (
                        <>
                            <button className="btn btn-secondary" onClick={() => {
                                setEditMode(false);
                                if (resumeList.length > 0) {
                                    const current = resumeList.find(r => r.id === selectedVersionId) || resumeList[0];
                                    setParsedData(current.parsed_data);
                                }
                                setParsingStatus('idle'); // Reset status on cancel
                                setError('');
                                setSuccessMessage('');
                            }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save as New Version'}</button>
                        </>
                    ) : (
                        <button className="btn btn-secondary" onClick={() => {
                            setEditMode(true);
                            setSuccessMessage('');
                            setParsingStatus('idle'); // Reset status on edit
                        }}>Edit Details</button>
                    )}
                </div>
            </header>

            <div className="resume-screen-container" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>

                <div className="resume-sidebar">
                    <div
                        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: '8px',
                            padding: '2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: isDragging ? 'var(--primary-light-color)' : 'var(--light-bg)',
                            marginBottom: '2rem'
                        }}
                    >
                        <UploadCloudIcon style={{ width: '48px', height: '48px', color: 'var(--primary-color)', marginBottom: '1rem' }} />
                        <h3>Upload Resume</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Drag & drop or click to upload<br />
                            (PDF Only)
                        </p>

                        {/** ⭐ UPDATED ACCEPT TYPES */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                            accept=".pdf"
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Parsing Status Indicator */}
                    {(parsingStatus === 'uploading' || parsingStatus === 'analyzing') && (
                        <div className="analysis-status" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <div className="progress-bar-container" style={{ width: '100%', height: '6px', backgroundColor: '#eee', borderRadius: '3px', marginBottom: '0.5rem', overflow: 'hidden' }}>
                                <div
                                    className="progress-bar-fill"
                                    style={{
                                        width: parsingStatus === 'uploading' ? '40%' : '80%',
                                        height: '100%',
                                        backgroundColor: 'var(--primary-color)',
                                        transition: 'width 0.5s ease'
                                    }}
                                />
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {parsingStatus === 'uploading' ? 'Uploading document...' : 'AI is analyzing content...'}
                            </p>
                        </div>
                    )}

                    {parsingStatus === 'partial_success' && (
                        <div className="status-badge status-warning" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '6px' }}>
                            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                            <div style={{ textAlign: 'left' }}>
                                <strong>AI Parsing Low Confidence</strong>
                                <div style={{ fontSize: '0.8rem' }}>Please verify details manually.</div>
                            </div>
                        </div>
                    )}

                    {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

                    {successMessage && parsingStatus !== 'partial_success' && (
                        <div className="success-message" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircleIcon style={{ width: '24px', height: '24px' }} />
                                <span>{successMessage}</span>
                            </div>
                        </div>
                    )}

                    {(parsedData || resumeList.length > 0) && (
                        <button
                            className="btn btn-primary"
                            onClick={async () => {
                                if (file) {
                                    const success = await handleSave();
                                    if (success) {
                                        setShowScreeningChat(true);
                                    }
                                } else {
                                    setShowScreeningChat(true);
                                }
                            }}
                            style={{ width: '100%', marginBottom: '1rem' }}
                        >
                            {successMessage ? 'Proceed to AI Screening Chat' : 'Save & Start AI Screening Chat'}
                        </button>
                    )}

                    <div className="resume-history">
                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Version History</h3>
                        {resumeList.length > 0 ? (
                            <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {resumeList.map(resume => (
                                    <div
                                        key={resume.id}
                                        className={`history-item ${selectedVersionId === resume.id ? 'active' : ''}`}
                                        onClick={() => handleVersionSelect(resume)}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--border-radius)',
                                            border: selectedVersionId === resume.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                                            backgroundColor: selectedVersionId === resume.id ? 'var(--primary-light-color)' : 'var(--surface-color)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                            <strong style={{ fontSize: '0.9rem' }}>Version {resume.version}</strong>
                                            {resume.is_current && <span className="status-badge status-active" style={{ fontSize: '0.7rem' }}>Current</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {formatDate(resume.created_at)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No resume versions yet.</p>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="resume-content">
                    {editMode ? (
                        <div className="form-panel">

                            <div className="form-section">
                                <h3 className="form-section-header">Personal Information</h3>
                                <div className="form-grid-2-col">
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            value={formData.personalInfo.name}
                                            onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, name: e.target.value } })}
                                            className={fieldErrors['personalInfo.name'] ? 'input-error' : ''}
                                        />
                                        {fieldErrors['personalInfo.name'] && <span className="error-text">{fieldErrors['personalInfo.name']}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={formData.personalInfo.email}
                                            onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, email: e.target.value } })}
                                            className={fieldErrors['personalInfo.email'] ? 'input-error' : ''}
                                        />
                                        {fieldErrors['personalInfo.email'] && <span className="error-text">{fieldErrors['personalInfo.email']}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.personalInfo.phone}
                                            onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, phone: e.target.value } })}
                                            className={fieldErrors['personalInfo.phone'] ? 'input-error' : ''}
                                        />
                                        {fieldErrors['personalInfo.phone'] && <span className="error-text">{fieldErrors['personalInfo.phone']}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>LinkedIn</label>
                                        <input
                                            type="url"
                                            value={formData.personalInfo.linkedin}
                                            onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, linkedin: e.target.value } })}
                                            className={fieldErrors['personalInfo.linkedin'] ? 'input-error' : ''}
                                        />
                                        {fieldErrors['personalInfo.linkedin'] && <span className="error-text">{fieldErrors['personalInfo.linkedin']}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>City</label>
                                        <input
                                            type="text"
                                            value={formData.personalInfo.city}
                                            onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, city: e.target.value } })}
                                            className={fieldErrors['personalInfo.city'] ? 'input-error' : ''}
                                        />
                                        {fieldErrors['personalInfo.city'] && <span className="error-text">{fieldErrors['personalInfo.city']}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>State</label>
                                        <input
                                            type="text"
                                            value={formData.personalInfo.state}
                                            onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, state: e.target.value } })}
                                            className={fieldErrors['personalInfo.state'] ? 'input-error' : ''}
                                        />
                                        {fieldErrors['personalInfo.state'] && <span className="error-text">{fieldErrors['personalInfo.state']}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="form-section-header">Professional Summary</h3>
                                <div className="form-group"><textarea rows={4} value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} /></div>
                            </div>

                            <div className="form-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className="form-section-header" style={{ marginBottom: 0 }}>Work Experience</h3>
                                    <button className="btn btn-sm btn-secondary" onClick={() => setFormData({ ...formData, experience: [...formData.experience, { company: '', role: '', startDate: '', endDate: '', description: '' }] })}>Add</button>
                                </div>
                                {renderExperience()}
                            </div>

                            <div className="form-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className="form-section-header" style={{ marginBottom: 0 }}>Projects</h3>
                                    <button className="btn btn-sm btn-secondary" onClick={() => setFormData({ ...formData, projects: [...formData.projects, { name: '', description: '', technologies: [] }] })}>Add</button>
                                </div>
                                {renderProjects()}
                            </div>

                            <div className="form-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className="form-section-header" style={{ marginBottom: 0 }}>Education</h3>
                                    <button className="btn btn-sm btn-secondary" onClick={() => setFormData({ ...formData, education: [...formData.education, { institution: '', degree: '', year: '' }] })}>Add</button>
                                </div>
                                {renderEducation()}
                            </div>

                            <div className="form-section">
                                <h3 className="form-section-header">Skills</h3>
                                <div className="form-group"><textarea rows={3} value={formData.skills.join(', ')} onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })} placeholder="Comma separated skills" /></div>
                            </div>

                            <div className="form-section">
                                <h3 className="form-section-header">Certifications</h3>
                                <div className="form-group"><textarea rows={3} value={formData.certifications.join(', ')} onChange={(e) => setFormData({ ...formData, certifications: e.target.value.split(',').map(s => s.trim()) })} placeholder="Comma separated certifications" /></div>
                            </div>
                        </div>
                    ) : (
                        <div className="resume-preview form-panel">
                            {parsedData ? (
                                <>
                                    <div className="preview-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                        <h2>{formData.personalInfo.name || 'Candidate Name'}</h2>
                                        <p style={{ color: 'var(--text-secondary)' }}>
                                            {formData.personalInfo.email} • {formData.personalInfo.phone} • {formData.personalInfo.city}, {formData.personalInfo.state}
                                        </p>
                                        {formData.personalInfo.linkedin && <a href={formData.personalInfo.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>LinkedIn Profile</a>}
                                    </div>

                                    {formData.summary && (
                                        <div className="preview-section" style={{ marginBottom: '2rem' }}>
                                            <h4>Summary</h4>
                                            <p>{formData.summary}</p>
                                        </div>
                                    )}

                                    {formData.experience.length > 0 && (
                                        <div className="preview-section" style={{ marginBottom: '2rem' }}>
                                            <h4>Experience</h4>
                                            {formData.experience.map((exp: any, i: number) => (
                                                <div key={i} style={{ marginBottom: '1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <strong>{exp.role}</strong>
                                                        <span>{exp.startDate} - {exp.endDate}</span>
                                                    </div>
                                                    <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{exp.company}</div>
                                                    <p style={{ marginTop: '0.5rem' }}>{exp.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {formData.projects.length > 0 && (
                                        <div className="preview-section" style={{ marginBottom: '2rem' }}>
                                            <h4>Projects</h4>
                                            {formData.projects.map((proj: any, i: number) => (
                                                <div key={i} style={{ marginBottom: '1rem' }}>
                                                    <strong>{proj.name}</strong>
                                                    <p style={{ marginTop: '0.5rem' }}>{proj.description}</p>
                                                    {proj.technologies && proj.technologies.length > 0 && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                            Tech: {Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {formData.education.length > 0 && (
                                        <div className="preview-section" style={{ marginBottom: '2rem' }}>
                                            <h4>Education</h4>
                                            {formData.education.map((edu: any, i: number) => (
                                                <div key={i} style={{ marginBottom: '0.5rem' }}>
                                                    <strong>{edu.institution}</strong> - {edu.degree} <span>({edu.year})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {formData.skills.length > 0 && (
                                        <div className="preview-section">
                                            <h4>Skills</h4>
                                            <div className="skills-tags">
                                                {formData.skills.map((skill: any, i: number) => (
                                                    <span key={i} className="tag">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {formData.certifications.length > 0 && (
                                        <div className="preview-section" style={{ marginTop: '2rem' }}>
                                            <h4>Certifications</h4>
                                            <ul style={{ paddingLeft: '1.2rem' }}>
                                                {formData.certifications.map((cert: any, i: number) => (
                                                    <li key={i}>{cert}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    <FileTextIcon style={{ width: '48px', height: '48px', marginBottom: '1rem', opacity: 0.5 }} />
                                    <h3>No Resume Data</h3>
                                    <p>Upload your resume to auto-fill your profile and increase your chances of getting hired.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}