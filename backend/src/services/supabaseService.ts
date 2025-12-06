import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env from multiple possible locations
const paths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'), // From dist/services/ to root
    path.resolve(__dirname, '../.env')     // From src/services/ to src/ (dev)
];

let loaded = false;
for (const p of paths) {
    const result = dotenv.config({ path: p });
    if (result.error) {
        // console.log(`Failed to load .env from ${p}`);
    } else {
        console.log(`[SupabaseService] Loaded .env from ${p}`);
        loaded = true;
        break;
    }
}

if (!loaded) {
    console.warn('[SupabaseService] WARNING: Could not load .env file from any expected location.');
}

const supabaseUrl = process.env.SUPABASE_URL;
// PRIORITIZE Service Role Key. Do not fallback to Anon key silently for backend ops.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('[SupabaseService] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing. Backend operations will fail with RLS errors.');
    // Fallback to anon key only if service key is strictly missing, but warn loudly
    if (process.env.SUPABASE_KEY) {
        console.warn('[SupabaseService] Falling back to SUPABASE_KEY (Anon). This is likely the cause of RLS errors.');
    }
} else {
    console.log('[SupabaseService] Successfully loaded Service Role Key.');
}

const isServiceKey = supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`[Supabase] Using ${isServiceKey ? 'SERVICE_ROLE' : 'ANON'} key for database connection.`);

// Use the key we resolved (Service Role preferred, or Anon if missing)
const finalKey = supabaseKey || process.env.SUPABASE_KEY;

if (!supabaseUrl || !finalKey) {
    console.error('[SupabaseService] Missing Supabase credentials in .env');
}

export const supabase = createClient(supabaseUrl!, finalKey!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
