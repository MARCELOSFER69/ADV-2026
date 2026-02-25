import { useQueries } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
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
    stagnantCount: number;
    cashFlow: { currentBalance: number, projectedIncome: number } | null;
    insuranceDue: any[];
    receivables: any[];
    lightweightClients: any[];
    lightweightCases: any[];
}

export const useDashboardStats = (filial?: string): DashboardStats => {
    const currentMonth = new Date().getMonth() + 1;
    const monthString = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;

    const results = useQueries({
        queries: [
            {
                // KPI: TOTAL CLIENTS (Count)
                queryKey: ['dashboard-clients-count', filial],
                queryFn: () => dashboardService.fetchTotalClientsCount(filial),
                staleTime: 1000 * 60 * 10,
            },
            {
                // KPI: ACTIVE CASES (Count)
                queryKey: ['dashboard-active-cases-count', filial],
                queryFn: () => dashboardService.fetchActiveCasesCount(filial),
                staleTime: 1000 * 60 * 10,
            },
            {
                // KPI: PENDING CASES (Whatsapp Queue)
                queryKey: ['dashboard-pending-queue', filial],
                queryFn: () => dashboardService.fetchTotalPendingCases(filial),
                staleTime: 1000 * 30,
            },
            {
                // CHART DATA (Financial) - Keep existing logic or optimize later
                queryKey: ['dashboard-chart'],
                queryFn: async () => {
                    const { data, error } = await supabase.rpc('get_financial_chart_data');
                    if (error) throw error;
                    return data;
                },
                staleTime: 1000 * 60 * 5,
            },
            {
                // CAPTADORES (Ranking)
                queryKey: ['dashboard-captadores'],
                queryFn: async () => {
                    const { data, error } = await supabase.rpc('get_top_captadores');
                    if (error) throw error;
                    return data;
                },
                staleTime: 1000 * 60 * 5,
            },
            {
                // BOT UPDATES (Recent Activity)
                queryKey: ['dashboard-bot-updates'],
                queryFn: async () => {
                    const { data, error } = await supabase.rpc('get_recent_bot_updates');
                    if (error) throw error;
                    return data;
                },
                staleTime: 1000 * 30, // 30 seconds
            },
            {
                // STAGNANT CASES (Count)
                queryKey: ['dashboard-stagnant', filial],
                queryFn: () => dashboardService.fetchStagnantCasesCount(filial),
                staleTime: 1000 * 60 * 10,
            },
            {
                // CASH FLOW (Projection)
                queryKey: ['dashboard-cash-flow', filial],
                queryFn: () => dashboardService.fetchCashFlowProjection(filial),
                staleTime: 1000 * 60 * 10,
            },
            {
                // INSURANCE DUE (List - Limited)
                queryKey: ['dashboard-insurance', filial],
                queryFn: () => dashboardService.fetchInsuranceDue(filial),
                staleTime: 1000 * 60 * 10,
            },
            {
                // RECEIVABLES (List - Limited)
                queryKey: ['dashboard-receivables', filial],
                queryFn: () => dashboardService.fetchReceivables(filial),
                staleTime: 1000 * 60 * 5,
            },
            {
                // FINANCIAL STATS (Montly Revenue/Expense)
                queryKey: ['dashboard-financial-stats', filial],
                queryFn: () => dashboardService.fetchFinancialStats(filial),
                staleTime: 1000 * 60 * 5,
            },
        ],
    });

    const isLoading = results.some(result => result.isLoading);
    const isError = results.some(result => result.isError);

    // Mapeamento dos Resultados (Indices baseados na ordem das queries acima)
    // 0: Clients Count
    // 1: Active Cases Count
    // 2: Pending Queue Count
    // 3: Chart
    // 4: Captadores
    // 5: Bot Updates
    // 6: Stagnant
    // 7: Cash Flow
    // 8: Insurance
    // 9: Receivables
    // 10: Financial Stats

    const totalClients = results[0].data || 0;
    const activeCases = results[1].data || 0;
    const pendingQueue = results[2].data || 0;

    const financialStats = results[10].data || { monthlyRevenue: 0, monthlyExpense: 0, expectedFees: 0 };

    const kpis = {
        total_clients: totalClients,
        active_cases: activeCases,
        monthly_revenue: financialStats.monthlyRevenue,
        expected_fees: financialStats.expectedFees,
        whatsapp_queue_pending: pendingQueue,
        success_rate: 0, // Placeholder se não houver cálculo específico
    };

    return {
        kpis: kpis,
        chartData: results[3].data || null,
        topCaptadores: results[4].data || null,
        botUpdates: results[5].data || null,
        stagnantCount: results[6].data || 0,
        cashFlow: results[7].data || null,
        insuranceDue: results[8].data || [],
        receivables: results[9].data || [],
        isLoading,
        isError,
        // Remover propriedades que não são mais usadas (lightweight lists) da interface se possível,
        // mas mantendo compatibilidade com return type:
        lightweightClients: [], // Empty array as fallback
        lightweightCases: [],   // Empty array as fallback
    };
};
