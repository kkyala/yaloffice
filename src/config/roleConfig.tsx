
import React from 'react';

// Import Icons
import { DashboardIcon, UsersIcon, JobsIcon, CandidatesIcon, InterviewIcon, OnboardingIcon, SettingsIcon, RecruitmentIcon, SearchIcon, TargetIcon, PlusIcon, ChatIcon, FileTextIcon, CalendarIcon } from '../components/Icons';

// Import Page Components
import AdminDashboardScreen from '../pages/AdminDashboardScreen';
import UserManagementScreen from '../pages/UserManagementScreen';
import EmployerDashboardScreen from '../pages/EmployerDashboardScreen';
import CandidatesScreen from '../pages/CandidatesScreen';
import AIInterviewScreen from '../pages/AIInterviewScreen';
import JobsScreen from '../pages/JobsScreen';
import SettingsScreen from '../pages/SettingsScreen';
import RecruiterDashboardScreen from '../pages/RecruiterDashboardScreen';
import CandidateMatchingScreen from '../pages/CandidateMatchingScreen';
import CandidateDashboardScreen from '../pages/CandidateDashboardScreen';
import AllCandidatesScreen from '../pages/AllCandidatesScreen';
import CandidateJobsScreen from '../pages/CandidateJobsScreen';
import JobApplicationScreen from '../pages/JobApplicationScreen';
import AgentDashboardScreen from '../pages/AgentDashboardScreen';
import PlacementsScreen from '../pages/PlacementsScreen';
import EmployerJobsListScreen from '../pages/EmployerJobsListScreen';
import JobCreationScreen from '../pages/JobCreationScreen';
import AgentJobsListScreen from '../pages/AgentJobsListScreen';
import AIInterviewReportScreen from '../pages/AIInterviewReportScreen';
import AIInterviewPlatformScreen from '../pages/AIInterviewPlatformScreen';
import GeminiLiveScreen from '../pages/GeminiLiveScreen';
import PreInterviewAssessmentScreen from '../pages/PreInterviewAssessmentScreen';
import SkillZoneScreen from '../pages/SkillZoneScreen';
import RecruitmentSurveyScreen from '../pages/RecruitmentSurveyScreen';
import EmployerAIPlatformScreen from '../pages/EmployerAIPlatformScreen';
import MyResumeScreen from '../pages/MyResumeScreen';
import CalendarScreen from '../pages/CalendarScreen';
import AIVideoInterviewScreen from '../pages/AIVideoInterviewScreen'; // NEW: Video Interview Screen
import LiveKitInterviewScreen from '../pages/LiveKitInterviewScreen'; // Tavus + LiveKit Interview
import ScreeningSessionScreen from '../pages/ScreeningSessionScreen'; // NEW: Audio Screening

// A placeholder for pages that are mentioned but not fully implemented
const PlaceholderScreen = ({ pageName }) => (
    <div>
        <h2>{pageName}</h2>
        <p>This page is under construction.</p>
    </div>
);

