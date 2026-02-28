
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { localSupabase } from './localSupabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env from multiple possible locations
const paths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'), // From dist/services/ to root
    path.resolve(__dirname, '../.env'),    // From src/services/ to src/ (dev)
    path.resolve(__dirname, '../../../.env') // From src/services/ to project root (yaloffice/.env)
];

let loaded = false;
for (const p of paths) {
    const result = dotenv.config({ path: p });
    if (!result.error) {
        console.log(`[SupabaseService] Loaded .env from ${p}`);
        loaded = true;
        break;
    }
}

if (!loaded) {
    console.warn('[SupabaseService] WARNING: Could not load .env file from any expected location.');
}

// CHECK IF USING LOCAL POSTGRES
// If DATABASE_URL is set and SUPABASE_URL is not, assume local.
// Or if USE_LOCAL_DB=true
const useLocalDB = process.env.USE_LOCAL_DB === 'true' || (!process.env.SUPABASE_URL && process.env.DATABASE_URL);

let supabaseClient: any;

if (useLocalDB) {
    console.log('[SupabaseService] Using LOCAL POSTGRES adapter (via pg).');
    supabaseClient = localSupabase;
} else {
    const supabaseUrl = process.env.SUPABASE_URL;
    // PRIORITIZE Service Role Key. Do not fallback to Anon key silently for backend ops.
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
        console.error('[SupabaseService] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing. Backend operations will fail with RLS errors.');
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

    if (finalKey) {
        console.log(`[SupabaseService] Final Key (first 10 chars): ${finalKey.substring(0, 10)}...`);
    }

    if (!supabaseUrl || !finalKey) {
        console.error('[SupabaseService] Missing Supabase credentials in .env');
    }

    supabaseClient = createClient(supabaseUrl!, finalKey!, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        },
        global: {
            headers: {
                Authorization: `Bearer ${finalKey}`
            }
        }
    });
}

export const supabase = supabaseClient;
