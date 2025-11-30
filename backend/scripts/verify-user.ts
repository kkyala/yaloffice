
import { supabase } from '../src/services/supabaseService';

async function verifyUser() {
    console.log('Verifying user profile...');
    const email = 'antigravity_test@yaloffice.com';

    // 1. Check Auth
    // Note: supabase-js admin client doesn't allow listing users easily without service role key usage in specific way
    // But we can check public.users directly.

    // 2. Check public.users
    const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.log(`Profile check failed or not found: ${error.message}`);
        // If not found, let's try to find the auth user ID to see if we can fix it
        // We can't easily query auth.users from here without direct SQL or specific admin API usage
        console.log('Please ensure you ran the fix_rls.sql script in Supabase SQL Editor.');
    } else {
        console.log('✅ User profile found in public.users:');
        console.log(profile);
    }
}

verifyUser();
