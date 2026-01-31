import { supabase } from './supabaseClient';
import { Case } from '../types';

export const fetchCasesData = async (page: number, perPage: number, search?: string, filters?: any) => {
    try {
        let query = supabase.from('view_cases_dashboard').select('*', { count: 'exact' });

        if (search) {
            query = query.or(`titulo.ilike.%${search}%,numero_processo.ilike.%${search}%,client_name.ilike.%${search}%,client_cpf.ilike.%${search}%`);
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
                    query = query.or('tipo.eq.Trabalhista,tipo.eq.Cível/Outros,and(tribunal.neq.INSS,tribunal.neq.)');
                    query = query.neq('tipo', 'Seguro Defeso');
                }
                else if (filters.category === 'Administrativo') {
                    query = query.in('tipo', ['Salário Maternidade', 'Aposentadoria', 'BPC/LOAS', 'Auxílio Doença']);
                    query = query.or('tribunal.is.null,tribunal.eq.,tribunal.eq.INSS');
                }
            }
        }

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

export const fetchAllCasesData = async () => {
    try {
        const { data, error } = await supabase.from('view_cases_dashboard').select('*');
        if (error) throw error;
        return (data || []) as unknown as Case[];
    } catch (error) {
        console.error("Erro fetchAllCasesData:", error);
        throw error;
    }
};
