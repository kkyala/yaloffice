
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const connectionString = 'postgresql://postgres:password@localhost:5432/yaloffice';

const pool = new Pool({ connectionString });

async function diagnoseAndFix() {
    const client = await pool.connect();
    try {
        console.log('--- DIAGNOSTIC START ---');

        // 1. Get the User from 'users' table (Auth)
        const userRes = await client.query(`SELECT * FROM users WHERE email = 'candidate800@yaloffice.com'`);
        const user = userRes.rows[0];

        if (!user) {
            console.log('❌ CRITICAL: User candidate800@yaloffice.com NOT found in `users` table. This user cannot login.');
            return;
        }
        console.log(`✅ User found in "users" table. ID: ${user.id}`);

        // 2. Get the Candidate from 'candidates' table (Profile)
        // Using distinct name from screenshot or guessing based on context. 
        // Screenshot showed name 'candidate 800'.
        const candidateRes = await client.query(`SELECT * FROM candidates WHERE name ILIKE '%candidate 800%'`);
        const candidate = candidateRes.rows[0];

        if (!candidate) {
            console.log('⚠️ No matching record found in `candidates` table for "candidate 800".');
            // Check if there's a candidate linked to this users.id potentially?
            const linkedCandidate = await client.query(`SELECT * FROM candidates WHERE user_id = $1`, [user.id]);
            if (linkedCandidate.rows.length > 0) {
                console.log('   However, a candidate record IS already linked to this user UUID.');
            } else {
                console.log('   User has no candidate profile.');
            }
        } else {
            console.log(`✅ Candidate record found: ID=${candidate.id}, Name="${candidate.name}", Current user_id=${candidate.user_id}`);

            // 3. Compare and Fix
            if (candidate.user_id !== user.id) {
                console.log(`❌ MISMATCH DETECTED: Candidate record points to user_id ${candidate.user_id}, but valid login user is ${user.id}`);
                console.log('   This confirms the user`s suspicion: The candidate record existed, but was likely orphaned or linked to a deleted user.');

                console.log('🛠️  FIXING LINK NOW...');
                await client.query(`UPDATE candidates SET user_id = $1 WHERE id = $2`, [user.id, candidate.id]);
                console.log('✅ Link updated. The candidate record is now attached to the valid login user.');
            } else {
                console.log('✅ LINK OK: Candidate record is already correctly linked to the user.');
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

diagnoseAndFix();
