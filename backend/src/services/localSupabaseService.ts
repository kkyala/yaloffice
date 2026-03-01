
import pg from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const { Pool } = pg;

// Use standard PG connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/yaloffice';

console.log(`[LocalSupabaseService] Initializing pool with: ${connectionString}`);
import * as fs from 'fs';
fs.appendFileSync('db_debug.log', `[${new Date().toISOString()}] Pool init: ${connectionString}\n`);

const pool = new Pool({
    connectionString,
});

class SupabaseQueryBuilder {
    private tableName: string;
    private filters: string[] = [];
    private values: any[] = [];
    private selectColumns: string = '*';
    private limitCount: number | null = null;
    private orderClause: string = '';
    private updateData: any = null;
    private insertData: any = null;
    private returnData: boolean = false;
    private isSingle: boolean = false;
    private isMaybeSingle: boolean = false;

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    select(columns: string = '*') {
        this.selectColumns = columns;
        this.returnData = true;
        return this;
    }

    eq(column: string, value: any) {
        this.values.push(value);
        this.filters.push(`"${column}" = $${this.values.length}`);
        return this;
    }

    in(column: string, values: any[]) {
        // Handle array IN clause
        // This is tricky with parameterized queries in a simple builder
        // simpler hack: literal expansion for now or array param
        // PG supports ANY($1)
        this.values.push(values);
        this.filters.push(`"${column}" = ANY($${this.values.length})`);
        return this;
    }

    neq(column: string, value: any) {
        this.values.push(value);
        this.filters.push(`"${column}" != $${this.values.length}`);
        return this;
    }

    gt(column: string, value: any) {
        this.values.push(value);
        this.filters.push(`"${column}" > $${this.values.length}`);
        return this;
    }

    lt(column: string, value: any) {
        this.values.push(value);
        this.filters.push(`"${column}" < $${this.values.length}`);
        return this;
    }

