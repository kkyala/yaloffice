import React, { useState, useMemo } from 'react';
import { config } from '../config/appConfig';

export default function JobCreationScreen({ onCancelJobAction, jobToEdit, onSaveJob, usersData = [], currentUser }) {
    const isEditing = !!jobToEdit;

    // --- FORM STATE ---
    const [jobTitle, setJobTitle] = useState(isEditing ? jobToEdit.title : '');
    const [status, setStatus] = useState(isEditing ? jobToEdit.status : 'Draft');
    const [jobLocation, setJobLocation] = useState(isEditing ? jobToEdit.location : '');
    const [jobDescription, setJobDescription] = useState(isEditing ? jobToEdit.description : '');
    const [skills, setSkills] = useState(isEditing ? (jobToEdit.qualifications || '').split(',').map(s => s.trim()).filter(Boolean) : []);
    const [newSkill, setNewSkill] = useState('');
    const [jobCode, setJobCode] = useState(isEditing ? jobToEdit.job_code || '' : `JPC-${Math.floor(Math.random() * 100)}`);
    const [businessUnit, setBusinessUnit] = useState(isEditing ? jobToEdit.business_unit || '' : 'IT Department - Techladder Inc');
    const [client, setClient] = useState(isEditing ? jobToEdit.client || '' : 'Ranstad');
    const [clientBillRate, setClientBillRate] = useState(isEditing ? jobToEdit.client_bill_rate || '' : 'N/A');
    const [payRate, setPayRate] = useState(isEditing ? jobToEdit.pay_rate || '' : 'N/A');
    const recruiters = useMemo(() => usersData.filter(u => u.role === 'Recruiter' || u.role === 'Agent'), [usersData]);
    const [recruitmentManager, setRecruitmentManager] = useState(isEditing ? jobToEdit.recruitment_manager || '' : recruiters[0]?.name || '');
    const [primaryRecruiter, setPrimaryRecruiter] = useState(isEditing ? jobToEdit.primary_recruiter || '' : recruiters[1]?.name || '');
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
        // Validation removed as per user request.
        // if (!jobTitle || !jobLocation || !jobDescription || skills.length === 0) {
        //     alert('Job Title, Location, Job Description, and at least one Required Skill are mandatory.');
        //     return;
        // }
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
        };
        
        const result = await onSaveJob(jobPayload);

        if (!result?.success) {
            setIsLoading(false);
            alert(result?.error || 'Failed to save the job. Please try again.');
        }
        // On success, App.tsx handles navigation, and this component will unmount.
    };

    return (
        <>
            <header className="page-header">
                <h1>{isEditing ? 'Edit Job' : 'Create New Job'}</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={onCancelJobAction} disabled={isLoading}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'Saving...' : (isEditing ? 'Update Job' : 'Save as Draft')}
                    </button>
                </div>
            </header>
            <div className="job-posting-grid">
                <div className="form-column">
                    <fieldset disabled={isLoading}>
                        <div className="form-section">
                            <h3 className="form-section-header">Core Details</h3>
                            <div className="form-grid-2-col">
                                <div className="form-group"><label htmlFor="job-title">Job Title*</label><input type="text" id="job-title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} /></div>
                                <div className="form-group"><label htmlFor="job-location">Location*</label><input type="text" id="job-location" value={jobLocation} onChange={e => setJobLocation(e.target.value)} /></div>
                                <div className="form-group"><label htmlFor="job-code">Job Code</label><input type="text" id="job-code" value={jobCode} onChange={e => setJobCode(e.target.value)} /></div>
                                <div className="form-group"><label htmlFor="business-unit">Business Unit</label><input type="text" id="business-unit" value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3 className="form-section-header">Assignment & Financials</h3>
                            <div className="form-grid-2-col">
                                <div className="form-group"><label htmlFor="client">Client</label><input type="text" id="client" value={client} onChange={e => setClient(e.target.value)} /></div>
                                <div className="form-group"><label htmlFor="job-status">Job Status</label><select id="job-status" value={status} onChange={e => setStatus(e.target.value)}><option>Draft</option><option>Active</option><option>On Hold</option><option>Closed</option></select></div>
                                <div className="form-group"><label htmlFor="client-bill-rate">Client Bill Rate / Salary</label><input type="text" id="client-bill-rate" value={clientBillRate} onChange={e => setClientBillRate(e.target.value)} /></div>
                                <div className="form-group"><label htmlFor="pay-rate">Pay Rate / Salary</label><input type="text" id="pay-rate" value={payRate} onChange={e => setPayRate(e.target.value)} /></div>
                                <div className="form-group"><label htmlFor="rec-manager">Recruitment Manager</label><select id="rec-manager" value={recruitmentManager} onChange={e => setRecruitmentManager(e.target.value)}>{recruiters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}</select></div>
                                <div className="form-group"><label htmlFor="primary-rec">Primary Recruiter</label><select id="primary-rec" value={primaryRecruiter} onChange={e => setPrimaryRecruiter(e.target.value)}>{recruiters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}</select></div>
                            </div>
                        </div>

                        <div className="form-section">
                             <h3 className="form-section-header">Job Content</h3>
                            <div className="form-group"><label htmlFor="job-description">Job Description*</label><textarea id="job-description" value={jobDescription} onChange={e => setJobDescription(e.target.value)} rows={8}></textarea></div>
                            <div className="form-group"><label htmlFor="skills">Required Skills*</label><div className="skills-input-container"><div className="skills-tags">{skills.map(skill => (<div key={skill} className="tag">{skill}<button onClick={() => handleRemoveSkill(skill)}>&times;</button></div>))}<input type="text" id="skills" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={handleAddSkill} placeholder="Add a skill and press Enter"/></div></div></div>
                        </div>
                    </fieldset>
                </div>
            </div>
        </>
    );
}