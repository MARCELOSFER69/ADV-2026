import { supabase } from './supabaseClient';

export const dashboardService = {
    // 1. KPIs Simples (Contagens) - USANDO HEAD: TRUE PARA PERFORMANCE
    async fetchStagnantCasesCount(filial?: string) {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 60);
        let query = supabase
            .from('cases')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'Arquivado')
            .not('status', 'ilike', '%Concluído%')
            .lt('data_abertura', limitDate.toISOString());

        if (filial && filial !== 'all') {
            query = query.eq('filial', filial);
        }

        const { count, error } = await query;

        if (error) throw error;
        return count || 0;
    },

    async fetchActiveCasesCount(filial?: string) {
        let query = supabase
            .from('cases')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'Arquivado');

        if (filial && filial !== 'all') {
            query = query.eq('filial', filial);
        }

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
    },

    async fetchTotalClientsCount(filial?: string) {
        let query = supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'arquivado');

        if (filial && filial !== 'all') {
            query = query.eq('filial', filial);
        }

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
    },

    // Novo: KPI para Fila do Whatsapp/Pendencias (Substituto de query pesada)
    async fetchTotalPendingCases(filial?: string) {
        let query = supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pendencia'); // Exemplo, ajustar conforme regra de negócio

        if (filial && filial !== 'all') {
            query = query.eq('filial', filial);
        }

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
    },

    // 2. Gráficos Financeiros
    async fetchFinancialStats(filial?: string) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

        const buildQuery = (tipo: string, paga: boolean) => {
            let q = supabase
                .from('financial_records')
                .select('valor, clients!inner(filial)')
                .eq('tipo', tipo)
                .eq('status_pagamento', paga)
                .gte('data_vencimento', startOfMonth)
                .lte('data_vencimento', endOfMonth);

            if (filial && filial !== 'all') {
                q = q.eq('clients.filial', filial);
            }
            return q;
        };

        const [incomeRes, expenseRes, expectedRes] = await Promise.all([
            buildQuery('Receita', true),
            buildQuery('Despesa', true),
            buildQuery('Receita', false)
        ]);

        const monthlyRevenue = incomeRes.data?.reduce((acc, curr) => acc + curr.valor, 0) || 0;
        const monthlyExpense = expenseRes.data?.reduce((acc, curr) => acc + curr.valor, 0) || 0;
        const expectedFees = expectedRes.data?.reduce((acc, curr) => acc + curr.valor, 0) || 0;

        return { monthlyRevenue, monthlyExpense, expectedFees };
    },

    async fetchCashFlowProjection(filial?: string) {
        const today = new Date();
        const next30 = new Date();
        next30.setDate(today.getDate() + 30);

        let futureIncomeQuery = supabase
            .from('financial_records')
            .select('valor, clients!inner(filial)')
            .eq('tipo', 'Receita')
            .eq('status_pagamento', false)
            .gte('data_vencimento', today.toISOString())
            .lte('data_vencimento', next30.toISOString());

        if (filial && filial !== 'all') {
            futureIncomeQuery = futureIncomeQuery.eq('clients.filial', filial);
        }

        const { data: futureIncome } = await futureIncomeQuery;
        const projectedIncome = futureIncome?.reduce((acc, curr) => acc + curr.valor, 0) || 0;

        // Saldo Atual Simplificado - Somando Receitas do Ano - Despesas do Ano
        const startYear = new Date(today.getFullYear(), 0, 1).toISOString();
        let yearFlowQuery = supabase
            .from('financial_records')
            .select('valor, tipo, clients!inner(filial)')
            .eq('status_pagamento', true)
            .gte('data_vencimento', startYear);

        if (filial && filial !== 'all') {
            yearFlowQuery = yearFlowQuery.eq('clients.filial', filial);
        }

        const { data: yearFlow } = await yearFlowQuery;

        let currentBalance = 0;
        yearFlow?.forEach(f => {
            currentBalance += f.tipo === 'Receita' ? f.valor : -f.valor;
        });

        return { currentBalance, projectedIncome };
    },

    // 3. Listas (Limitadas a top 5-10 para não pesar)
    async fetchInsuranceDue(filial?: string) {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        let query = supabase
            .from('financial_records')
            .select('id, titulo, valor, data_vencimento, client_id, case_id, clients!inner(filial)')
            .eq('status_pagamento', false)
            .eq('tipo', 'Receita')
            .ilike('titulo', '%Seguro Defeso%')
            .gte('data_vencimento', today.toISOString())
            .lte('data_vencimento', nextWeek.toISOString());

        if (filial && filial !== 'all') {
            query = query.eq('clients.filial', filial);
        }

        const { data, error } = await query.limit(10); // LIMIT OBRIGATÓRIO

        if (error) throw error;
        return data || [];
    },

    async fetchReceivables(filial?: string) {
        let query = supabase
            .from('financial_records')
            .select('id, titulo, valor, data_vencimento, client_id, case_id, clients!inner(filial)')
            .eq('status_pagamento', false)
            .eq('tipo', 'Receita');

        if (filial && filial !== 'all') {
            query = query.eq('clients.filial', filial);
        }

        const { data, error } = await query
            .order('data_vencimento', { ascending: true })
            .limit(10); // LIMIT OBRIGATÓRIO

        if (error) throw error;
        return data || [];
    },

    // DEPRECATED: Traziam dados demais. Removidos para garantir uso do count_only.
    // fetchClientsLightweight - REMOVIDO
    // fetchCasesLightweight - REMOVIDO
};
