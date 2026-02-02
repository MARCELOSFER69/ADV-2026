import { supabase } from './supabaseClient';

export interface AuditLogEntry {
    action: string;
    details?: string;
    user_id?: string; // Optional, can be derived from session
    entity?: string;  // e.g., 'client', 'robot', 'system'
    entity_id?: string;
}

export const auditService = {
    /**
     * Logs an action to the audit_logs table.
     * @param entry The log entry details.
     */
    log: async (entry: AuditLogEntry) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || entry.user_id;

            // Ensure we have a user ID or mark as system/anonymous
            const finalUserId = userId || 'system';

            const logData = {
                action: entry.action,
                details: entry.details,
                user_id: finalUserId,
                entity: entry.entity,
                entity_id: entry.entity_id,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('audit_logs')
                .insert(logData)
                .select() // Optional, confirms insert
                .single();

            if (error) {
                console.error('Failed to write to audit log:', error);
            }
        } catch (err) {
            console.error('Error in auditService:', err);
        }
    }
};
