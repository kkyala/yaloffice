
import React from 'react';

const Icon = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    />
);

export const YaalOfficeLogo = (props) => (
    <img
        src="https://storage.googleapis.com/yalassest/logo_updated.png"
        alt="Yāl Hire Logo"
        width="54"
        height="54"
        style={{ objectFit: 'contain' }}
        {...props}
    />
);

export const DashboardIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/control-panel.png" alt="Dashboard" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const ChevronLeftIcon = (props) => (
    <Icon {...props}><polyline points="15 18 9 12 15 6"></polyline></Icon>
);

export const ChevronRightIcon = (props) => (
    <Icon {...props}><polyline points="9 18 15 12 9 6"></polyline></Icon>
);

export const PlusIcon = (props) => (
    <Icon {...props}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></Icon>
);

export const UsersIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/conference-call.png" alt="Users" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const JobsIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/briefcase.png" alt="Jobs" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const CandidatesIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/management.png" alt="Candidates" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const InterviewIcon = (props) => (
    <Icon {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></Icon>
);

export const OnboardingIcon = (props) => (
    <Icon {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></Icon>
);

export const SettingsIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/gear.png" alt="Settings" width="28" height="28" style={{ objectFit: 'contain', cursor: 'pointer' }} {...props} />
);

export const RecruitmentIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/find-user-male.png" alt="Recruitment" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const ScreenShareIcon = (props) => (
    <Icon {...props}>
        <path d="M20 13V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"></path>
        <line x1="12" x2="22" y1="18" y2="18"></line>
        <polyline points="18 14 22 18 18 22"></polyline>
    </Icon>
);

export const SearchIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/search.png" alt="Search" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const TargetIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/target.png" alt="Target" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const MicOnIcon = (props) => (
    <Icon {...props}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></Icon>
);

export const MicOffIcon = (props) => (
    <Icon {...props}><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></Icon>
);

export const VideoOnIcon = (props) => (
    <Icon {...props}><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></Icon>
);

export const VideoOffIcon = (props) => (
    <Icon {...props}><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></Icon>
);

export const PhoneOffIcon = (props) => (
    <Icon {...props}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2.05v1.59a2 2 0 0 1-2.18 2.18a19.79 19.79 0 0 1-8.63-3.07a19.42 19.42 0 0 1-6.1-6.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h1.59a2 2 0 0 1 2.05 1.72a12.84 12.84 0 0 0 .7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.6 3.4zM22 2L2 22"></path></Icon>
);

export const LogoutIcon = (props) => (
    <Icon {...props}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
    </Icon>
);

export const SendIcon = (props) => (
    <Icon {...props}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></Icon>
);

export const XIcon = (props) => (
    <Icon {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></Icon>
);

export const MenuIcon = (props) => (
    <Icon {...props}><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></Icon>
);

export const BellIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/bell.png" alt="Notifications" width="28" height="28" style={{ objectFit: 'contain', cursor: 'pointer' }} {...props} />
);

export const GlobeIcon = (props) => (
    <img
        src="https://img.icons8.com/3d-fluency/94/globe.png"
        alt="Language"
        width="28"
        height="28"
        style={{ objectFit: 'contain', cursor: 'pointer' }}
        {...props}
    />
);

export const BuildingIcon = (props) => (
    <Icon {...props}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line><line x1="9" y1="15" x2="9.01" y2="15"></line><line x1="15" y1="15" x2="15.01" y2="15"></line></Icon>
);

export const ChatIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/chat-message.png" alt="Chat" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const AudioWaveIcon = (props) => (
    <Icon {...props}>
        <path d="M2 10v4" />
        <path d="M6 7v10" />
        <path d="M10 4v16" />
        <path d="M14 7v10" />
        <path d="M18 10v4" />
    </Icon>
);

export const StopCircleIcon = (props) => (
    <Icon {...props}>
        <circle cx="12" cy="12" r="10"></circle>
        <rect x="9" y="9" width="6" height="6"></rect>
    </Icon>
);

export const Volume2Icon = (props) => (
    <Icon {...props}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </Icon>
);

export const RobotIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/robot-2.png" alt="AI Robot" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const BriefcaseIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/briefcase.png" alt="Briefcase" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const CheckCircleIcon = (props) => (
    <Icon {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></Icon>
);

export const AlertCircleIcon = (props) => (
    <Icon {...props}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></Icon>
);

export const UploadCloudIcon = (props) => (
    <Icon {...props}><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path><polyline points="16 16 12 12 8 16"></polyline></Icon>
);

export const SparklesIcon = (props) => (
    <Icon {...props}><path d="M12 2L14.39 8.61L21 11L14.39 13.39L12 20L9.61 13.39L3 11L9.61 8.61L12 2Z" /></Icon>
);

export const FileTextIcon = (props) => (
    <img src="https://img.icons8.com/3d-fluency/94/document.png" alt="File" width="28" height="28" style={{ objectFit: 'contain' }} {...props} />
);

export const CalendarIcon = (props) => (
    <img
        src="https://img.icons8.com/3d-fluency/94/calendar.png"
        alt="Calendar"
        width="28"
        height="28"
        style={{ objectFit: 'contain', cursor: 'pointer' }}
        {...props}
    />
);

export const FilePlusIcon = (props) => (
    <Icon {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></Icon>
);

// --- SYNDICATION ICONS ---
export const LinkedInIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#0077B5" {...props}>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
);

export const IndeedIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#2557a7" {...props}>
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm7.25 18.25a.75.75 0 0 1-1.06 1.06l-3.25-3.25a.75.75 0 0 1 1.06-1.06l3.25 3.25zm-6-3.5a6.25 6.25 0 1 1 0-12.5 6.25 6.25 0 0 1 0 12.5z" />
    </svg>
);

export const GlassdoorIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#0caa41" {...props}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v8h-2v-8z" />
    </svg>
);

export const PlayCircleIcon = (props) => (
    <Icon {...props}><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></Icon>
);

export const GoogleIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...props}>
        <path fill="#4285F4" d="M21.35 11.1H12v2.8h5.35c-0.25 1.3-1.05 2.35-2.25 3.15v2.6h3.65c2.15-2 3.4-4.9 3.4-8.15 0-0.8-0.1-1.55-0.25-2.3z" />
        <path fill="#34A853" d="M12 21c2.7 0 4.95-0.9 6.6-2.45l-3.65-2.6c-0.9 0.6-2.05 0.95-3.4 0.95-2.6 0-4.8-1.75-5.6-4.1H2.9v2.6C4.55 18.4 8 21 12 21z" />
        <path fill="#FBBC05" d="M6.4 12.85c-0.2-0.6-0.3-1.25-0.3-1.9s0.1-1.3 0.3-1.9V6.45H2.9c-1.35 2.7-1.35 5.8 0 8.5l3.5-2.1z" />
    </svg>
);

export const UserIcon = (props) => (
    <Icon {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></Icon>
);

export const GraduationCapIcon = (props) => (
    <Icon {...props}><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></Icon>
);

export const CodeIcon = (props) => (
    <Icon {...props}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></Icon>
);

export const AwardIcon = (props) => (
    <Icon {...props}><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></Icon>
);

export const FilterIcon = (props) => (
    <Icon {...props}>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </Icon>
);