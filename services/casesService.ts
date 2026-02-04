import { supabase } from './supabaseClient';
import { Case } from '../types';

const applyCaseFilters = (query: any, search?: string, filters?: any) => {
    if (search) {
        const normalizedSearch = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        query = query.or(`titulo_unaccent.ilike.%${normalizedSearch}%,numero_processo.ilike.%${search}%,client_name_unaccent.ilike.%${normalizedSearch}%,client_cpf.ilike.%${search}%`);
    }

    // Lógica de Arquivo Morto vs Ativos
    if (filters?.viewMode === 'archived') {
        query = query.eq('status', 'Arquivado');
    } else {
        query = query.neq('status', 'Arquivado');
    }

    if (filters) {
        if (filters.tipo && filters.tipo !== 'all') query = query.eq('tipo', filters.tipo);
        if (filters.status && filters.status !== 'all' && filters.status !== 'active') {
            query = query.eq('status', filters.status);
        }
        if (filters.tribunal && filters.tribunal !== 'all') {
            query = query.ilike('tribunal', `%${filters.tribunal}%`);
        }
        if (filters.dateStart) query = query.gte('data_abertura', filters.dateStart);
        if (filters.dateEnd) query = query.lte('data_abertura', filters.dateEnd);

        if (filters.category) {
            if (filters.category === 'Seguro Defeso') {
                query = query.eq('tipo', 'Seguro Defeso');
            }
            else if (filters.category === 'Judicial') {
                // Judicial: Qualquer processo que TENHA tribunal e NÃO seja INSS
                query = query.neq('tipo', 'Seguro Defeso');
                query = query.not('tribunal', 'is', null);
                query = query.neq('tribunal', '');
                query = query.not('tribunal', 'ilike', '%INSS%');
                query = query.not('tribunal', 'ilike', '%Administrativo%');
            }
            else if (filters.category === 'Administrativo') {
                // Administrativo: Qualquer processo que seja INSS ou sem tribunal (e não seja Seguro Defeso)
                query = query.neq('tipo', 'Seguro Defeso');
                query = query.or('tribunal.is.null,tribunal.eq.,tribunal.ilike.%INSS%,tribunal.ilike.%Administrativo%');
            }
        }
    }
    return query;
};

export const fetchCasesData = async (page: number, perPage: number, search?: string, filters?: any) => {
    try {
        let query = supabase.from('view_cases_dashboard').select('*', { count: 'exact' });
        query = applyCaseFilters(query, search, filters);

        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const sortKey = filters?.sortKey || 'data_abertura';
        const sortAsc = filters?.sortDirection !== 'desc';

        const { data, count, error } = await query
            .order(sortKey, { ascending: sortAsc })
            .range(from, to);

        if (error) throw error;

        return { data: (data || []) as unknown as Case[], count: count || 0 };
    } catch (error) {
        console.error("Erro fetchCasesData:", error);
        throw error;
    }
};

// ... existing code ...
// ... existing code ...
/**
 * @deprecated THIS FUNCTION KILLS PERFORMANCE. DO NOT USE FOR > 500 RECORDS.
 * Use fetchCasesData with pagination or specialized lightweight queries instead.
 */
export const fetchAllCasesData = async () => {
    try {
        console.warn("PERFORMANCE WARNING: fetchAllCasesData called. This should be avoided.");
        const { data, error } = await supabase.from('view_cases_dashboard').select('*');
        if (error) throw error;
        return (data || []) as unknown as Case[];
    } catch (error) {
        console.error("Erro fetchAllCasesData:", error);
        throw error;
    }
};

/**
 * Optimized fetch for Kanban.
 * Fetches only what is needed to display the card.
 */
export const fetchKanbanCases = async (search?: string, filters?: any) => {
    try {
        let query = supabase
            .from('view_cases_dashboard')
            .select('id, titulo, numero_processo, status, valor_causa, client_id, data_abertura, client_name, client_cpf');

        query = applyCaseFilters(query, search, filters);

        const { data, error } = await query;

        if (error) throw error;
        return (data || []) as unknown as Case[];
    } catch (error) {
        console.error("Erro fetchKanbanCases:", error);
        throw error;
    }
};

export const fetchCaseById = async (id: string) => {
    try {
        const { data, error } = await supabase
            .from('view_cases_dashboard')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Case;
    } catch (error) {
        // ... existing code ...
        console.error(`Erro fetchCaseById (${id}):`, error);
        throw error;
    }
};

export const fetchCaseEvents = async (caseId: string) => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('case_id', caseId)
            .order('data_hora', { ascending: true });

        if (error) throw error;
        // Importante: Tipar corretamente no frontend ou aqui
        return data as any[];
    } catch (error) {
        console.error(`Erro fetchCaseEvents (${caseId}):`, error);
        throw error;
    }
};

export const fetchCaseTasks = async (caseId: string) => {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('case_id', caseId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as any[];
    } catch (error) {
        console.error(`Erro fetchCaseTasks (${caseId}):`, error);
        throw error;
    }
};
export const fetchCaseInstallments = async (caseId: string) => {
    try {
        const { data, error } = await supabase
            .from('case_installments')
            .select('*')
            .eq('case_id', caseId)
            .order('parcela_numero', { ascending: true });

        if (error) throw error;
        return data as any[];
    } catch (error) {
        console.error(`Erro fetchCaseInstallments (${caseId}):`, error);
        throw error;
    }
};
