import { supabase } from './supabaseClient';
import { Case, CaseStatus, CaseType } from '../types';

export const fetchCasesData = async (page: number, perPage: number, search?: string, filters?: any) => {
    try {
        let query = supabase.from('cases').select('*, clients!inner(nome_completo, cpf_cnpj)', { count: 'exact' });

        if (search) query = query.or(`titulo.ilike.%${search}%,numero_processo.ilike.%${search}%`);

        if (filters && filters.viewMode === 'archived') {
            query = query.eq('status', 'Arquivado');
        } else {
            query = query.neq('status', 'Arquivado');
        }

        if (filters) {
            if (filters.tipo && filters.tipo !== 'all') query = query.eq('tipo', filters.tipo);

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

            if (filters.status && filters.status !== 'all' && filters.status !== 'active') {
                query = query.eq('status', filters.status);
            }
        }

        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const { data, count, error } = await query.order('data_abertura', { ascending: false }).range(from, to);

        if (error) throw error;

        return { data: (data as unknown as Case[]) || [], count: count || 0 };
    } catch (error) {
        console.error("Erro fetchCasesData:", error);
        throw error;
    }
};
