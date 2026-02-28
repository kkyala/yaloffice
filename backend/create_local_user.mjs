
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/yaloffice';

const pool = new Pool({
    connectionString,
});

async function createUser() {
    const client = await pool.connect();
    try {
        console.log('Connecting to database:', connectionString);

        const email = 'candidate103@yaloffice.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        console.log('Attempting to drop foreign key constraint users_id_fkey for local dev...');
        try {
            await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey');
            console.log('Constraint dropped (or did not exist).');
        } catch (e) {
            console.log('Could not drop constraint (might not exist or permission issue):', e.message);
        }

        console.log(`Checking if user ${email} exists...`);
        const res = await client.query('SELECT * FROM users WHERE email = $1', [email]);

        if (res.rows.length > 0) {
            console.log('User already exists. Updating password...');
            await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
            console.log('Password updated and user is ready.');
        } else {
            console.log('Creating new user...');
            const insertRes = await client.query(`
                INSERT INTO users (id, email, password_hash, role, name, status, mobile, created_at)
                VALUES ($1, $2, $3, 'Candidate', 'Candidate 103', 'Active', '555-0103', NOW())
                RETURNING *
            `, [userId, email, hashedPassword]);
            console.log('User created:', insertRes.rows[0]);
        }
    } catch (err) {
        console.error('Error creating user:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

createUser();