export const roleConfig = {
    Employer: {
        defaultPage: 'recruitment-dashboard',
        navItems: [
            { name: 'Dashboard', page: 'recruitment-dashboard', icon: <DashboardIcon /> },
            { name: 'AI Platform', page: 'ai-platform', icon: <ChatIcon /> },
            { name: 'Calendar', page: 'calendar', icon: <CalendarIcon /> },
            {
                name: 'Recruit',
                page: 'recruitment',
                icon: <RecruitmentIcon />,
                children: [
                    { name: 'List of Jobs', page: 'employer-jobs-list', icon: <JobsIcon /> },
                    { name: 'Add Job', page: 'employer-add-job', icon: <PlusIcon /> },
                    { name: 'Pipeline', page: 'recruitment-pipeline', icon: <CandidatesIcon /> },
                    { name: 'Candidates', page: 'candidates', icon: <UsersIcon /> },
                    { name: 'Skill Zone', page: 'skill-zone', icon: <TargetIcon /> },
                    { name: 'Survey', page: 'recruitment-survey', icon: <InterviewIcon /> },
                ]
            }
        ],
        pages: {
            // Core Recruitment Pages
            'recruitment-dashboard': EmployerDashboardScreen,
            'ai-platform': EmployerAIPlatformScreen,
            'recruitment-pipeline': CandidatesScreen,
            'recruitment-survey': RecruitmentSurveyScreen,
            'candidates': AllCandidatesScreen, // Pointing to the real component now
            'skill-zone': SkillZoneScreen,
            'calendar': CalendarScreen,

            // New Job Management Pages for Employer
            'employer-jobs-list': EmployerJobsListScreen,
            'employer-add-job': JobCreationScreen,
            'employer-edit-job': JobCreationScreen,
            'interview-report': AIInterviewReportScreen,
            'interview': AIInterviewScreen, // Existing audio interview
            'ai-video-interview': AIVideoInterviewScreen, // NEW: Video interview
        },
    },
    Candidate: {
        defaultPage: 'dashboard',
        navItems: [
            { name: 'My Applications', page: 'dashboard', icon: <JobsIcon /> },
            { name: 'My Resume', page: 'my-resume', icon: <FileTextIcon /> },
            { name: 'My Calendar', page: 'calendar', icon: <CalendarIcon /> },
            { name: 'Find Jobs', page: 'find-jobs', icon: <SearchIcon /> },
            { name: 'Settings', page: 'settings', icon: <SettingsIcon /> },
        ],
        pages: {
            dashboard: CandidateDashboardScreen,
            'find-jobs': CandidateJobsScreen,
            'my-resume': MyResumeScreen,
            'calendar': CalendarScreen,
            'apply-for-job': JobApplicationScreen,
            'pre-interview-assessment': PreInterviewAssessmentScreen,
            'screening-session': ScreeningSessionScreen, // NEW
            interview: AIInterviewScreen, // Existing audio interview
            'ai-video-interview': AIVideoInterviewScreen, // Gemini Video interview
            'livekit-interview': LiveKitInterviewScreen, // Tavus + LiveKit interview
            'interview-report': AIInterviewReportScreen,
            settings: SettingsScreen,
        },
    },
    Admin: {
        defaultPage: 'dashboard',
        navItems: [
            { name: 'Dashboard', page: 'dashboard', icon: <DashboardIcon /> },
            { name: 'User Management', page: 'users', icon: <UsersIcon /> },
            { name: 'Settings', page: 'settings', icon: <SettingsIcon /> },
        ],
        pages: {
            dashboard: AdminDashboardScreen,
            users: UserManagementScreen,
            settings: SettingsScreen,
        },
    },
    Agent: {
        defaultPage: 'dashboard',
        navItems: [
            { name: 'Dashboard', page: 'dashboard', icon: <DashboardIcon /> },
            { name: 'AI Platform', page: 'ai-platform', icon: <ChatIcon /> },
            { name: 'Jobs', page: 'agent-jobs-list', icon: <JobsIcon /> },
            { name: 'Calendar', page: 'calendar', icon: <CalendarIcon /> },
            { name: 'AI Candidates Match', page: 'matching', icon: <TargetIcon /> },
            { name: 'Talent Pipeline', page: 'candidates', icon: <CandidatesIcon /> },
            { name: 'All Candidates', page: 'allCandidates', icon: <UsersIcon /> },
            { name: 'Placements', page: 'placements', icon: <OnboardingIcon /> },
            { name: 'Settings', page: 'settings', icon: <SettingsIcon /> },
        ],
        pages: {
            dashboard: AgentDashboardScreen,
            'ai-platform': AIInterviewPlatformScreen,
            'agent-jobs-list': AgentJobsListScreen,
            'employer-add-job': JobCreationScreen,
            'employer-edit-job': JobCreationScreen,
            candidates: CandidatesScreen,
            matching: CandidateMatchingScreen,
            allCandidates: AllCandidatesScreen,
            placements: PlacementsScreen,
            settings: SettingsScreen,
            'calendar': CalendarScreen,
            'interview-report': AIInterviewReportScreen,
            'interview': AIInterviewScreen, // Existing audio interview
            'ai-video-interview': AIVideoInterviewScreen, // NEW: Video interview
        },
    },
    Recruiter: {
        defaultPage: 'dashboard',
        navItems: [
            { name: 'Dashboard', page: 'dashboard', icon: <DashboardIcon /> },
            { name: 'AI Platform', page: 'ai-platform', icon: <ChatIcon /> },
            { name: 'Gemini Interview Live', page: 'gemini-live', icon: <ChatIcon /> },
            { name: 'Calendar', page: 'calendar', icon: <CalendarIcon /> },
            { name: 'AI Candidates Match', page: 'matching', icon: <TargetIcon /> },
            { name: 'Talent Pipeline', page: 'candidates', icon: <CandidatesIcon /> },
            { name: 'All Candidates', page: 'allCandidates', icon: <UsersIcon /> },
            { name: 'Settings', page: 'settings', icon: <SettingsIcon /> },
        ],
        pages: {
            dashboard: RecruiterDashboardScreen,
            'ai-platform': AIInterviewPlatformScreen,
            'gemini-live': GeminiLiveScreen,
            candidates: CandidatesScreen,
            matching: CandidateMatchingScreen,
            allCandidates: AllCandidatesScreen,
            settings: SettingsScreen,
            'calendar': CalendarScreen,
            'interview-report': AIInterviewReportScreen,
            'interview': AIInterviewScreen, // Existing audio interview
            'ai-video-interview': AIVideoInterviewScreen, // NEW: Video interview
        },
    },
};
