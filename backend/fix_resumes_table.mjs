import { Client } from 'pg';

const connectionString = 'postgresql://postgres:postgres@localhost:5432/postgres';

const fixResumesTable = async () => {
    const client = new Client({ connectionString });
    try {
        await client.connect();

        console.log("Adding file_path column to resumes table...");
        await client.query(`ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS file_path TEXT;`);

        console.log("Successfully updated resumes schema.");
    } catch (err) {
        console.error("Error updating schema:", err);
    } finally {
        await client.end();
    }
};

fixResumesTable();
