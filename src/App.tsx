
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from './services/api';
import { roleConfig } from './config/roleConfig';

// Components
import LoginScreen from './pages/LoginScreen';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import ProfileModal from './components/ProfileModal';
import { AIProvider } from './context/AIProvider';
import FeedbackBanner from './components/FeedbackBanner';
import FloatingAIChatWidget from './components/FloatingAIChatWidget';
import AvatarInterviewScreen from './pages/AvatarInterviewScreen';

const getErrorMessage = (error: any) => {
    if (typeof error === 'string') return error;
    if (error && typeof error.message === 'string') return error.message;
    if (error && typeof error.error === 'string') return error.error;
    return 'An unexpected error occurred. Please try again.';
};

export default function App() {
    const [session, setSession] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<string>('');
    const [activeParent, setActiveParent] = useState<string>('');
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
    const [profileModalTab, setProfileModalTab] = useState<string | null>(null);
    const [showFeedbackBanner, setShowFeedbackBanner] = useState<boolean>(true);
    const [usersData, setUsersData] = useState<any[]>([]);
    const [jobsData, setJobsData] = useState<any[]>([]);
    const [candidatesData, setCandidatesData] = useState<any[]>([]);
    const [placementsData, setPlacementsData] = useState<any[]>([]);
    const [resumeList, setResumeList] = useState<any[]>([]);
    const [jobScreenView, setJobScreenView] = useState<string>('list');
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [interviewingContext, setInterviewingContext] = useState<{ applicationId: number | null; candidateId: number | null } | null>(null);
    const [pipelineJobFilter, setPipelineJobFilter] = useState<string>('all');

    const currentRoleConfig = useMemo(() => {
        if (!currentUser || !currentUser.role) return null;
        // Handle case sensitivity (e.g. 'employer' vs 'Employer')
        const roleKey = Object.keys(roleConfig).find(key => key.toLowerCase() === currentUser.role.toLowerCase());
        return roleKey ? roleConfig[roleKey] : null;
    }, [currentUser]);

    const handleError = (error: any, context?: string) => {
        console.error(`Error ${context || ''}:`, error);
    };

    const refetchCandidates = useCallback(async () => {
        const { data: { session: authSession } } = await api.getSession();
        if (!authSession?.user) {
            setCandidatesData([]);
            return;
        }

        const { data: userProfile, error: profileError } = await api.get(`/users/${authSession.user.id}`);

        if (profileError || !userProfile) {
            handleError(profileError || new Error('User profile not found'), 'getting user role for refetch');
            setCandidatesData([]);
            return;
        }

        if (userProfile.role === 'Candidate') {
            const { data, error } = await api.get(`/candidates?user_id=${userProfile.id}`);
            if (error) handleError(error, 'refetching candidate applications');
            else setCandidatesData(data || []);
        } else if (userProfile.role === 'Employer') {
            const { data: employerJobsData, error: jobsError } = await api.get(`/jobs?employer=${userProfile.name}`);

            if (jobsError) {
                handleError(jobsError, `refetching employer's job IDs for ${userProfile.name}`);
                setCandidatesData([]);
                return;
            }

            const employerJobIds = employerJobsData.map((job: any) => job.id);

            if (employerJobIds.length === 0) {
                setCandidatesData([]);
                return;
            }

            // Need to fetch candidates for these jobs. API supports array of jobIds?
            // Let's loop for now or update API. Updated API to support array.
            // But for simplicity let's just fetch all candidates and filter client side if API doesn't support complex query yet
            // Actually I updated candidates API to support jobId array.
            // But passing array in query param is tricky. Let's fetch all candidates for now as fallback or improve API.
            // Let's use the API I wrote: query = query.in('jobId', jobId)
            // But passing array in GET param: ?jobId=1&jobId=2

            const queryString = employerJobIds.map((id: number) => `jobId=${id}`).join('&');
            const { data, error } = await api.get(`/candidates?${queryString}`);

            if (error) handleError(error, `refetching candidate applications for employer ${userProfile.name}`);
            else setCandidatesData(data || []);
        }
        else {
            const { data, error } = await api.get('/candidates');
            if (error) handleError(error, 'refetching all candidates');
            else setCandidatesData(data || []);
        }
    }, []);

    const refetchUsers = async () => {
        const { data, error } = await api.get('/users');
        if (error) handleError(error, 'refetching users');
        else setUsersData(data || []);
    };
    const refetchJobs = async () => {
        const { data, error } = await api.get('/jobs');
        if (error) handleError(error, 'refetching jobs');
        else setJobsData(data || []);
    };
    const refetchPlacements = async () => {
        const { data, error } = await api.get('/placements');
        if (error) handleError(error, 'refetching placements');
        else setPlacementsData(data || []);
    };

    const refetchResume = async (userId: string) => {
        const { data, error } = await api.get(`/resumes/${userId}`);

        if (error) handleError(error, 'fetching resumes');
        else setResumeList(data || []);
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        api.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) {
                setCurrentUser(null);
                setResumeList([]);
                setCurrentPage('');
            }
        });
        // No subscription for now, we rely on manual updates or polling if needed
        // Or we could implement a simple event emitter in api service
    }, []);

    useEffect(() => {
        console.log('Session changed:', session);
        if (!session?.user) {
            console.log('No session user, stopping load');
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const loadInitialData = async () => {
            console.log('Loading initial data for user:', session.user.id);
            setIsLoading(true);
            const { data: userProfile, error: profileError } = await api.get(`/users/${session.user.id}`);
            console.log('User profile fetch result:', { userProfile, profileError });

            if (!isMounted) return;

            let finalUserProfile = userProfile;

            if (profileError || !userProfile) {
                console.warn('User profile not found.');
                handleError(new Error('User profile not found'), 'fetching user profile');
                await api.logout();
                setSession(null);
                return;
            }

            setCurrentUser(finalUserProfile);
            if (finalUserProfile && !currentPage) {
                const initialPage = roleConfig[finalUserProfile.role]?.defaultPage || 'dashboard';
                console.log('Setting initial page:', initialPage);
                setCurrentPage(initialPage);
                setActiveParent(initialPage);
            }


            const promises = [
                refetchUsers(),
                refetchJobs(),
                refetchCandidates(),
                refetchPlacements()
            ];

            if (finalUserProfile.role === 'Candidate') {
                await refetchResume(finalUserProfile.id);
                // Redirect to resume if profile is incomplete (no mobile or no resume)
                // Only redirect if we are NOT already on the resume page to avoid loops
                if ((!finalUserProfile.mobile || !finalUserProfile.name) && currentPage !== 'my-resume') {
                    setCurrentPage('my-resume');
                    setActiveParent('my-resume');
                }
            }

            await Promise.all(promises);

            if (isMounted) {
                setIsLoading(false);
            }
        };

        loadInitialData();

        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, refetchCandidates]); // Removed currentPage to prevent re-running on navigation

    const handleLogin = async ({ email, password }: { email: string; password: string; }) => {
        const { data, error } = await api.login({ email, password });
        if (!error && data?.session) {
            setSession(data.session);
        }
        return { success: !error, error: error ? getErrorMessage(error) : null };
    };
    const handleSignup = async ({ email, password, fullName, role, mobileNumber }: { email: string; password: string; fullName: string; role: string; mobileNumber: string; }) => {
        const { data: authData, error: signUpError } = await api.signup({ email, password, options: { data: { name: fullName, role: role, mobile: mobileNumber, status: 'Active' } } });
        if (signUpError) {
            if ((signUpError as any).message && (signUpError as any).message.includes('unique constraint')) return { success: false, error: 'A user with this email already exists.' };
            handleError(signUpError, 'signing up user');
            return { success: false, error: getErrorMessage(signUpError) };
        }
        if (!authData.user) return { success: false, error: 'Sign up succeeded but no user data was returned. Please try logging in.' };

        // Create profile
        const { error: profileError } = await api.post('/users', { id: authData.user.id, email: authData.user.email, name: fullName, role: role, mobile: mobileNumber, status: 'Active' });
        if (profileError) {
            handleError(profileError, 'creating user profile after signup');
            console.warn(`User ${authData.user.id} signed up but profile creation failed. It will be retried on next login.`);
        }

        // Auto-login if session is returned (Email confirmation disabled)
        if (authData.session) {
            setSession(authData.session);
            // Fetch profile again to be sure or construct it
            const { data: userProfile } = await api.get(`/users/${authData.user.id}`);
            setCurrentUser(userProfile || { id: authData.user.id, email: authData.user.email, name: fullName, role: role, mobile: mobileNumber, status: 'Active' });

            // Set initial page
            const initialPage = roleConfig[role]?.defaultPage || 'dashboard';
            setCurrentPage(initialPage);
            setActiveParent(initialPage);

            return { success: true, autoLogin: true };
        }

        return { success: true, autoLogin: false };
    };
    const handleLogout = async () => { await api.logout(); setCurrentUser(null); setCurrentPage(''); };

    const handleNavigate = useCallback((page: string, parent: string, context: { applicationId?: number; candidateId?: number } = {}) => {
        setCurrentPage(page);
        setActiveParent(parent);
        if (isMobile) setIsSidebarOpen(false);
        if (context.applicationId !== undefined || context.candidateId !== undefined) setInterviewingContext({ applicationId: context.applicationId ?? null, candidateId: context.candidateId ?? null }); else setInterviewingContext(null);
    }, [isMobile]);

    const handleUpdateUserProfile = async (profileData: any) => {
        if (!currentUser) return { success: false, error: 'User not logged in.' };
        const { data, error } = await api.put(`/users/${currentUser.id}`, profileData);
        if (error) { handleError(error, 'updating user profile'); return { success: false, error: getErrorMessage(error) }; }
        setCurrentUser(data);
        await refetchUsers();
        return { success: true };
    };
    const handleSaveAIConfig = async (config: any) => {
        if (!currentUser) return { success: false, error: 'No user is currently logged in.' };
        const { data, error } = await api.put(`/users/${currentUser.id}`, { ai_config: config });
        if (error) { handleError(error, 'saving AI configuration'); return { success: false, error: getErrorMessage(error) }; }
        setCurrentUser(data);
        await refetchUsers();
        return { success: true };
    };

    const handleSaveResume = async (resumeData: any, file?: File) => {
        if (!currentUser) return { success: false, error: 'User not logged in.' };

        try {
            let filePayload = {};
            if (file) {
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });
                filePayload = {
                    file_content: base64,
                    file_type: file.type,
                    file_name: file.name
                };
            }

            const { error } = await api.post('/resumes', {
                user_id: currentUser.id,
                parsed_data: resumeData,
                ...filePayload
            });

            if (error) throw error;

            // Update user profile with resume details if missing
            const updates: any = {};
            if (resumeData.personalInfo?.phone) updates.mobile = resumeData.personalInfo.phone;
            if (resumeData.personalInfo?.city) updates.city = resumeData.personalInfo.city;
            if (resumeData.personalInfo?.state) updates.state = resumeData.personalInfo.state;
            if (resumeData.personalInfo?.linkedin) updates.linkedin_url = resumeData.personalInfo.linkedin;

            if (Object.keys(updates).length > 0) {
                await api.put(`/users/${currentUser.id}`, updates);
                await refetchUsers();
            }

            await refetchResume(currentUser.id);
            return { success: true };

        } catch (err) {
            handleError(err, 'saving resume version');
            return { success: false, error: getErrorMessage(err) };
        }
    };

    const handleSaveInterviewResults = async (applicationId: number, score: number, transcript: string, analysis?: any, audioUrl?: string) => {
        const { data: appData, error: fetchError } = await api.get(`/candidates/${applicationId}`);
        if (fetchError) { handleError(fetchError, 'fetching candidate for interview save'); return; }
        const newConfig = {
            ...(appData.interview_config || {}),
            interviewStatus: 'finished',
            aiScore: score,
            transcript,
            analysis,
            audioRecordingUrl: audioUrl,
            completedAt: new Date().toISOString()
        };
        // Update status to 'Interviewing' if not already, and mark interview as completed
        const { error } = await api.put(`/candidates/${applicationId}`, {
            interview_config: newConfig,
            status: appData.status === 'Interviewing' ? appData.status : 'Interviewing' // Keep status as Interviewing after completion
        });
        if (error) handleError(error, 'saving interview results'); else await refetchCandidates();
    };
    const handleSaveAssessmentResults = async (applicationId: number, assessmentData: any) => {
        const { data: appData, error: fetchError } = await api.get(`/candidates/${applicationId}`);
        if (fetchError) {
            handleError(fetchError, 'fetching candidate for assessment save');
            return { success: false, error: getErrorMessage(fetchError) };
        }

        const newConfig = { ...(appData.interview_config || {}), interviewStatus: 'assessment_completed', assessmentData };
        const { error } = await api.put(`/candidates/${applicationId}`, { interview_config: newConfig });

        if (error) {
            handleError(error, 'saving assessment results');
            return { success: false, error: getErrorMessage(error) };
        }

        await refetchCandidates();
        return { success: true };
    };
    const handleUpdateApplicationStatus = async (applicationId: number, newStatus: string) => {
        const { error } = await api.put(`/candidates/${applicationId}`, { status: newStatus });
        if (error) handleError(error, 'updating application status'); else await refetchCandidates();
    };
    const handleScheduleInterview = async (applicationId: number, config: any) => {
        const { data: appData, error: fetchError } = await api.get(`/candidates/${applicationId}`);
        if (fetchError) { handleError(fetchError, 'fetching app for schedule'); return { success: false }; }

        // Check if this is for screening assignment (status is 'Screening' and no screeningStatus)
        const isScreeningAssignment = appData.status === 'Screening' && !appData.interview_config?.screeningStatus;

        if (isScreeningAssignment) {
            // Agent is assigning audio screening
            // Set screening status to 'assigned' and prepare for audio screening
            const newConfig = {
                ...(appData.interview_config || {}),
                ...config,
                screeningStatus: 'assigned',
                screeningType: 'audio', // Audio screening
                scheduledAt: new Date().toISOString()
            };

            const { error } = await api.put(`/candidates/${applicationId}`, { interview_config: newConfig });
            if (error) { handleError(error, 'assigning screening'); return { success: false }; }
            await refetchCandidates();
            return { success: true };
        }

        // For interview scheduling, check if screening is completed
        if (appData.status === 'Screening' || appData.status === 'Sourced') {
            // Check screening status from screening_assessments table
            try {
                const { data: screeningStatus } = await api.get(`/interview/screening-status/${appData.user_id || appData.candidate_id}`);

                if (!screeningStatus?.completed) {
                    return {
                        success: false,
                        error: 'Screening assessment must be completed before scheduling interview. Please ensure the candidate has completed their initial screening.'
                    };
                }
            } catch (err) {
                console.warn('Could not verify screening status:', err);
                // Continue anyway, but log the warning
            }
        }

        // Ensure interviewStatus is set if not provided in config, default to 'assessment_pending' for scheduling
        const statusToSet = config.interviewStatus || 'assessment_pending';

        const newConfig = {
            ...(appData.interview_config || {}),
            ...config,
            interviewStatus: statusToSet,
            scheduledAt: new Date().toISOString()
        };

        const { error } = await api.put(`/candidates/${applicationId}`, { interview_config: newConfig });
        if (error) { handleError(error, 'scheduling interview'); return { success: false }; }
        await refetchCandidates();
        return { success: true };
    };
    const handleStartInterviewSession = async (applicationId: number) => {
        const { data: appData, error: fetchError } = await api.get(`/candidates/${applicationId}`);
        if (fetchError) {
            handleError(fetchError, 'fetching app for interview start');
            return { success: false, error: getErrorMessage(fetchError) };
        }

        const newConfig = { ...(appData.interview_config || {}), interviewStatus: 'started' };
        const { error } = await api.put(`/candidates/${applicationId}`, { interview_config: newConfig });

        if (error) {
            handleError(error, 'starting interview session');
            return { success: false, error: getErrorMessage(error) };
        }

        await refetchCandidates();
        return { success: true };
    };
    const handleApplyForJob = async (job: any, profileData: any) => {
        if (!currentUser) return { success: false, error: 'User not logged in' };
        const userProfilePayload = { name: profileData.name, mobile: profileData.mobile, city: profileData.city, state: profileData.state, linkedin_url: profileData.linkedin_url, work_authorization: profileData.work_authorization };
        const { error: userUpdateError } = await api.put(`/users/${currentUser.id}`, userProfilePayload);
        if (userUpdateError) return { success: false, error: getErrorMessage(userUpdateError) };
        await refetchUsers();

        // Check for existing application
        // API needs to support filtering by user_id and jobId
        // Using the query string support I added earlier
        const { data: existingApps, error: appCheckError } = await api.get(`/candidates?user_id=${currentUser.id}&jobId=${job.id}`);

        if (appCheckError) return { success: false, error: getErrorMessage(appCheckError) };
        if (existingApps && existingApps.length > 0) return { success: false, error: 'You have already applied for this job.' };

        const applicationPayload = { jobId: job.id, name: profileData.name, dob: profileData.dob, role: job.title, status: 'Applied', resumeSummary: profileData.summary, source: profileData.source, user_id: currentUser.id };
        const { data: newApp, error: appError } = await api.post('/candidates', applicationPayload);
        if (appError) return { success: false, error: getErrorMessage(appError) };

        // After applying, trigger job-specific resume screening if resume exists
        // Get the latest resume for this user
        try {
            const { data: resumes } = await api.get(`/resumes/${currentUser.id}`);
            if (resumes && resumes.length > 0) {
                const latestResume = resumes[0];
                if (latestResume.parsed_data) {
                    // Trigger job-specific screening assessment
                    // This happens asynchronously, so we don't wait for it
                    const apiBase = process.env.VITE_API_URL || 'http://localhost:8000';
                    fetch(`${apiBase}/api/ai/resume/process-screening`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            resumeData: latestResume.parsed_data,
                            userId: currentUser.id,
                            candidateName: profileData.name || currentUser.name,
                            candidateEmail: currentUser.email,
                            jobTitle: job.title,
                            jobId: job.id
                        })
                    }).catch(err => {
                        console.warn('Failed to trigger job-specific screening:', err);
                        // Don't fail the application if screening fails
                    });
                }
            }
        } catch (err) {
            console.warn('Could not trigger job-specific screening:', err);
            // Continue anyway
        }

        await refetchCandidates();
        return { success: true, applicationId: newApp?.id, data: newApp };
    };

    const handleSaveJob = async (jobData: any) => {
        const payload = { ...jobData };
        const isUpdate = typeof payload.id === 'number' && Number.isFinite(payload.id) && payload.id > 0;
        if (!payload.employer && currentUser?.name) payload.employer = currentUser.name;

        try {
            let response: any;
            if (isUpdate) {
                const { id, ...updateFields } = payload;
                response = await api.put(`/jobs/${id}`, updateFields);
            } else {
                const { id, ...insertFields } = payload;
                response = await api.post('/jobs', insertFields);
            }

            if (response.error) {
                if (response.error.message && response.error.message.includes('unique constraint')) return { success: false, error: 'Internal ID collision occurred. Please try again.' };
                handleError(response.error, 'saving job');
                return { success: false, error: getErrorMessage(response.error) };
            }

            await refetchJobs();
            const role = currentUser?.role;
            if (role === 'Employer') handleNavigate('employer-jobs-list', 'recruitment');
            else if (role === 'Agent') handleNavigate('agent-jobs-list', 'agent-jobs-list');
            else handleNavigate('dashboard', 'dashboard');

            return { success: true, job: response.data };
        } catch (err) {
            handleError(err, 'saving job (unexpected)');
            return { success: false, error: getErrorMessage(err) };
        }
    };

    const handlePublishJob = async (jobId: number) => {
        const { error } = await api.put(`/jobs/${jobId}`, { status: 'Active' });
        if (error) handleError(error, 'publishing job'); else await refetchJobs();
    };

    const handleCreateNewJob = () => {
        setSelectedJob(null);
        handleNavigate('employer-add-job', 'recruitment');
    };

    const handleCancelJobAction = () => {
        const role = currentUser?.role;
        if (role === 'Employer') handleNavigate('employer-jobs-list', 'recruitment');
        else if (role === 'Agent') handleNavigate('agent-jobs-list', 'agent-jobs-list');
        else handleNavigate('dashboard', 'dashboard');
    };
    const handleEditJob = (job: any) => { setSelectedJob(job); handleNavigate('employer-edit-job', 'recruitment'); };

    const handleRemoveCandidateFromPipeline = async (candidateId: number) => console.log('Remove from pipeline:', candidateId);
    const handleDeleteCandidate = async (candidateId: number) => console.log('Delete candidate:', candidateId);
    const handleClearAllCandidates = async () => console.log('Clear all candidates');
    const handleSendJobToCandidate = async (jobId: number, candidateId: number) => console.log('Send job:', jobId, 'to candidate:', candidateId);
    const handleMoveCandidatesToPipeline = (candidates: any[], jobId: number) => console.log('Move candidates:', candidates, 'to job:', jobId);

    if (isLoading) return <div className="loading-overlay"><h2>Loading Yāl Office...</h2></div>;
    if (!currentUser) return <LoginScreen onLogin={handleLogin} onSignup={handleSignup} />;

    const PageComponent = currentRoleConfig?.pages[currentPage];
    if (!PageComponent) return <div className="loading-overlay"><h2>Page not found or role not configured.</h2></div>;

    const interviewingCandidate = interviewingContext?.candidateId ? candidatesData.find(c => c.id === interviewingContext.candidateId) : null;
    const currentApplicationId = interviewingContext?.applicationId ?? null;
    const jobToEditForPage = (currentPage === 'employer-edit-job') ? selectedJob : null;

    // Determine which interview component to use based on interviewType
    const getInterviewComponent = () => {
        const interviewType = interviewingCandidate?.interview_config?.interviewType;
        if (interviewType === 'livekit' || interviewType === 'tavus' || interviewType === 'video') {
            return AvatarInterviewScreen;
        }
        // Default to audio interview
        return currentPage === 'interview' ? roleConfig[currentUser.role].pages['interview'] : PageComponent;
    };
    const InterviewComponentToRender = getInterviewComponent();

    return (
        <AIProvider>
            <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Sidebar
                    user={currentUser}
                    navItems={currentRoleConfig?.navItems || []}
                    currentPage={currentPage}
                    activeParent={activeParent}
                    onNavigate={handleNavigate}
                    isMobile={isMobile}
                    isOpen={isSidebarOpen}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    onNavigateToDashboard={() => currentRoleConfig?.defaultPage && handleNavigate(currentRoleConfig.defaultPage, currentRoleConfig.defaultPage)}
                />
                <div className="main-content">
                    <TopHeader
                        user={currentUser}
                        onLogout={handleLogout}
                        onProfileClick={(tab = 'profile') => setProfileModalTab(tab)}
                        currentPage={currentPage}
                        navItems={currentRoleConfig?.navItems || []}
                        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        isMobile={isMobile}
                        onNavigateToDashboard={() => currentRoleConfig?.defaultPage && handleNavigate(currentRoleConfig.defaultPage, currentRoleConfig.defaultPage)}
                        onNavigate={handleNavigate}
                        candidatesData={candidatesData}
                        jobsData={jobsData}
                    />
                    {showFeedbackBanner && <FeedbackBanner onClose={() => setShowFeedbackBanner(false)} />}
                    <main className="page-content">
                        {currentPage === 'interview' || currentPage === 'ai-video-interview' ? (
                            <InterviewComponentToRender
                                currentUser={currentUser} interviewingCandidate={interviewingCandidate} currentApplicationId={currentApplicationId}
                                onSaveInterviewResults={handleSaveInterviewResults} onStartInterviewSession={handleStartInterviewSession} onNavigate={handleNavigate}
                                jobsData={jobsData}
                            />
                        ) : (
                            <PageComponent
                                currentUser={currentUser} usersData={usersData} jobsData={jobsData} candidatesData={candidatesData} placementsData={placementsData}
                                jobScreenView={jobScreenView} selectedJob={selectedJob} interviewingCandidate={interviewingCandidate} currentApplicationId={currentApplicationId} pipelineJobFilter={pipelineJobFilter}
                                onNavigate={handleNavigate} onSaveJob={handleSaveJob} onApplyForJob={handleApplyForJob} onSaveInterviewResults={handleSaveInterviewResults}
                                onSaveAssessmentResults={handleSaveAssessmentResults} onStartInterviewSession={handleStartInterviewSession} onUpdateApplicationStatus={handleUpdateApplicationStatus}
                                onScheduleInterview={handleScheduleInterview} onRemoveCandidateFromPipeline={handleRemoveCandidateFromPipeline} onDeleteCandidate={handleDeleteCandidate}
                                onClearAllCandidates={handleClearAllCandidates} onSendJobToCandidate={handleSendJobToCandidate} onPipelineJobFilterChange={setPipelineJobFilter}
                                onCreateNewJob={handleCreateNewJob} onCancelJobAction={handleCancelJobAction} onEditJob={handleEditJob} onPublishJob={handlePublishJob}
                                onViewJob={(job: any) => { setSelectedJob(job); setJobScreenView('detail'); }} onStartApplication={(job: any) => { setSelectedJob(job); handleNavigate('apply-for-job', 'find-jobs'); }}
                                onMoveCandidates={handleMoveCandidatesToPipeline} onSaveAIConfig={handleSaveAIConfig} onUpdateUserProfile={handleUpdateUserProfile}
                                onSaveResume={handleSaveResume} resumeList={resumeList}
                                jobToEdit={jobToEditForPage}
                            />
                        )}
                    </main>
                </div>
                {profileModalTab && (
                    <ProfileModal
                        user={currentUser}
                        initialTab={profileModalTab}
                        onClose={() => setProfileModalTab(null)}
                        onChangePassword={async (newPassword) => {
                            const { error } = await api.put(`/users/${currentUser.id}`, { password: newPassword });
                            return { success: !error, error: error ? getErrorMessage(error) : undefined };
                        }}
                    />
                )}
            </div>
            {currentUser?.role === 'Candidate' && currentPage !== 'screening-session' && <FloatingAIChatWidget />}
        </AIProvider>
    );
}
