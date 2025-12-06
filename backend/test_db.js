import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing DB Access (JS)...');
console.log('URL:', supabaseUrl);
console.log('Key defined:', !!supabaseKey);

if (supabaseKey) {
    console.log('Key starts with:', supabaseKey.substring(0, 10));
    try {
        const part = supabaseKey.split('.')[1];
        const payload = JSON.parse(Buffer.from(part, 'base64').toString());
        console.log('Key Role:', payload.role);
    } catch (e) {
        console.log('Could not decode JWT:', e);
    }
} else {
    console.error('SUPABASE_SERVICE_ROLE_KEY is NOT defined in process.env');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function test() {
    console.log('Attempting Select...');
    const { data, error } = await supabase.from('interviews').select('count', { count: 'exact', head: true });
    if (error) {
        console.error('Select failed:', error);
    } else {
        console.log('Select success. Count:', data);
    }

    console.log('Attempting Insert...');
    const { error: insertError } = await supabase.from('audit_logs').insert({
        action: 'TEST_ACCESS',
        details: { test: true }
    });

    if (insertError) {
        console.error('Insert Audit Log failed:', insertError);
    } else {
        console.log('Insert Audit Log success');
    }
}

test();
