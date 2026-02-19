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
    startDate?: string;
    endDate?: string;
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
            clients (nome_completo, cpf_cnpj, filial),
            cases (
                titulo, 
                numero_processo, 
                client_id,
                clients (nome_completo, cpf_cnpj, filial)
            )
        `)
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate);

    // Apply Other Filters

    // Apply Filters
    if (filters.type && filters.type !== 'all') {
        if (filters.type === FinancialType.COMISSAO) {
            // Se filtrar por comissão, busca tanto pelo tipo quanto pela movimentação em várias grafias
            query = query.or(`tipo.eq.Comissão,tipo.eq.comissao,tipo_movimentacao.eq.Comissao,tipo_movimentacao.eq.Comissão`);
        } else {
            query = query.eq('tipo', filters.type);
        }
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
        if (filters.account.includes('|')) {
            const [recebedor, conta] = filters.account.split('|');
            query = query.eq('conta', conta);
            if (recebedor && recebedor !== 'Outros') {
                query = query.eq('recebedor', recebedor);
            }
        } else {
            query = query.eq('conta', filters.account);
        }
    }

    if (filters.receiver && filters.receiver !== 'all') {
        // Sintaxe PostgREST para OR com aspas para lidar com nomes com espaços
        query = query.or(`recebedor.eq."${filters.receiver}",captador_nome.eq."${filters.receiver}"`);
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

    let records = (data as any[]) || [];

    // --- FILTRAGEM DE FILIAL LOCAL (Pós-DB para suportar lógica de herança) ---
    if (filters.filial && filters.filial !== 'all') {
        const branchTerm = filters.filial;
        records = records.filter(r => {
            const clientFilial = r.clients?.filial || r.cases?.clients?.filial;
            return r.filial === branchTerm || clientFilial === branchTerm;
        });
    }

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
                .not('gps_lista', 'is', null);

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

                        // Filter by Status
                        if (filters.status === 'paid' && gps.status !== 'Paga') return;
                        if (filters.status === 'pending' && gps.status === 'Paga') return;
                        // Default behavior: if no status filter, usually we show everything or just paid?
                        // The previous code only showed 'Paga'. Let's keep that but allow 'Pendente' if filtered.
                        if (!filters.status && gps.status !== 'Paga') return;

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
                            status_pagamento: true, // Only 'Paga' items reach here
                            data_pagamento: gps.data_pagamento || dueDate, // GPS payment date
                            captador_nome: 'INSS',
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
            p_start_date: startDate,
            p_end_date: endDate
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
                data_pagamento: gps.data_pagamento || (isPaid ? dueDate : undefined),
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
        }).filter(r => r.data_vencimento && r.status_pagamento);

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

/**
 * Busca todas as contas e recebedores únicos já registrados no sistema.
 */
export const fetchUniqueAccounts = async (): Promise<{ recebedor: string, conta: string }[]> => {
    try {
        const { data, error } = await supabase
            .from('financial_records')
            .select('recebedor, conta')
            .not('conta', 'is', null);

        if (error) throw error;

        // Extrair pares únicos
        const seen = new Set();
        const accounts: { recebedor: string, conta: string }[] = [];

        data.forEach(item => {
            const key = `${item.recebedor || ''}|${item.conta}`;
            if (!seen.has(key)) {
                seen.add(key);
                accounts.push({
                    recebedor: item.recebedor || 'Outros',
                    conta: item.conta
                });
            }
        });

        return accounts.sort((a, b) => a.recebedor.localeCompare(b.recebedor));
    } catch (error) {
        console.error('Erro ao buscar contas:', error);
        return [];
    }
};
