
import { supabase } from './supabaseClient';

export interface BotLog {
    id?: string;
    case_id: string;
    bot_name: string;
    raw_response?: any;
    changes_detected?: any;
    created_at?: string;
}

export interface Notification {
    id?: string;
    client_id: string;
    case_id?: string;
    message: string;
    severity: 'baixa' | 'media' | 'alta' | 'critica';
    status: 'pendente' | 'enviado' | 'erro';
    error_log?: string;
    scheduled_for?: string;
    sent_at?: string;
    created_at?: string;
}

export const automationService = {
    async logBotUpdate(log: BotLog) {
        const { data, error } = await supabase
            .from('bot_update_logs')
            .insert([log])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getNotifications(status: string = 'pendente'): Promise<Notification[]> {
        const { data, error } = await supabase
            .from('notification_queue')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async updateNotificationStatus(id: string, status: 'enviado' | 'erro', errorLog?: string) {
        const { error } = await supabase
            .from('notification_queue')
            .update({
                status,
                error_log: errorLog,
                sent_at: status === 'enviado' ? new Date().toISOString() : null
            })
            .eq('id', id);
        if (error) throw error;
    },

    /**
     * Adiciona um job na fila de automação para ser processado pelo Robô Local (bot.cjs).
     */
    async enqueueJob(type: string, payload: any, priority: number = 1) {
        const { data, error } = await supabase
            .from('automation_queue')
            .insert([{
                type,
                payload,
                priority,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
