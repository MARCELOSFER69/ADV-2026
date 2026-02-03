
import { supabase } from './supabaseClient';
import { Client, CaseStatus } from '../types';
import { auditService } from './auditService';

export const fetchClientsData = async (page: number, perPage: number, search?: string, filters?: any) => {
    try {
        // Usamos a VIEW customizada para performance máxima
        let query = supabase.from('view_clients_dashboard').select('*', { count: 'exact' });

        // Filtro de Busca (Search) com Unaccent suporte
        if (search) {
            const normalizedSearch = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const cleanSearch = search.replace(/\D/g, '');
            if (cleanSearch.length > 0) {
                query = query.or(`nome_completo_unaccent.ilike.%${normalizedSearch}%,cpf_cnpj.ilike.%${search}%,cpf_cnpj.ilike.%${cleanSearch}%`);
            } else {
                query = query.ilike('nome_completo_unaccent', `%${normalizedSearch}%`);
            }
        }

        // Filtros Granulares (Database-side)
        if (filters) {
            if (filters.filial && filters.filial !== 'all') query = query.eq('filial', filters.filial);
            if (filters.captador && filters.captador !== '') query = query.ilike('captador', `%${filters.captador}%`);
            if (filters.city && filters.city !== '') query = query.ilike('cidade', `%${filters.city}%`);
            if (filters.sexo && filters.sexo !== 'all') query = query.eq('sexo', filters.sexo);

            // Filtro de Status (Usando a coluna calculada da View)
            if (filters.status === 'active') {
                query = query.eq('status_calculado', 'Ativo');
            } else if (filters.status === 'inactive') {
                query = query.eq('status_calculado', 'Inativo');
            } else if (filters.status === 'concedido') {
                query = query.eq('status_calculado', 'Concedido');
            } else if (filters.status === 'arquivado') {
                query = query.eq('status', 'arquivado');
            }

            // Filtro de Pendências (Usando a coluna calculada da View)
            if (filters.pendencia === 'com_pendencia') {
                query = query.gt('pendencias_count', 0);
            } else if (filters.pendencia === 'sem_pendencia') {
                query = query.eq('pendencias_count', 0);
            }

            // Filtro de Situação GPS (Usando a coluna calculada da View)
            if (filters.gps && filters.gps !== 'all') {
                query = query.eq('gps_status_calculado', filters.gps);
            }

            // Filtro de Datas (Cadastro)
            if (filters.dateStart) {
                query = query.gte('data_cadastro', filters.dateStart);
            }
            if (filters.dateEnd) {
                query = query.lte('data_cadastro', filters.dateEnd);
            }
        }

        // Paginação e Ordenação
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const sortKey = filters?.sortKey || 'nome_completo';
        const sortAsc = filters?.sortDirection !== 'desc';

        const { data, count, error } = await query
            .order(sortKey, { ascending: sortAsc })
            .range(from, to);

        if (error) throw error;

        if (data) {
            // Buscamos os processos apenas para os clientes da página atual (Paginação eficiente)
            const clientIds = data.map((c: any) => c.id);
            let casesMap = new Map<string, any[]>();

            if (clientIds.length > 0) {
                const { data: pageCases } = await supabase.from('cases').select('*').in('client_id', clientIds);
                if (pageCases) {
                    pageCases.forEach((c: any) => {
                        const list = casesMap.get(c.client_id) || [];
                        list.push(c);
                        casesMap.set(c.client_id, list);
                    });
                }
            }

            const mapped = data.map((c: any) => ({
                ...c,
                cases: casesMap.get(c.id) || [],
                interviewStatus: c.interview_status || 'Pendente',
                interviewDate: c.interview_date,
                documentos: c.documentos || []
            }));

            return { data: mapped as Client[], count: count || 0 };
        }
        return { data: [], count: 0 };
    } catch (error) {
        console.error("Erro fetchClients:", error);
        throw error;
    }
};

