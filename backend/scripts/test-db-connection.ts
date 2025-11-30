import { supabase } from '../src/services/supabaseService';

async function testConnection() {
    console.log('Testing Supabase connection...');
    try {
        const { data, error } = await supabase.from('audit_logs').select('*').limit(1);
        if (error) {
            console.error('Connection failed:', error.message);
            process.exit(1);
        }
        console.log('Connection successful! Data:', data);
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

testConnection();
