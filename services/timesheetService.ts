import { supabase } from './supabaseClient';
import { TimesheetEntry } from '../types';
import { getTodayBrasilia } from '../utils/dateUtils';

export const timesheetService = {
    /**
     * Fetch timesheet entries for a specific user and month
     */
    async fetchUserTimesheets(userId: string, month: string): Promise<TimesheetEntry[]> {
        const startDate = `${month}-01`;
        // Get last day of month
        const date = new Date(startDate);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const endDate = `${month}-${lastDay}`;

        const { data, error } = await supabase
            .from('timesheets')
            .select('*')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch all timesheets for all users (Admin only)
     */
    async fetchAllTimesheets(month: string): Promise<TimesheetEntry[]> {
        const startDate = `${month}-01`;
        const date = new Date(startDate);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const endDate = `${month}-${lastDay}`;

        const { data, error } = await supabase
            .from('timesheets')
            .select(`
        *,
        users:user_id (full_name)
      `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) throw error;

        return (data || []).map(entry => ({
            ...entry,
            user_name: (entry as any).users?.full_name || 'Desconhecido'
        }));
    },

    /**
     * Save or update a timesheet entry
     */
    async saveEntry(entry: Partial<TimesheetEntry>): Promise<void> {
        if (!entry.user_id || !entry.date) throw new Error("Usuário e data são obrigatórios.");

        // Prevent future dates (unless admin, but RLS will catch it anyway)
        const today = getTodayBrasilia();
        if (entry.date > today) {
            throw new Error("Não é possível registrar ponto para datas futuras.");
        }

        const { error } = await supabase
            .from('timesheets')
            .upsert(entry, { onConflict: 'user_id, date' });

        if (error) throw error;
    },

    /**
     * Get today's entry for a specific user
     */
    async getTodayEntry(userId: string): Promise<TimesheetEntry | null> {
        const today = getTodayBrasilia();
        const { data, error } = await supabase
            .from('timesheets')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows found"
        return data;
    }
};
