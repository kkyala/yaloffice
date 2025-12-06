---
description: Testing the Job-Specific AI Screening Workflow
---

# Job-Specific AI Screening Workflow Test Plan

This workflow describes how to verify the end-to-end process of configuring and completing a job-specific AI screening.

## Prerequisites
- User accounts for:
  - **Agent/Recruiter**: To create the job.
  - **Candidate**: To apply for the job.
- Backend server running (`npm run server`).
- Frontend running (`npm run dev`).

## Steps

### 1. Agent: Create a Job with Screening
1. Log in as an **Agent** or **Recruiter**.
2. Navigate to **Recruitment** > **Post a Job**.
3. Fill in the required job details (Title, Description, Skills, etc.).
4. Scroll to the **Screening Configuration** section.
5. Check **Enable AI Screening for this Job**.
6. (Optional) Enter specific **Screening Questions / Criteria**.
7. Click **Save Job**.
8. Verify the job appears in the jobs list.

### 2. Candidate: Apply for the Job
1. Log in as a **Candidate**.
2. Navigate to **Find Jobs**.
3. Locate the job created in Step 1.
4. Click **Apply Now**.
5. A confirmation dialog should appear stating the job requires screening. Click **OK/Proceed**.
6. Fill in the application form (Profile, Resume Summary).
7. Click **Submit Application**.

### 3. Candidate: Complete Screening
1. After submission, you should be automatically redirected to the **AI Screening** page (or the Pre-Interview Assessment page which then redirects).
2. Verify the page shows "Ready for your screening?".
3. Click **Start Screening**.
4. Speak with the AI. Verify it mentions the specific job title and asks relevant questions (if configured).
5. Click **End Interview** when finished.
6. Wait for the analysis to complete.
7. Verify the **Screening Completed** report is shown with a score and feedback.

### 4. Verification
1. **Candidate Dashboard**: Go to **Dashboard**. Verify the application status is "Screening Completed" (or similar status reflecting progress).
2. **Employer/Agent View**: Log back in as the Agent.
3. Go to **Candidates**.
4. Find the candidate's application.
5. Verify the screening score and report are visible.
