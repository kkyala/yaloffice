# How to Use Yaal Office AI Recruitment Platform

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles](#user-roles)
3. [For Candidates](#for-candidates)
4. [For Employers](#for-employers)
5. [For Recruiters/Agents](#for-recruitersagents)
6. [Video Interview Setup](#video-interview-setup)
7. [Resume Management](#resume-management)
8. [Common Workflows](#common-workflows)

---

## Getting Started

### Initial Setup

1. **Start the Application**:
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000`

2. **Create an Account**:
   - Click "Sign Up"
   - Enter your email, name, and password
   - Select your role: Candidate, Employer, Agent, or Recruiter
   - Click "Create Account"

3. **Log In**:
   - Enter your credentials
   - You'll be redirected to your role-specific dashboard

---

## User Roles

### 1. **Candidate**
- Browse and apply for jobs
- Upload and manage resumes
- Take AI-powered interviews
- Track application status
- Communicate with AI assistant

### 2. **Employer**
- Post job openings
- Review applications
- Schedule AI interviews
- Manage candidate pipeline
- View interview reports and analytics

### 3. **Agent/Recruiter**
- Match candidates to jobs
- Manage talent pipeline
- Track placements
- Search candidate database
- Generate reports

### 4. **Admin**
- Manage all users
- System configuration
- View platform analytics
- Manage permissions

---

## For Candidates

### Step 1: Upload Your Resume

1. **Navigate to "My Resume"** from the sidebar
2. **Upload your resume**:
   - Drag and drop a file or click to browse
   - Supported formats: PDF, Word (.doc, .docx), or images (JPG, PNG)
3. **AI Auto-Parsing**:
   - Wait 3-5 seconds for AI to parse your document
   - Review the extracted information:
     - Personal info (name, email, phone, LinkedIn)
     - Professional summary
     - Work experience
     - Education
     - Skills
4. **Edit if needed**:
   - Click "Edit Details" to make corrections
   - Add missing information
5. **Save**:
   - Click "Save as New Version"
   - Your resume is now in the system with version control

### Step 2: Browse Jobs

1. **Navigate to "Available Jobs"**
2. **Filter jobs**:
   - Use search bar for keywords
   - Filter by location, salary, or status
3. **View job details**:
   - Click on a job card
   - Read description, requirements, qualifications

### Step 3: Apply for Jobs

1. **Click "Apply Now"** on a job listing
2. **Confirm your application**:
   - Ensure your resume is current
   - Add a cover letter (optional)
3. **Submit**:
   - Your application is sent to the employer
   - Status: "Applied"

### Step 4: Take AI Interview

#### Option A: Audio/Video Interview (Gemini AI)

1. **Wait for interview invitation** (status changes to "Interview Scheduled")
2. **Navigate to the interview**:
   - From dashboard notifications
   - Or from "My Applications" → Click on job
3. **Pre-Interview Assessment**:
   - Answer preliminary questions
   - Review interview instructions
4. **Start Interview**:
   - Click "Start Interview"
   - Grant microphone/camera permissions
   - The AI interviewer will greet you
5. **During Interview**:
   - Answer questions naturally
   - Speak clearly
   - If you need help, ask - but the AI won't give answers
   - View live transcript on the right
6. **End Interview**:
   - Click "End Interview" when done
   - AI will analyze your responses (takes ~10 seconds)

#### Option B: Video Interview with AI Avatar (Tavus + LiveKit)

1. **Wait for interview invitation**
2. **System Check**:
   - Verify camera, microphone, and AI interviewer are ready
3. **Start Interview**:
   - Click "Start Interview"
   - You'll see:
     - **Top**: AI avatar interviewer (realistic video avatar)
     - **Bottom**: Your video feed
     - **Right**: Live transcript
4. **During Interview**:
   - The AI avatar will ask questions
   - Answer naturally as you would in a real interview
   - The AI can see and hear you
   - Real-time transcription is happening
5. **Controls**:
   - Toggle microphone on/off
   - Toggle camera on/off
   - End interview button (red)
6. **After Interview**:
   - AI analyzes your performance
   - Generates score and feedback
   - Results saved to database

### Step 5: View Interview Results

1. **Navigate to "Interview Report"**
2. **Review**:
   - Overall score (1-10)
   - AI-generated feedback
   - Full transcript
   - Recording (if available)
3. **Track Progress**:
   - Monitor application status changes
   - Wait for employer decision

---

## For Employers

### Step 1: Post a Job

1. **Navigate to "Create Job"** from sidebar
2. **Fill in job details**:
   - **Basic Info**: Title, job code, business unit, client
   - **Location**: City, state, or "Remote"
   - **Compensation**: Salary range, client bill rate, pay rate
   - **Description**: Full job description
   - **Qualifications**: Required skills and experience
   - **Requirements**: Education, certifications
3. **Interview Configuration**:
   - Set number of questions (default: 5)
   - Set difficulty: Easy, Medium, Hard
   - Add custom questions (optional)
   - Choose interview type: Audio, Video, or AI Avatar
4. **Job Syndication** (optional):
   - Enable posting to LinkedIn, Indeed, Glassdoor, etc.
   - Select channels
5. **Save Draft or Publish**:
   - "Save Draft" → Job status: Draft
   - "Publish Job" → Job status: Open (live for candidates)

### Step 2: Review Applications

1. **Navigate to "Candidates"**
2. **View Pipeline**:
   - **Columns**: Applied, Sourced, Screening, Interviewing, Offer, Hired
   - **Drag and drop** candidates between stages
3. **Review Candidate**:
   - Click on candidate card
   - View resume summary
   - Check AI match score
   - Review application date

### Step 3: Schedule Interview

1. **Select a candidate**
2. **Click "Schedule Interview"**
3. **Configure Interview**:
   - Interview type: Audio, Video, or AI Avatar (Tavus)
   - Number of questions
   - Difficulty level
   - Custom questions
4. **Send Invitation**:
   - Candidate receives notification
   - Status changes to "Interview Scheduled"

### Step 4: Review Interview Reports

1. **Navigate to "Interview Reports"**
2. **Select a candidate**
3. **Review**:
   - **Score**: AI-generated score (1-10)
   - **Transcript**: Full conversation
   - **Analysis**: Strengths and weaknesses
   - **Recording**: Video/audio replay (if enabled)
4. **Make Decision**:
   - Move candidate to "Offer" stage
   - Or reject and provide feedback

### Step 5: Manage Pipeline

1. **Navigate to "Candidates"** (Kanban view)
2. **Drag and drop** candidates:
   - Applied → Sourced (acknowledged)
   - Sourced → Screening (under review)
   - Screening → Interviewing (interview scheduled/completed)
   - Interviewing → Offer (moving forward)
   - Offer → Hired (accepted offer)
3. **Update Status**:
   - Click candidate → "Update Status"
   - Add notes
   - Set next steps

---

## For Recruiters/Agents

### Step 1: Search Candidates

1. **Navigate to "All Candidates"**
2. **Search and Filter**:
   - Search by name, skills, or keywords
   - Filter by status, source, score
   - Sort by date, score, or name
3. **View Candidate Profile**:
   - Click on candidate
   - Review resume, experience, skills
   - Check application history

### Step 2: Match Candidates to Jobs

1. **Navigate to "Candidate Matching"**
2. **Select a job**
3. **AI Matching**:
   - System shows top matches
   - View match scores (%)
   - Review skills alignment
4. **Source Candidate**:
   - Click "Add to Pipeline"
   - Candidate moves to "Sourced" stage

### Step 3: Track Placements

1. **Navigate to "Placements"**
2. **View**:
   - Successful hires
   - Start dates
   - Compensation details
   - Client information
3. **Manage**:
   - Update placement status
   - Track onboarding progress
   - Monitor first 90 days

---

## Video Interview Setup

### For AI Avatar Interviews (Tavus + LiveKit)

#### Prerequisites:
1. Tavus account with API key
2. LiveKit account with API key and secret
3. Backend token server running

#### Configuration:

**Already Done** (if you followed the setup):
- ✅ Tavus API key: `83b2cdad444a4e42abc2824d24f63070`
- ✅ Tavus persona ID: `pe13ed370726`
- ⚠️ LiveKit needs configuration

**To Complete LiveKit Setup**:

1. **Sign up for LiveKit**:
   - Go to https://cloud.livekit.io/
   - Create a project
   - Get API Key and Secret

2. **Update `.env.local`**:
   ```bash
   VITE_LIVEKIT_API_KEY=your_actual_key
   VITE_LIVEKIT_API_SECRET=your_actual_secret
   VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

3. **Start Backend Token Server**:

   Create `backend/server.js`:
   ```javascript
   const express = require('express');
   const cors = require('cors');
   const { AccessToken } = require('livekit-server-sdk');
   require('dotenv').config();

   const app = express();
   app.use(cors());
   app.use(express.json());

   app.post('/api/livekit/token', async (req, res) => {
       const { roomName, participantName, participantMetadata } = req.body;

       const token = new AccessToken(
           process.env.LIVEKIT_API_KEY,
           process.env.LIVEKIT_API_SECRET,
           { identity: participantName, metadata: participantMetadata }
       );

       token.addGrant({
           roomJoin: true,
           room: roomName,
           canPublish: true,
           canSubscribe: true,
       });

       res.json({ token: await token.toJwt() });
   });

   app.listen(3001, () => console.log('Backend on port 3001'));
   ```

   Install dependencies:
   ```bash
   cd backend
   npm init -y
   npm install express cors dotenv livekit-server-sdk
   ```

   Create `backend/.env`:
   ```bash
   LIVEKIT_API_KEY=your_key
   LIVEKIT_API_SECRET=your_secret
   ```

   Run:
   ```bash
   node server.js
   ```

4. **Update Frontend Proxy** (`vite.config.ts`):
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
       plugins: [react()],
       server: {
           proxy: {
               '/api': 'http://localhost:3001'
           }
       }
   });
   ```

---

## Resume Management

### Upload Resume

**Supported Formats**:
- ✅ PDF (`.pdf`)
- ✅ Microsoft Word 97-2003 (`.doc`)
- ✅ Microsoft Word 2007+ (`.docx`)
- ✅ Images (`.jpg`, `.png`)

**File Size**: Up to 10MB

**Process**:
1. Drag and drop or click to upload
2. AI parses document (3-5 seconds)
3. Review extracted data
4. Edit if needed
5. Save as new version

**Version Control**:
- Each save creates a new version
- View history in left sidebar
- Switch between versions
- Latest version marked as "Current"

### Edit Resume

1. Click "Edit Details"
2. Update any field:
   - Personal info
   - Summary
   - Experience (add/remove/edit)
   - Education (add/remove/edit)
   - Skills (comma-separated)
3. Click "Save as New Version"

---

## Common Workflows

### Workflow 1: Complete Recruitment Cycle (Employer)

1. **Create Job** → Set interview config → Publish
2. **Review Applications** → View candidates in pipeline
3. **Schedule Interview** → Candidate receives invitation
4. **Candidate Takes Interview** → AI conducts interview
5. **Review Report** → AI score and analysis
6. **Make Offer** → Move to "Offer" stage
7. **Hire** → Move to "Hired" stage
8. **Track Placement** → Monitor onboarding

### Workflow 2: Job Application Journey (Candidate)

1. **Upload Resume** → AI parses and saves
2. **Browse Jobs** → Find relevant positions
3. **Apply** → Submit application
4. **Wait for Interview** → Notification received
5. **Take Interview** → Complete AI interview
6. **View Report** → Check score and feedback
7. **Track Status** → Monitor application progress
8. **Receive Offer** → Accept or decline

### Workflow 3: Candidate Matching (Recruiter)

1. **New Job Posted** → Review requirements
2. **Search Database** → Find matching candidates
3. **AI Matching** → System suggests top matches
4. **Review Profiles** → Check resumes and scores
5. **Add to Pipeline** → Move to "Sourced"
6. **Schedule Interview** → Set up AI interview
7. **Review Results** → Analyze interview performance
8. **Make Placement** → Successfully hire candidate

---

## Troubleshooting

### Resume Upload Issues

**Problem**: "Resume parsing failed"
- **Solution**: Ensure file is valid PDF, Word, or image
- Try converting to a different format
- Check file size (< 10MB)

**Problem**: "AI parsed incorrect information"
- **Solution**: Click "Edit Details" and manually correct
- The AI learns from formatted documents better

### Interview Issues

**Problem**: Camera/microphone not working
- **Solution**: Allow browser permissions
- Check browser settings → Privacy → Camera/Microphone
- Try refreshing the page

**Problem**: "Failed to start interview"
- **Solution**:
  - Check if backend server is running (for Tavus/LiveKit)
  - Verify API keys in `.env.local`
  - Check browser console for errors

**Problem**: AI interviewer not responding
- **Solution**:
  - Speak clearly and wait for response
  - Check internet connection
  - Ensure microphone is not muted

### Application Issues

**Problem**: Can't see jobs
- **Solution**: Make sure jobs are "Published" (not Draft)
- Check if you're logged in as Candidate

**Problem**: Interview report not showing
- **Solution**: Wait for AI analysis to complete (~10 seconds)
- Refresh the page
- Check if interview was properly ended

---

## Tips for Success

### For Candidates

1. **Resume Quality**: Use a clean, well-formatted resume
2. **Complete Profile**: Fill in all fields for better matching
3. **Interview Preparation**:
   - Test your camera and microphone beforehand
   - Find a quiet, well-lit space
   - Dress professionally
   - Speak clearly and naturally
4. **Follow Up**: Monitor your application status regularly

### For Employers

1. **Clear Job Descriptions**: Be specific about requirements
2. **Custom Questions**: Add role-specific questions for better assessment
3. **Quick Review**: Review interview reports within 24-48 hours
4. **Pipeline Management**: Keep candidates moving through stages
5. **Communication**: Provide feedback to candidates

### For Recruiters

1. **Database Search**: Use specific keywords for better matches
2. **AI Matching**: Trust the AI scores but review manually too
3. **Track Metrics**: Monitor placement success rates
4. **Candidate Relationships**: Build long-term candidate database

---

## Next Steps

1. **Explore the Dashboard**: Familiarize yourself with all features
2. **Test AI Interview**: Try a sample interview to understand the flow
3. **Customize Settings**: Configure interview preferences
4. **Invite Team Members**: Add other users (Admin role)
5. **Review Analytics**: Track platform usage and success rates

For detailed technical documentation, see:
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- [QUICK_START.md](QUICK_START.md)
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

**Need Help?**
- Check the documentation in the `doc/` folder
- Review error messages in browser console
- Contact support or open an issue

Happy Recruiting! 🎉
