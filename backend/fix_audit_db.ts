import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAuditLogs() {
    console.log('Attempting to fix audit_logs table...');

    // SQL to add the column if it doesn't exist
    const sql = `
    DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_id') THEN 
            ALTER TABLE audit_logs ADD COLUMN user_id UUID; 
            RAISE NOTICE 'Added user_id column to audit_logs';
        ELSE 
            RAISE NOTICE 'user_id column already exists';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'ip_address') THEN 
            ALTER TABLE audit_logs ADD COLUMN ip_address TEXT; 
            RAISE NOTICE 'Added ip_address column';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_agent') THEN 
            ALTER TABLE audit_logs ADD COLUMN user_agent TEXT; 
            RAISE NOTICE 'Added user_agent column';
        END IF;
    END $$;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    // If RPC fails (often does if exec_sql isn't set up), we might need to use the raw query if the client supports it, 
    // or just rely on the user to run it. But wait, we don't have direct SQL access usually unless via a specific function.
    // Let's try to just use the standard client to inspect first.

    if (error) {
        console.error('RPC exec_sql failed (expected if not configured):', error);
        console.log('Trying alternative: We cannot alter schema directly via JS client without a helper function.');
        console.log('However, we can try to inspect the table to confirm the issue.');
    }

    // Check columns
    const { data, error: inspectError } = await supabase
        .from('audit_logs')
        .select('*')
        .limit(1);

    if (inspectError) {
        console.error('Error selecting from audit_logs:', inspectError);
    } else {
        console.log('Successfully selected from audit_logs. Data sample:', data);
    }
}

fixAuditLogs();
