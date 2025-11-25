import React, { useState, useRef, useEffect } from 'react';
import { UploadCloudIcon, CheckCircleIcon, FileTextIcon } from '../components/Icons';
import { aiService } from '../services/aiService';

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

export default function MyResumeScreen({ currentUser, onSaveResume, resumeList = [] }) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<any>(null);
    const [editMode, setEditMode] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        personalInfo: { name: '', email: '', phone: '', linkedin: '', city: '', state: '' },
        summary: '',
        experience: [],
        education: [],
        skills: []
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
                skills: parsedData.skills || []
            });
        } else {
            setFormData({
                personalInfo: { name: '', email: '', phone: '', linkedin: '', city: '', state: '' },
                summary: '',
                experience: [],
                education: [],
                skills: []
            });
        }
    }, [parsedData]);

    const handleVersionSelect = (resume: any) => {
        setSelectedVersionId(resume.id);
        setParsedData(resume.parsed_data);
        setEditMode(false);
        setError('');
        setSuccessMessage('');
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
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];

        const isImage = selectedFile.type.startsWith("image/");
        const isAllowed = allowedTypes.includes(selectedFile.type) || isImage;

        if (!isAllowed) {
            setError("Please upload a valid PDF, Word document, or image file.");
            return;
        }

        setFile(selectedFile);
        setError("");
        analyzeResume(selectedFile);
    };

    const analyzeResume = async (resumeFile: File) => {
        setIsAnalyzing(true);
        setError('');
        setSelectedVersionId(null);

        try {
            const base64 = await fileToBase64(resumeFile);
            const result = await aiService.parseResumeDocument(base64, resumeFile.type);
            setParsedData(result);
            setEditMode(true);
            setSuccessMessage('Resume analyzed successfully! Please review and save to create a new version.');
        } catch (err) {
            console.error("Analysis failed:", err);
            setError('Failed to analyze resume. Please try again or fill in the details manually.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSuccessMessage('');
        setError('');
        const result = await onSaveResume(formData);

        if (result.success) {
            setSuccessMessage('Resume saved successfully! A new version has been created.');
            setEditMode(false);
        } else {
            setError(result.error || 'Failed to save details.');
        }
        setIsSaving(false);
    };

    const renderExperience = () => (
        formData.experience.map((exp, index) => (
            <div key={index} className="resume-item">
                <div className="form-grid-2-col">
                    <div className="form-group"><label>Company</label><input type="text" value={exp.company} onChange={(e) => { const list = [...formData.experience]; list[index].company = e.target.value; setFormData({...formData, experience: list}); }} /></div>
                    <div className="form-group"><label>Role</label><input type="text" value={exp.role} onChange={(e) => { const list = [...formData.experience]; list[index].role = e.target.value; setFormData({...formData, experience: list}); }} /></div>
                    <div className="form-group"><label>Start Date</label><input type="text" value={exp.startDate} onChange={(e) => { const list = [...formData.experience]; list[index].startDate = e.target.value; setFormData({...formData, experience: list}); }} /></div>
                    <div className="form-group"><label>End Date</label><input type="text" value={exp.endDate} onChange={(e) => { const list = [...formData.experience]; list[index].endDate = e.target.value; setFormData({...formData, experience: list}); }} /></div>
                    <div className="form-group grid-col-span-2"><label>Description</label><textarea rows={3} value={exp.description} onChange={(e) => { const list = [...formData.experience]; list[index].description = e.target.value; setFormData({...formData, experience: list}); }} /></div>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={() => { const list = [...formData.experience]; list.splice(index, 1); setFormData({...formData, experience: list}); }}>Remove</button>
            </div>
        ))
    );

    return (
        <>
            <header className="page-header">
                <h1>My Resume</h1>
                <div className="header-actions">
                    {editMode ? (
                        <>
                            <button className="btn btn-secondary" onClick={() => { 
                                setEditMode(false); 
                                if(resumeList.length > 0) {
                                    const current = resumeList.find(r => r.id === selectedVersionId) || resumeList[0];
                                    setParsedData(current.parsed_data);
                                }
                            }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save as New Version'}</button>
                        </>
                    ) : (
                        <button className="btn btn-secondary" onClick={() => {
                            setEditMode(true);
                            setSuccessMessage('');
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
                            Drag & drop or click to upload<br/>
                            (PDF, DOC, DOCX, JPG, PNG)
                        </p>

                        {/** ⭐ UPDATED ACCEPT TYPES */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} 
                            accept=".pdf,.doc,.docx,image/*"
                            style={{ display: 'none' }} 
                        />
                    </div>
                    
                    {isAnalyzing && (
                        <div className="analysis-status" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                            <p>AI is analyzing your document...</p>
                        </div>
                    )}
                    
                    {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
                    {successMessage && <div className="success-message" style={{ marginBottom: '1rem' }}>{successMessage}</div>}

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
                                    <div className="form-group"><label>Full Name</label><input type="text" value={formData.personalInfo.name} onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, name: e.target.value}})} /></div>
                                    <div className="form-group"><label>Email</label><input type="email" value={formData.personalInfo.email} onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, email: e.target.value}})} /></div>
                                    <div className="form-group"><label>Phone</label><input type="tel" value={formData.personalInfo.phone} onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, phone: e.target.value}})} /></div>
                                    <div className="form-group"><label>LinkedIn</label><input type="url" value={formData.personalInfo.linkedin} onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, linkedin: e.target.value}})} /></div>
                                    <div className="form-group"><label>City</label><input type="text" value={formData.personalInfo.city} onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, city: e.target.value}})} /></div>
                                    <div className="form-group"><label>State</label><input type="text" value={formData.personalInfo.state} onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, state: e.target.value}})} /></div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="form-section-header">Professional Summary</h3>
                                <div className="form-group"><textarea rows={4} value={formData.summary} onChange={(e) => setFormData({...formData, summary: e.target.value})} /></div>
                            </div>

                            <div className="form-section">
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                    <h3 className="form-section-header" style={{marginBottom: 0}}>Work Experience</h3>
                                    <button className="btn btn-sm btn-secondary" onClick={() => setFormData({...formData, experience: [...formData.experience, {company: '', role: '', startDate: '', endDate: '', description: ''}]})}>Add</button>
                                </div>
                                {renderExperience()}
                            </div>

                            <div className="form-section">
                                <h3 className="form-section-header">Skills</h3>
                                <div className="form-group"><textarea rows={3} value={formData.skills.join(', ')} onChange={(e) => setFormData({...formData, skills: e.target.value.split(',').map(s => s.trim())})} placeholder="Comma separated skills" /></div>
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
                                            {formData.experience.map((exp, i) => (
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

                                    {formData.education.length > 0 && (
                                        <div className="preview-section" style={{ marginBottom: '2rem' }}>
                                            <h4>Education</h4>
                                            {formData.education.map((edu, i) => (
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
                                                {formData.skills.map((skill, i) => (
                                                    <span key={i} className="tag">{skill}</span>
                                                ))}
                                            </div>
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