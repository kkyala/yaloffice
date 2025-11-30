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
                console.error('Failed to write audit log:', error);
            }
        } catch (err) {
            console.error('Error writing audit log:', err);
        }
    }
}

export const auditLogger = new AuditLogger();
