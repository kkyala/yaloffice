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

async function createScreeningTable() {
    console.log('Creating screening_assessments table...');

    const sql = `
    CREATE TABLE IF NOT EXISTS screening_assessments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        score INTEGER,
        summary TEXT,
        strengths TEXT[],
        weaknesses TEXT[],
        transcript JSONB
    );

    -- Enable RLS
    ALTER TABLE screening_assessments ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view their own assessments
    DROP POLICY IF EXISTS "Users can view own screening assessments" ON screening_assessments;
    CREATE POLICY "Users can view own screening assessments" ON screening_assessments
        FOR SELECT USING (auth.uid() = user_id);

    -- Policy: Service role can do anything (implicit, but good to be sure if we add insert policy for users)
    -- Actually, usually inserts happen via backend service role, so we don't need public insert policy.
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('RPC exec_sql failed:', error);
        console.log('Attempting to create via standard client (if possible) or logging failure.');
        // Since we know RPC might fail if not set up, we'll just log. 
        // In a real scenario, we'd need the migration script run via SQL editor.
        // But let's assume the previous fix_audit_db.ts pattern worked or we have to rely on existing tables.
        // Actually, if RPC fails, I can't create the table from here.
        // I will assume for now I can use the 'interviews' table which exists, 
        // OR I will try to use the 'interviews' table to store this data effectively 
        // and tell the user I used the existing table to keep it simple, 
        // UNLESS I can confirm I can run SQL.

        // Let's try to check if 'interviews' table is enough.
        // It has 'analysis' column which is JSONB. It can store all the fields.
        // The user asked "let me know whether a table to be created".
        // I will try to create it, but if it fails, I'll fallback to 'interviews' and mention it.
    } else {
        console.log('Table screening_assessments created successfully (or already exists).');
    }
}

createScreeningTable();
