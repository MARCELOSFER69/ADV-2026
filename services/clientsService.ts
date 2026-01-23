import { supabase } from './supabaseClient';
import { Client, CaseStatus } from '../types';

export const fetchClientsData = async (page: number, perPage: number, search?: string, filters?: any) => {
    try {
        let query = supabase.from('clients').select('*, cases(id, status, gps_lista)', { count: 'exact' });

        if (search) {
            const cleanSearch = search.replace(/\D/g, '');
            if (cleanSearch.length > 0) {
                query = query.or(`nome_completo.ilike.%${search}%,cpf_cnpj.ilike.%${search}%,cpf_cnpj.ilike.%${cleanSearch}%`);
            } else {
                query = query.ilike('nome_completo', `%${search}%`);
            }
        }

        if (filters) {
            if (filters.filial && filters.filial !== 'all') query = query.eq('filial', filters.filial);
            if (filters.captador && filters.captador !== '') query = query.ilike('captador', `%${filters.captador}%`);
            if (filters.city && filters.city !== '') query = query.ilike('cidade', `%${filters.city}%`);
            if (filters.sexo && filters.sexo !== 'all') query = query.eq('sexo', filters.sexo);

            if (filters.pendencia === 'com_pendencia') {
                query = query.not('pendencias', 'is', 'null').neq('pendencias', '{}');
            } else if (filters.pendencia === 'sem_pendencia') {
                query = query.or('pendencias.is.null,pendencias.eq.{}');
            }

            if (filters.status && filters.status === 'arquivado') {
                query = query.eq('status', 'arquivado');
            } else if (filters.status !== 'active' && filters.status !== 'inactive') {
                query = query.neq('status', 'arquivado');
            }

            const needsCaseFilter = ['active', 'inactive', 'concedido', 'indeferido'].includes(filters.status) || (filters.gps && filters.gps !== 'all');

            if (needsCaseFilter) {
                const { data: allCases } = await supabase.from('cases').select('client_id, status, gps_lista');

                if (allCases) {
                    const validCases = allCases.filter((c: any) => c.status && c.status.trim().toLowerCase() !== 'arquivado');
                    const inProgressStatuses = [CaseStatus.PROTOCOLAR, CaseStatus.ANALISE, CaseStatus.EXIGENCIA, CaseStatus.AGUARDANDO_AUDIENCIA, CaseStatus.EM_RECURSO];

                    const activeClientIds = new Set<string>();
                    const concededClientIds = new Set<string>();
                    const indeferidoClientIds = new Set<string>();
                    const allNonArchivedClientIds = new Set<string>();
                    const gpsPendentesIds = new Set<string>();
                    const gpsPuxadaIds = new Set<string>();
                    const clientsWithIssues = new Set<string>();

                    for (const c of validCases) {
                        const gpsList = c.gps_lista || [];
                        let isCasePendente = !gpsList || gpsList.length === 0;
                        let isCasePuxada = gpsList && gpsList.some((g: any) => g.status !== 'Paga');

                        if (isCasePendente) { gpsPendentesIds.add(c.client_id); clientsWithIssues.add(c.client_id); }
                        if (isCasePuxada) { gpsPuxadaIds.add(c.client_id); clientsWithIssues.add(c.client_id); }

                        allNonArchivedClientIds.add(c.client_id);

                        if (inProgressStatuses.includes(c.status as CaseStatus)) activeClientIds.add(c.client_id);
                        else if (c.status === CaseStatus.CONCLUIDO_CONCEDIDO) concededClientIds.add(c.client_id);
                        else if (c.status === CaseStatus.CONCLUIDO_INDEFERIDO) indeferidoClientIds.add(c.client_id);
                    }

                    const finalConcedidoIds = new Set([...concededClientIds].filter(id => !activeClientIds.has(id)));
                    const finalIndeferidoIds = new Set([...indeferidoClientIds].filter(id => !activeClientIds.has(id) && !concededClientIds.has(id)));
                    const gpsRegularIds = new Set<string>();
                    activeClientIds.forEach(id => { if (!clientsWithIssues.has(id)) gpsRegularIds.add(id); });

                    let matchingIds = new Set<string>();

                    if (filters.status === 'active') matchingIds = activeClientIds;
                    else if (filters.status === 'concedido') matchingIds = finalConcedidoIds;
                    else if (filters.status === 'indeferido') matchingIds = finalIndeferidoIds;

                    if (filters.gps === 'pendente') matchingIds = filters.status === 'active' ? new Set([...matchingIds].filter(id => gpsPendentesIds.has(id))) : gpsPendentesIds;
                    else if (filters.gps === 'puxada') matchingIds = filters.status === 'active' ? new Set([...matchingIds].filter(id => gpsPuxadaIds.has(id))) : gpsPuxadaIds;
                    else if (filters.gps === 'regular') matchingIds = filters.status === 'active' ? new Set([...matchingIds].filter(id => gpsRegularIds.has(id))) : gpsRegularIds;

                    if (filters.status === 'inactive') {
                        if (allNonArchivedClientIds.size > 0) query = query.not('id', 'in', `(${Array.from(allNonArchivedClientIds).join(',')})`);
                    } else {
                        if (matchingIds.size > 0) query = query.in('id', Array.from(matchingIds));
                        else if (['active', 'concedido', 'indeferido'].includes(filters.status) || (filters.gps && filters.gps !== 'all')) query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
                    }
                }
            }
        }

        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const { data, count, error } = await query.order('nome_completo', { ascending: true }).range(from, to);

        if (error) throw error;

        if (data) {
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
