
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

// export const YaalOfficeLogo = (props) => (
//   <img
//     src={`data:image/png;base64,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`}
//     alt="Yāl Office Logo"
//     width="40"
//     height="40"
//     style={{ objectFit: 'contain' }}
//     {...props}
//   />
// );

export const YaalOfficeLogo = (props) => (
  <img
    src="https://storage.googleapis.com/yalimages/ChatGPT%20Image%20Nov%2019%2C%202025%2C%2007_09_42%20AM.png"
    alt="Yāl Office Logo"
    width="70"
    height="70"
    style={{ objectFit: 'contain' }}
    {...props}
  />
);

export const DashboardIcon = (props) => (
    <Icon {...props}>
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
    </Icon>
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
    <Icon {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></Icon>
);

export const JobsIcon = (props) => (
    <Icon {...props}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></Icon>
);

export const CandidatesIcon = (props) => (
     <Icon {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></Icon>
);

export const InterviewIcon = (props) => (
    <Icon {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></Icon>
);

export const OnboardingIcon = (props) => (
    <Icon {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></Icon>
);

export const SettingsIcon = (props) => (
    <Icon {...props}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></Icon>
);

export const RecruitmentIcon = (props) => (
    <Icon {...props}><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></Icon>
);

export const ScreenShareIcon = (props) => (
    <Icon {...props}>
        <path d="M20 13V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"></path>
        <line x1="12" x2="22" y1="18" y2="18"></line>
        <polyline points="18 14 22 18 18 22"></polyline>
    </Icon>
);

export const SearchIcon = (props) => (
    <Icon {...props}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></Icon>
);

export const TargetIcon = (props) => (
    <Icon {...props}><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></Icon>
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
    <Icon {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></Icon>
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
    <Icon {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></Icon>
);

export const GlobeIcon = (props) => (
    <Icon {...props}><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 1.5 0 0 1-4 10 15.3 1.5 0 0 1-4-10 15.3 1.5 0 0 1 4-10z"></path></Icon>
);

export const BuildingIcon = (props) => (
    <Icon {...props}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line><line x1="9" y1="15" x2="9.01" y2="15"></line><line x1="15" y1="15" x2="15.01" y2="15"></line></Icon>
);

export const ChatIcon = (props) => (
    <Icon {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></Icon>
);

export const AudioWaveIcon = (props) => (
    <Icon {...props}>
        <path d="M2 10v4"/>
        <path d="M6 7v10"/>
        <path d="M10 4v16"/>
        <path d="M14 7v10"/>
        <path d="M18 10v4"/>
    </Icon>
);

export const RobotIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12,2A2,2 0 0,1 14,4C14,4.24 13.95,4.47 13.87,4.68C16.95,5.5 19.5,8.23 19.5,11.5V12A1,1 0 0,1 18.5,13H5.5A1,1 0 0,1 4.5,12V11.5C4.5,8.23 7.05,5.5 10.13,4.68C10.05,4.47 10,4.24 10,4A2,2 0 0,1 12,2M9,14H15A1,1 0 0,1 16,15V18A1,1 0 0,1 15,19H9A1,1 0 0,1 8,18V15A1,1 0 0,1 9,14M12,15.5A1.5,1.5 0 0,0 10.5,17A1.5,1.5 0 0,0 12,18.5A1.5,1.5 0 0,0 13.5,17A1.5,1.5 0 0,0 12,15.5Z" />
    </svg>
);

export const BriefcaseIcon = (props) => (
    <Icon {...props}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </Icon>
);

export const CheckCircleIcon = (props) => (
    <Icon {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></Icon>
);

export const UploadCloudIcon = (props) => (
    <Icon {...props}><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path><polyline points="16 16 12 12 8 16"></polyline></Icon>
);

export const SparklesIcon = (props) => (
    <Icon {...props}><path d="M12 2L14.39 8.61L21 11L14.39 13.39L12 20L9.61 13.39L3 11L9.61 8.61L12 2Z" /></Icon>
);

export const FileTextIcon = (props) => (
    <Icon {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></Icon>
);

export const CalendarIcon = (props) => (
    <Icon {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></Icon>
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

export const GoogleIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...props}>
        <path fill="#4285F4" d="M21.35 11.1H12v2.8h5.35c-0.25 1.3-1.05 2.35-2.25 3.15v2.6h3.65c2.15-2 3.4-4.9 3.4-8.15 0-0.8-0.1-1.55-0.25-2.3z"/>
        <path fill="#34A853" d="M12 21c2.7 0 4.95-0.9 6.6-2.45l-3.65-2.6c-0.9 0.6-2.05 0.95-3.4 0.95-2.6 0-4.8-1.75-5.6-4.1H2.9v2.6C4.55 18.4 8 21 12 21z"/>
        <path fill="#FBBC05" d="M6.4 12.85c-0.2-0.6-0.3-1.25-0.3-1.9s0.1-1.3 0.3-1.9V6.45H2.9c-1.35 2.7-1.35 5.8 0 8.5l3.5-2.1z"/>
        <path fill="#EA4335" d="M12 5.45c1.45 0 2.75 0.5 3.8 1.5l2.85-2.85C16.95 2.55 14.7 1.5 12 1.5 8 1.5 4.55 4.1 2.9 7.45l3.5 2.1c0.8-2.35 3-4.1 5.6-4.1z"/>
    </svg>
);