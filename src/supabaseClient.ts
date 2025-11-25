import { createClient } from '@supabase/supabase-js';
import { config } from './config/appConfig';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

// This check prevents the app from running with an invalid Supabase configuration.
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
  const errorMessage = "Supabase configuration is missing or invalid. Please update your URL and Key in src/config/appConfig.ts.";
  console.error(errorMessage);
  // Throw an error to stop the app from running.
  throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);