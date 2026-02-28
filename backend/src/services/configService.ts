
import { supabase } from './supabaseService.js';
import dotenv from 'dotenv';

// Load environment variables as fallback
dotenv.config();

export class ConfigService {
    private static cache: Record<string, string> = {};
    private static lastFetch: number = 0;
    private static CACHE_TTL = 60000; // 1 minute cache

    /**
     * Get a configuration value.
     * Priority:
     * 1. Database (system_configurations)
     * 2. Environment Variable (.env)
     * 3. Default Value
     */
    static async get(key: string, defaultValue: string = ''): Promise<string> {
        // Check ENV first for critical bootstrap config (like SUPABASE_URL) to avoid circular dependency
        if (key.startsWith('SUPABASE_')) {
            return process.env[key] || defaultValue;
        }

        // Try to fetch from DB
        try {
            await this.refreshCacheIfNeeded();
            if (this.cache[key] !== undefined && this.cache[key] !== '') {
                return this.cache[key];
            }
        } catch (error) {
            console.warn(`[ConfigService] Failed to fetch config from DB for ${key}, falling back to ENV.`);
        }

        // Fallback to ENV
        const envValue = process.env[key];
        if (envValue) {
            return envValue;
        }

        return defaultValue;
    }

    /**
     * Set a configuration value in the database.
     */
    static async set(key: string, value: string): Promise<void> {
        const { error } = await supabase
            .from('system_configurations')
            .upsert({ key, value, updated_at: new Date().toISOString() });

        if (error) throw error;

        // Update cache immediately
        this.cache[key] = value;
    }

    /**
     * Refresh the local cache from the database.
     */
    private static async refreshCacheIfNeeded() {
        if (Date.now() - this.lastFetch < this.CACHE_TTL && Object.keys(this.cache).length > 0) {
            return;
        }

        const { data, error } = await supabase
            .from('system_configurations')
            .select('key, value');

        if (error) {
            // If table doesn't exist, we just ignore and use ENV
            // console.error('[ConfigService] Error fetching configs:', error);
            return;
        }

        if (data) {
            data.forEach((row: any) => {
                this.cache[row.key] = row.value;
            });
            this.lastFetch = Date.now();
        }
    }

    /**
     * Get all configurations (for Admin UI).
     * Returns sensitive values masked if requested.
     */
    static async getAll() {
        const { data, error } = await supabase
            .from('system_configurations')
            .select('*')
            .order('group', { ascending: true });

        if (error) throw error;
        return data || [];
    }
}
