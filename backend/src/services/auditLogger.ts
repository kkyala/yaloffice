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
                // Fallback: If column missing, try logging without user_id to at least save the action
                if (error.message && error.message.includes('user_id')) {
                    const { error: retryError } = await supabase.from('audit_logs').insert({
                        action: entry.action,
                        resource_type: entry.resourceType,
                        resource_id: entry.resourceId,
                        details: { ...entry.details, original_user_id: entry.userId }, // Save user_id in details
                    });
                    if (retryError) console.error('Retry audit log failed:', retryError);
                }
            }
        } catch (err) {
            console.error('Error writing audit log:', err);
        }
    }
}

export const auditLogger = new AuditLogger();
