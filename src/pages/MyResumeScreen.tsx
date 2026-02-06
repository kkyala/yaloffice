import React, { useState, useRef, useEffect } from 'react';
import { UploadCloudIcon, CheckCircleIcon, FileTextIcon, UserIcon, BriefcaseIcon, GraduationCapIcon, CodeIcon, AwardIcon } from '../components/Icons';
import { aiService } from '../services/aiService';
import ResumeScreeningPhoneScreen from './ResumeScreeningPhoneScreen';
import { z } from 'zod';

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

type TabType = 'profile' | 'experience' | 'projects' | 'education' | 'skills';

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
    const [activeTab, setActiveTab] = useState<TabType>('profile');

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
        // Only auto-select if we don't have data loaded (e.g. from a fresh upload)
        if (resumeList.length > 0 && !selectedVersionId && !isAnalyzing && !parsedData) {
            const latest = resumeList[0];
            setSelectedVersionId(latest.id);
            setParsedData(latest.parsed_data);
            setEditMode(false);
        } else if (resumeList.length === 0 && !isAnalyzing && !parsedData) {
            setParsedData(null);
            setEditMode(true);
        }
    }, [resumeList, selectedVersionId, isAnalyzing, parsedData]);

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
                experience: (parsedData.experience || []).map((e: any) => ({
                    company: e.company || '',
                    role: e.role || '',
                    startDate: e.startDate || '',
                    endDate: e.endDate || '',
                    description: e.description || ''
                })),
                education: (parsedData.education || []).map((e: any) => ({
                    institution: e.institution || '',
                    degree: e.degree || '',
                    year: e.year || ''
                })),
                skills: parsedData.skills || [],
                projects: (parsedData.projects || []).map((p: any) => ({
                    name: p.name || '',
                    description: p.description || '',
                    technologies: p.technologies || []
                })),
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

    const getInputStyle = (errorKey: string) => ({
        borderColor: fieldErrors[errorKey] ? '#ef4444' : '', // Explicit red
        borderWidth: fieldErrors[errorKey] ? '2px' : '1px',
        backgroundColor: fieldErrors[errorKey] ? '#fef2f2' : 'var(--bg-field, #f8fafc)' // Light red background for visibility
    });

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
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
            console.error("Validation Error:", err);
            // Check if it's a ZodError (it has an 'errors' array)
            if (err && Array.isArray(err.errors)) {
                const errors: Record<string, string> = {};
                let firstErrorPath = '';

                err.errors.forEach((e: any) => {
                    // Flatten nested paths for easier access
                    const path = e.path.join('.');
                    errors[path] = e.message;
                    if (!firstErrorPath) firstErrorPath = path;
                });

                setFieldErrors(errors);

                // Determine which tab has the first error and switch to it
                if (firstErrorPath) {
                    if (firstErrorPath.startsWith('personalInfo') || firstErrorPath.startsWith('summary')) {
                        setActiveTab('profile');
                    } else if (firstErrorPath.startsWith('experience')) {
                        setActiveTab('experience');
                    } else if (firstErrorPath.startsWith('projects')) {
                        setActiveTab('projects');
                    } else if (firstErrorPath.startsWith('education')) {
                        setActiveTab('education');
                    } else if (firstErrorPath.startsWith('skills') || firstErrorPath.startsWith('certifications')) {
                        setActiveTab('skills');
                    }
                }

                // Also set a general error message
                setError('Please fix the validation errors highlighted in the ' + activeTab + ' tab.');

                // Scroll to top to ensure error is seen
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return false;
        }
    };

    const handleSave = async (): Promise<boolean> => {
        console.log("Attempting to save resume...", formData);

        if (!validateForm()) {
            console.warn("Form validation failed");
            return false;
        }

        setIsSaving(true);
        setSuccessMessage('');
        setError('');

        try {
            const result = await onSaveResume(formData, file);
            console.log("Save result:", result);

            if (result.success) {
                setSuccessMessage('Resume saved successfully! A new version has been created.');
                // Update preview with saved data
                setParsedData(formData);
                setEditMode(false);
                setParsingStatus('idle'); // Reset status after saving
                setIsSaving(false);
                return true;
            } else {
                setError(result.error || 'Failed to save details.');
                setIsSaving(false);
                return false;
            }
        } catch (e) {
            console.error("Unexpected error during save:", e);
            setError('An unexpected error occurred while saving.');
            setIsSaving(false);
            return false;
        }
    };

    const renderExperience = () => (
        <div className="tab-pane fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="section-title">Work Experience</h3>
                <button className="btn btn-outline-primary btn-sm" onClick={() => setFormData({ ...formData, experience: [...formData.experience, { company: '', role: '', startDate: '', endDate: '', description: '' }] })}>
                    + Add Experience
                </button>
            </div>

            <div className="experience-list">
                {formData.experience.length === 0 && (
                    <div className="empty-state">
                        <p>No work experience added yet.</p>
                    </div>
                )}
                {formData.experience.map((exp: any, index: number) => (
                    <div key={index} className="card p-4 mb-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div className="d-flex justify-content-between mb-3">
                            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)' }}>Position {index + 1}</h4>
                            <button className="btn-icon" onClick={() => { const list = [...formData.experience]; list.splice(index, 1); setFormData({ ...formData, experience: list }); }}>
                                <span style={{ color: 'var(--error-color)' }}>Trash</span>
                            </button>
                        </div>
                        <div className="form-grid-2-col">
                            <div className="form-group">
                                <label>Company <span style={{ color: 'var(--error-color)' }}>*</span></label>
                                <input
                                    className={`form-control ${fieldErrors[`experience.${index}.company`] ? 'is-invalid' : ''}`}
                                    type="text"
                                    value={exp.company || ''}
                                    onChange={(e) => { const list = [...formData.experience]; list[index].company = e.target.value; setFormData({ ...formData, experience: list }); }}
                                    placeholder="e.g. Google"
                                    style={getInputStyle(`experience.${index}.company`)}
                                />
                                {fieldErrors[`experience.${index}.company`] && <span className="error-text" style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{fieldErrors[`experience.${index}.company`]}</span>}
                            </div>
                            <div className="form-group">
                                <label>Role <span style={{ color: 'var(--error-color)' }}>*</span></label>
                                <input
                                    className={`form-control ${fieldErrors[`experience.${index}.role`] ? 'is-invalid' : ''}`}
                                    type="text"
                                    value={exp.role || ''}
                                    onChange={(e) => { const list = [...formData.experience]; list[index].role = e.target.value; setFormData({ ...formData, experience: list }); }}
                                    placeholder="e.g. Senior Engineer"
                                    style={getInputStyle(`experience.${index}.role`)}
                                />
                                {fieldErrors[`experience.${index}.role`] && <span className="error-text" style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{fieldErrors[`experience.${index}.role`]}</span>}
                            </div>
                            <div className="form-group"><label>Start Date</label><input className="form-control" type="text" value={exp.startDate || ''} onChange={(e) => { const list = [...formData.experience]; list[index].startDate = e.target.value; setFormData({ ...formData, experience: list }); }} placeholder="MMM YYYY" /></div>
                            <div className="form-group"><label>End Date</label><input className="form-control" type="text" value={exp.endDate || ''} onChange={(e) => { const list = [...formData.experience]; list[index].endDate = e.target.value; setFormData({ ...formData, experience: list }); }} placeholder="MMM YYYY or Present" /></div>
                            <div className="form-group grid-col-span-2"><label>Description</label><textarea className="form-control" rows={3} value={exp.description || ''} onChange={(e) => { const list = [...formData.experience]; list[index].description = e.target.value; setFormData({ ...formData, experience: list }); }} placeholder="Describe your responsibilities and achievements..." /></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderProjects = () => (
        <div className="tab-pane fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="section-title">Projects</h3>
                <button className="btn btn-outline-primary btn-sm" onClick={() => setFormData({ ...formData, projects: [...formData.projects, { name: '', description: '', technologies: [] }] })}>
                    + Add Project
                </button>
            </div>

            <div className="projects-list">
                {formData.projects.length === 0 && (
                    <div className="empty-state">
                        <p>No projects added yet.</p>
                    </div>
                )}
                {formData.projects.map((proj: any, index: number) => (
                    <div key={index} className="card p-4 mb-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div className="d-flex justify-content-between mb-3">
                            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)' }}>Project {index + 1}</h4>
                            <button className="btn-icon" onClick={() => { const list = [...formData.projects]; list.splice(index, 1); setFormData({ ...formData, projects: list }); }}>
                                <span style={{ color: 'var(--error-color)' }}>Remove</span>
                            </button>
                        </div>
                        <div className="form-grid-2-col">
                            <div className="form-group">
                                <label>Project Name <span style={{ color: 'var(--error-color)' }}>*</span></label>
                                <input
                                    className={`form-control ${fieldErrors[`projects.${index}.name`] ? 'is-invalid' : ''}`}
                                    type="text"
                                    value={proj.name || ''}
                                    onChange={(e) => { const list = [...formData.projects]; list[index].name = e.target.value; setFormData({ ...formData, projects: list }); }}
                                    placeholder="e.g. E-commerce Platform"
                                    style={getInputStyle(`projects.${index}.name`)}
                                />
                                {fieldErrors[`projects.${index}.name`] && <span className="error-text" style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{fieldErrors[`projects.${index}.name`]}</span>}
                            </div>
                            <div className="form-group"><label>Technologies</label><input className="form-control" type="text" value={(Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies) || ''} onChange={(e) => { const list = [...formData.projects]; list[index].technologies = e.target.value.split(',').map((t: string) => t.trim()); setFormData({ ...formData, projects: list }); }} placeholder="React, Node.js, etc." /></div>
                            <div className="form-group grid-col-span-2"><label>Description</label><textarea className="form-control" rows={2} value={proj.description || ''} onChange={(e) => { const list = [...formData.projects]; list[index].description = e.target.value; setFormData({ ...formData, projects: list }); }} placeholder="Briefly describe the project..." /></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderEducation = () => (
        <div className="tab-pane fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="section-title">Education</h3>
                <button className="btn btn-outline-primary btn-sm" onClick={() => setFormData({ ...formData, education: [...formData.education, { institution: '', degree: '', year: '' }] })}>
                    + Add Education
                </button>
            </div>

            <div className="education-list">
                {formData.education.length === 0 && (
                    <div className="empty-state">
                        <p>No education added yet.</p>
                    </div>
                )}
                {formData.education.map((edu: any, index: number) => (
                    <div key={index} className="card p-4 mb-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div className="d-flex justify-content-between mb-3">
                            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)' }}>Education {index + 1}</h4>
                            <button className="btn-icon" onClick={() => { const list = [...formData.education]; list.splice(index, 1); setFormData({ ...formData, education: list }); }}>
                                <span style={{ color: 'var(--error-color)' }}>Remove</span>
                            </button>
                        </div>
                        <div className="form-grid-2-col">
                            <div className="form-group">
                                <label>Institution <span style={{ color: 'var(--error-color)' }}>*</span></label>
                                <input
                                    className={`form-control ${fieldErrors[`education.${index}.institution`] ? 'is-invalid' : ''}`}
                                    type="text"
                                    value={edu.institution || ''}
                                    onChange={(e) => { const list = [...formData.education]; list[index].institution = e.target.value; setFormData({ ...formData, education: list }); }}
                                    placeholder="University Name"
                                    style={getInputStyle(`education.${index}.institution`)}
                                />
                                {fieldErrors[`education.${index}.institution`] && <span className="error-text" style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{fieldErrors[`education.${index}.institution`]}</span>}
                            </div>
                            <div className="form-group"><label>Degree</label><input className="form-control" type="text" value={edu.degree || ''} onChange={(e) => { const list = [...formData.education]; list[index].degree = e.target.value; setFormData({ ...formData, education: list }); }} placeholder="Bachelor's in Computer Science" /></div>
                            <div className="form-group"><label>Year</label><input className="form-control" type="text" value={edu.year || ''} onChange={(e) => { const list = [...formData.education]; list[index].year = e.target.value; setFormData({ ...formData, education: list }); }} placeholder="2020 - 2024" /></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderProfile = () => (
        <div className="tab-pane fade-in">
            <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Basic Profile</h3>

            <div className="form-grid-2-col">
                <div className="form-group">
                    <label>Full Name <span style={{ color: 'var(--error-color)' }}>*</span></label>
                    <input
                        className={`form-control ${fieldErrors['personalInfo.name'] ? 'is-invalid' : ''}`}
                        type="text"
                        value={formData.personalInfo.name}
                        onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, name: e.target.value } })}
                        style={getInputStyle('personalInfo.name')}
                    />
                    {fieldErrors['personalInfo.name'] && <span className="error-text" style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{fieldErrors['personalInfo.name']}</span>}
                </div>
                <div className="form-group">
                    <label>Email <span style={{ color: 'var(--error-color)' }}>*</span></label>
                    <input
                        className={`form-control ${fieldErrors['personalInfo.email'] ? 'is-invalid' : ''}`}
                        type="email"
                        value={formData.personalInfo.email}
                        onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, email: e.target.value } })}
                        style={getInputStyle('personalInfo.email')}
                    />
                    {fieldErrors['personalInfo.email'] && <span className="error-text" style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{fieldErrors['personalInfo.email']}</span>}
                </div>
                <div className="form-group">
                    <label>Phone <span style={{ color: 'var(--error-color)' }}>*</span></label>
                    <input
                        className={`form-control ${fieldErrors['personalInfo.phone'] ? 'is-invalid' : ''}`}
                        type="tel"
                        value={formData.personalInfo.phone}
                        onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, phone: e.target.value } })}
                        style={getInputStyle('personalInfo.phone')}
                    />
                    {fieldErrors['personalInfo.phone'] && <span className="error-text" style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{fieldErrors['personalInfo.phone']}</span>}
                </div>
                <div className="form-group">
                    <label>LinkedIn</label>
                    <input
                        className={`form-control ${fieldErrors['personalInfo.linkedin'] ? 'is-invalid' : ''}`}
                        type="url"
                        value={formData.personalInfo.linkedin}
                        onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, linkedin: e.target.value } })}
                        style={getInputStyle('personalInfo.linkedin')}
                    />
                    {fieldErrors['personalInfo.linkedin'] && <span className="error-text" style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{fieldErrors['personalInfo.linkedin']}</span>}
                </div>
                <div className="form-group">
                    <label>City <span style={{ color: 'var(--error-color)' }}>*</span></label>
                    <input
                        className={`form-control ${fieldErrors['personalInfo.city'] ? 'is-invalid' : ''}`}
                        type="text"
                        value={formData.personalInfo.city}
                        onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, city: e.target.value } })}
                        style={getInputStyle('personalInfo.city')}
                    />
                    {fieldErrors['personalInfo.city'] && <span className="error-text" style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{fieldErrors['personalInfo.city']}</span>}
                </div>
                <div className="form-group">
                    <label>State <span style={{ color: 'var(--error-color)' }}>*</span></label>
                    <input
                        className={`form-control ${fieldErrors['personalInfo.state'] ? 'is-invalid' : ''}`}
                        type="text"
                        value={formData.personalInfo.state}
                        onChange={(e) => setFormData({ ...formData, personalInfo: { ...formData.personalInfo, state: e.target.value } })}
                        style={getInputStyle('personalInfo.state')}
                    />
                    {fieldErrors['personalInfo.state'] && <span className="error-text" style={{ color: 'var(--error-color)', fontSize: '0.85rem' }}>{fieldErrors['personalInfo.state']}</span>}
                </div>
            </div>

            <div className="form-group mt-4">
                <h3 className="section-title" style={{ marginTop: '1rem', fontSize: '1rem' }}>Professional Summary</h3>
                <textarea className="form-control" rows={4} value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Write a brief summary of your professional background..." />
            </div>
        </div>
    );

    const renderSkills = () => (
        <div className="tab-pane fade-in">
            <div className="mb-4">
                <h3 className="section-title" style={{ marginBottom: '1rem' }}>Skills</h3>
                <div className="form-group">
                    <textarea
                        className="form-control"
                        rows={3}
                        value={formData.skills.join(', ')}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })}
                        placeholder="Java, Python, React, Leadership, etc. (Comma separated)"
                    />
                    <small className="text-secondary">Separate skills with commas</small>
                </div>
            </div>

            <div>
                <h3 className="section-title" style={{ marginBottom: '1rem' }}>Certifications</h3>
                <div className="form-group">
                    <textarea
                        className="form-control"
                        rows={3}
                        value={formData.certifications.join(', ')}
                        onChange={(e) => setFormData({ ...formData, certifications: e.target.value.split(',').map(s => s.trim()) })}
                        placeholder="AWS Certified Solutions Architect, PMP, etc. (Comma separated)"
                    />
                    <small className="text-secondary">Separate certifications with commas</small>
                </div>
            </div>
        </div>
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
            <ResumeScreeningPhoneScreen
                currentUser={currentUser}
                resumeText={formatResumeAsText(parsedData)}
                onComplete={() => {
                    setShowScreeningChat(false);
                    onNavigate('find-jobs', 'find-jobs');
                }}
            />
        );
    }

    // Tabs Config
    const tabs = [
        { id: 'profile', label: 'Profile', icon: <UserIcon style={{ width: 18 }} /> },
        { id: 'experience', label: 'Experience', icon: <BriefcaseIcon style={{ width: 18 }} /> },
        { id: 'education', label: 'Education', icon: <GraduationCapIcon style={{ width: 18 }} /> },
        { id: 'projects', label: 'Projects', icon: <CodeIcon style={{ width: 18 }} /> },
        { id: 'skills', label: 'Skills', icon: <AwardIcon style={{ width: 18 }} /> },
    ];

    return (
        <>
            <header className="page-header" style={{ marginBottom: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>My Resume</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage your professional profile</p>
                </div>
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
                                setFieldErrors({}); // Clear validation errors
                            }}>Cancel</button>
                            <button className="btn btn-primary" onClick={async () => {
                                const success = await handleSave();
                                if (!success) {
                                    // Optional: alert user if they missed the red text
                                    // alert("Please fix validation errors.");
                                }
                            }} disabled={isSaving}>
                                {isSaving ? <span className="spin-loader"></span> : null}
                                {isSaving ? 'Saving...' : 'Save & Publish'}
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-primary" onClick={() => {
                            setEditMode(true);
                            setSuccessMessage('');
                            setParsingStatus('idle'); // Reset status on edit
                        }}>Edit Profile</button>
                    )}
                </div>
            </header>

            <div className="resume-screen-container" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>

                {/* LEFT SIDEBAR - Upload & History */}
                <div className="resume-sidebar">
                    <div
                        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: '12px',
                            padding: '2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: isDragging ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-secondary)',
                            transition: 'all 0.3s ease',
                            marginBottom: '2rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--surface-color)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}>
                                <UploadCloudIcon style={{ width: '32px', height: '32px', color: 'var(--primary-color)' }} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Upload Resume</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                Auto-fill your profile<br />
                                <span style={{ opacity: 0.7 }}>(PDF, DOCX)</span>
                            </p>
                        </div>

                        {/* Hidden Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                            accept=".pdf,.doc,.docx"
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Parsing Status Indicator */}
                    {(parsingStatus === 'uploading' || parsingStatus === 'analyzing') && (
                        <div className="analysis-status fade-in" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
                            <div className="progress-bar-container" style={{ width: '100%', height: '6px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '3px', marginBottom: '0.75rem', overflow: 'hidden' }}>
                                <div
                                    className="progress-bar-fill"
                                    style={{
                                        width: parsingStatus === 'uploading' ? '40%' : '80%',
                                        height: '100%',
                                        backgroundColor: 'var(--primary-color)',
                                        borderRadius: '3px',
                                        transition: 'width 0.5s ease'
                                    }}
                                />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                {parsingStatus === 'uploading' ? 'Uploading document...' : 'AI Analysing...'}
                            </p>
                        </div>
                    )}

                    {error && <div className="login-error fade-in" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                    {successMessage && parsingStatus !== 'partial_success' && (
                        <div className="success-message fade-in" style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <CheckCircleIcon style={{ width: '18px', height: '18px' }} />
                                <strong>Parsed Successfully</strong>
                            </div>
                            <span style={{ opacity: 0.9 }}>Review the data on the right tab.</span>
                        </div>
                    )}

                    {(parsedData || resumeList.length > 0) && (
                        <button
                            className="btn btn-primary"
                            onClick={async () => {
                                // If we have a new file or we are in edit mode, we MUST save first
                                if (file || editMode) {
                                    const success = await handleSave();
                                    if (success) {
                                        setShowScreeningChat(true);
                                    } else {
                                        // Validation failed - use safeParse to get issues consistently
                                        const result = resumeSchema.safeParse(formData);
                                        if (!result.success) {
                                            const missing = result.error.issues.map(issue => {
                                                const path = issue.path[issue.path.length - 1];
                                                return typeof path === 'string' ? path.charAt(0).toUpperCase() + path.slice(1) : path;
                                            });
                                            const uniqueMissing = Array.from(new Set(missing)).join(', ');

                                            alert(`Unable to proceed. Please correct the following required fields:\n\n${uniqueMissing}\n\nThese fields have been highlighted in red.`);
                                        }
                                        // If validation passed but save failed, handleSave handles the UI error message.
                                    }
                                } else {
                                    // Just viewing existing data
                                    setShowScreeningChat(true);
                                }
                            }}
                            style={{ width: '100%', marginBottom: '2rem', padding: '0.8rem', borderRadius: '8px', fontWeight: '600' }}
                        >
                            {/* Logic: If just parsed successfully, user wants to start. If editing specific fields, user also wants to start. */}
                            {successMessage && !editMode ? 'Start AI Screening' : (editMode || file ? 'Save & Start AI Screening' : 'Start AI Screening')}
                        </button>
                    )}

                    <div className="resume-history">
                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Version History</h3>
                        {resumeList.length > 0 ? (
                            <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {resumeList.map(resume => (
                                    <div
                                        key={resume.id}
                                        className={`history-item ${selectedVersionId === resume.id ? 'active' : ''}`}
                                        onClick={() => handleVersionSelect(resume)}
                                        style={{
                                            padding: '0.85rem',
                                            borderRadius: '8px',
                                            border: selectedVersionId === resume.id ? '1px solid var(--primary-color)' : '1px solid transparent',
                                            backgroundColor: selectedVersionId === resume.id ? 'var(--primary-light-color)' : 'var(--bg-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.2rem' }}>Version {resume.version}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(resume.created_at)}</div>
                                        </div>
                                        {resume.is_current && <span className="status-badge status-active" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Active</span>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                No history yet
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE - TABS & CONTENT */}
                <div className="resume-content">
                    {editMode ? (
                        <div className="form-panel" style={{ backgroundColor: 'var(--surface-color)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden', padding: 0 }}>

                            {/* Validation Error Summary */}
                            {Object.keys(fieldErrors).length > 0 && (
                                <div className="validation-summary fade-in" style={{
                                    backgroundColor: 'var(--error-bg, #FEF2F2)',
                                    color: 'var(--error-color, #DC2626)',
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid var(--error-border, #FECACA)',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.75rem'
                                }}>
                                    <div style={{ marginTop: '2px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: '600' }}>Please fix the following errors to save:</h4>
                                        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.85rem', lineHeight: '1.5' }}>
                                            {// Show unique error messages
                                                Array.from(new Set(Object.values(fieldErrors))).map((msg, i) => (
                                                    <li key={i}>{msg}</li>
                                                ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Tabs Header */}
                            <div className="tabs-header" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 1rem', overflowX: 'auto', backgroundColor: 'var(--bg-secondary)' }}>
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab.id as TabType)}
                                        style={{
                                            padding: '1.25rem 1.5rem',
                                            border: 'none',
                                            background: 'none',
                                            fontSize: '0.95rem',
                                            fontWeight: activeTab === tab.id ? '600' : '500',
                                            color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                                            borderBottom: activeTab === tab.id ? '3px solid var(--primary-color)' : '3px solid transparent',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="tab-content" style={{ padding: '2rem' }}>
                                {activeTab === 'profile' && renderProfile()}
                                {activeTab === 'experience' && renderExperience()}
                                {activeTab === 'projects' && renderProjects()}
                                {activeTab === 'education' && renderEducation()}
                                {activeTab === 'skills' && renderSkills()}
                            </div>
                        </div>
                    ) : (
                        /* PREVIEW MODE (unchanged structure, just cleaner style) */
                        <div className="resume-preview form-panel" style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            {parsedData ? (
                                <>
                                    <div className="preview-header" style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>{parsedData.personalInfo?.name || 'Candidate Name'}</h1>
                                            <div style={{ display: 'flex', gap: '1.5rem', color: '#64748b', fontSize: '0.95rem', flexWrap: 'wrap' }}>
                                                {parsedData.personalInfo?.email && <span>📧 {parsedData.personalInfo?.email}</span>}
                                                {parsedData.personalInfo?.phone && <span>📱 {parsedData.personalInfo?.phone}</span>}
                                                {parsedData.personalInfo?.city && <span>📍 {parsedData.personalInfo?.city}, {parsedData.personalInfo?.state}</span>}
                                            </div>
                                        </div>
                                        {parsedData.personalInfo?.linkedin && (
                                            <a href={parsedData.personalInfo?.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                                                View LinkedIn
                                            </a>
                                        )}
                                    </div>

                                    {parsedData.summary && (
                                        <div className="preview-section" style={{ marginBottom: '2.5rem' }}>
                                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px', marginBottom: '1rem' }}>Professional Summary</h4>
                                            <p style={{ lineHeight: '1.7', color: '#334155' }}>{parsedData.summary}</p>
                                        </div>
                                    )}

                                    {parsedData.experience && parsedData.experience.length > 0 && (
                                        <div className="preview-section" style={{ marginBottom: '2.5rem' }}>
                                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px', marginBottom: '1.5rem' }}>Experience</h4>
                                            {parsedData.experience.map((exp: any, i: number) => (
                                                <div key={i} style={{ marginBottom: '2rem', paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                        <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{exp.role}</strong>
                                                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>{exp.startDate} - {exp.endDate}</span>
                                                    </div>
                                                    <div style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '0.75rem', fontWeight: '500' }}>{exp.company}</div>
                                                    <p style={{ marginTop: '0.5rem', color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>{exp.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {parsedData.projects && parsedData.projects.length > 0 && (
                                        <div className="preview-section" style={{ marginBottom: '2.5rem' }}>
                                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px', marginBottom: '1.5rem' }}>Projects</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                                {parsedData.projects.map((proj: any, i: number) => (
                                                    <div key={i} style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                                                        <strong style={{ display: 'block', fontSize: '1.05rem', marginBottom: '0.5rem', color: '#0f172a' }}>{proj.name}</strong>
                                                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#475569', lineHeight: '1.5', marginBottom: '1rem' }}>{proj.description}</p>
                                                        {proj.technologies && (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                {(Array.isArray(proj.technologies) ? proj.technologies : [proj.technologies]).map((t, idx) => (
                                                                    <span key={idx} style={{ fontSize: '0.75rem', backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', color: '#64748b' }}>{t}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {parsedData.education && parsedData.education.length > 0 && (
                                        <div className="preview-section" style={{ marginBottom: '2.5rem' }}>
                                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px', marginBottom: '1.5rem' }}>Education</h4>
                                            {parsedData.education.map((edu: any, i: number) => (
                                                <div key={i} style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                                    <div>
                                                        <strong style={{ display: 'block', color: '#0f172a' }}>{edu.institution}</strong>
                                                        <span style={{ color: '#475569', fontSize: '0.9rem' }}>{edu.degree}</span>
                                                    </div>
                                                    <span style={{ fontWeight: '600', color: '#64748b' }}>{edu.year}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {parsedData.skills && parsedData.skills.length > 0 && (
                                        <div className="preview-section">
                                            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px', marginBottom: '1rem' }}>Skills</h4>
                                            <div className="skills-tags">
                                                {parsedData.skills.map((skill: any, i: number) => (
                                                    <span key={i} className="tag" style={{ backgroundColor: '#eff6ff', color: 'var(--primary-color)', border: '1px solid #dbeafe', padding: '6px 14px', borderRadius: '50px', fontWeight: '500' }}>{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                        <FileTextIcon style={{ width: '40px', height: '40px', opacity: 0.4 }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#0f172a' }}>Build Your Profile</h3>
                                    <p style={{ maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                                        Upload your resume on the left to auto-fill your details, or click "Edit Profile" above to start fresh.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}