export const fetchAllFilteredClientsData = async (search?: string, filters?: any): Promise<Client[]> => {
    try {
        let query = supabase.from('view_clients_dashboard').select('*');

        // Filtro de Busca (Search) com Unaccent suporte
        if (search) {
            const normalizedSearch = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const cleanSearch = search.replace(/\D/g, '');
            if (cleanSearch.length > 0) {
                query = query.or(`nome_completo_unaccent.ilike.%${normalizedSearch}%,cpf_cnpj.ilike.%${search}%,cpf_cnpj.ilike.%${cleanSearch}%`);
            } else {
                query = query.ilike('nome_completo_unaccent', `%${normalizedSearch}%`);
            }
        }

        // Filtros Granulares
        if (filters) {
            if (filters.filial && filters.filial !== 'all') query = query.eq('filial', filters.filial);
            if (filters.captador && filters.captador !== '') query = query.ilike('captador', `%${filters.captador}%`);
            if (filters.city && filters.city !== '') query = query.ilike('cidade', `%${filters.city}%`);
            if (filters.sexo && filters.sexo !== 'all') query = query.eq('sexo', filters.sexo);

            if (filters.status === 'active') {
                query = query.eq('status_calculado', 'Ativo');
            } else if (filters.status === 'inactive') {
                query = query.eq('status_calculado', 'Inativo');
            } else if (filters.status === 'concedido') {
                query = query.eq('status_calculado', 'Concedido');
            } else if (filters.status === 'arquivado') {
                query = query.eq('status', 'arquivado');
            }

            if (filters.pendencia === 'com_pendencia') {
                query = query.gt('pendencias_count', 0);
            } else if (filters.pendencia === 'sem_pendencia') {
                query = query.eq('pendencias_count', 0);
            }

            if (filters.gps && filters.gps !== 'all') {
                query = query.eq('gps_status_calculado', filters.gps);
            }

            if (filters.dateStart) {
                query = query.gte('data_cadastro', filters.dateStart);
            }
            if (filters.dateEnd) {
                query = query.lte('data_cadastro', filters.dateEnd);
            }
        }

        const sortKey = filters?.sortKey || 'nome_completo';
        const sortAsc = filters?.sortDirection !== 'desc';

        const { data, error } = await query.order(sortKey, { ascending: sortAsc });

        if (error) throw error;
        return (data || []) as Client[];
    } catch (error) {
        console.error("Erro fetchAllFilteredClients:", error);
        throw error;
    }
};

export const deleteClient = async (id: string, reason?: string) => {
    try {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;

        // Audit Log
        auditService.log({
            action: 'delete_client',
            details: `Client ${id} deleted. Reason: ${reason || 'No reason provided'}`,
            entity: 'client',
            entity_id: id
        });
    } catch (error) {
        console.error("Error deleting client:", error);
        throw error;
    }
};
// ... existing code ...
export const fetchAllClientsData = async (): Promise<Client[]> => {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('nome_completo', { ascending: true });

        if (error) throw error;
        return (data || []) as Client[];
    } catch (error) {
        console.error("Error fetching all clients:", error);
        return [];
    }
};

export const fetchClientById = async (id: string): Promise<Client | null> => {
    try {
        // Fetch client data
        const { data: client, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!client) return null;

        // Fetch related cases just for this client
        const { data: clientCases } = await supabase
            .from('cases')
            .select('*')
            .eq('client_id', id);

        return {
            ...client,
            cases: clientCases || [],
            interviewStatus: client.interview_status || 'Pendente',
            interviewDate: client.interview_date,
            documentos: client.documentos || []
        } as Client;

    } catch (error) {
        console.error(`Error fetching client ${id}:`, error);
        throw error;
    }
};

export const checkCpfExists = async (cpf: string, excludeId?: string): Promise<{ exists: boolean; client?: { id: string; nome_completo: string } }> => {
    try {
        let query = supabase
            .from('clients')
            .select('id, nome_completo')
            .eq('cpf_cnpj', cpf);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data, error } = await query.single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found" which is good here
            throw error;
        }

        return { exists: !!data, client: data || undefined };
    } catch (error) {
        console.error("Error checking CPF:", error);
        return { exists: false };
    }
};
