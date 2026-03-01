import pg from 'pg';
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/yaloffice';
const pool = new Pool({ connectionString });

async function fix() {
    try {
        await pool.query(`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "screening_enabled" BOOLEAN DEFAULT false;`);
        console.log("Added column: screening_enabled (boolean)");

        await pool.query(`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "screening_config" JSONB DEFAULT '{}'::jsonb;`);
        console.log("Added column: screening_config (jsonb)");

        // Also add to candidates, if needed? interview_config already exists likely.

        console.log("Database schema successfully updated.");
    } catch (e) {
        if (e.message && e.message.includes("does not exist")) {
            console.error("Error: ", e.message);
        } else {
            console.error("Error executing query:", e);
        }
    } finally {
        pool.end();
    }
}

fix();
