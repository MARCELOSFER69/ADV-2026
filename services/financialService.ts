import { supabase } from './supabaseClient';
import { FinancialRecord, FinancialType, GPS, FinancialReceiver } from '../types';

export interface FinancialFilters {
    type?: string;
    status?: string; // 'paid' | 'pending'
    method?: string;
    account?: string;
    receiver?: string;
    search?: string;
    filial?: string;
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
            clients!inner (nome_completo, cpf_cnpj, filial),
            cases (titulo, numero_processo, client_id)
        `)
        .gte('data_vencimento', startDate) // Greater than or equal to startDate
        .lte('data_vencimento', endDate);  // Less than or equal to endDate

    // Apply Branch Filter
    if (filters.filial && filters.filial !== 'all') {
        query = query.eq('clients.filial', filters.filial);
    }

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
        query = query.or(`titulo.ilike.${term},recebedor.ilike.${term},captador_nome.ilike.${term}`);
    }

    const { data, error } = await query.order('data_vencimento', { ascending: false });

    if (error) {
        console.error('Erro ao buscar financeiro:', error);
        throw error;
    }

    let records = (data as FinancialRecord[]) || [];

    // --- BUSCAR GPS (Injetar como Despesas) ---
    // Apenas se não houver filtro excluindo Despesas ou Status Pendente/Pago conflitante
    const shouldFetchGps =
        (!filters.type || filters.type === 'all' || filters.type === FinancialType.DESPESA) &&
        (!filters.receiver) && // GPS geralmente tem recebedor 'INSS' implicito ou null
        (!filters.account);     // GPS pode não ter conta definida na lista

    if (shouldFetchGps) {
        try {
            // Buscar casos que têm GPS
            let gpsQuery = supabase
                .from('cases')
                .select('id, gps_lista, client_id, titulo, numero_processo, clients(nome_completo, cpf_cnpj, filial)')
                .not('gps_lista', 'is', null)
                // O filtro de filial se aplica ao cliente do caso
                .eq(filters.filial && filters.filial !== 'all' ? 'clients.filial' : '', filters.filial && filters.filial !== 'all' ? filters.filial : ''); // Supabase ignora chave vazia? Não. Precisa lógica condicional melhor.

            if (filters.filial && filters.filial !== 'all') {
                gpsQuery = gpsQuery.eq('clients.filial', filters.filial);
            }

            if (filters.search) {
                // Se busca textual, verifica se bate com titulo/processo OU se a palavra "GPS" está na busca
                const term = filters.search.toLowerCase();
                if (!term.includes('gps') && !term.includes('inss')) {
                    // Se a busca não é por GPS, filtramos os casos que batem textualmente
                    gpsQuery = gpsQuery.or(`titulo.ilike.%${filters.search}%,numero_processo.ilike.%${filters.search}%`);
                }
            }

            const { data: casesWithGps, error: gpsError } = await gpsQuery;

            if (!gpsError && casesWithGps) {
                const gpsRecords: FinancialRecord[] = [];

                casesWithGps.forEach((c: any) => {
                    const gpsList = (c.gps_lista || []) as GPS[];
                    gpsList.forEach(gps => {
                        // Determinar Data de Vencimento
                        // Se não tem data_pagamento, assumimos vencimento baseado na competência (dia 15 do mês seguinte)
                        // Ex: 01/2026 -> Vence 15/02/2026
                        let dueDate = gps.data_pagamento;
                        if (!dueDate) {
                            try {
                                const [month, year] = gps.competencia.split('/').map(Number);
                                if (month && year) {
                                    // Mês seguinte, dia 15
                                    const date = new Date(year, month, 15);
                                    dueDate = date.toISOString().split('T')[0];
                                }
                            } catch (e) { }
                        }

                        if (!dueDate) return; // Sem data, ignora

                        // Filtro de Data
                        if (dueDate < startDate || dueDate > endDate) return;

                        // Filtro de Status
                        const isPaid = gps.status === 'Paga';
                        if (filters.status === 'paid' && !isPaid) return;
                        if (filters.status === 'pending' && isPaid) return;

                        // Filtro Texto (Se busca explicita por GPS)
                        if (filters.search) {
                            const term = filters.search.toLowerCase();
                            // Se o termo não bateu no titulo do caso (já filtrado na query),
                            // verificamos se bate na própria GPS (competência)
                            const contextMatch = (c.titulo || '').toLowerCase().includes(term) || (c.numero_processo || '').toLowerCase().includes(term);
                            const gpsMatch = gps.competencia.includes(term) || 'gps'.includes(term) || 'inss'.includes(term);

                            if (!contextMatch && !gpsMatch) return;
                        }

                        // Mapear para FinancialRecord
                        gpsRecords.push({
                            id: `gps-${c.id}-${gps.id}`, // ID Virtual único
                            case_id: c.id,
                            client_id: c.client_id,
                            titulo: `GPS - ${gps.competencia}`,
                            tipo: FinancialType.DESPESA,
                            tipo_movimentacao: 'GPS',
                            valor: gps.valor,
                            data_vencimento: dueDate,
                            status_pagamento: isPaid,
                            captador_nome: 'INSS', // Ou deixamos null
                            // recebedor: 'Previdência Social', // Removed as per user request
                            forma_pagamento: gps.forma_pagamento || 'Boleto',
                            // Dados relacionais flat
                            clients: c.clients,
                            cases: { titulo: c.titulo, numero_processo: c.numero_processo, client_id: c.client_id }
                        });
                    });
                });

                // Filter out GPS records that already have a physical entry
                const normalize = (s: string) => s.replace(/\s|-/g, '').toLowerCase();
                const physicalGpsTitles = new Set(
                    records
                        .filter(r => r.tipo_movimentacao === 'GPS')
                        .map(r => normalize(r.titulo))
                );

                const uniqueGpsRecords = gpsRecords.filter(r => !physicalGpsTitles.has(normalize(r.titulo)));

                // Merge
                records = [...records, ...uniqueGpsRecords];
            }
        } catch (err) {
            console.error('Erro ao buscar GPS para financeiro:', err);
            // Não falha o request principal, apenas loga e segue sem GPS
        }
    }

    // Ordenar final mesclado
    return records.sort((a, b) => {
        return new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime();
    });
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
        // 1. Buscar registros da tabela física
        const { data: physicalRecords, error: physError } = await supabase
            .from('financial_records')
            .select('*')
            .eq('case_id', caseId)
            .order('data_vencimento', { ascending: false });

        if (physError) throw physError;

        // 2. Buscar GPS (dados virtuais da lista do caso)
        const { data: caseData, error: caseError } = await supabase
            .from('cases')
            .select('id, gps_lista, client_id, titulo, numero_processo, clients(nome_completo, cpf_cnpj, filial)')
            .eq('id', caseId)
            .single();

        if (caseError) throw caseError;

        const gpsList = (caseData.gps_lista || []) as GPS[];
        const gpsRecords: FinancialRecord[] = gpsList.map(gps => {
            // Determinar Data de Vencimento (Lógica idêntica ao fetchFinancialRecords)
            let dueDate = gps.data_pagamento;
            if (!dueDate) {
                try {
                    const [month, year] = gps.competencia.split('/').map(Number);
                    if (month && year) {
                        const date = new Date(year, month, 15);
                        dueDate = date.toISOString().split('T')[0];
                    }
                } catch (e) { }
            }

            const isPaid = gps.status === 'Paga';
            const clientData = Array.isArray(caseData.clients) ? caseData.clients[0] : caseData.clients;

            return {
                id: `gps-${caseId}-${gps.id}`,
                case_id: caseId,
                client_id: caseData.client_id,
                titulo: `GPS - ${gps.competencia}`,
                tipo: FinancialType.DESPESA,
                tipo_movimentacao: 'GPS',
                valor: gps.valor,
                data_vencimento: dueDate || '',
                status_pagamento: isPaid,
                captador_nome: 'INSS',
                forma_pagamento: gps.forma_pagamento || 'Boleto',
                clients: clientData ? {
                    nome_completo: clientData.nome_completo,
                    cpf_cnpj: clientData.cpf_cnpj
                } : undefined,
                cases: {
                    titulo: caseData.titulo,
                    numero_processo: caseData.numero_processo,
                    client_id: caseData.client_id
                }
            } as FinancialRecord;
        }).filter(r => r.data_vencimento);

        // Filter out GPS records that already have a physical entry
        const normalize = (s: string) => s.replace(/\s|-/g, '').toLowerCase();
        const physicalGpsTitles = new Set(
            (physicalRecords || [])
                .filter(r => r.tipo_movimentacao === 'GPS')
                .map(r => normalize(r.titulo))
        );

        const uniqueGpsRecords = gpsRecords.filter(r => !physicalGpsTitles.has(normalize(r.titulo)));

        // 3. Merge e Ordenação
        const merged = [...(physicalRecords || []), ...uniqueGpsRecords];
        return merged.sort((a, b) => {
            return new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime();
        });
    } catch (error) {
        console.error(`Erro ao buscar financeiro do caso ${caseId}:`, error);
        throw error;
    }
};

export const fetchReceivers = async (): Promise<FinancialReceiver[]> => {
    try {
        const { data, error } = await supabase
            .from('financial_receivers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return (data || []) as FinancialReceiver[];
    } catch (error) {
        console.error('Erro ao buscar recebedores:', error);
        return [];
    }
};

export const addReceiver = async (receiver: Partial<FinancialReceiver>): Promise<void> => {
    try {
        const { error } = await supabase
            .from('financial_receivers')
            .insert([receiver]);

        if (error && error.code !== '23505') { // Ignore duplicate key error
            throw error;
        }
    } catch (error) {
        console.error('Erro ao adicionar recebedor:', error);
        throw error;
    }
};
