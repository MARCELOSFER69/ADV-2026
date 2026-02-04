import { supabase } from './supabaseClient';

export const dashboardService = {
    // 1. KPIs Simples (Contagens) - USANDO HEAD: TRUE PARA PERFORMANCE
    async fetchStagnantCasesCount() {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 60);
        const { count, error } = await supabase
            .from('cases')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'Arquivado')
            .not('status', 'ilike', '%Concluído%')
            .lt('data_abertura', limitDate.toISOString());

        if (error) throw error;
        return count || 0;
    },

    async fetchActiveCasesCount() {
        const { count, error } = await supabase
            .from('cases')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'Arquivado');
        if (error) throw error;
        return count || 0;
    },

    async fetchTotalClientsCount() {
        const { count, error } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'arquivado');
        if (error) throw error;
        return count || 0;
    },

    // Novo: KPI para Fila do Whatsapp/Pendencias (Substituto de query pesada)
    async fetchTotalPendingCases() {
        const { count, error } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pendencia'); // Exemplo, ajustar conforme regra de negócio
        if (error) throw error;
        return count || 0;
    },

    // 2. Gráficos Financeiros
    async fetchFinancialStats() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

        // RPC OTIMIZADO seria ideal aqui, mas mantendo a lógica JS por enquanto para não quebrar contrato sem acesso ao SQL.
        // Pelo menos garantindo que trazemos apenas colunas 'valor'.

        // Receita Mensal
        const { data: incomeData } = await supabase
            .from('financial_records')
            .select('valor')
            .eq('tipo', 'Receita')
            .eq('status_pagamento', true)
            .gte('data_vencimento', startOfMonth)
            .lte('data_vencimento', endOfMonth);

        const monthlyRevenue = incomeData?.reduce((acc, curr) => acc + curr.valor, 0) || 0;

        // Despesa Mensal
        const { data: expenseData } = await supabase
            .from('financial_records')
            .select('valor')
            .eq('tipo', 'Despesa')
            .eq('status_pagamento', true)
            .gte('data_vencimento', startOfMonth)
            .lte('data_vencimento', endOfMonth);

        const monthlyExpense = expenseData?.reduce((acc, curr) => acc + curr.valor, 0) || 0;

        // Honorários Previstos (Não pagos, vencimento este mês)
        const { data: expectedData } = await supabase
            .from('financial_records')
            .select('valor')
            .eq('tipo', 'Receita')
            .eq('status_pagamento', false)
            .gte('data_vencimento', startOfMonth)
            .lte('data_vencimento', endOfMonth);

        const expectedFees = expectedData?.reduce((acc, curr) => acc + curr.valor, 0) || 0;

        return { monthlyRevenue, monthlyExpense, expectedFees };
    },

    async fetchCashFlowProjection() {
        const today = new Date();
        const next30 = new Date();
        next30.setDate(today.getDate() + 30);

        const { data: futureIncome } = await supabase
            .from('financial_records')
            .select('valor')
            .eq('tipo', 'Receita')
            .eq('status_pagamento', false)
            .gte('data_vencimento', today.toISOString())
            .lte('data_vencimento', next30.toISOString());

        const projectedIncome = futureIncome?.reduce((acc, curr) => acc + curr.valor, 0) || 0;

        // Saldo Atual Simplificado - Somando Receitas do Ano - Despesas do Ano
        const startYear = new Date(today.getFullYear(), 0, 1).toISOString();
        const { data: yearFlow } = await supabase
            .from('financial_records')
            .select('valor, tipo')
            .eq('status_pagamento', true)
            .gte('data_vencimento', startYear);

        let currentBalance = 0;
        yearFlow?.forEach(f => {
            currentBalance += f.tipo === 'Receita' ? f.valor : -f.valor;
        });

        return { currentBalance, projectedIncome };
    },

    // 3. Listas (Limitadas a top 5-10 para não pesar)
    async fetchInsuranceDue() {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const { data, error } = await supabase
            .from('financial_records')
            .select('id, titulo, valor, data_vencimento, client_id, case_id')
            .eq('status_pagamento', false)
            .eq('tipo', 'Receita')
            .ilike('titulo', '%Seguro Defeso%')
            .gte('data_vencimento', today.toISOString())
            .lte('data_vencimento', nextWeek.toISOString())
            .limit(10); // LIMIT OBRIGATÓRIO

        if (error) throw error;
        return data || [];
    },

    async fetchReceivables() {
        const { data, error } = await supabase
            .from('financial_records')
            .select('id, titulo, valor, data_vencimento, client_id, case_id')
            .eq('status_pagamento', false)
            .eq('tipo', 'Receita')
            .order('data_vencimento', { ascending: true })
            .limit(10); // LIMIT OBRIGATÓRIO

        if (error) throw error;
        return data || [];
    },

    // DEPRECATED: Traziam dados demais. Removidos para garantir uso do count_only.
    // fetchClientsLightweight - REMOVIDO
    // fetchCasesLightweight - REMOVIDO
};
