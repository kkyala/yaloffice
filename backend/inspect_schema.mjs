import img from 'pg';
const { Pool } = img;

const pool = new Pool({
    connectionString: 'postgresql://postgres:password@localhost:5432/yaloffice'
});

async function inspect() {
    try {
        const client = await pool.connect();
        console.log('Connected to DB.');

        // List tables
        const resTabs = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', resTabs.rows.map(r => r.table_name));

        // Inspect interviews columns
        const resIntCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'interviews'
        `);
        console.log('Interviews Columns:', resIntCols.rows);

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

inspect();
