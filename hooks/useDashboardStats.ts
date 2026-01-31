import { useQueries } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

export interface DashboardStats {
    kpis: {
        total_clients: number;
        active_cases: number;
        monthly_revenue: number;
        expected_fees: number;
        whatsapp_queue_pending: number;
        success_rate: number;
    } | null;
    chartData: {
        month: string;
        income: number;
        expense: number;
    }[] | null;
    topCaptadores: {
        name: string;
        count: number;
    }[] | null;
    botUpdates: {
        id: string;
        numero_processo: string;
        case_title: string;
        bot_name: string;
        changes_detected: any;
        created_at: string;
    }[] | null;
    isLoading: boolean;
    isError: boolean;
}

export const useDashboardStats = (): DashboardStats => {
    const currentMonth = new Date().getMonth() + 1;
    const monthString = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;

    const results = useQueries({
        queries: [
            {
                queryKey: ['dashboard-kpis'],
                queryFn: async () => {
                    const { data, error } = await supabase.rpc('get_dashboard_kpis');
                    if (error) throw error;
                    return data;
                },
                staleTime: 1000 * 60 * 5, // 5 minutes
            },
            {
                queryKey: ['dashboard-chart'],
                queryFn: async () => {
                    const { data, error } = await supabase.rpc('get_financial_chart_data');
                    if (error) throw error;
                    return data;
                },
                staleTime: 1000 * 60 * 5,
            },
            {
                queryKey: ['dashboard-captadores'],
                queryFn: async () => {
                    const { data, error } = await supabase.rpc('get_top_captadores');
                    if (error) throw error;
                    return data;
                },
                staleTime: 1000 * 60 * 5,
            },
            {
                queryKey: ['dashboard-bot-updates'],
                queryFn: async () => {
                    const { data, error } = await supabase.rpc('get_recent_bot_updates');
                    if (error) throw error;
                    return data;
                },
                staleTime: 1000 * 30, // 30 seconds
            }
        ],
    });

    const isLoading = results.some(result => result.isLoading);
    const isError = results.some(result => result.isError);

    return {
        kpis: results[0].data || null,
        chartData: results[1].data || null,
        topCaptadores: results[2].data || null,
        botUpdates: results[3].data || null,
        isLoading,
        isError
    };
};
