import { supabase } from './supabaseClient';
import { FinancialRecord } from '../types';

export interface FinancialFilters {
    type?: string;
    status?: string; // 'paid' | 'pending'
    method?: string;
    account?: string;
    receiver?: string;
    search?: string;
}

/**
 * Busca registros financeiros filtrados por período e outros critérios.
 * @param startDate Data inicial (YYYY-MM-DD)
 * @param endDate Data final (YYYY-MM-DD)
 * @param filters Filtros opcionais
 */
export const fetchFinancialRecords = async (
    startDate: string,
    endDate: string,
    filters: FinancialFilters = {}
): Promise<FinancialRecord[]> => {
    let query = supabase
        .from('financial_records')
        .select(`
            *,
            clients (nome_completo, cpf_cnpj),
            cases (titulo, numero_processo, client_id)
        `)
        .gte('data_vencimento', startDate) // Greater than or equal to startDate
        .lte('data_vencimento', endDate);  // Less than or equal to endDate

    // Apply Filters
    if (filters.type && filters.type !== 'all') {
        query = query.eq('tipo', filters.type);
    }

    if (filters.status === 'paid') {
        query = query.eq('status_pagamento', true);
    } else if (filters.status === 'pending') {
        query = query.eq('status_pagamento', false);
    }

    if (filters.method && filters.method !== 'all') {
        query = query.eq('forma_pagamento', filters.method);
    }

    if (filters.account && filters.account !== 'all') {
        query = query.eq('conta', filters.account);
    }

    if (filters.receiver && filters.receiver !== 'all') {
        // Recebedor pode ser 'recebedor' ou 'captador_nome' dependendo da estrutura exata, 
        // mas assumindo que filtramos pela coluna 'recebedor' ou talvez precisemos de um OR.
        // Se a UI filtra pelo campo 'recebedor' ou 'captador_nome' combinados, o backend precisa refletir isso.
        // Por simplicidade e performance, vamos filtrar onde 'recebedor' bate, ou ajustar se necessário.
        // Dado o código do frontend: const rec = record.recebedor || record.captador_nome;
        // O ideal seria um .or(), mas o PostgREST tem sintaxe específica para combinados.
        // Vamos tentar filtrar apenas colunas diretas primeiro garantindo a indexação.
        // Se 'captador_nome' for relevante apenas para comissões, talvez precisemos de "or".

        // Sintaxe PostgREST para OR: .or(`recebedor.eq.${filters.receiver},captador_nome.eq.${filters.receiver}`)
        query = query.or(`recebedor.eq.${filters.receiver},captador_nome.eq.${filters.receiver}`);
    }

    if (filters.search) {
        // Busca textual. Nota: 'ilike' em todas as colunas pode ser pesado.
        // Idealmente, usar Search index do Postgres, mas 'ilike' resolve para volumes médios.
        const term = `%${filters.search}%`;
        query = query.or(`descricao.ilike.${term},recebedor.ilike.${term},captador_nome.ilike.${term}`);
    }

    const { data, error } = await query.order('data_vencimento', { ascending: false });

    if (error) {
        console.error('Erro ao buscar financeiro:', error);
        throw error;
    }

    return (data as FinancialRecord[]) || [];
};

export const fetchFinancialSummary = async (startDate: string, endDate: string) => {
    try {
        const { data, error } = await supabase.rpc('get_financial_summary', {
            start_date: startDate,
            end_date: endDate
        });

        if (error) throw error;
        return data as { income: number; expense: number; balance: number };
    } catch (e) {
        console.warn('RPC get_financial_summary falhou, usando fallback local...', e);
        // ... existing code ...
        console.warn('RPC get_financial_summary falhou, usando fallback local...', e);
        // Fallback: Se o RPC não existir, retorna null para o Frontend calcular manualmente
        return null;
    }
};

export const fetchFinancialsByCaseId = async (caseId: string): Promise<FinancialRecord[]> => {
    try {
        const { data, error } = await supabase
            .from('financial_records')
            .select('*')
            .eq('case_id', caseId)
            .order('data_vencimento', { ascending: false });

        if (error) throw error;
        return (data as FinancialRecord[]) || [];
    } catch (error) {
        console.error(`Erro ao buscar financeiro do caso ${caseId}:`, error);
        throw error;
    }
};