    order(column: string, { ascending = true } = {}) {
        this.orderClause = `ORDER BY "${column}" ${ascending ? 'ASC' : 'DESC'}`;
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    single() {
        this.isSingle = true;
        this.limitCount = 1;
        return this;
    }

    maybeSingle() {
        this.isMaybeSingle = true;
        this.limitCount = 1;
        return this;
    }

    insert(data: any) {
        this.insertData = data;
        this.returnData = false; // Default unless select() is called? Supabase usually requires .select() to return data
        return this; // Supabase returns a PostgrestFilterBuilder which has .select()
    }

    update(data: any) {
        this.updateData = data;
        return this;
    }

    upsert(data: any, options?: { onConflict?: string }) {
        this.insertData = data;
        // Store conflict target in updateData property or a new property? 
        // Let's use a dedicated property on the class if possible, but simpler to overload updateData for now.
        // Actually, let's create a specific property for conflict.
        (this as any).conflictTarget = options?.onConflict;
        this.updateData = 'UPSERT';
        return this;
    }

    delete() {
        this.updateData = 'DELETE';
        return this;
    }

    then(resolve: (data: { data: any, error: any }) => void, reject: (err: any) => void) {
        this.execute().then(resolve).catch(reject);
    }

    async execute(): Promise<{ data: any, error: any }> {
        try {
            let text = '';

            if (this.insertData) {
                // INSERT
                const keys = Object.keys(this.insertData);
                const vals = Object.values(this.insertData);
                const startIdx = this.values.length + 1;
                const placeholders = vals.map((_, i) => `$${startIdx + i}`);
                this.values.push(...vals);

                text = `INSERT INTO "${this.tableName}" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${placeholders.join(',')})`;

                if (this.updateData === 'UPSERT') {
                    const conflictTarget = (this as any).conflictTarget || 'id';
                    // Generate SET clause for UPDATE
                    // SET col1 = EXCLUDED.col1, ...
                    const setClause = keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
                    text += ` ON CONFLICT ("${conflictTarget}") DO UPDATE SET ${setClause}`;
                }

                if (this.returnData || this.selectColumns !== '*') {
                    text += ` RETURNING ${this.selectColumns}`;
                }
            } else if (this.updateData) {
                // UPDATE OR DELETE
                if (this.updateData === 'DELETE') {
                    text = `DELETE FROM "${this.tableName}"`;
                } else if (this.updateData === 'UPSERT') {
                    // Logic flow should not reach here if insertData is set, which upsert() sets.
                    // But if someone called update() then upsert()... 
                    // Let's assume standard usage.
                    // Fallback to error or ignore
                    console.error('UPSERT called without insertData?');
                } else {
                    // Normal UPDATE
                    const keys = Object.keys(this.updateData);
                    const vals = Object.values(this.updateData);
                    const startIdx = this.values.length + 1;
                    const setClause = keys.map((k, i) => `"${k}" = $${startIdx + i}`).join(', ');
                    this.values.push(...vals);

                    text = `UPDATE "${this.tableName}" SET ${setClause}`;
                }

                if (this.updateData !== 'UPSERT') {
                    if (this.filters.length > 0) {
                        text += ` WHERE ${this.filters.join(' AND ')}`;
                    }
                }

                if (this.returnData || this.selectColumns !== '*') {
                    text += ` RETURNING ${this.selectColumns}`;
                }
            } else {
                // SELECT
                text = `SELECT ${this.selectColumns} FROM "${this.tableName}"`;
                if (this.filters.length > 0) {
                    text += ` WHERE ${this.filters.join(' AND ')}`;
                }
                if (this.orderClause) {
                    text += ` ${this.orderClause}`;
                }
                if (this.limitCount) {
                    text += ` LIMIT ${this.limitCount}`;
                }
            }

            console.log(`[LocalDB] Executing: ${text} [${this.values}]`);
            // Add file logging
            const fs = await import('fs');
            fs.appendFileSync('local_db_query.log', `[${new Date().toISOString()}] Query: ${text} | Values: ${JSON.stringify(this.values)}\n`);

            const res = await pool.query(text, this.values);

            let data: any = res.rows;
            if (this.isSingle) {
                if (data.length === 0) return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
                data = data[0];
            } else if (this.isMaybeSingle) {
                if (data.length === 0) data = null;
                else data = data[0];
            }

            return { data, error: null };

        } catch (err: any) {
            console.error('[LocalDB] Error:', err);
            return { data: null, error: err };
        }
    }
}

// Storage Shim (Mock implementation)
const storageShim = {
    from: (bucket: string) => ({
        upload: async (path: string, file: any) => {
            console.log(`[LocalStorage] Uploaded to ${bucket}/${path}`);
            return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => {
            return { data: { publicUrl: `http://localhost:8000/avatar_output/${path}` } };
        }
    })
};

// Auth Shim (Admin operations)
const authShim = {
    admin: {
        createUser: async (params: any) => {
            // Create in local users table
            const client = new SupabaseQueryBuilder('users');
            // Assuming we refactored auth routes to handle local logic, this might not be called directly often
            // But if it is:
            return { data: { user: { id: 'local-id', ...params } }, error: null };
        },
        generateLink: async () => ({ data: { user: {}, properties: { action_link: 'http://localhost:443/verify-mock' } }, error: null }),
        deleteUser: async () => ({ data: {}, error: null })
    },
    signInWithPassword: async (credentials: any) => {
        console.warn(`[LocalSupabase] Login attempt via Shim for ${credentials.email}. Failing because user must exist in local 'users' table.`);
        return { data: { session: null, user: null }, error: { message: 'Invalid credentials (Local)', status: 401 } };
    },
    signOut: async () => ({ error: null }),
    verifyOtp: async () => ({ data: { session: {}, user: {} }, error: null }),
    getUser: async (token: string) => {
        try {
            const secret = process.env.JWT_SECRET || 'fallback_secret_key_change_me';
            const decoded = jwt.verify(token, secret) as any;
            return { data: { user: decoded }, error: null };
        } catch (e: any) {
            console.error('Local Supabase getUser failed:', e.message);
            // Don't return error object that crashes destructuring, return valid structure with null user
            return { data: { user: null }, error: e };
        }
    }
};

export const localSupabase = {
    from: (table: string) => new SupabaseQueryBuilder(table),
    storage: storageShim,
    auth: authShim
};
