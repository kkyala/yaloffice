import { supabase } from './supabaseService.js';

export interface AuditLogEntry {
    userId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
}

class AuditLogger {
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            const { error } = await supabase.from('audit_logs').insert({
                user_id: entry.userId,
                action: entry.action,
                resource_type: entry.resourceType,
                resource_id: entry.resourceId,
                details: entry.details,
                ip_address: entry.ipAddress,
                user_agent: entry.userAgent,
            });

            if (error) {
                // If RLS fails, just log to console and continue. Do not disrupt the flow.
                console.warn('[AuditLogger] Failed to write audit log (RLS/DB error):', error.message);
            }
        } catch (err) {
            console.error('[AuditLogger] Unexpected error:', err);
        }
    }
}

export const auditLogger = new AuditLogger();
