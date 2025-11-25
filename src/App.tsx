
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { roleConfig } from './config/roleConfig';

// Components
import LoginScreen from './pages/LoginScreen';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import ProfileModal from './components/ProfileModal';
import { AIProvider } from './context/AIProvider';
import FeedbackBanner from './components/FeedbackBanner';
import FloatingAIChatWidget from './components/FloatingAIChatWidget';
import AIVideoInterviewScreen from './pages/AIVideoInterviewScreen';
import LiveKitInterviewScreen from './pages/LiveKitInterviewScreen';

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

    const currentRoleConfig = useMemo(() => (currentUser ? roleConfig[currentUser.role] : null), [currentUser]);

    const handleError = (error: any, context?: string) => {
        console.error(`Error ${context || ''}:`, error);
    };

    const refetchCandidates = useCallback(async () => {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.user) {
            setCandidatesData([]);
            return;
        }

        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('id, role, name')
            .eq('id', authSession.user.id)
            .single();

        if (profileError || !userProfile) {
            handleError(profileError || new Error('User profile not found'), 'getting user role for refetch');
            setCandidatesData([]);
            return;
        }

        if (userProfile.role === 'Candidate') {
            const { data, error } = await supabase.from('candidates').select('*').eq('user_id', userProfile.id);
            if (error) handleError(error, 'refetching candidate applications');
            else setCandidatesData(data || []);
        } else if (userProfile.role === 'Employer') {
            const { data: employerJobsData, error: jobsError } = await supabase
                .from('jobs')
                .select('id')
                .eq('employer', userProfile.name);

            if (jobsError) {
                handleError(jobsError, `refetching employer's job IDs for ${userProfile.name}`);
                setCandidatesData([]);
                return;
            }

            const employerJobIds = employerJobsData.map(job => job.id);

            if (employerJobIds.length === 0) {
                setCandidatesData([]);
                return;
            }

            const { data, error } = await supabase
                .from('candidates')
                .select('*')
                .in('jobId', employerJobIds);

            if (error) handleError(error, `refetching candidate applications for employer ${userProfile.name}`);
            else setCandidatesData(data || []);
        }
        else {
            const { data, error } = await supabase.from('candidates').select('*');
            if (error) handleError(error, 'refetching all candidates');
            else setCandidatesData(data || []);
        }
    }, []);

    const refetchUsers = async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) handleError(error, 'refetching users');
        else setUsersData(data || []);
    };
    const refetchJobs = async () => {
        const { data, error } = await supabase.from('jobs').select('*');
        if (error) handleError(error, 'refetching jobs');
        else setJobsData(data || []);
    };
    const refetchPlacements = async () => {
        const { data, error } = await supabase.from('placements').select('*');
        if (error) handleError(error, 'refetching placements');
        else setPlacementsData(data || []);
    };
    
    const refetchResume = async (userId: string) => {
        const { data, error } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', userId)
            .order('version', { ascending: false });
            
        if (error) handleError(error, 'fetching resumes');
        else setResumeList(data || []);
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                setCurrentUser(null);
                setResumeList([]);
                setCurrentPage('');
            }
        });
        return () => subscription?.unsubscribe && subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!session?.user) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const loadInitialData = async () => {
            setIsLoading(true);
            const { data: userProfile, error: profileError } = await supabase
                .from('users').select('*').eq('id', session.user.id).single();

            if (!isMounted) return;

            let finalUserProfile = userProfile;

            if (profileError && profileError.code === 'PGRST116') {
                console.warn('User profile not found. Attempting to create one from auth metadata.');
                const { user_metadata } = session.user;
                if (user_metadata && user_metadata.name && user_metadata.role) {
                    const { data: newlyCreatedProfile, error: insertError } = await supabase.from('users').insert({
                        id: session.user.id,
                        email: session.user.email,
                        name: user_metadata.name,
                        role: user_metadata.role,
                        mobile: user_metadata.mobile,
                        status: user_metadata.status || 'Active',
                    }).select().single();
                    if (insertError) { handleError(insertError, 'recreating user profile from metadata'); await supabase.auth.signOut(); return; }
                    finalUserProfile = newlyCreatedProfile;
                    console.log('Successfully created missing user profile.');
                } else {
                    handleError(new Error('User profile is missing and there is no metadata to recreate it.'), 'fetching user profile');
                    await supabase.auth.signOut();
                    return;
                }
            } else if (profileError) {
                handleError(profileError, 'fetching user profile');
                await supabase.auth.signOut();
                return;
            }

            setCurrentUser(finalUserProfile);
            if (finalUserProfile && !currentPage) {
                const initialPage = roleConfig[finalUserProfile.role]?.defaultPage || 'dashboard';
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
                promises.push(refetchResume(finalUserProfile.id));
            }

            await Promise.all(promises);

            if (isMounted) {
                setIsLoading(false);
            }
        };

        loadInitialData();

        return () => { isMounted = false; };
    }, [session, refetchCandidates, currentPage]);

    const handleLogin = async ({ email, password }: { email: string; password: string; }) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { success: !error, error: error ? getErrorMessage(error) : null };
    };
    const handleSignup = async ({ email, password, fullName, role, mobileNumber }: { email: string; password: string; fullName: string; role: string; mobileNumber: string; }) => {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { name: fullName, role: role, mobile: mobileNumber, status: 'Active' } } });
        if (signUpError) {
            if ((signUpError as any).message && (signUpError as any).message.includes('unique constraint')) return { success: false, error: 'A user with this email already exists.' };
            handleError(signUpError, 'signing up user');
            return { success: false, error: getErrorMessage(signUpError) };
        }
        if (!authData.user) return { success: false, error: 'Sign up succeeded but no user data was returned. Please try logging in.' };
        const { error: profileError } = await supabase.from('users').insert({ id: authData.user.id, email: authData.user.email, name: fullName, role: role, mobile: mobileNumber, status: 'Active' });
        if (profileError) { handleError(profileError, 'creating user profile after signup'); console.warn(`User ${authData.user.id} signed up but profile creation failed. It will be retried on next login.`); }
        return { success: true };
    };
    const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setCurrentPage(''); };

    const handleNavigate = useCallback((page: string, parent: string, context: { applicationId?: number; candidateId?: number } = {}) => {
        setCurrentPage(page);
        setActiveParent(parent);
        if (isMobile) setIsSidebarOpen(false);
        if (context.applicationId !== undefined || context.candidateId !== undefined) setInterviewingContext({ applicationId: context.applicationId ?? null, candidateId: context.candidateId ?? null }); else setInterviewingContext(null);
    }, [isMobile]);

    const handleUpdateUserProfile = async (profileData: any) => {
        if (!currentUser) return { success: false, error: 'User not logged in.' };
        const { data, error } = await supabase.from('users').update(profileData).eq('id', currentUser.id).select().single();
        if (error) { handleError(error, 'updating user profile'); return { success: false, error: getErrorMessage(error) }; }
        setCurrentUser(data);
        await refetchUsers();
        return { success: true };
    };
    const handleSaveAIConfig = async (config: any) => {
        if (!currentUser) return { success: false, error: 'No user is currently logged in.' };
        const { data, error } = await supabase.from('users').update({ ai_config: config }).eq('id', currentUser.id).select().single();
        if (error) { handleError(error, 'saving AI configuration'); return { success: false, error: getErrorMessage(error) }; }
        setCurrentUser(data);
        await refetchUsers();
        return { success: true };
    };
    
    const handleSaveResume = async (resumeData: any) => {
        if (!currentUser) return { success: false, error: 'User not logged in.' };
        
        try {
            const { count, error: countError } = await supabase
                .from('resumes')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', currentUser.id);
                
            if (countError) throw countError;
            const nextVersion = (count || 0) + 1;

            await supabase
                .from('resumes')
                .update({ is_current: false })
                .eq('user_id', currentUser.id);

            const { data: newResume, error: insertError } = await supabase
                .from('resumes')
                .insert({
                    user_id: currentUser.id,
                    version: nextVersion,
                    parsed_data: resumeData,
                    is_current: true,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            const updates: any = {};
            if (!currentUser.name && resumeData.personalInfo?.name) updates.name = resumeData.personalInfo.name;
            if (!currentUser.mobile && resumeData.personalInfo?.phone) updates.mobile = resumeData.personalInfo.phone;
            if (!currentUser.city && resumeData.personalInfo?.city) updates.city = resumeData.personalInfo.city;
            if (!currentUser.state && resumeData.personalInfo?.state) updates.state = resumeData.personalInfo.state;
            if (!currentUser.linkedin_url && resumeData.personalInfo?.linkedin) updates.linkedin_url = resumeData.personalInfo.linkedin;
            
            if (Object.keys(updates).length > 0) {
                await supabase.from('users').update(updates).eq('id', currentUser.id);
                await refetchUsers();
            }

            await refetchResume(currentUser.id);
            return { success: true };

        } catch (err) {
            handleError(err, 'saving resume version');
            return { success: false, error: getErrorMessage(err) };
        }
    };

    const handleSaveInterviewResults = async (applicationId: number, score: number, transcript: string) => {
        const { data: appData, error: fetchError } = await supabase.from('candidates').select('interview_config').eq('id', applicationId).single();
        if (fetchError) { handleError(fetchError, 'fetching candidate for interview save'); return; }
        const newConfig = { ...(appData.interview_config || {}), interviewStatus: 'finished', aiScore: score, transcript };
        const { error } = await supabase.from('candidates').update({ interview_config: newConfig }).eq('id', applicationId);
        if (error) handleError(error, 'saving interview results'); else await refetchCandidates();
    };
    const handleSaveAssessmentResults = async (applicationId: number, assessmentData: any) => {
        const { data: appData, error: fetchError } = await supabase.from('candidates').select('interview_config').eq('id', applicationId).single();
        if (fetchError) { handleError(fetchError, 'fetching candidate for assessment save'); return { success: false }; }
        const newConfig = { ...(appData.interview_config || {}), interviewStatus: 'assessment_completed', assessmentData };
        const { error } = await supabase.from('candidates').update({ interview_config: newConfig }).eq('id', applicationId);
        if (error) { handleError(error, 'saving assessment results'); return { success: false }; }
        await refetchCandidates();
        return { success: true };
    };
    const handleUpdateApplicationStatus = async (applicationId: number, newStatus: string) => {
        const { error } = await supabase.from('candidates').update({ status: newStatus }).eq('id', applicationId);
        if (error) handleError(error, 'updating application status'); else await refetchCandidates();
    };
    const handleScheduleInterview = async (applicationId: number, config: any) => {
        const { data: appData, error: fetchError } = await supabase.from('candidates').select('interview_config').eq('id', applicationId).single();
        if (fetchError) { handleError(fetchError, 'fetching app for schedule'); return { success: false }; }
        const newConfig = { ...(appData.interview_config || {}), ...config, scheduledAt: new Date().toISOString() }; // Add scheduledAt
        const { error } = await supabase.from('candidates').update({ interview_config: newConfig }).eq('id', applicationId);
        if (error) { handleError(error, 'scheduling interview'); return { success: false }; }
        await refetchCandidates();
        return { success: true };
    };
    const handleStartInterviewSession = async (applicationId: number) => {
        const { data: appData, error: fetchError } = await supabase.from('candidates').select('interview_config').eq('id', applicationId).single();
        if (fetchError) { handleError(fetchError, 'fetching app for interview start'); return { success: false }; }
        const newConfig = { ...(appData.interview_config || {}), interviewStatus: 'started' };
        const { error } = await supabase.from('candidates').update({ interview_config: newConfig }).eq('id', applicationId);
        if (error) { handleError(error, 'starting interview session'); return { success: false }; }
        await refetchCandidates();
        return { success: true };
    };
    const handleApplyForJob = async (job: any, profileData: any) => {
        if (!currentUser) return { success: false, error: 'User not logged in' };
        const userProfilePayload = { name: profileData.name, mobile: profileData.mobile_number, city: profileData.city, state: profileData.state, linkedin_url: profileData.linkedin_url, work_authorization: profileData.work_authorization };
        const { error: userUpdateError } = await supabase.from('users').update(userProfilePayload).eq('id', currentUser.id);
        if (userUpdateError) return { success: false, error: getErrorMessage(userUpdateError) };
        await refetchUsers();
        const { data: existingApp, error: appCheckError } = await supabase.from('candidates').select('id').eq('user_id', currentUser.id).eq('jobId', job.id).maybeSingle();
        if (appCheckError) return { success: false, error: getErrorMessage(appCheckError) };
        if (existingApp) return { success: false, error: 'You have already applied for this job.' };
        const applicationPayload = { jobId: job.id, name: profileData.name, dob: profileData.dob, role: job.title, status: 'Applied', resumeSummary: profileData.summary, source: profileData.source, user_id: currentUser.id };
        const { error: appError } = await supabase.from('candidates').insert([applicationPayload]);
        if (appError) return { success: false, error: getErrorMessage(appError) };
        await refetchCandidates();
        return { success: true };
    };

    const handleSaveJob = async (jobData: any) => {
        const payload = { ...jobData };
        const isUpdate = typeof payload.id === 'number' && Number.isFinite(payload.id) && payload.id > 0;
        if (!payload.employer && currentUser?.name) payload.employer = currentUser.name;

        try {
            let response: any;
            if (isUpdate) {
                const { id, ...updateFields } = payload;
                response = await supabase.from('jobs').update(updateFields).eq('id', id).select().single();
            } else {
                const { id, ...insertFields } = payload;
                response = await supabase.from('jobs').insert([insertFields]).select().single();
            }

            if (response.error) {
                if (response.error.code === '23505') return { success: false, error: 'Internal ID collision occurred. Please try again.' };
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
        const { error } = await supabase.from('jobs').update({ status: 'Active' }).eq('id', jobId);
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
        if (interviewType === 'livekit' || interviewType === 'tavus') {
            return LiveKitInterviewScreen;
        }
        if (interviewType === 'video') {
            return AIVideoInterviewScreen;
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
                        onChangeUsername={async (newName) => handleUpdateUserProfile({ name: newName })} 
                        onChangePassword={async (newPassword) => {
                            const { error } = await supabase.auth.updateUser({ password: newPassword });
                            return { success: !error, error: error ? getErrorMessage(error) : undefined };
                        }} 
                    />
                )}
            </div>
            {currentUser?.role === 'Candidate' && <FloatingAIChatWidget />}
        </AIProvider>
    );
}
