import React, { useState, useMemo } from 'react';
import { config } from '../config/appConfig';
import {
    BriefcaseIcon,
    MapPinIcon,
    BuildingIcon,
    DollarSignIcon,
    UserIcon,
    RobotIcon,
    FileTextIcon,
    AwardIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    ChevronLeftIcon,
    BriefcaseOutlineIcon,
    FileTextOutlineIcon,
    RobotOutlineIcon
} from '../components/Icons';

export default function JobCreationScreen({ onCancelJobAction, jobToEdit, onSaveJob, usersData = [], currentUser }) {
    const isEditing = !!jobToEdit;

    // --- FORM STATE ---
    const [jobTitle, setJobTitle] = useState(isEditing ? jobToEdit.title : '');
    const [status, setStatus] = useState(isEditing ? jobToEdit.status : 'Draft');
    const [jobLocation, setJobLocation] = useState(isEditing ? jobToEdit.location : '');
    const [jobDescription, setJobDescription] = useState(isEditing ? jobToEdit.description : '');
    const [skills, setSkills] = useState(isEditing ? (jobToEdit.qualifications || '').split(',').map(s => s.trim()).filter(Boolean) : []);
    const [newSkill, setNewSkill] = useState('');
    const [jobCode, setJobCode] = useState(isEditing ? jobToEdit.job_code || '' : `JPC-${Math.floor(Math.random() * 1000)}`);
    const [businessUnit, setBusinessUnit] = useState(isEditing ? jobToEdit.business_unit || '' : 'IT Department - Techladder Inc');
    const [client, setClient] = useState(isEditing ? jobToEdit.client || '' : 'Ranstad');
    const [clientBillRate, setClientBillRate] = useState(isEditing ? jobToEdit.client_bill_rate || '' : '');
    const [payRate, setPayRate] = useState(isEditing ? jobToEdit.pay_rate || '' : '');
    const recruiters = useMemo(() => usersData.filter(u => u.role === 'Recruiter' || u.role === 'Agent'), [usersData]);
    const [recruitmentManager, setRecruitmentManager] = useState(isEditing ? jobToEdit.recruitment_manager || '' : (recruiters.length > 0 ? recruiters[0].name : ''));
    const [primaryRecruiter, setPrimaryRecruiter] = useState(isEditing ? jobToEdit.primary_recruiter || '' : (recruiters.length > 1 ? recruiters[1].name : (recruiters[0]?.name || '')));

    // Screening Config State
    const [screeningEnabled, setScreeningEnabled] = useState(isEditing ? jobToEdit.screening_enabled || false : false);
    const [screeningQuestions, setScreeningQuestions] = useState(isEditing ? (jobToEdit.screening_config?.questions || '') : '');

    const [isLoading, setIsLoading] = useState(false);

    // --- HANDLERS ---
    const handleAddSkill = (e) => {
        if (e.key === 'Enter' && newSkill.trim() !== '') {
            e.preventDefault();
            if (!skills.includes(newSkill.trim())) setSkills([...skills, newSkill.trim()]);
            setNewSkill('');
        }
    };
    const handleRemoveSkill = (skillToRemove) => setSkills(skills.filter(skill => skill !== skillToRemove));

    const handleSubmit = async () => {
        setIsLoading(true);

        const jobPayload = {
            ...(isEditing && { id: jobToEdit.id }),
            title: jobTitle,
            status,
            location: jobLocation,
            description: jobDescription,
            job_code: jobCode,
            business_unit: businessUnit,
            client,
            client_bill_rate: clientBillRate,
            pay_rate: payRate,
            recruitment_manager: recruitmentManager,
            primary_recruiter: primaryRecruiter,
            qualifications: skills.join(', '),
            employer: isEditing ? jobToEdit.employer : currentUser.name,
            open: isEditing ? jobToEdit.open : true,
            sourced: isEditing ? jobToEdit.sourced : 0,
            screened: isEditing ? jobToEdit.screened : 0,
            shortlisted: isEditing ? jobToEdit.shortlisted : 0,
            interviewed: isEditing ? jobToEdit.interviewed : 0,
            salaryMin: isEditing ? jobToEdit.salaryMin : 0,
            salaryMax: isEditing ? jobToEdit.salaryMax : 0,
            screening_enabled: screeningEnabled,
            screening_config: {
                questions: screeningQuestions
            }
        };

        const result = await onSaveJob(jobPayload);

        if (!result?.success) {
            setIsLoading(false);
            const errorMessage = result?.error || 'Failed to save the job. Please try again.';
            if (errorMessage.includes('Could not find') && errorMessage.includes('column')) {
                alert('Database Schema Error: Missing columns in the "jobs" table.\n\nPlease run the SQL script located at "backend/update_schema.sql" in your Supabase Dashboard SQL Editor to fix this.');
            } else {
                alert(errorMessage);
            }
        }
        // On success, App.tsx handles navigation, and this component will unmount.
    };

    return (
        <div className="page-content">
            <header className="page-header">
                <div>
                    <button onClick={onCancelJobAction} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 mb-2 transition-colors border-none bg-transparent cursor-pointer p-0" style={{ fontSize: '0.9rem' }}>
                        <ChevronLeftIcon width="16" height="16" /> Back to Jobs
                    </button>
                    <h1>{isEditing ? 'Edit Job Posting' : 'Create New Job Posting'}</h1>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={onCancelJobAction} disabled={isLoading}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'Saving...' : (isEditing ? 'Update Job' : 'Publish Job')}
                    </button>
                </div>
            </header>

            <div className="form-layout">
                {/* LEFT COLUMN - MAIN DETAILS */}
                <div className="form-column">
                    {/* CORE DETAILS CARD */}
                    <div className="form-card">
                        <div className="form-card-header">
                            <div className="icon-wrapper"><BriefcaseIcon width="20" height="20" /></div>
                            <h3>Core Details</h3>
                        </div>

                        <div className="form-group mb-6">
                            <label htmlFor="job-title">Job Title <span className="text-red-500">*</span></label>
                            <div className="input-wrapper">
                                <BriefcaseOutlineIcon className="input-icon" width="18" height="18" />
                                <input
                                    type="text"
                                    id="job-title"
                                    className="form-input-premium"
                                    placeholder="e.g. Senior Frontend Engineer"
                                    value={jobTitle}
                                    onChange={e => setJobTitle(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="form-group">
                                <label htmlFor="job-location">Location <span className="text-red-500">*</span></label>
                                <div className="input-wrapper">
                                    <MapPinIcon className="input-icon" width="18" height="18" />
                                    <input
                                        type="text"
                                        id="job-location"
                                        className="form-input-premium"
                                        placeholder="e.g. New York, NY (Remote)"
                                        value={jobLocation}
                                        onChange={e => setJobLocation(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="job-code">Job Code</label>
                                <div className="input-wrapper">
                                    <FileTextOutlineIcon className="input-icon" width="18" height="18" />
                                    <input
                                        type="text"
                                        id="job-code"
                                        className="form-input-premium"
                                        value={jobCode}
                                        onChange={e => setJobCode(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="job-description">Job Description <span className="text-red-500">*</span></label>
                            <textarea
                                id="job-description"
                                className="form-input-premium"
                                placeholder="Describe the role, responsibilities, and company culture..."
                                value={jobDescription}
                                onChange={e => setJobDescription(e.target.value)}
                                rows={8}
                            ></textarea>
                        </div>
                    </div>

                    {/* SKILLS & REQUIREMENTS CARD */}
                    <div className="form-card">
                        <div className="form-card-header">
                            <div className="icon-wrapper"><AwardIcon width="20" height="20" /></div>
                            <h3>Skills & Requirements</h3>
                        </div>

                        <div className="form-group">
                            <label htmlFor="skills">Required Skills <span className="text-red-500">*</span></label>
                            <div className="skills-container" onClick={() => document.getElementById('skill-input').focus()}>
                                {skills.map(skill => (
                                    <div key={skill} className="skill-tag">
                                        {skill}
                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveSkill(skill); }}>&times;</button>
                                    </div>
                                ))}
                                <input
                                    type="text"
                                    id="skill-input"
                                    className="skill-input"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    onKeyDown={handleAddSkill}
                                    placeholder={skills.length === 0 ? "Type a skill and press Enter (e.g. React.js)" : "Add another..."}
                                />
                            </div>
                            <p className="text-sm text-slate-400 mt-2">Press Enter to add a skill tag.</p>
                        </div>
                    </div>

                    {/* AI SCREENING CARD */}
                    <div className="form-card" style={{ border: screeningEnabled ? '1px solid var(--primary-300)' : undefined }}>
                        <div className="form-card-header justify-between">
                            <div className="flex items-center gap-3">
                                <div className="icon-wrapper" style={{ background: screeningEnabled ? 'var(--primary-100)' : 'var(--slate-100)', color: screeningEnabled ? 'var(--color-primary)' : 'var(--slate-500)' }}>
                                    <RobotIcon width="20" height="20" />
                                </div>
                                <h3>AI Screening Configuration</h3>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    style={{ position: 'absolute', opacity: 0 }}
                                    checked={screeningEnabled}
                                    onChange={e => setScreeningEnabled(e.target.checked)}
                                />
                                <div className="toggle-track">
                                    <div className="toggle-thumb"></div>
                                </div>
                            </label>
                        </div>

                        {screeningEnabled ? (
                            <div className="animate-fade-in">
                                <div className="p-4 bg-primary-50 rounded-lg border border-primary-100 mb-6 flex gap-3 items-start">
                                    <CheckCircleIcon className="text-primary-600 flex-shrink-0 mt-1" width="18" height="18" />
                                    <div>
                                        <h4 className="text-primary-800 font-semibold m-0 text-sm">AI Agent Enabled</h4>
                                        <p className="text-primary-700 text-sm m-0 mt-1">The AI will conduct first-round interviews based on the questions below.</p>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="screening-questions">Screening Questions / Evaluation Criteria</label>
                                    <textarea
                                        id="screening-questions"
                                        className="form-input-premium"
                                        value={screeningQuestions}
                                        onChange={e => setScreeningQuestions(e.target.value)}
                                        rows={5}
                                        placeholder="1. Explain your experience with React hooks.
2. How do you handle state management in large apps?
3. Describe a challenging bug you fixed recently."
                                    ></textarea>
                                    <p className="text-sm text-slate-500 mt-2">Provide specific questions or topics for the AI to cover. Leave blank for general screening based on job description.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex gap-3 items-start opacity-75">
                                <AlertCircleIcon className="text-slate-400 flex-shrink-0 mt-1" width="18" height="18" />
                                <div>
                                    <h4 className="text-slate-600 font-semibold m-0 text-sm">AI Screening Disabled</h4>
                                    <p className="text-slate-500 text-sm m-0 mt-1">Enable this feature to have our AI agent automatically screen candidates for this role.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN - SIDEBAR SETTINGS */}
                <div className="form-column">
                    <div className="form-card sticky top-6">
                        <div className="form-card-header">
                            <div className="icon-wrapper"><BuildingIcon width="20" height="20" /></div>
                            <h3>Organization & Financials</h3>
                        </div>

                        <div className="form-group mb-4">
                            <label htmlFor="job-status">Job Status</label>
                            <div className="input-wrapper">
                                <select
                                    id="job-status"
                                    className="form-input-premium"
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                >
                                    <option value="Draft">Draft</option>
                                    <option value="Active">Active</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label htmlFor="business-unit">Business Unit</label>
                            <div className="input-wrapper">
                                <BuildingIcon className="input-icon" width="18" height="18" />
                                <input type="text" id="business-unit" className="form-input-premium" value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} />
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label htmlFor="client">Client</label>
                            <div className="input-wrapper">
                                <BuildingIcon className="input-icon" width="18" height="18" />
                                <input type="text" id="client" className="form-input-premium" value={client} onChange={e => setClient(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 mb-4">
                            <div className="form-group">
                                <label htmlFor="client-bill-rate">Bill Rate</label>
                                <div className="input-wrapper">
                                    <DollarSignIcon className="input-icon" width="18" height="18" />
                                    <input type="text" id="client-bill-rate" className="form-input-premium" placeholder="$0.00" value={clientBillRate} onChange={e => setClientBillRate(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="pay-rate">Pay Rate</label>
                                <div className="input-wrapper">
                                    <DollarSignIcon className="input-icon" width="18" height="18" />
                                    <input type="text" id="pay-rate" className="form-input-premium" placeholder="$0.00" value={payRate} onChange={e => setPayRate(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label htmlFor="rec-manager">Recruitment Manager</label>
                            <div className="input-wrapper">
                                <select id="rec-manager" className="form-input-premium" value={recruitmentManager} onChange={e => setRecruitmentManager(e.target.value)}>
                                    <option value="">Select Manager</option>
                                    {recruiters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="primary-rec">Primary Recruiter</label>
                            <div className="input-wrapper">
                                <select id="primary-rec" className="form-input-premium" value={primaryRecruiter} onChange={e => setPrimaryRecruiter(e.target.value)}>
                                    <option value="">Select Recruiter</option>
                                    {recruiters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}