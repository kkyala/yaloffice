import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Supabase] Warning: Using ANON key. Backend operations may fail if RLS is enabled. Please add SUPABASE_SERVICE_ROLE_KEY to .env');
}

export const supabase = createClient(supabaseUrl!, supabaseKey!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
