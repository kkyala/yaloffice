import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
    console.log('🔍 Verifying Database Schema...');
    let allPassed = true;

    // 1. Verify 'jobs' table
    console.log('\nChecking "jobs" table...');
    const testJob = {
        title: 'Schema Verification Job',
        employer: 'System Test',
        location: 'Test Location',
        description: 'This is a temporary job to verify schema.',
        job_code: 'TEST-001',
        business_unit: 'Test Unit',
        client: 'Test Client',
        client_bill_rate: '100',
        pay_rate: '80',
        recruitment_manager: 'Test Manager',
        primary_recruiter: 'Test Recruiter',
        qualifications: 'Test Skill',
        open: false,
        sourced: 0,
        screened: 0,
        shortlisted: 0,
        interviewed: 0,
        salaryMin: 50000,
        salaryMax: 100000
    };

    const { data: jobData, error: jobError } = await supabase.from('jobs').insert(testJob).select().single();

    if (jobError) {
        console.error('❌ "jobs" table check FAILED!');
        console.error('Error:', jobError.message);
        if (jobError.message.includes('column') && jobError.message.includes('does not exist')) {
            console.error('Reason: Missing columns in "jobs" table.');
        }
        allPassed = false;
    } else {
        console.log('✅ "jobs" table check PASSED!');
        // Cleanup
        await supabase.from('jobs').delete().eq('id', jobData.id);
    }

    // 2. Verify 'interviews' table
    console.log('\nChecking "interviews" table...');
    const testInterview = {
        id: 'test-schema-verification-id',
        room_name: 'test-room',
        job_title: 'Test Job',
        candidate_name: 'Test Candidate',
        status: 'pending',
        question_count: 5,
        current_question_index: 0,
        difficulty: 'Medium',
        started_at: new Date().toISOString()
    };

    const { error: interviewError } = await supabase.from('interviews').upsert(testInterview);

    if (interviewError) {
        console.error('❌ "interviews" table check FAILED!');
        console.error('Error:', interviewError.message);
        if (interviewError.message.includes('column') && interviewError.message.includes('does not exist')) {
            console.error('Reason: Missing columns in "interviews" table.');
        }
        allPassed = false;
    } else {
        console.log('✅ "interviews" table check PASSED!');
        // Cleanup
        await supabase.from('interviews').delete().eq('id', 'test-schema-verification-id');
    }

    console.log('\n---------------------------------------------------');
    if (allPassed) {
        console.log('🎉 ALL CHECKS PASSED! The database schema is correct.');
    } else {
        console.log('⚠️ CHECKS FAILED. Please run "backend/update_schema.sql" in Supabase.');
    }
}

verifySchema();
