
import { supabase } from '../src/services/supabaseService.js';

async function checkDatabase() {
    console.log('Checking database connection...');

    // 1. Check audit_logs table
    console.log('Checking audit_logs table...');
    const { error: auditError } = await supabase.from('audit_logs').select('count', { count: 'exact', head: true });
    if (auditError) {
        console.error('❌ Error accessing audit_logs:', auditError.message);
    } else {
        console.log('✅ audit_logs table is accessible.');
    }

    // 2. Check resumes table
    console.log('Checking resumes table...');
    const { error: resumeError } = await supabase.from('resumes').select('count', { count: 'exact', head: true });
    if (resumeError) {
        console.error('❌ Error accessing resumes:', resumeError.message);
    } else {
        console.log('✅ resumes table is accessible.');
    }

    // 3. Check storage bucket
    console.log('Checking resumes storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.error('❌ Error listing buckets:', bucketError.message);
    } else {
        const resumeBucket = buckets?.find(b => b.name === 'resumes');
        if (resumeBucket) {
            console.log('✅ resumes bucket exists.');
        } else {
            console.error('❌ resumes bucket does NOT exist.');
        }
    }
}

checkDatabase();
