import img from 'pg';
const { Pool } = img;

const pool = new Pool({
    connectionString: 'postgresql://postgres:password@localhost:5432/yaloffice'
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Connected to DB. Starting Schema Migration...');

        // 1. Fix 'interviews' table
        // We drop and recreate to ensure clean state matching Supabase schema used in code.
        console.log('Recreating table: interviews...');
        await client.query(`DROP TABLE IF EXISTS interviews CASCADE;`);
        await client.query(`
            CREATE TABLE interviews (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                room_name TEXT NOT NULL,
                job_title TEXT,
                candidate_id TEXT, -- Can be UUID or string depending on usage
                candidate_name TEXT,
                custom_questions JSONB DEFAULT '[]'::jsonb,
                status TEXT DEFAULT 'pending',
                started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                ended_at TIMESTAMP WITH TIME ZONE,
                transcript JSONB DEFAULT '[]'::jsonb,
                current_question_index INTEGER DEFAULT 0,
                analysis JSONB,
                question_count INTEGER DEFAULT 5,
                difficulty TEXT DEFAULT 'medium',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('✅ interviews table recreated.');

        // 2. Create 'screening_assessments' table
        console.log('Creating table: screening_assessments...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS screening_assessments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                job_title TEXT,
                job_id TEXT, -- Or Integer depending on jobs table
                overall_score NUMERIC,
                summary TEXT,
                strengths JSONB DEFAULT '[]'::jsonb,
                weaknesses JSONB DEFAULT '[]'::jsonb,
                skills_analysis JSONB,
                transcript TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('✅ screening_assessments table created.');

        // 3. Verify 'candidates' table columns (optional but checking for missing columns like 'interview_config')
        // We add missing columns if they don't exist.
        console.log('Checking candidates table...');
        await client.query(`
            ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_config JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE candidates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
            ALTER TABLE candidates ADD COLUMN IF NOT EXISTS jobId TEXT;
        `);
        console.log('✅ candidates table updated.');

        // 4. Update 'jobs' table for screening flow
        console.log('Updating jobs table (screening flow)...');
        await client.query(`
            ALTER TABLE jobs 
            ADD COLUMN IF NOT EXISTS screening_enabled boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS screening_config jsonb DEFAULT '{}'::jsonb;
        `);
        console.log('✅ jobs table updated with screening columns.');

        // 5. Update 'screening_assessments' for job linking
        console.log('Updating screening_assessments table...');
        await client.query(`
            ALTER TABLE screening_assessments
            ADD COLUMN IF NOT EXISTS job_id bigint REFERENCES jobs(id);
            
            CREATE INDEX IF NOT EXISTS idx_screening_job_id ON screening_assessments(job_id);
        `);
        console.log('✅ screening_assessments table updated.');

    } catch (err) {
        console.error('Migration Error:', err);
    } finally {
        client.release();
        await pool.end();
        console.log('Migration complete.');
    }
}

migrate();
