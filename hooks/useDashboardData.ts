import { useMemo, useCallback } from 'react';
import { Client, Case, FinancialRecord, Event, Task, Reminder, CaseHistory, WidgetPeriod, WidgetType, CaseStatus, FinancialType, CaseType } from '../types';

interface UseDashboardDataProps {
    clients: Client[];
    cases: Case[];
    financial: FinancialRecord[];
    events: Event[];
    tasks: Task[];
    reminders: Reminder[];
}

export const useDashboardData = ({
    clients,
    cases,
    financial,
    events,
    tasks,
    reminders
}: UseDashboardDataProps) => {

    const getDateRange = useCallback((period: WidgetPeriod = 'this_month') => {
        const now = new Date();
        let start = new Date(0), end = new Date(), prevStart = new Date(0), prevEnd = new Date(0);

        if (period === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        } else if (period === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
        } else if (period === 'this_year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            prevStart = new Date(now.getFullYear() - 1, 0, 1);
            prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        }
        return { start, end, prevStart, prevEnd };
    }, []);

    const calculateKPI = useCallback((type: WidgetType, period: WidgetPeriod = 'this_month') => {
        const { start, end, prevStart, prevEnd } = getDateRange(period);
        let currentValue = 0, previousValue = 0, label = '', format = 'number';

        if (type === 'kpi-income' || type === 'kpi-expense') {
            const finType = type === 'kpi-income' ? FinancialType.RECEITA : FinancialType.DESPESA;
            label = type === 'kpi-income' ? 'Receita' : 'Despesas';
            format = 'currency';
            currentValue = financial.filter(f => f.tipo === finType && f.status_pagamento && new Date(f.data_vencimento) >= start && new Date(f.data_vencimento) <= end).reduce((acc, curr) => acc + curr.valor, 0);
            previousValue = financial.filter(f => f.tipo === finType && f.status_pagamento && new Date(f.data_vencimento) >= prevStart && new Date(f.data_vencimento) <= prevEnd).reduce((acc, curr) => acc + curr.valor, 0);
        } else if (type === 'kpi-new-clients') {
            label = 'Novos Clientes';
            currentValue = clients.filter(c => new Date(c.data_cadastro) >= start && new Date(c.data_cadastro) <= end).length;
            previousValue = clients.filter(c => new Date(c.data_cadastro) >= prevStart && new Date(c.data_cadastro) <= prevEnd).length;
        } else if (type === 'kpi-active-cases') {
            label = 'Processos Ativos';
            currentValue = cases.filter(c => c.status !== CaseStatus.ARQUIVADO).length;
            previousValue = currentValue;
        } else if (type === 'kpi-success-rate') {
            label = 'Taxa de Êxito';
            format = 'percentage';
            const total = cases.filter(c => c.status === CaseStatus.CONCLUIDO_CONCEDIDO || c.status === CaseStatus.CONCLUIDO_INDEFERIDO).length;
            const wins = cases.filter(c => c.status === CaseStatus.CONCLUIDO_CONCEDIDO).length;
            currentValue = total > 0 ? (wins / total) * 100 : 0;
            previousValue = currentValue;
        }

        let trend = 0;
        if (previousValue > 0) trend = ((currentValue - previousValue) / previousValue) * 100;
        else if (currentValue > 0) trend = 100;

        return { currentValue, previousValue, trend, label, format };
    }, [clients, cases, financial, getDateRange]);

    const getChartData = useCallback((dataType: 'financial' | 'clients' | 'cases' = 'financial') => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const monthKey = d.toLocaleString('pt-BR', { month: 'short' });
            const m = d.getMonth(), y = d.getFullYear();
            if (dataType === 'financial') {
                const income = financial.filter(f => f.tipo === FinancialType.RECEITA && f.status_pagamento && new Date(f.data_vencimento).getMonth() === m && new Date(f.data_vencimento).getFullYear() === y).reduce((acc, curr) => acc + curr.valor, 0);
                const expense = financial.filter(f => f.tipo === FinancialType.DESPESA && f.status_pagamento && new Date(f.data_vencimento).getMonth() === m && new Date(f.data_vencimento).getFullYear() === y).reduce((acc, curr) => acc + curr.valor, 0);
                data.push({ name: monthKey, Receita: income, Despesa: expense, Lucro: income - expense });
            } else if (dataType === 'clients') {
                data.push({ name: monthKey, Clientes: clients.filter(c => new Date(c.data_cadastro).getMonth() === m && new Date(c.data_cadastro).getFullYear() === y).length });
            } else {
                data.push({ name: monthKey, Processos: cases.filter(c => new Date(c.data_abertura).getMonth() === m && new Date(c.data_abertura).getFullYear() === y).length });
            }
        }
        return data;
    }, [clients, cases, financial]);

    const topCaptadores = useMemo(() => {
        const ranking: Record<string, number> = {};
        clients.forEach(c => { if (c.captador) ranking[c.captador] = (ranking[c.captador] || 0) + 1; });
        return Object.entries(ranking).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    }, [clients]);

    const stagnantCasesCount = useMemo(() => {
        const limitDate = new Date(); limitDate.setDate(limitDate.getDate() - 60);
        return cases.filter(c => c.status !== CaseStatus.ARQUIVADO && !c.status.includes('Concluído') && new Date(c.data_abertura) < limitDate).length;
    }, [cases]);

    const cashFlowData = useMemo(() => {
        const today = new Date(); const next30 = new Date(); next30.setDate(today.getDate() + 30);
        const currentBalance = financial.reduce((acc, curr) => { if (!curr.status_pagamento) return acc; return acc + (curr.tipo === FinancialType.RECEITA ? curr.valor : -curr.valor); }, 0);
        const projectedIncome = financial.filter(f => !f.status_pagamento && f.tipo === FinancialType.RECEITA && new Date(f.data_vencimento) <= next30).reduce((acc, curr) => acc + curr.valor, 0);
        return [{ name: 'Saldo Atual', valor: currentBalance, fill: '#10B981' }, { name: 'Projeção (30d)', valor: currentBalance + projectedIncome, fill: '#3B82F6' }];
    }, [financial]);

    const funnelData = useMemo(() => {
        const counts = { inicial: 0, andamento: 0, decisao: 0, finalizado: 0 };
        cases.forEach(c => {
            if ([CaseStatus.ANALISE, CaseStatus.EXIGENCIA, CaseStatus.AGUARDANDO_AUDIENCIA].includes(c.status)) counts.inicial++;
            else if (c.status === CaseStatus.EM_RECURSO) counts.andamento++;
            else if (c.status.includes('Aguardando')) counts.decisao++;
            else if ([CaseStatus.CONCLUIDO_CONCEDIDO, CaseStatus.CONCLUIDO_INDEFERIDO, CaseStatus.ARQUIVADO].includes(c.status)) counts.finalizado++;
        });
        return [{ name: 'Inicial', value: counts.inicial, fill: '#60A5FA' }, { name: 'Andamento', value: counts.andamento, fill: '#EAB308' }, { name: 'Decisão', value: counts.decisao, fill: '#A855F7' }, { name: 'Finalizado', value: counts.finalizado, fill: '#10B981' }];
    }, [cases]);

    const radarData = useMemo(() => {
        const { start, end } = getDateRange('this_month');
        const income = financial.filter(f => f.tipo === FinancialType.RECEITA && f.status_pagamento && new Date(f.data_vencimento) >= start && new Date(f.data_vencimento) <= end).reduce((acc, curr) => acc + curr.valor, 0);
        const expense = financial.filter(f => f.tipo === FinancialType.DESPESA && f.status_pagamento && new Date(f.data_vencimento) >= start && new Date(f.data_vencimento) <= end).reduce((acc, curr) => acc + curr.valor, 0);
        const commissions = financial.filter(f => f.tipo === FinancialType.COMISSAO && f.status_pagamento && new Date(f.data_vencimento) >= start && new Date(f.data_vencimento) <= end).reduce((acc, curr) => acc + curr.valor, 0);
        const max = Math.max(income, expense, commissions, 1);
        return [{ subject: 'Receitas', A: income, fullMark: max }, { subject: 'Despesas', A: expense, fullMark: max }, { subject: 'Comissões', A: commissions, fullMark: max }];
    }, [financial, getDateRange]);

    const insuranceDueData = useMemo(() => {
        const today = new Date(); const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7);
        return financial.filter(f => !f.status_pagamento && f.tipo === FinancialType.RECEITA && (f.descricao.includes('Seguro Defeso') || f.descricao.includes('Benefício')) && new Date(f.data_vencimento) >= today && new Date(f.data_vencimento) <= nextWeek).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
    }, [financial]);

    const overdueOrImpendingDeadlines = useMemo(() => cases.filter(c => c.data_fatal && c.status !== CaseStatus.ARQUIVADO && c.status !== CaseStatus.CONCLUIDO_CONCEDIDO).sort((a, b) => new Date(a.data_fatal!).getTime() - new Date(b.data_fatal!).getTime()).slice(0, 5), [cases]);
    const pendingTasks = useMemo(() => tasks.filter(t => !t.concluido).slice(0, 5), [tasks]);
    const upcomingEvents = useMemo(() => events.filter(e => new Date(e.data_hora) >= new Date()).sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()).slice(0, 5), [events]);
    const birthdaysThisMonth = useMemo(() => { const currentMonth = new Date().getMonth(); return clients.filter(c => { if (!c.data_nascimento) return false; const bDate = new Date(c.data_nascimento); const correctedDate = new Date(bDate.getTime() + bDate.getTimezoneOffset() * 60000); return correctedDate.getMonth() === currentMonth; }).sort((a, b) => new Date(a.data_nascimento!).getDate() - new Date(b.data_nascimento!).getDate()); }, [clients]);
    const receivablesData = useMemo(() => financial.filter(f => f.tipo === FinancialType.RECEITA && !f.status_pagamento).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()), [financial]);
    const typeDistributionData = useMemo(() => { const counts: Record<string, number> = {}; cases.forEach(c => { counts[c.tipo] = (counts[c.tipo] || 0) + 1; }); return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [cases]);

    return {
        calculateKPI,
        getChartData,
        topCaptadores,
        stagnantCasesCount,
        cashFlowData,
        funnelData,
        radarData,
        insuranceDueData,
        overdueOrImpendingDeadlines,
        pendingTasks,
        upcomingEvents,
        birthdaysThisMonth,
        receivablesData,
        typeDistributionData,
        getDateRange
    };
};
