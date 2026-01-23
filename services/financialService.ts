import { supabase } from './supabaseClient';
import { FinancialRecord, FinancialType } from '../types';

export const fetchFinancialData = async (filters?: {
    type?: FinancialType | 'all';
    status?: 'paid' | 'pending' | 'all';
    dateStart?: string;
    dateEnd?: string;
    clientId?: string;
}) => {
    try {
        let query = supabase.from('financial').select('*, clients(nome_completo)').order('data_vencimento', { ascending: true });

        if (filters) {
            if (filters.type && filters.type !== 'all') query = query.eq('tipo', filters.type);
            if (filters.status === 'paid') query = query.eq('status_pagamento', true);
            if (filters.status === 'pending') query = query.eq('status_pagamento', false);
            if (filters.dateStart) query = query.gte('data_vencimento', filters.dateStart);
            if (filters.dateEnd) query = query.lte('data_vencimento', filters.dateEnd);
            if (filters.clientId) query = query.eq('client_id', filters.clientId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data as unknown as FinancialRecord[]) || [];
    } catch (error) {
        console.error("Erro fetchFinancialData:", error);
        throw error;
    }
};

export const fetchDashboardMetrics = async () => {
    try {
        // Fetch only necessary counts/sums for dashboard to save bandwidth
        const { data: counts, error: countError } = await supabase.rpc('get_dashboard_counts');

        if (countError) {
            // Fallback if RPC doesn't exist yet
            const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true }).neq('status', 'arquivado');
            const { count: casesCount } = await supabase.from('cases').select('*', { count: 'exact', head: true }).neq('status', 'Arquivado');
            return {
                clients: clientsCount || 0,
                cases: casesCount || 0
            };
        }

        return counts;
    } catch (error) {
        console.error("Erro metrics:", error);
        return { clients: 0, cases: 0 };
    }
};
