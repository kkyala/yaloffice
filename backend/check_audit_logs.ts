
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key to bypass RLS for checking

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuditLogs() {
    console.log('Checking audit_logs table...');

    // 1. Try to select from the table to see if it exists and what columns it returns
    const { data, error } = await supabase
        .from('audit_logs')
        .select('user_id')
        .limit(1);

    if (error) {
        console.error('Error selecting from audit_logs:', error);
        if (error.code === 'PGRST204') {
            console.error('PGRST204: Columns not found in schema cache. This usually means the table structure changed but PostgREST cache is stale.');
        }
    } else {
        console.log('Successfully selected from audit_logs.');
        if (data && data.length > 0) {
            console.log('Sample row keys:', Object.keys(data[0]));
        } else {
            console.log('Table is empty, but accessible.');
        }
    }

    // 2. Try to insert a test log
    console.log('\nAttempting to insert a test log...');
    const testLog = {
        action: 'TEST_ACTION',
        details: { message: 'Checking table structure' },
        // We omit user_id to see if it's optional or if that triggers the specific error
    };

    const { data: insertData, error: insertError } = await supabase
        .from('audit_logs')
        .insert(testLog)
        .select();

    if (insertError) {
        console.error('Error inserting into audit_logs:', insertError);
    } else {
        console.log('Successfully inserted test log:', insertData);
    }
}

checkAuditLogs();
