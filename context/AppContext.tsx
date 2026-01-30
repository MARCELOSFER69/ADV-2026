import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import {
    Client, Case, CaseType, FinancialRecord, Event, ViewState, Task, FinancialType, CaseHistory,
    UserPreferences, User, OfficeExpense, Captador, CaseInstallment, CommissionReceipt,
    AppNotification, Reminder, UserPermission, GPS, PersonalCredential, OfficeBalance, CaseStatus,
    ClientHistory, EventType, Chat, ChatMessage
} from '../types';
import { supabase } from '../services/supabaseClient';
import { getTodayBrasilia } from '../utils/dateUtils';
import { listClientFilesFromR2 } from '../services/storageService';
import { whatsappService } from '../services/whatsappService';
import { deleteClient as deleteClientService } from '../services/clientsService';
import { encryptData, decryptData } from '../utils/cryptoUtils';

// Chave para salvar permissões no cache local
const PERMISSIONS_KEY = 'app_user_permissions';

interface AppContextType {
    user: User | null;
    login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
    logout: () => Promise<void>;
    updateUserProfile: (updates: Partial<User>) => Promise<void>;
    saveUserPreferences: (prefs: UserPreferences) => Promise<void>;

    // --- DADOS GERAIS ---
    clients: Client[];
    cases: Case[];

    // --- DADOS PAGINADOS ---
    paginatedClients: Client[];
    totalClients: number;
    fetchClients: (page: number, perPage: number, search?: string, filters?: any) => Promise<void>;
    refreshClient: (clientId: string) => Promise<void>;
    reloadData: () => Promise<void>;
    // reloadData duplicado removido

    paginatedCases: Case[];
    totalCases: number;
    fetchCases: (page: number, perPage: number, search?: string, filters?: any) => Promise<void>;

    financial: FinancialRecord[];
    officeExpenses: OfficeExpense[];
    officeBalances: OfficeBalance[];
    personalCredentials: PersonalCredential[];
    events: Event[];
    tasks: Task[];
    captadores: Captador[];
    commissionReceipts: CommissionReceipt[];
    reminders: Reminder[];
    notifications: AppNotification[];

    currentView: ViewState;
    setCurrentView: (view: ViewState) => void;
    clientToView: string | null;
    setClientToView: (id: string | null, tab?: 'info' | 'docs' | 'credentials' | 'history' | 'cnis') => void;
    clientDetailTab: 'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp';
    setClientDetailTab: (tab: 'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp') => void;

    addClient: (client: Client) => Promise<void>;
    updateClient: (updatedClient: Client) => Promise<void>;
    deleteClient: (id: string, reason?: string) => Promise<void>;
    syncClientDocuments: (clientId: string) => Promise<void>;
    addCase: (newCase: Case) => Promise<void>;
    updateCase: (updatedCase: Case, reason?: string) => Promise<void>;
    deleteCase: (id: string) => Promise<void>;
    getCaseHistory: (caseId: string) => Promise<CaseHistory[]>;
    getClientHistory: (clientId: string) => Promise<ClientHistory[]>;
    addEvent: (newEvent: Event) => Promise<void>;
    updateEvent: (updatedEvent: Event) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    addTask: (newTask: Task) => Promise<void>;
    toggleTask: (taskId: string) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;

    addFinancialRecord: (record: FinancialRecord) => Promise<void>;
    deleteFinancialRecord: (id: string) => Promise<void>;

    addOfficeExpense: (expense: OfficeExpense) => Promise<void>;
    updateOfficeExpense: (expense: OfficeExpense) => Promise<void>;
    deleteOfficeExpense: (id: string) => Promise<void>;
    toggleOfficeExpenseStatus: (id: string) => Promise<void>;
    addOfficeBalance: (balance: OfficeBalance) => Promise<void>;

    addPersonalCredential: (cred: PersonalCredential) => Promise<void>;
    deletePersonalCredential: (id: string) => Promise<void>;

    addCaptador: (nome: string, filial: string) => Promise<Captador | null>;
    deleteCaptador: (id: string, reason?: string) => Promise<void>;

    createCommissionReceipt: (receipt: CommissionReceipt, recordIds: string[]) => Promise<void>;
    deleteCommissionReceipt: (id: string) => Promise<void>;
    confirmReceiptSignature: (receiptId: string) => Promise<void>;
    uploadReceiptFile: (receiptId: string, file: File) => Promise<void>;

    getInstallments: (caseId: string) => Promise<CaseInstallment[]>;
    generateInstallments: (caseId: string, startDate: string) => Promise<void>;
    updateInstallment: (installment: CaseInstallment, clientName: string) => Promise<void>;
    toggleInstallmentPaid: (installment: CaseInstallment, clientName: string, paymentDetails?: any) => Promise<void>;

    updateGPS: (caseId: string, gpsList: GPS[]) => Promise<void>;

    addReminder: (reminder: Reminder) => Promise<void>;
    toggleReminder: (id: string) => Promise<void>;
    deleteReminder: (id: string) => Promise<void>;

    toasts: ToastMessage[];
    showToast: (type: 'success' | 'error', message: any) => void;
    isLoading: boolean;

    globalPreferences: UserPreferences;
    mergedPreferences: UserPreferences;
    saveGlobalPreferences: (prefs: UserPreferences) => Promise<void>;

    isNewCaseModalOpen: boolean;
    setIsNewCaseModalOpen: (isOpen: boolean) => void;
    isNewClientModalOpen: boolean;
    setIsNewClientModalOpen: (isOpen: boolean) => void;
    newCaseParams: { clientId?: string; type?: CaseType } | null;
    openNewCaseWithParams: (clientId: string, type: CaseType) => void;
    caseToView: string | null;
    setCaseToView: (id: string | null) => void;

    // --- WHATSAPP ---
    chats: Chat[];
    chatMessages: ChatMessage[];
    fetchChatMessages: (chatId: string) => Promise<void>;
    assumeChat: (chatId: string) => Promise<void>;
    sendMessage: (chatId: string, content: string) => Promise<void>;
    markChatAsRead: (chatId: string) => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    finishChat: (chatId: string) => Promise<void>;
    waitingChatsCount: number;

    // --- AUTOMATION ---
    triggerRgpSync: (clientList: { id: string, cpf_cnpj: string }[]) => Promise<void>;
    triggerReapSync: (clientList: { id: string, cpf_cnpj: string, senha_gov?: string }[]) => Promise<void>;

    // --- ASSISTANT ---
    isAssistantOpen: boolean;
    setIsAssistantOpen: (isOpen: boolean) => void;

    // --- ANIMATIONS ---
    isStatusBlinking: boolean;
}

interface ToastMessage {
    id: number;
    type: 'success' | 'error';
    message: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);


const CLIENT_FIELD_LABELS: Record<string, string> = {
    nome_completo: 'Nome',
    cpf_cnpj: 'CPF/CNPJ',
    telefone: 'Telefone',
    email: 'Email',
    senha_gov: 'Senha GOV',
    data_nascimento: 'Data de Nascimento',
    sexo: 'Sexo',
    endereco: 'Endereço',
    nacionalidade: 'Nacionalidade',
    estado_civil: 'Estado Civil',
    profissao: 'Profissão',
    rg: 'RG',
    orgao_emissor: 'Órgão Emissor',
    numero_casa: 'Número',
    bairro: 'Bairro',
    cidade: 'Cidade',
    uf: 'UF',
    cep: 'CEP',
    captador: 'Captador',
    filial: 'Filial',
    observacao: 'Observação',
    aposentadoria_modalidade: 'Modalidade de Aposentadoria',
    interviewStatus: 'Status da Entrevista',
    interviewDate: 'Data da Entrevista',
    representante_nome: 'Nome do Representante',
    representante_cpf: 'CPF do Representante'
};

const CASE_FIELD_LABELS: Record<string, string> = {
    titulo: 'Título',
    numero_processo: 'Número do Processo',
    tribunal: 'Tribunal/Órgão',
    valor_causa: 'Valor da Causa',
    status: 'Status',
    tipo: 'Tipo de Ação',
    modalidade: 'Modalidade',
    data_abertura: 'Data de Abertura',
    status_pagamento: 'Status de Pagamento',
    valor_honorarios_pagos: 'Honorários Pagos',
    data_fatal: 'Prazo Fatal',
    honorarios_forma_pagamento: 'Forma de Pagamento (Honorários)',
    honorarios_recebedor: 'Recebedor',
    honorarios_tipo_conta: 'Tipo de Conta',
    honorarios_conta: 'Conta'
};

const METADATA_FIELD_LABELS: Record<string, string> = {
    nit: 'NIT',
    der: 'DER (Data de Entrada)',
    nis: 'NIS/CadÚnico',
    renda_familiar: 'Renda Familiar',
    data_parto: 'Data do Parto/Atestado',
    cid: 'CID',
    data_incapacidade: 'Data Início Incapacidade'
};

export const AppProvider = ({ children }: { children?: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    // Cache Geral
    const [clients, setClients] = useState<Client[]>([]);
    const [cases, setCases] = useState<Case[]>([]);

    // Estados Paginados
    const [paginatedClients, setPaginatedClients] = useState<Client[]>([]);
    const [totalClients, setTotalClients] = useState(0);

    const [paginatedCases, setPaginatedCases] = useState<Case[]>([]);
    const [totalCases, setTotalCases] = useState(0);

    const [financial, setFinancial] = useState<FinancialRecord[]>([]);
    const [officeExpenses, setOfficeExpenses] = useState<OfficeExpense[]>([]);
    const [officeBalances, setOfficeBalances] = useState<OfficeBalance[]>([]);
    const [personalCredentials, setPersonalCredentials] = useState<PersonalCredential[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [captadores, setCaptadores] = useState<Captador[]>([]);
    const [commissionReceipts, setCommissionReceipts] = useState<CommissionReceipt[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // WhatsApp
    const [chats, setChats] = useState<Chat[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    const [currentView, setCurrentView] = useState<ViewState>('dashboard');
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [clientToView, _setClientToView] = useState<string | null>(null);
    const [clientDetailTab, setClientDetailTab] = useState<'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp'>('info');
    const [isStatusBlinking, setIsStatusBlinking] = useState(false);

    const setClientToView = useCallback((id: string | null, tab?: 'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp') => {
        _setClientToView(id);
        if (tab) setClientDetailTab(tab);
    }, []);

    const [caseToView, setCaseToView] = useState<string | null>(null);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
    const [newCaseParams, setNewCaseParams] = useState<{ clientId?: string; type?: CaseType } | null>(null);

    const openNewCaseWithParams = useCallback((clientId: string, type: CaseType) => {
        setNewCaseParams({ clientId, type });
        setIsNewCaseModalOpen(true);
    }, []);

    const isDataLoaded = useRef(false);
    const isLoadingRef = useRef(false);
    const [globalPreferences, setGlobalPreferences] = useState<UserPreferences>({});
    const [usingDb] = useState(true);

    const showToast = useCallback((type: 'success' | 'error', message: any) => {
        const id = Date.now() + Math.random();
        let safeMessage = '';
        if (typeof message === 'string') safeMessage = message;
        else if (message instanceof Error) safeMessage = message.message;
        else safeMessage = JSON.stringify(message);

        setToasts((prev) => [...prev, { id, type, message: safeMessage }]);
        setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 3000);
    }, []);

    // --- BUSCA PAGINADA DE CLIENTES ---
    const fetchClients = useCallback(async (page: number, perPage: number, search?: string, filters?: any) => {
        try {
            // 1. Prepare main query with JOIN to cases for display columns
            let query = supabase.from('clients').select('*, cases(id, status, gps_lista)', { count: 'exact' });

            // 2. Client-side Search (Name/CPF)
            if (search) {
                const cleanSearch = search.replace(/\D/g, '');
                if (cleanSearch.length > 0) {
                    query = query.or(`nome_completo.ilike.%${search}%,cpf_cnpj.ilike.%${search}%,cpf_cnpj.ilike.%${cleanSearch}%`);
                } else {
                    query = query.ilike('nome_completo', `%${search}%`);
                }
            }

            // 3. Apply Simple Filters
            if (filters) {
                if (filters.filial && filters.filial !== 'all') query = query.eq('filial', filters.filial);
                if (filters.captador && filters.captador !== '') query = query.ilike('captador', `%${filters.captador}%`);
                if (filters.city && filters.city !== '') query = query.ilike('cidade', `%${filters.city}%`);
                if (filters.sexo && filters.sexo !== 'all') query = query.eq('sexo', filters.sexo);

                // Pendency Filter
                if (filters.pendencia === 'com_pendencia') {
                    query = query.not('pendencias', 'is', 'null').neq('pendencias', '{}');
                } else if (filters.pendencia === 'sem_pendencia') {
                    query = query.or('pendencias.is.null,pendencias.eq.{}');
                }

                // Client Status Filter (Arquivado/Ativo)
                if (filters.status && filters.status === 'arquivado') {
                    query = query.eq('status', 'arquivado');
                } else if (filters.status !== 'active' && filters.status !== 'inactive') { // Only apply if not handled by complex case status
                    query = query.neq('status', 'arquivado');
                }

                // 4. COMPLEX FILTERS (Case Status & GPS)
                const needsCaseFilter =
                    ['active', 'inactive', 'concedido', 'indeferido'].includes(filters.status) ||
                    (filters.gps && filters.gps !== 'all');

                if (needsCaseFilter) {
                    // Robust Fetch: Get ALL cases and filter in memory to avoid case-sensitivity issues
                    const { data: allCases } = await supabase.from('cases').select('client_id, status, gps_lista');

                    if (allCases) {
                        // Filter ACTIVE cases in JS (Robust against 'Arquivado', 'arquivado', ' ARQUIVADO ', etc.)
                        const validCases = allCases.filter((c: any) => c.status && c.status.trim().toLowerCase() !== 'arquivado');

                        const inProgressStatuses = [
                            CaseStatus.PROTOCOLAR,
                            CaseStatus.ANALISE,
                            CaseStatus.EXIGENCIA,
                            CaseStatus.AGUARDANDO_AUDIENCIA,
                            CaseStatus.EM_RECURSO
                        ];

                        // Specific Status Sets
                        const activeClientIds = new Set<string>();
                        const concededClientIds = new Set<string>();
                        const indeferidoClientIds = new Set<string>();
                        const allNonArchivedClientIds = new Set<string>();

                        // Calculate GPS Statuses per Client based on VALID cases only
                        const gpsPendentesIds = new Set<string>(); // Sem Guia
                        const gpsPuxadaIds = new Set<string>();   // Com Guia mas Pendente
                        const clientsWithIssues = new Set<string>(); // Union of above

                        for (const c of validCases) {
                            const gpsList = c.gps_lista || [];
                            let isCasePendente = false;
                            let isCasePuxada = false;

                            // Check for EMPTY list (or null) -> Pendente
                            if (!gpsList || gpsList.length === 0) {
                                isCasePendente = true;
                            } else {
                                // Check for Unpaid items -> Puxada
                                const hasPendingItem = gpsList.some((g: any) => g.status !== 'Paga');
                                if (hasPendingItem) isCasePuxada = true;
                            }

                            if (isCasePendente) {
                                gpsPendentesIds.add(c.client_id);
                                clientsWithIssues.add(c.client_id);
                            }
                            if (isCasePuxada) {
                                gpsPuxadaIds.add(c.client_id);
                                clientsWithIssues.add(c.client_id);
                            }

                            allNonArchivedClientIds.add(c.client_id);

                            // Capture statuses
                            if (inProgressStatuses.includes(c.status as CaseStatus)) {
                                activeClientIds.add(c.client_id);
                            } else if (c.status === CaseStatus.CONCLUIDO_CONCEDIDO) {
                                concededClientIds.add(c.client_id);
                            } else if (c.status === CaseStatus.CONCLUIDO_INDEFERIDO) {
                                indeferidoClientIds.add(c.client_id);
                            }
                        }

                        // Refine sets: Priority Ativo > Concedido > Indeferido
                        const finalConcedidoIds = new Set([...concededClientIds].filter(id => !activeClientIds.has(id)));
                        const finalIndeferidoIds = new Set([...indeferidoClientIds].filter(id => !activeClientIds.has(id) && !concededClientIds.has(id)));

                        const gpsRegularIds = new Set<string>();
                        // Regular = Active Clients that have cases but NO issues
                        activeClientIds.forEach(id => {
                            if (!clientsWithIssues.has(id)) {
                                gpsRegularIds.add(id);
                            }
                        });

                        let matchingIds = new Set<string>();

                        // --- FILTER APPLICATION ---

                        // Start with Status Base
                        if (filters.status === 'active') {
                            matchingIds = activeClientIds;
                        } else if (filters.status === 'concedido') {
                            matchingIds = finalConcedidoIds;
                        } else if (filters.status === 'indeferido') {
                            matchingIds = finalIndeferidoIds;
                        } else if (filters.status === 'inactive') {
                            // Logic handled by exclusion later
                        } else {
                            // Status 'all' - no restriction yet
                        }

                        // GPS Filters
                        if (filters.gps === 'pendente') {
                            if (filters.status === 'active') {
                                matchingIds = new Set([...matchingIds].filter(id => gpsPendentesIds.has(id)));
                            } else {
                                matchingIds = gpsPendentesIds;
                            }
                        } else if (filters.gps === 'puxada') {
                            if (filters.status === 'active') {
                                matchingIds = new Set([...matchingIds].filter(id => gpsPuxadaIds.has(id)));
                            } else {
                                matchingIds = gpsPuxadaIds;
                            }
                        } else if (filters.gps === 'regular') {
                            if (filters.status === 'active') {
                                matchingIds = new Set([...matchingIds].filter(id => gpsRegularIds.has(id)));
                            } else {
                                matchingIds = gpsRegularIds;
                            }
                        }

                        // Final Query for ID Filtering
                        if (filters.status === 'inactive') {
                            if (allNonArchivedClientIds.size > 0) {
                                query = query.not('id', 'in', `(${Array.from(allNonArchivedClientIds).join(',')})`);
                            }
                        } else {
                            if (matchingIds.size > 0) {
                                query = query.in('id', Array.from(matchingIds));
                            } else if (['active', 'concedido', 'indeferido'].includes(filters.status) || (filters.gps && filters.gps !== 'all')) {
                                // Blocking query if filter active but no matches
                                query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
                            }
                        }
                    }
                }
            }

            const from = (page - 1) * perPage;
            const to = from + perPage - 1;

            // Remove Join from Main Query to be safe
            // We kept 'cases' in the join previously but it was returning empty?
            // Let's do a pure client fetch first
            // Note: We need to re-assign 'query' because we might had modified it
            // Actually 'query' is mutable reference. We just need to ensure .select() is correct.
            // But .select is called at start. We can't change it now?
            // Actually Supabase query builder allows chaining.
            // BUT .select() overrides? No because we defined 'let query' at top.
            // We defined `let query = supabase.from('clients').select('*, cases(id, status, gps_lista)', { count: 'exact' });`
            // If we want to remove the join, we should have defined it differently.
            // However, we can just IGNORE the joined data and fetch manually.

            const { data, count, error } = await query.order('nome_completo', { ascending: true }).range(from, to);

            if (error) throw error;

            if (data) {
                // MANUAL JOIN STRATEGY
                const clientIds = data.map((c: any) => c.id);
                let casesMap = new Map<string, any[]>();

                if (clientIds.length > 0) {
                    const { data: pageCases } = await supabase
                        .from('cases')
                        .select('*')
                        .in('client_id', clientIds);

                    if (pageCases) {
                        pageCases.forEach((c: any) => {
                            const list = casesMap.get(c.client_id) || [];
                            list.push(c);
                            casesMap.set(c.client_id, list);
                        });
                    }
                }

                const mapped = await Promise.all(data.map(async (c: any) => ({
                    ...c,
                    cases: casesMap.get(c.id) || [], // Attach cases manually
                    interviewStatus: c.interview_status || 'Pendente',
                    interviewDate: c.interview_date,
                    documentos: c.documentos || [],
                    // --- SEGURANÇA: DESCRIPTOGRAFIA REMOVIDA (LAZY LOADING) ---
                    senha_gov: c.senha_gov,
                    senha_inss: c.senha_inss
                })));
                // console.log('fetchClients mapped[0] docs:', mapped[0]?.documentos);
                // console.log('fetchClients mapped results (first few):', mapped.slice(0, 5));
                setPaginatedClients(mapped);
                setTotalClients(count || 0);
            }
        } catch (error) {
            console.error("Erro fetchClients:", error);
        }
    }, []);

    // --- BUSCA PAGINADA DE PROCESSOS ---
    const fetchCases = useCallback(async (page: number, perPage: number, search?: string, filters?: any) => {
        try {
            let query = supabase.from('cases').select('*, clients!inner(nome_completo, cpf_cnpj)', { count: 'exact' });

            if (search) query = query.or(`titulo.ilike.%${search}%,numero_processo.ilike.%${search}%`);

            // Lógica de Arquivo Morto vs Ativos
            if (filters && filters.viewMode === 'archived') {
                // Se estamos vendo arquivo morto, TRAZER APENAS ARQUIVADOS
                query = query.eq('status', 'Arquivado');
            } else {
                // Padrão: TRAZER TUDO QUE NÃO É ARQUIVADO
                // Isso garante que processos ativos (mesmo que com outro filtro) NUNCA apareçam no arquivo
                query = query.neq('status', 'Arquivado');
            }

            if (filters) {
                if (filters.tipo && filters.tipo !== 'all') query = query.eq('tipo', filters.tipo);

                // --- FILTRO DE CATEGORIA (Strict Mode) ---
                if (filters.category) {
                    if (filters.category === 'Seguro Defeso') {
                        query = query.eq('tipo', 'Seguro Defeso');
                    }
                    else if (filters.category === 'Judicial') {
                        // Apenas tipos estritamente judiciais OU Administrativos que foram JUDICIALIZADOS
                        // Lógica: (Tipo Judicial) OR (Tribunal != INSS/Vazio)
                        // NOTA: Seguro Defeso é sempre excluído daqui
                        query = query.or('tipo.eq.Trabalhista,tipo.eq.Cível/Outros,and(tribunal.neq.INSS,tribunal.neq.)');
                        // Garante exclusão de Seguro Defeso caso tenha tribunal setado (raro mas possível)
                        query = query.neq('tipo', 'Seguro Defeso');
                    }
                    else if (filters.category === 'Administrativo') {
                        // Tipos administrativos (exclui Seguro e Judiciais)
                        // E EXCLUI os judicializados (Tribunal != null/INSS)
                        query = query.in('tipo', ['Salário Maternidade', 'Aposentadoria', 'BPC/LOAS', 'Auxílio Doença']);
                        query = query.or('tribunal.is.null,tribunal.eq.,tribunal.eq.INSS');
                    }
                }

                // Se status for passado explicitamente E não for 'all', usamos ele
                // MAS RESPEITAMOS A REGRA PRIMÁRIA DO ARQUIVO/ATIVO
                if (filters.status && filters.status !== 'all' && filters.status !== 'active') {
                    query = query.eq('status', filters.status);
                }
            }

            const from = (page - 1) * perPage;
            const to = from + perPage - 1;

            const { data, count, error } = await query.order('data_abertura', { ascending: false }).range(from, to);

            if (error) throw error;

            if (data) {
                setPaginatedCases(data as unknown as Case[]);
                setTotalCases(count || 0);
            }
        } catch (error) {
            console.error("Erro fetchCases:", error);
        }
    }, []);

    // --- LOAD DATA ---
    const loadData = useCallback(async (currentUserId?: string, silent = false) => {
        if (!silent && (isLoadingRef.current || isDataLoaded.current)) return;

        if (!silent) {
            setIsLoading(true);
            isLoadingRef.current = true;
        }

        if (usingDb) {
            try {
                // --- PARALLEL FETCHING STRATEGY ---
                const [
                    { data: clientsData },
                    { data: casesData },
                    { data: financeData },
                    { data: eventsData },
                    { data: tasksData },
                    { data: expensesData },
                    { data: balancesData },
                    { data: captadoresData },
                    { data: receiptsData },
                    { data: credsData }
                ] = await Promise.all([
                    supabase.from('clients').select('*').order('data_cadastro', { ascending: false }),
                    supabase.from('cases').select('*').order('data_abertura', { ascending: false }),
                    supabase.from('financial').select('*, clients(nome_completo)').order('data_vencimento', { ascending: true }),
                    supabase.from('events').select('*').order('data_hora', { ascending: true }),
                    supabase.from('tasks').select('*'),
                    supabase.from('office_expenses').select('*').order('data_despesa', { ascending: false }),
                    supabase.from('office_balances').select('*').order('data_entrada', { ascending: false }),
                    supabase.from('captadores').select('*'),
                    supabase.from('commission_receipts').select('*').order('data_geracao', { ascending: false }),
                    supabase.from('personal_credentials').select('*').order('created_at', { ascending: false })
                ]);

                // --- PROCESS FETCHED DATA ---
                if (clientsData) {
                    const mappedClients = await Promise.all(clientsData.map(async (c: any) => ({
                        ...c,
                        interviewStatus: c.interview_status || 'Pendente',
                        interviewDate: c.interview_date,
                        documentos: c.documentos || [],
                        // --- SEGURANÇA: DESCRIPTOGRAFIA REMOVIDA (LAZY LOADING) ---
                        // Senhas permanecem criptografadas na memória e são descriptografadas apenas ao visualizar/editar
                        senha_gov: c.senha_gov,
                        senha_inss: c.senha_inss
                    })));
                    setClients(mappedClients);
                }

                if (casesData) setCases(casesData);
                if (financeData) setFinancial(financeData as any);
                if (eventsData) setEvents(eventsData);
                if (tasksData) setTasks(tasksData);
                if (expensesData) setOfficeExpenses(expensesData);
                if (balancesData) setOfficeBalances(balancesData);
                if (captadoresData) setCaptadores(captadoresData);
                if (receiptsData) setCommissionReceipts(receiptsData);
                if (credsData) setPersonalCredentials(credsData);

                if (currentUserId) {
                    const { data: remindersData } = await supabase
                        .from('reminders')
                        .select('*')
                        .eq('user_id', currentUserId)
                        .order('date', { ascending: true });
                    if (remindersData) setReminders(remindersData);
                }

                const { data: globalPrefsData } = await supabase.from('system_settings').select('value').eq('key', 'global_preferences').single();
                if (globalPrefsData && globalPrefsData.value) {
                    setGlobalPreferences(globalPrefsData.value);
                }

                // WhatsApp Initial Load
                const { data: chatsData } = await supabase.from('chats')
                    .select('*')
                    .order('last_message_at', { ascending: false });
                if (chatsData) setChats(chatsData);

                // Enable Realtime for WhatsApp
                supabase.channel('whatsapp-realtime')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, payload => {
                        console.log("⚡ [Realtime] Chat Update:", payload.eventType, payload.new);
                        if (payload.eventType === 'INSERT') {
                            setChats(prev => {
                                if (prev.some(c => c.id === payload.new.id)) return prev;
                                return [payload.new as Chat, ...prev];
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            setChats(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
                        }
                    })
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
                        const newMessage = payload.new as ChatMessage;
                        console.log("📩 [Realtime] Nova Mensagem!", newMessage.sender_type, ":", newMessage.content, "Chat ID:", newMessage.chat_id);

                        setChatMessages(prev => {
                            const isDuplicate = prev.some(m => m.id === newMessage.id || (m.content === newMessage.content && m.timestamp === newMessage.timestamp));
                            if (!isDuplicate) return [...prev, newMessage];
                            return prev;
                        });

                        if (newMessage.sender_type === 'client') {
                            setChats(prev => prev.map(c => {
                                if (c.id === newMessage.chat_id) {
                                    return {
                                        ...c,
                                        unread_count: (c.unread_count || 0) + 1,
                                        last_message: newMessage.content,
                                        last_message_at: newMessage.timestamp
                                    };
                                }
                                return c;
                            }));
                        }
                    })
                    .subscribe();

                // Realtime subscription for clients (RGP/CNIS updates)
                supabase.channel('clients-realtime')
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clients' }, payload => {
                        console.log("👥 [Realtime] Client Update:", payload.new.id);
                        const updatedClient = payload.new as Client;
                        setClients(prev => prev.map(c => c.id === updatedClient.id ? { ...c, ...updatedClient } : c));
                        setPaginatedClients(prev => prev.map(c => c.id === updatedClient.id ? { ...c, ...updatedClient } : c));
                    })
                    .subscribe();

                // Realtime subscription for cases
                supabase.channel('cases-realtime')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, payload => {
                        console.log("📂 [Realtime] Case Update:", payload.eventType, (payload.new as any)?.id);
                        if (payload.eventType === 'INSERT') {
                            const newCase = payload.new as Case;
                            setCases(prev => [newCase, ...prev]);
                            setPaginatedCases(prev => [newCase, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            const updatedCase = payload.new as Case;
                            setCases(prev => prev.map(c => c.id === updatedCase.id ? { ...c, ...updatedCase } : c));
                            setPaginatedCases(prev => prev.map(c => c.id === updatedCase.id ? { ...c, ...updatedCase } : c));
                        } else if (payload.eventType === 'DELETE') {
                            const deletedId = (payload.old as { id: string }).id;
                            if (deletedId) {
                                setCases(prev => prev.filter(c => c.id !== deletedId));
                                setPaginatedCases(prev => prev.filter(c => c.id !== deletedId));
                            }
                        }
                    })
                    .subscribe();

                await Promise.all([
                    fetchClients(1, 50),
                    fetchCases(1, 50)
                ]);

                isDataLoaded.current = true;
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            }
        }

        if (!silent) {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, [fetchClients, fetchCases]);

    // --- REFRESH SINGLE CLIENT (Fallback for Realtime) ---
    const refreshClient = useCallback(async (clientId: string) => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*, cases(id, status, gps_lista)')
                .eq('id', clientId)
                .single();

            if (error) { console.error("RefreshClient error:", error); return; }

            if (data) {
                const mapped: Client = {
                    ...data,
                    cases: data.cases || [],
                    interviewStatus: data.interview_status || 'Pendente',
                    interviewDate: data.interview_date,
                    documentos: data.documentos || [],
                    // --- SEGURANÇA: DESCRIPTOGRAFIA REMOVIDA (LAZY LOADING) ---
                    senha_gov: data.senha_gov,
                    senha_inss: data.senha_inss
                };

                // Updates BOTH states to ensure consistency across views
                setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...mapped } : c));
                setPaginatedClients(prev => prev.map(c => c.id === clientId ? { ...c, ...mapped } : c));
            }
        } catch (e) {
            console.error("RefreshClient exception:", e);
        }
    }, []);

    // --- RELOAD DATA (Silent Refresh) ---
    const reloadData = useCallback(async () => {
        if (user?.id) {
            await loadData(user.id, true);
        }
    }, [user, loadData]);

    // --- PERMISSÕES ---
    const fetchUserPermissions = useCallback(async (email: string): Promise<UserPermission | undefined> => {
        if (!email) return undefined;
        try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject("timeout"), 5000));
            const dbPromise = supabase.from('user_permissions').select('*').ilike('email', email.trim()).single();
            const { data, error } = await Promise.race([dbPromise, timeoutPromise]) as any;
            if (error) throw error;
            if (data) {
                localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(data));
                return data;
            }
        } catch (error) {
            const cached = localStorage.getItem(PERMISSIONS_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.email === email) return parsed;
                } catch (e) { console.error("Cache inválido"); }
            }
            return undefined;
        }
        return undefined;
    }, []);

    // --- ANIMATION TIMER (60s cycle) ---
    useEffect(() => {
        const interval = setInterval(() => {
            setIsStatusBlinking(true);
            setTimeout(() => setIsStatusBlinking(false), 3000);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const meta = session.user.user_metadata || {};
                    const permissions = await fetchUserPermissions(session.user.email || '');

                    setUser({
                        id: session.user.id,
                        email: session.user.email || '',
                        name: meta.name || 'Usuário',
                        role: permissions?.role || meta.role || 'colaborador',
                        avatar: meta.avatar || '',
                        preferences: meta.preferences || {},
                        permissions: permissions
                    });
                    await loadData(session.user.id);
                } else {
                    setIsLoading(false);
                }
            } catch (e) {
                console.error("Erro fatal na sessão:", e);
                setIsLoading(false);
            }
        };
        checkSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                if (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION') {
                    if (!user) {
                        const meta = session.user.user_metadata || {};
                        let permissions = await fetchUserPermissions(session.user.email || '');
                        setUser({
                            id: session.user.id,
                            email: session.user.email || '',
                            name: meta.name || 'Usuário',
                            role: permissions?.role || meta.role || 'colaborador',
                            avatar: meta.avatar || '',
                            preferences: meta.preferences || {},
                            permissions: permissions
                        });
                    }
                    if (!isDataLoaded.current) {
                        loadData(session.user.id, false);
                    }
                }
            } else if (_event === 'SIGNED_OUT') {
                localStorage.removeItem(PERMISSIONS_KEY);
                setUser(null);
                setClients([]);
                setCases([]);
                setPaginatedClients([]);
                setPaginatedCases([]);
                setFinancial([]);
                setOfficeExpenses([]);
                setOfficeBalances([]);
                setCaptadores([]);
                setCommissionReceipts([]);
                setPersonalCredentials([]);
                setReminders([]);
                setNotifications([]);
                isDataLoaded.current = false;
                isLoadingRef.current = false;
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const calculateNotifications = useCallback(async () => {
        const newNotifications: AppNotification[] = [];
        const today = getTodayBrasilia();

        const todayDate = new Date(today + 'T00:00:00');
        const tomorrowDate = new Date(todayDate);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        financial.forEach(f => {
            if (!f.status_pagamento) {
                if (f.data_vencimento === today) {
                    const clientName = (f as any).clients?.nome_completo || clients.find(c => c.id === f.client_id)?.nome_completo || 'Escritório';
                    newNotifications.push({
                        id: `fin-today-${f.id}`,
                        type: f.tipo === FinancialType.RECEITA ? 'income' : 'expense',
                        title: f.tipo === FinancialType.RECEITA ? 'Recebimento HOJE' : 'Despesa Vence HOJE',
                        message: f.descricao,
                        amount: f.valor,
                        date: today,
                        urgency: 'today',
                        clientName: clientName,
                        status: 'unread'
                    });
                }
                else if (f.data_vencimento === tomorrow) {
                    const clientName = (f as any).clients?.nome_completo || clients.find(c => c.id === f.client_id)?.nome_completo || 'Escritório';
                    newNotifications.push({
                        id: `fin-tmrw-${f.id}`,
                        type: f.tipo === FinancialType.RECEITA ? 'income' : 'expense',
                        title: f.tipo === FinancialType.RECEITA ? 'Recebimento AMANHÃ' : 'Despesa Vence AMANHÃ',
                        message: f.descricao,
                        amount: f.valor,
                        date: tomorrow,
                        urgency: 'tomorrow',
                        clientName: clientName,
                        status: 'unread'
                    });
                }
            }
        });

        reminders.forEach(r => {
            if (!r.completed) {
                if (r.date === today) {
                    newNotifications.push({
                        id: `rem-today-${r.id}`,
                        type: 'reminder',
                        title: 'Lembrete para HOJE',
                        message: r.title,
                        amount: 0,
                        date: today,
                        urgency: 'today',
                        clientName: 'Pessoal',
                        status: 'unread'
                    });
                } else if (r.date === tomorrow) {
                    newNotifications.push({
                        id: `rem-tmrw-${r.id}`,
                        type: 'reminder',
                        title: 'Lembrete para AMANHÃ',
                        message: r.title,
                        amount: 0,
                        date: tomorrow,
                        urgency: 'tomorrow',
                        clientName: 'Pessoal',
                        status: 'unread'
                    });
                }
            }
        });

        officeExpenses.forEach(e => {
            if (e.status === 'Pendente') {
                if (e.data_despesa === today) {
                    newNotifications.push({
                        id: `office-today-${e.id}`,
                        type: 'expense',
                        title: 'Despesa Fixa Vence HOJE',
                        message: e.titulo,
                        amount: e.valor,
                        date: today,
                        urgency: 'today',
                        clientName: 'Escritório',
                        status: 'unread'
                    });
                }
                else if (e.data_despesa === tomorrow) {
                    newNotifications.push({
                        id: `office-tmrw-${e.id}`,
                        type: 'expense',
                        title: 'Despesa Fixa Vence AMANHÃ',
                        message: e.titulo,
                        amount: e.valor,
                        date: tomorrow,
                        urgency: 'tomorrow',
                        clientName: 'Escritório',
                        status: 'unread'
                    });
                }
            }
        });

        if (usingDb) {
            const { data: installments } = await supabase
                .from('case_installments')
                .select('*, cases(titulo, clients(nome_completo))')
                .eq('pago', false)
                .or(`data_vencimento.eq.${today},data_vencimento.eq.${tomorrow}`);

            if (installments) {
                installments.forEach((inst: any) => {
                    const isToday = inst.data_vencimento === today;
                    newNotifications.push({
                        id: `inst-${inst.id}`,
                        type: 'benefit',
                        title: isToday ? 'Pagamento HOJE' : 'Pagamento AMANHÃ',
                        message: `Parcela ${inst.parcela_numero} do Benefício (${inst.cases?.titulo})`,
                        amount: inst.valor,
                        date: inst.data_vencimento,
                        urgency: isToday ? 'today' : 'tomorrow',
                        clientName: inst.cases?.clients?.nome_completo || 'Cliente Desconhecido',
                        status: 'unread'
                    });
                });
            }
        }

        clients.forEach(c => {
            if (c.interviewStatus === 'Agendada' && c.interviewDate) {
                if (c.interviewDate === today) {
                    newNotifications.push({
                        id: `interview-today-${c.id}`,
                        type: 'interview',
                        title: 'Entrevista HOJE',
                        message: `Entrevista inicial agendada.`,
                        amount: 0,
                        date: today,
                        urgency: 'today',
                        clientName: c.nome_completo,
                        status: 'unread'
                    });
                }
                else if (c.interviewDate === tomorrow) {
                    newNotifications.push({
                        id: `interview-tmrw-${c.id}`,
                        type: 'interview',
                        title: 'Entrevista AMANHÃ',
                        message: `Entrevista inicial agendada.`,
                        amount: 0,
                        date: tomorrow,
                        urgency: 'tomorrow',
                        clientName: c.nome_completo,
                        status: 'unread'
                    });
                }
            }
        });

        // --- NOTIFICAÇÕES DE EVENTOS DO PROCESSO (Aviso de 7 dias) ---
        const sevenDaysLater = new Date(todayDate);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

        events.forEach(ev => {
            const eventDateStr = ev.data_hora.split('T')[0];
            const eventDate = new Date(ev.data_hora);
            const diffDays = Math.ceil((new Date(eventDateStr).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

            const relatedCase = cases.find(k => k.id === ev.case_id);
            const client = clients.find(c => c.id === relatedCase?.client_id);
            const clientName = client?.nome_completo || 'Cliente';

            if (ev.tipo === EventType.PERICIA) {
                let shouldNotify = false;
                if (diffDays >= 0 && diffDays <= 7) {
                    shouldNotify = true;
                } else if (diffDays > 7 && diffDays <= 30 && diffDays % 7 === 0) {
                    shouldNotify = true;
                }

                if (shouldNotify) {
                    const dayLabel = diffDays === 0 ? 'HOJE' : diffDays === 1 ? 'AMANHÃ' : `em ${diffDays} dias`;
                    const urgency = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : 'upcoming';

                    newNotifications.push({
                        id: `pericia-${ev.id}-${diffDays}`,
                        type: 'reminder',
                        title: `Perícia ${dayLabel}`,
                        message: `Perícia de ${clientName} em ${ev.cidade || 'Local não informado'} dia ${eventDate.toLocaleDateString('pt-BR')} (Faltam ${diffDays} dias)`,
                        amount: 0,
                        date: eventDateStr,
                        urgency: urgency,
                        clientName: clientName,
                        clientId: client?.id,
                        caseId: ev.case_id,
                        status: 'unread'
                    });
                }
            } else {
                if (diffDays >= 0 && diffDays <= 7) {
                    const dayLabel = diffDays === 0 ? 'HOJE' : diffDays === 1 ? 'AMANHÃ' : `em ${diffDays} dias`;
                    const urgency = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : 'upcoming';

                    const messageContent = ev.tipo === ev.titulo ? ev.titulo : `${ev.tipo}: ${ev.titulo}`;
                    newNotifications.push({
                        id: `event-${ev.id}`,
                        type: 'reminder',
                        title: `Evento ${dayLabel}`,
                        message: `${messageContent}${ev.cidade ? ` (${ev.cidade})` : ''}`,
                        amount: 0,
                        date: eventDateStr,
                        urgency: urgency,
                        clientName: clientName,
                        clientId: client?.id,
                        caseId: ev.case_id,
                        status: 'unread'
                    });
                }
            }
        });

        // --- NOVO: NOTIFICAÇÕES DE PRAZOS E ESTAGNAÇÃO ---
        cases.forEach(c => {
            // Filtro rigoroso: apenas excluir se for um destes status finais exatos
            const isConcluded = c.status === CaseStatus.ARQUIVADO ||
                c.status === CaseStatus.CONCLUIDO_CONCEDIDO ||
                c.status === CaseStatus.CONCLUIDO_INDEFERIDO;

            if (isConcluded) return;

            const client = clients.find(cl => cl.id === c.client_id);
            const clientName = client?.nome_completo || 'Cliente Desconhecido';

            // 1. Check for Fatal Deadlines (data_fatal) in the next 7 days
            if (c.data_fatal) {
                const fatalDateStr = c.data_fatal.split('T')[0];
                const diffDays = Math.ceil((new Date(fatalDateStr).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays >= 0 && diffDays <= 7) {
                    const dayLabel = diffDays === 0 ? 'HOJE' : diffDays === 1 ? 'AMANHÃ' : `em ${diffDays} dias`;
                    const urgency = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : 'upcoming';

                    newNotifications.push({
                        id: `fatal-${c.id}-${diffDays}`,
                        type: 'expense', // Using expense for red icon
                        title: `PRAZO FATAL ${dayLabel}`,
                        message: `O processo "${c.titulo}" vence em breve!`,
                        amount: 0,
                        date: fatalDateStr,
                        urgency: urgency,
                        clientName: clientName,
                        clientId: c.client_id,
                        caseId: c.id,
                        status: 'unread'
                    });
                }
            }

            // 2. Check for Stagnation (15 days - Reduced from 60 to show more alerts)
            const lastUpdate = c.updated_at || c.data_abertura;
            if (lastUpdate) {
                const lastUpdateDate = new Date(lastUpdate);
                const diffDaysStagnant = Math.ceil((todayDate.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDaysStagnant >= 15) {
                    newNotifications.push({
                        id: `stagnant-${c.id}`,
                        type: 'benefit', // Using benefit for blue/neutral alert
                        title: 'Processo Estagnado',
                        message: `Sem movimentação há ${diffDaysStagnant} dias: "${c.titulo}"`,
                        amount: 0,
                        date: today,
                        urgency: 'upcoming',
                        clientName: clientName,
                        clientId: c.client_id,
                        caseId: c.id,
                        status: 'unread'
                    });
                }
            }
        });

        setNotifications(newNotifications);
    }, [financial, officeExpenses, reminders, clients, events, cases]);

    useEffect(() => {
        if (!isLoading) {
            const timer = setTimeout(() => {
                calculateNotifications();
            }, 1000); // Aumento do debounce para reduzir processamento em segundo plano
            return () => clearTimeout(timer);
        }
    }, [calculateNotifications, isLoading]);

    // --- FUNÇÕES DE AUTENTICAÇÃO ---
    const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.user) {
                const meta = data.user.user_metadata || {};
                const permissions = await fetchUserPermissions(email);

                setUser({
                    id: data.user.id,
                    email: data.user.email || '',
                    name: meta.name || 'Usuário',
                    role: permissions?.role || meta.role || 'colaborador',
                    avatar: meta.avatar || '',
                    preferences: meta.preferences || {},
                    permissions: permissions
                });
                showToast('success', 'Login realizado com sucesso!');
                await loadData(data.user.id);
            }
        } catch (error: any) {
            console.error("Erro no login:", error);
            throw new Error(error.message || 'Falha ao autenticar.');
        }
    }, [fetchUserPermissions, loadData, showToast]);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setCurrentView('dashboard');
        showToast('success', 'Você saiu do sistema.');
    }, [showToast]);

    const updateUserProfile = useCallback(async (updates: Partial<User>) => {
        if (!user) return;
        const metaUpdates: any = {};
        if (updates.name !== undefined) metaUpdates.name = updates.name;
        if (updates.role !== undefined) metaUpdates.role = updates.role;
        if (updates.avatar !== undefined) metaUpdates.avatar = updates.avatar;
        if (updates.preferences !== undefined) metaUpdates.preferences = updates.preferences;
        setUser({ ...user, ...updates });
        await supabase.auth.updateUser({ data: metaUpdates });
        showToast('success', 'Perfil atualizado com sucesso!');
    }, [user, showToast]);

    const saveUserPreferences = useCallback(async (newPrefs: UserPreferences) => {
        if (!user) return;
        const updatedPrefs = { ...(user.preferences || {}), ...newPrefs };
        setUser({ ...user, preferences: updatedPrefs });
        await supabase.auth.updateUser({ data: { preferences: updatedPrefs } });
    }, [user]);

    const saveGlobalPreferences = useCallback(async (newPrefs: UserPreferences) => {
        if (!user || user.role !== 'admin') return;
        const updatedGlobal = { ...(globalPreferences || {}), ...newPrefs };
        setGlobalPreferences(updatedGlobal);

        // Upsert style update for system_settings
        const { error } = await supabase.from('system_settings').upsert({
            key: 'global_preferences',
            value: updatedGlobal
        }, { onConflict: 'key' });

        if (error) {
            console.error("Erro ao salvar preferências globais:", error);
            showToast('error', 'Erro ao salvar preferências globais.');
        } else {
            showToast('success', 'Configurações globais salvas para todos os usuários.');
        }
    }, [user, globalPreferences, showToast]);

    // --- FUNÇÕES GERAIS ---
    const addReminder = useCallback(async (reminder: Reminder) => {
        if (usingDb) await supabase.from('reminders').insert([reminder]);
        setReminders(prev => [...prev, reminder]);
        showToast('success', 'Lembrete adicionado!');
    }, [showToast]);

    const toggleReminder = useCallback(async (id: string) => {
        const rem = reminders.find(r => r.id === id);
        if (rem) {
            const newState = !rem.completed;
            if (usingDb) await supabase.from('reminders').update({ completed: newState }).eq('id', id);
            setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: newState } : r));
        }
    }, [reminders]);

    const deleteReminder = useCallback(async (id: string) => {
        if (usingDb) await supabase.from('reminders').delete().eq('id', id);
        setReminders(prev => prev.filter(r => r.id !== id));
    }, []);
    const addClient = useCallback(async (client: Client) => {
        const { cases, ...rest } = client;
        const payload: any = {
            ...rest,
            interview_status: client.interviewStatus,
            interview_date: client.interviewDate,
            documentos: client.documentos || []
        };

        // --- SEGURANÇA: CRIPTOGRAFIA ---
        if (payload.senha_gov) payload.senha_gov = await encryptData(payload.senha_gov);
        if (payload.senha_inss) payload.senha_inss = await encryptData(payload.senha_inss);
        // registered_by might be missing in schema
        // payload.registered_by = user?.name || 'Usuário';

        const finalClient = { ...client };

        if (usingDb) {
            const { error } = await supabase.from('clients').insert([payload]);
            if (error) {
                console.error("Erro ao inserir cliente no Supabase:", error);
                showToast('error', 'Erro ao salvar no banco: ' + error.message);
            }
            const historyEntry = {
                id: crypto.randomUUID(),
                client_id: client.id,
                action: 'Cadastro',
                details: 'Cadastro inicial do cliente no sistema.',
                user_name: user?.name || 'Usuário',
                timestamp: new Date().toISOString()
            };
            await supabase.from('client_history').insert([historyEntry]);
        }
        setClients(prev => [finalClient, ...prev]);
        setPaginatedClients(prev => [finalClient, ...prev]);
        setTotalClients(prev => prev + 1);
        showToast('success', 'Cliente salvo!');
    }, [user, showToast]);

    const updateClient = useCallback(async (updatedClient: Client) => {
        const oldClient = clients.find(c => c.id === updatedClient.id);
        const { id, interviewStatus, interviewDate, cases, ...rest } = updatedClient;

        // Audit logic
        let details = 'Atualização de dados do cliente.';
        if (oldClient) {
            const changes = [];
            for (const key in CLIENT_FIELD_LABELS) {
                const oldVal = (oldClient as any)[key];
                const newVal = (updatedClient as any)[key];

                const normalizedOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
                const normalizedNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();

                if (normalizedOld !== normalizedNew) {
                    const label = CLIENT_FIELD_LABELS[key];
                    changes.push(`${label}: de "${normalizedOld || 'vazio'}" para "${normalizedNew || 'vazio'}"`);
                }
            }
            if (changes.length > 0) details = changes.join(' | ');
        }

        const dbPayload: any = {
            ...rest,
            interview_status: interviewStatus,
            interview_date: interviewDate,
            documentos: updatedClient.documentos || []
        };

        // --- SEGURANÇA: CRIPTOGRAFIA CONDICIONAL ---
        // Apenas criptografa se o valor mudou (evita re-criptografar o hash antigo que veio do banco)
        if (dbPayload.senha_gov && (!oldClient || dbPayload.senha_gov !== oldClient.senha_gov)) {
            dbPayload.senha_gov = await encryptData(dbPayload.senha_gov);
        }

        if (dbPayload.senha_inss && (!oldClient || dbPayload.senha_inss !== oldClient.senha_inss)) {
            dbPayload.senha_inss = await encryptData(dbPayload.senha_inss);
        }
        // updated_by is missing in schema
        // dbPayload.updated_by = user?.name || 'Usuário'

        const finalClient = { ...updatedClient };

        if (usingDb) {
            const { error } = await supabase.from('clients').update(dbPayload).eq('id', id);
            if (error) {
                console.error("Erro ao atualizar cliente no Supabase:", error);
                showToast('error', 'Erro ao salvar no banco: ' + error.message);
            }
            const historyEntry = {
                id: crypto.randomUUID(),
                client_id: id,
                action: 'Edição',
                details: details,
                user_name: user?.name || 'Usuário',
                timestamp: new Date().toISOString()
            };
            await supabase.from('client_history').insert([historyEntry]);
        }
        setClients(prev => prev.map(c => c.id === id ? finalClient : c));
        setPaginatedClients(prev => prev.map(c => c.id === id ? finalClient : c));
        showToast('success', 'Atualizado!');
    }, [clients, user, showToast]);

    const deleteClient = useCallback(async (id: string, reason?: string) => {
        if (usingDb) await deleteClientService(id, reason);
        setClients(prev => prev.filter(c => c.id !== id));
        setPaginatedClients(prev => prev.filter(c => c.id !== id));
        setTotalClients(prev => prev - 1);
        showToast('success', 'Removido.');
    }, [showToast]);

    const syncClientDocuments = useCallback(async (clientId: string) => {
        try {
            const client = clients.find(c => c.id === clientId);
            if (!client) return;
            const r2Files = await listClientFilesFromR2(clientId);
            if (!r2Files || r2Files.length === 0) {
                showToast('success', 'Nenhum arquivo encontrado no armazenamento para este cliente.');
                return;
            }
            const currentDocs = client.documentos || [];
            const newDocs = [...currentDocs];
            let addedCount = 0;
            r2Files.forEach(file => {
                const exists = currentDocs.some(d => d.path === file.path || d.url === file.url);
                if (!exists) {
                    const rawName = file.path.split('/').pop() || 'Arquivo Recuperado';
                    // Remove o prefixo numérico (timestamp) do início do nome do arquivo
                    const cleanName = rawName.replace(/^\d+_/, '');

                    newDocs.push({
                        id: crypto.randomUUID(),
                        nome: cleanName,
                        tipo: file.path.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMG',
                        data_upload: file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString(),
                        url: file.url,
                        path: file.path
                    });
                    addedCount++;
                }
            });
            if (addedCount > 0) {
                await updateClient({ ...client, documentos: newDocs });
                showToast('success', `${addedCount} arquivo(s) recuperado(s)!`);
            } else {
                showToast('success', 'Todos os arquivos já estão sincronizados.');
            }
        } catch (error) {
            console.error(error);
            showToast('error', 'Falha ao sincronizar.');
        }
    }, [clients, updateClient, showToast]);

    const addCase = useCallback(async (newCase: Case) => {
        const finalCase = {
            ...newCase,
            registered_by: user?.name || 'Usuário',
            updated_at: new Date().toISOString()
        };
        if (usingDb) {
            await supabase.from('cases').insert([finalCase]);
            const historyEntry = {
                id: crypto.randomUUID(),
                case_id: newCase.id,
                action: 'Abertura',
                details: 'Abertura de processo no sistema.',
                user_name: user?.name || 'Usuário',
                timestamp: new Date().toISOString()
            };
            await supabase.from('case_history').insert([historyEntry]);
        }
        setCases(prev => [finalCase, ...prev]);
        setPaginatedCases(prev => [finalCase, ...prev]);
        setTotalCases(prev => prev + 1);

        // Update Client Cache for Immediate UI Feedback
        setClients(prev => prev.map(c => {
            if (c.id === newCase.client_id) {
                return { ...c, cases: [...(c.cases || []), newCase] };
            }
            return c;
        }));
        setPaginatedClients(prev => prev.map(c => {
            if (c.id === newCase.client_id) {
                return { ...c, cases: [...(c.cases || []), newCase] };
            }
            return c;
        }));

        showToast('success', 'Processo criado!');
    }, [showToast]);

    const updateCase = useCallback(async (updatedCase: Case, reason?: string) => {
        const oldCase = cases.find(c => c.id === updatedCase.id);
        let actionTitle = 'Edição';
        let details = reason || 'Atualização de dados do processo.';

        if (oldCase) {
            const changes = [];

            // Diff Main Fields
            for (const key in CASE_FIELD_LABELS) {
                const oldVal = (oldCase as any)[key];
                const newVal = (updatedCase as any)[key];

                const normalizedOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
                const normalizedNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();

                if (normalizedOld !== normalizedNew) {
                    const label = CASE_FIELD_LABELS[key];
                    changes.push(`${label}: de "${normalizedOld || 'vazio'}" para "${normalizedNew || 'vazio'}"`);
                }
            }

            // Diff Metadata Fields
            const oldMeta = oldCase.metadata || {};
            const newMeta = updatedCase.metadata || {};
            for (const key in METADATA_FIELD_LABELS) {
                const oldVal = oldMeta[key];
                const newVal = newMeta[key];

                const normalizedOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
                const normalizedNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();

                if (normalizedOld !== normalizedNew) {
                    const label = METADATA_FIELD_LABELS[key];
                    changes.push(`${label}: de "${normalizedOld || 'vazio'}" para "${normalizedNew || 'vazio'}"`);
                }
            }

            if (changes.length > 0) {
                const diffString = changes.join(' | ');
                if (reason) {
                    details = `${reason} | ${diffString}`;
                } else {
                    details = diffString;
                }
            }

            if (oldCase.status !== updatedCase.status) actionTitle = 'Mudança de Status';
        }

        // IMPORTANTE: Gera financeiro se o status mudar para PAGO
        if (oldCase && oldCase.status_pagamento !== 'Pago' && updatedCase.status_pagamento === 'Pago') {
            const newRecord: FinancialRecord = {
                id: crypto.randomUUID(),
                case_id: updatedCase.id,
                client_id: updatedCase.client_id,
                descricao: `Honorários - ${updatedCase.titulo}`,
                tipo: FinancialType.RECEITA,
                tipo_movimentacao: 'Honorários',
                valor: updatedCase.valor_honorarios_pagos || 0,
                data_vencimento: getTodayBrasilia(),
                status_pagamento: true,
                // Campos Novos
                forma_pagamento: updatedCase.honorarios_forma_pagamento,
                recebedor: updatedCase.honorarios_recebedor,
                tipo_conta: updatedCase.honorarios_tipo_conta,
                conta: updatedCase.honorarios_conta
            };
            await addFinancialRecord(newRecord);
            details += ' (Honorários lançados).';
        }

        const finalCase = {
            ...updatedCase,
            updated_by: user?.name || 'Usuário',
            updated_at: new Date().toISOString()
        };

        if (usingDb) {
            const { error } = await supabase.from('cases').update(finalCase).eq('id', updatedCase.id);
            if (error) {
                console.error("Erro ao atualizar caso:", error);
                showToast('error', 'Erro ao salvar: ' + (error.message || JSON.stringify(error)));
                return;
            }
            const historyEntry = {
                id: crypto.randomUUID(),
                case_id: updatedCase.id,
                action: actionTitle,
                details: details,
                user_name: user?.name || 'Usuário',
                timestamp: new Date().toISOString()
            };
            await supabase.from('case_history').insert([historyEntry]);
        }

        setCases(prev => prev.map(c => c.id === updatedCase.id ? finalCase : c));
        setPaginatedCases(prev => prev.map(c => c.id === updatedCase.id ? finalCase : c));

        // Atualiza LOCALMENTE a lista de clients para refletir a mudança no Modal
        setClients(prev => prev.map(c => {
            if (c.id === updatedCase.client_id) {
                const updatedCases = (c.cases || []).map(kase => kase.id === updatedCase.id ? updatedCase : kase);
                return { ...c, cases: updatedCases };
            }
            return c;
        }));
        setPaginatedClients(prev => prev.map(c => {
            if (c.id === updatedCase.client_id) {
                const updatedCases = (c.cases || []).map(kase => kase.id === updatedCase.id ? updatedCase : kase);
                return { ...c, cases: updatedCases };
            }
            return c;
        }));

        showToast('success', 'Processo atualizado!');
    }, [cases, user, showToast]);

    const deleteCase = useCallback(async (id: string) => {
        if (usingDb) await supabase.from('cases').delete().eq('id', id);
        setCases(prev => prev.filter(c => c.id !== id));
        setPaginatedCases(prev => prev.filter(c => c.id !== id));
        setTotalCases(prev => prev - 1);
        showToast('success', 'Processo removido.');
    }, [showToast]);

    const getCaseHistory = useCallback(async (caseId: string) => { const { data } = await supabase.from('case_history').select('*').eq('case_id', caseId).order('timestamp', { ascending: false }); return data || []; }, []);
    const getClientHistory = useCallback(async (clientId: string) => { const { data } = await supabase.from('client_history').select('*').eq('client_id', clientId).order('timestamp', { ascending: false }); return data || []; }, []);
    const addEvent = useCallback(async (e: Event) => {
        if (usingDb) {
            await supabase.from('events').insert([e]);
            if (e.case_id) {
                const historyEntry = {
                    id: crypto.randomUUID(),
                    case_id: e.case_id,
                    action: 'Evento Agendado',
                    details: `${e.tipo}: ${e.titulo} em ${new Date(e.data_hora).toLocaleString('pt-BR')}`,
                    user_name: user?.name || 'Usuário',
                    timestamp: new Date().toISOString()
                };
                await supabase.from('case_history').insert([historyEntry]);
            }
        }
        setEvents(prev => [...prev, e]);
        showToast('success', 'Evento criado!');
    }, [user, showToast]);

    const updateEvent = useCallback(async (updatedEvent: Event) => {
        try {
            if (usingDb) {
                await supabase.from('events').update(updatedEvent).eq('id', updatedEvent.id);
                if (updatedEvent.case_id) {
                    const historyEntry = {
                        id: crypto.randomUUID(),
                        case_id: updatedEvent.case_id,
                        action: 'Evento Atualizado',
                        details: `Atualizado: ${updatedEvent.titulo}`,
                        user_name: user?.name || 'Usuário',
                        timestamp: new Date().toISOString()
                    };
                    await supabase.from('case_history').insert([historyEntry]);
                }
            }
            setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
            showToast('success', 'Evento atualizado!');
        } catch (error) {
            console.error('Erro ao atualizar evento:', error);
            showToast('error', 'Erro ao atualizar o evento.');
        }
    }, [user, showToast]);

    const deleteEvent = useCallback(async (id: string) => {
        if (!id) return;

        // 1. Remove IMEDIATAMENTE do estado local (comparação simples de string)
        const sid = String(id).trim();
        setEvents(prev => prev.filter(e => String(e.id).trim() !== sid));

        try {
            if (usingDb) {
                // Tenta apagar do Supabase
                const { error } = await supabase.from('events').delete().eq('id', sid);
                if (error) {
                    console.error('Supabase delete error:', error);
                    // Não revertemos o estado local para não frustrar o usuário, 
                    // mas avisamos se houver erro real.
                }
            }
            showToast('success', 'Item removido da lista.');
        } catch (error) {
            console.error('Erro fatal na exclusão:', error);
        }
    }, [usingDb, showToast]);

    const addTask = useCallback(async (t: Task) => {
        if (usingDb) {
            await supabase.from('tasks').insert([t]);
            if (t.case_id) {
                const historyEntry = {
                    id: crypto.randomUUID(),
                    case_id: t.case_id,
                    action: 'Tarefa Criada',
                    details: `Nova tarefa: ${t.titulo}`,
                    user_name: user?.name || 'Usuário',
                    timestamp: new Date().toISOString()
                };
                await supabase.from('case_history').insert([historyEntry]);
            }
        }
        setTasks(prev => [...prev, t]);
    }, [user]);

    const toggleTask = useCallback(async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            const ns = !task.concluido;
            if (usingDb) {
                await supabase.from('tasks').update({ concluido: ns }).eq('id', id);
                if (task.case_id) {
                    const historyEntry = {
                        id: crypto.randomUUID(),
                        case_id: task.case_id,
                        action: ns ? 'Tarefa Concluída' : 'Tarefa Reaberta',
                        details: `${ns ? 'Concluída' : 'Pendente'}: ${task.titulo}`,
                        user_name: user?.name || 'Usuário',
                        timestamp: new Date().toISOString()
                    };
                    await supabase.from('case_history').insert([historyEntry]);
                }
            }
            setTasks(prev => prev.map(t => t.id === id ? { ...t, concluido: ns } : t));
        }
    }, [tasks, user]);

    const deleteTask = useCallback(async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (usingDb) {
            await supabase.from('tasks').delete().eq('id', id);
            if (task && task.case_id) {
                const historyEntry = {
                    id: crypto.randomUUID(),
                    case_id: task.case_id,
                    action: 'Tarefa Removida',
                    details: `Excluída: ${task.titulo}`,
                    user_name: user?.name || 'Usuário',
                    timestamp: new Date().toISOString()
                };
                await supabase.from('case_history').insert([historyEntry]);
            }
        }
        setTasks(prev => prev.filter(t => t.id !== id));
    }, [tasks, user]);

    const addFinancialRecord = useCallback(async (r: FinancialRecord) => {
        if (usingDb) {
            await supabase.from('financial').insert([r]);
            if (r.case_id) {
                const historyEntry = {
                    id: crypto.randomUUID(),
                    case_id: r.case_id,
                    action: 'Lançamento Financeiro',
                    details: `${r.tipo}: ${r.descricao} - R$ ${r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    user_name: user?.name || 'Usuário',
                    timestamp: new Date().toISOString()
                };
                await supabase.from('case_history').insert([historyEntry]);
            }
        }
        setFinancial(prev => [...prev, r]);

        // Sync case honorarios if it's an honorary record and NOT Seguro Defeso
        if (r.case_id && r.is_honorary) {
            const c = cases.find(case_item => case_item.id === r.case_id);
            if (c && c.tipo !== CaseType.SEGURO_DEFESO) {
                const currentCaseFinancials = [...financial, r].filter(f => f.case_id === r.case_id);
                const totalFees = currentCaseFinancials
                    .filter(f => f.is_honorary)
                    .reduce((acc, curr) => acc + (curr.valor || 0), 0);

                const nextStatus = totalFees > 0 ? 'Pago' : 'Pendente';

                if (usingDb) {
                    await supabase.from('cases').update({
                        valor_honorarios_pagos: totalFees,
                        status_pagamento: nextStatus,
                        updated_at: new Date().toISOString()
                    }).eq('id', r.case_id);
                }
                setCases(prev => prev.map(item => item.id === r.case_id ? { ...item, valor_honorarios_pagos: totalFees, status_pagamento: nextStatus } : item));
                setPaginatedCases(prev => prev.map(item => item.id === r.case_id ? { ...item, valor_honorarios_pagos: totalFees, status_pagamento: nextStatus } : item));
            }
        }
    }, [cases, financial, usingDb, user]);

    const deleteFinancialRecord = useCallback(async (id: string) => {
        const record = financial.find(f => f.id === id);
        if (usingDb) {
            await supabase.from('financial').delete().eq('id', id);
            if (record && record.case_id) {
                const historyEntry = {
                    id: crypto.randomUUID(),
                    case_id: record.case_id,
                    action: 'Lançamento Removido',
                    details: `Excluído: ${record.descricao}`,
                    user_name: user?.name || 'Usuário',
                    timestamp: new Date().toISOString()
                };
                await supabase.from('case_history').insert([historyEntry]);
            }
        }
        setFinancial(prev => prev.filter(f => f.id !== id));
        showToast('success', 'Removido.');

        // Sync case honorarios if it was an honorary record and NOT Seguro Defeso
        if (record && record.case_id && record.is_honorary) {
            const c = cases.find(case_item => case_item.id === record.case_id);
            if (c && c.tipo !== CaseType.SEGURO_DEFESO) {
                const remainingFinancials = financial.filter(f => f.id !== id && f.case_id === record.case_id);
                const totalFees = remainingFinancials
                    .filter(f => f.is_honorary)
                    .reduce((acc, curr) => acc + (curr.valor || 0), 0);

                const nextStatus = totalFees > 0 ? 'Pago' : 'Pendente';

                if (usingDb) {
                    await supabase.from('cases').update({
                        valor_honorarios_pagos: totalFees,
                        status_pagamento: nextStatus,
                        updated_at: new Date().toISOString()
                    }).eq('id', record.case_id);
                }
                setCases(prev => prev.map(item => item.id === record.case_id ? { ...item, valor_honorarios_pagos: totalFees, status_pagamento: nextStatus } : item));
                setPaginatedCases(prev => prev.map(item => item.id === record.case_id ? { ...item, valor_honorarios_pagos: totalFees, status_pagamento: nextStatus } : item));
            }
        }
    }, [financial, cases, usingDb, user, showToast]);

    const addOfficeExpense = useCallback(async (e: OfficeExpense) => {
        if (usingDb) {
            const { error } = await supabase.from('office_expenses').insert([e]);
            if (error) {
                console.error("Erro ao salvar despesa:", error);
                showToast('error', 'Erro ao salvar despesa: ' + error.message);
                return;
            }
        }
        setOfficeExpenses(prev => [e, ...prev]);
        showToast('success', 'Despesa salva!');
    }, [showToast]);

    const updateOfficeExpense = useCallback(async (updatedExpense: OfficeExpense) => {
        if (usingDb) {
            const { error } = await supabase.from('office_expenses').update(updatedExpense).eq('id', updatedExpense.id);
            if (error) {
                console.error(error);
                showToast('error', 'Erro ao atualizar despesa.');
                return;
            }
        }
        setOfficeExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
        showToast('success', 'Despesa atualizada!');
    }, [showToast]);

    const deleteOfficeExpense = useCallback(async (id: string) => {
        if (usingDb) await supabase.from('office_expenses').delete().eq('id', id);
        setOfficeExpenses(prev => prev.filter(e => e.id !== id));
        showToast('success', 'Despesa removida.');
    }, [showToast]);

    const toggleOfficeExpenseStatus = useCallback(async (id: string) => {
        const expense = officeExpenses.find(e => e.id === id);
        if (expense) {
            const newStatus = expense.status === 'Pago' ? 'Pendente' : 'Pago';
            const updates: any = { status: newStatus };

            if (newStatus === 'Pendente') {
                updates.paid_with_balance_id = null;
            }

            if (usingDb) await supabase.from('office_expenses').update(updates).eq('id', id);
            setOfficeExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
            showToast('success', `Despesa marcada como ${newStatus}`);
        }
    }, [officeExpenses, showToast]); // Adicionado showToast na dependência se for usar, mas o original não usava. Vou manter consistencia.

    const addOfficeBalance = useCallback(async (balance: OfficeBalance) => {
        if (usingDb) await supabase.from('office_balances').insert([balance]);
        setOfficeBalances(prev => [balance, ...prev].sort((a, b) => new Date(b.data_entrada).getTime() - new Date(a.data_entrada).getTime()));
        showToast('success', "Saldo adicionado com sucesso!");
    }, [showToast]);

    const addPersonalCredential = useCallback(async (cred: PersonalCredential) => {
        if (usingDb) await supabase.from('personal_credentials').insert([cred]);
        setPersonalCredentials(prev => [cred, ...prev]);
        showToast('success', 'Credencial salva!');
    }, [showToast]);

    const deletePersonalCredential = useCallback(async (id: string) => {
        if (usingDb) await supabase.from('personal_credentials').delete().eq('id', id);
        setPersonalCredentials(prev => prev.filter(c => c.id !== id));
        showToast('success', 'Removido.');
    }, [showToast]);

    const addCaptador = useCallback(async (nome: string, filial: string) => {
        const newCap = { id: crypto.randomUUID(), nome, filial };
        if (usingDb) await supabase.from('captadores').insert([newCap]);
        setCaptadores(prev => [...prev, newCap]);
        return newCap;
    }, []);
    const deleteCaptador = useCallback(async (id: string) => {
        if (usingDb) await supabase.from('captadores').delete().eq('id', id);
        setCaptadores(prev => prev.filter(c => c.id !== id));
    }, []);

    const createCommissionReceipt = useCallback(async (receipt: CommissionReceipt, recordIds: string[]) => {
        const newReceipt = { ...receipt, status_assinatura: 'pendente' as 'pendente' };
        if (usingDb) {
            const { error } = await supabase.from('commission_receipts').insert([newReceipt]);
            if (error) throw error;
            await supabase.from('financial').update({ receipt_id: newReceipt.id }).in('id', recordIds);
        }
        setCommissionReceipts(prev => [newReceipt, ...prev]);
        setFinancial(prev => prev.map(f => recordIds.includes(f.id) ? { ...f, receipt_id: newReceipt.id } : f));
        showToast('success', 'Recibo gerado!');
    }, [showToast]);

    const deleteCommissionReceipt = useCallback(async (id: string) => {
        if (!confirm('Deseja excluir?')) return;
        if (usingDb) {
            await supabase.from('financial').update({ receipt_id: null }).eq('receipt_id', id);
            await supabase.from('commission_receipts').delete().eq('id', id);
        }
        setCommissionReceipts(prev => prev.filter(r => r.id !== id));
        setFinancial(prev => prev.map(f => f.receipt_id === id ? { ...f, receipt_id: undefined } : f));
        showToast('success', 'Excluído!');
    }, [showToast]);

    const confirmReceiptSignature = useCallback(async (receiptId: string) => {
        if (usingDb) await supabase.from('commission_receipts').update({ status_assinatura: 'assinado' }).eq('id', receiptId);
        setCommissionReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, status_assinatura: 'assinado' } : r));
        showToast('success', 'Assinado!');
    }, [showToast]);

    const uploadReceiptFile = useCallback(async (receiptId: string, file: File) => {
        try {
            if (usingDb) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${receiptId}.${fileExt}`;
                const filePath = `receipts/${fileName}`;
                await supabase.storage.from('receipts').upload(filePath, file, { upsert: true });
                const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
                await supabase.from('commission_receipts').update({ arquivo_url: data.publicUrl }).eq('id', receiptId);
                setCommissionReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, arquivo_url: data.publicUrl } : r));
            } else {
                const fakeUrl = URL.createObjectURL(file);
                setCommissionReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, arquivo_url: fakeUrl } : r));
            }
            showToast('success', 'Anexado!');
        } catch (error) {
            showToast('error', 'Erro upload.');
        }
    }, [showToast]);

    const getInstallments = useCallback(async (caseId: string) => {
        if (usingDb) {
            const { data } = await supabase.from('case_installments').select('*').eq('case_id', caseId).order('parcela_numero');
            return data || [];
        }
        return [];
    }, []);

    const generateInstallments = useCallback(async (caseId: string, startDate: string) => {
        const newInstallments = [];
        const start = new Date(startDate);
        for (let i = 0; i < 4; i++) {
            const date = new Date(start);
            date.setMonth(date.getMonth() + i);
            newInstallments.push({
                id: crypto.randomUUID(),
                case_id: caseId,
                parcela_numero: i + 1,
                data_vencimento: date.toISOString().split('T')[0],
                valor: 1627,
                pago: false,
                destino: 'Escritório'
            });
        }
        if (usingDb) await supabase.from('case_installments').insert(newInstallments);
        showToast('success', 'Parcelas geradas!');
    }, [showToast]);

    const updateInstallment = useCallback(async (inst: CaseInstallment, clientName: string) => {
        if (usingDb) {
            await supabase.from('case_installments').update(inst).eq('id', inst.id);
            if (inst.case_id) {
                const historyEntry = {
                    id: crypto.randomUUID(),
                    case_id: inst.case_id,
                    action: 'Edição de Parcela',
                    details: `Parcela ${inst.parcela_numero}: Valor R$ ${inst.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Destino: ${inst.destino} | Vencimento: ${new Date(inst.data_vencimento).toLocaleDateString('pt-BR')}`,
                    user_name: user?.name || 'Usuário',
                    timestamp: new Date().toISOString()
                };
                await supabase.from('case_history').insert([historyEntry]);
            }
        }
        showToast('success', 'Atualizado');
    }, [user, showToast]);

    const toggleInstallmentPaid = useCallback(async (inst: CaseInstallment, clientName: string, paymentDetails?: any) => {
        const newState = !inst.pago;
        const relatedCase = cases.find(c => c.id === inst.case_id);
        const clientId = relatedCase?.client_id;

        // Monta o objeto de update
        const updateData: any = {
            pago: newState,
            data_pagamento: newState ? new Date().toISOString() : null
        };

        // Adiciona detalhes se fornecidos
        if (newState && paymentDetails) {
            if (paymentDetails.forma_pagamento) updateData.forma_pagamento = paymentDetails.forma_pagamento;
            if (paymentDetails.recebedor) updateData.recebedor = paymentDetails.recebedor;
            if (paymentDetails.tipo_conta) updateData.tipo_conta = paymentDetails.tipo_conta;
            if (paymentDetails.conta) updateData.conta = paymentDetails.conta;
        } else if (!newState) {
            // Limpa se desmarcar
            updateData.forma_pagamento = null;
            updateData.recebedor = null;
            updateData.tipo_conta = null;
            updateData.conta = null;
        }

        if (usingDb) {
            await supabase.from('case_installments').update(updateData).eq('id', inst.id);

            // Log History for the Installment itself
            if (inst.case_id) {
                const historyEntry = {
                    id: crypto.randomUUID(),
                    case_id: inst.case_id,
                    action: newState ? 'Recebimento de Parcela' : 'Cancelamento de Recebimento',
                    details: `Parcela ${inst.parcela_numero}: ${newState ? 'Recebida' : 'Marcada como pendente'}${paymentDetails?.forma_pagamento ? ` via ${paymentDetails.forma_pagamento}` : ''}`,
                    user_name: user?.name || 'Usuário',
                    timestamp: new Date().toISOString()
                };
                await supabase.from('case_history').insert([historyEntry]);
            }

            if (newState && inst.destino === 'Escritório') {
                let descricao = `Parc. ${inst.parcela_numero} - Seguro Defeso (${clientName})`;
                if (paymentDetails?.forma_pagamento === 'Especie') descricao += ' (ESPÉCIE)';

                await addFinancialRecord({
                    id: crypto.randomUUID(),
                    case_id: inst.case_id,
                    client_id: clientId,
                    descricao: descricao,
                    tipo: FinancialType.RECEITA,
                    valor: inst.valor,
                    data_vencimento: inst.data_vencimento,
                    status_pagamento: true,
                    tipo_movimentacao: 'Honorários',
                    // Detalhes extras
                    forma_pagamento: paymentDetails?.forma_pagamento,
                    recebedor: paymentDetails?.recebedor,
                    tipo_conta: paymentDetails?.tipo_conta,
                    conta: paymentDetails?.conta
                });
            }
        }
        showToast('success', newState ? 'Recebido!' : 'Cancelado.');
    }, [cases, addFinancialRecord, user, showToast]);

    const updateGPS = useCallback(async (caseId: string, gpsList: GPS[]) => {
        const oldCase = cases.find(c => c.id === caseId);
        if (usingDb) {
            await supabase.from('cases').update({
                gps_lista: gpsList,
                updated_at: new Date().toISOString()
            }).eq('id', caseId);

            // Compare for changes in status or value
            if (oldCase) {
                const oldGps = oldCase.gps_lista || [];
                const changes: string[] = [];
                gpsList.forEach(newG => {
                    const oldG = oldGps.find(o => o.id === newG.id);
                    if (!oldG || oldG.status !== newG.status) {
                        changes.push(`${newG.competencia}: ${newG.status}`);
                    }
                });
                if (changes.length > 0) {
                    await supabase.from('case_history').insert([{
                        id: crypto.randomUUID(),
                        case_id: caseId,
                        action: 'GPS Atualizada',
                        details: changes.join(' | '),
                        user_name: user?.name || 'Usuário',
                        timestamp: new Date().toISOString()
                    }]);
                }
            }
        }
        setCases(prev => prev.map(c => c.id === caseId ? { ...c, gps_lista: gpsList } : c));
        setPaginatedCases(prev => prev.map(c => c.id === caseId ? { ...c, gps_lista: gpsList } : c));
    }, [cases, user, usingDb]);

    const fetchChatMessages = useCallback(async (chatId: string) => {
        if (usingDb) {
            const { data, error } = await supabase.from('chat_messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('timestamp', { ascending: true });
            if (data) setChatMessages(data);
            if (error) console.error("Error fetching messages:", error);
        }
    }, [usingDb]);

    // --- WHATSAPP FUNCTIONS ---
    const assumeChat = useCallback(async (chatId: string) => {
        if (!user) return;
        const updates = {
            status: 'active' as const,
            assigned_to: user.name,
            assigned_to_id: user.id
        };

        if (usingDb) {
            await supabase.from('chats').update(updates).eq('id', chatId);

            // Log de sistema no chat
            await supabase.from('chat_messages').insert([{
                chat_id: chatId,
                sender_type: 'system',
                sender_name: 'Sistema',
                content: `Atendimento assumido por ${user.name}`,
                timestamp: new Date().toISOString()
            }]);

            // Log de histórico do cliente
            const currentChat = chats.find(c => c.id === chatId);
            if (currentChat?.client_id) {
                await supabase.from('client_history').insert([{
                    id: crypto.randomUUID(),
                    client_id: currentChat.client_id,
                    action: 'WhatsApp: Atendimento Assumido',
                    details: `Atendimento iniciado por ${user.name}`,
                    user_name: user.name,
                    timestamp: new Date().toISOString()
                }]);
            }
        }

        setChats(prev => prev.map(c => c.id === chatId ? { ...c, ...updates } : c));
        // Adiciona a mensagem de sistema localmente para feedback imediato
        setChatMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            chat_id: chatId,
            sender_type: 'system',
            sender_name: 'Sistema',
            content: `Atendimento assumido por ${user.name}`,
            timestamp: new Date().toISOString(),
            read: true
        }]);

        showToast('success', 'Você assumiu este atendimento!');
    }, [user, showToast, usingDb, chats]);

    const finishChat = useCallback(async (chatId: string) => {
        if (!user) return;
        const updates = {
            status: 'finished' as const,
        };

        if (usingDb) {
            await supabase.from('chats').update(updates).eq('id', chatId);

            // Log de sistema no chat
            await supabase.from('chat_messages').insert([{
                chat_id: chatId,
                sender_type: 'system',
                sender_name: 'Sistema',
                content: `Atendimento encerrado por ${user.name}`,
                timestamp: new Date().toISOString()
            }]);

            // Log de histórico do cliente
            const currentChat = chats.find(c => c.id === chatId);
            if (currentChat?.client_id) {
                await supabase.from('client_history').insert([{
                    id: crypto.randomUUID(),
                    client_id: currentChat.client_id,
                    action: 'WhatsApp: Atendimento Encerrado',
                    details: `Atendimento finalizado por ${user.name}`,
                    user_name: user.name,
                    timestamp: new Date().toISOString()
                }]);
            }
        }

        setChats(prev => prev.map(c => c.id === chatId ? { ...c, ...updates } : c));
        // Adiciona a mensagem de sistema localmente
        setChatMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            chat_id: chatId,
            sender_type: 'system',
            sender_name: 'Sistema',
            content: `Atendimento encerrado por ${user.name}`,
            timestamp: new Date().toISOString(),
            read: true
        }]);

        showToast('success', 'Atendimento encerrado com sucesso!');
    }, [user, showToast, usingDb, chats]);

    const sendMessage = useCallback(async (chatId: string, content: string) => {
        if (!user) return;
        const newMessage: ChatMessage = {
            id: crypto.randomUUID(),
            chat_id: chatId,
            sender_type: 'user',
            sender_name: user.name,
            content,
            timestamp: new Date().toISOString(),
            read: true
        };

        if (usingDb) {
            await supabase.from('chat_messages').insert([newMessage]);
            // Update last message in chat
            await supabase.from('chats').update({
                last_message: content,
                last_message_at: newMessage.timestamp
            }).eq('id', chatId);

            // Send actual WhatsApp message if configured
            const chat = chats.find(c => c.id === chatId);
            if (chat?.remote_jid) {
                try {
                    await whatsappService.sendMessage(chat.remote_jid, content);
                } catch (err) {
                    console.error("Failed to send external WhatsApp message:", err);
                }
            }
        }

        setChatMessages(prev => [...prev, newMessage]);
        setChats(prev => prev.map(c => c.id === chatId ? {
            ...c,
            last_message: content,
            last_message_at: newMessage.timestamp
        } : c));
    }, [user, usingDb]);

    const markChatAsRead = useCallback(async (chatId: string) => {
        if (usingDb) {
            await supabase.from('chat_messages')
                .update({ read: true })
                .eq('chat_id', chatId)
                .eq('sender_type', 'client');

            await supabase.from('chats')
                .update({ unread_count: 0 })
                .eq('id', chatId);
        }

        setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread_count: 0 } : c));
        setChatMessages(prev => prev.map(m => m.chat_id === chatId && m.sender_type === 'client' ? { ...m, read: true } : m));
    }, [usingDb]);

    const deleteChat = useCallback(async (chatId: string) => {
        console.log("🗑️ Tentando apagar chat:", chatId);
        if (!window.confirm('Tem certeza que deseja apagar esta conversa? Isso também apagará todas as mensagens no banco de dados.')) {
            console.log("❌ Exclusão cancelada pelo usuário");
            return;
        }

        try {
            if (usingDb) {
                console.log("📡 Deletando mensagens do chat...");
                const { error: msgError } = await supabase.from('chat_messages').delete().eq('chat_id', chatId);
                if (msgError) {
                    console.error("❌ Erro ao deletar mensagens:", msgError);
                    throw msgError;
                }

                console.log("📡 Deletando o chat...");
                const { error: chatError } = await supabase.from('chats').delete().eq('id', chatId);
                if (chatError) {
                    console.error("❌ Erro ao deletar chat:", chatError);
                    throw chatError;
                }
            }

            console.log("✅ Chat deletado com sucesso do banco, atualizando estado local...");
            setChats(prev => prev.filter(c => c.id !== chatId));
            setChatMessages(prev => prev.filter(m => m.chat_id !== chatId));
            showToast('success', 'Conversa apagada!');
        } catch (error: any) {
            console.error("💥 Falha crítica ao apagar chat:", error);
            showToast('error', `Erro ao apagar: ${error.message || 'Erro desconhecido'}`);
        }
    }, [usingDb, showToast]);

    const triggerRgpSync = useCallback(async (clientList: { id: string, cpf_cnpj: string }[]) => {
        const task = {
            clients: clientList.map(c => ({
                id: c.id,
                cpf: c.cpf_cnpj.replace(/\D/g, '')
            })),
            timestamp: new Date().toISOString()
        };

        // Tenta chamada direta na API Local (Mais rápido e confiável se estiver na mesma máquina)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

            const response = await fetch('http://localhost:3001/api/rgp-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                showToast('success', 'Consulta iniciada via API Local!');
                return;
            }
        } catch (e) {
            console.warn("⚠️ API Local indisponível, usando fallback via Supabase...");
        }

        // Fallback: Supabase Realtime
        try {
            const { error } = await supabase.from('system_settings').upsert({
                key: 'rgp_sync_task',
                value: task
            }, { onConflict: 'key' });

            if (error) throw error;
            showToast('success', `${clientList.length === 1 ? 'Consulta' : 'Sincronização em massa'} enviada para a fila.`);
        } catch (err) {
            console.error("Erro ao disparar RGP sync:", err);
            showToast('error', "Falha ao enviar comando para o robô.");
        }
    }, [showToast]);

    const triggerReapSync = useCallback(async (clientList: { id: string, cpf_cnpj: string, senha_gov?: string }[]) => {
        const task = {
            clients: clientList.map(c => ({
                id: c.id,
                cpf: c.cpf_cnpj.replace(/\D/g, ''),
                senha_gov: c.senha_gov
            })),
            timestamp: new Date().toISOString()
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch('http://localhost:3001/api/reap-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                showToast('success', 'Robô de Manutenção REAP iniciado via API Local!');
                return;
            }
        } catch (e) {
            console.warn("⚠️ API Local indisponível para REAP, usando fallback via Supabase...");
        }

        try {
            const { error } = await supabase.from('system_settings').upsert({
                key: 'reap_sync_task',
                value: task
            }, { onConflict: 'key' });

            if (error) throw error;
            showToast('success', `${clientList.length === 1 ? 'REAP' : 'REAP em massa'} enviado para a fila.`);
        } catch (err) {
            console.error("Erro ao disparar REAP sync:", err);
            showToast('error', "Falha ao enviar comando para o robô REAP.");
        }
    }, [showToast]);

    const mergedPreferences = useMemo(() => {
        return { ...globalPreferences, ...(user?.preferences || {}) };
    }, [globalPreferences, user?.preferences]);

    const waitingChatsCount = useMemo(() => {
        return chats.filter(c => c.status === 'waiting' && !c.assigned_to_id).length;
    }, [chats]);

    // --- EFEITO DE TEMA ---
    useEffect(() => {
        const theme = mergedPreferences.theme || 'standard';
        document.documentElement.setAttribute('data-theme', theme);
    }, [mergedPreferences.theme]);

    const contextValue = useMemo(() => ({
        user, login, logout, updateUserProfile, saveUserPreferences,
        globalPreferences, mergedPreferences, saveGlobalPreferences,

        clients, cases,
        paginatedClients, totalClients, fetchClients,
        paginatedCases, totalCases, fetchCases,

        financial, officeExpenses, personalCredentials, events, tasks, captadores, commissionReceipts, notifications,
        currentView, setCurrentView, clientToView, setClientToView,
        addClient, updateClient, deleteClient, addCase, updateCase, deleteCase,
        getCaseHistory, getClientHistory,
        addEvent, updateEvent, deleteEvent, addTask, toggleTask, deleteTask,
        addFinancialRecord, deleteFinancialRecord,
        addOfficeExpense, updateOfficeExpense, deleteOfficeExpense, toggleOfficeExpenseStatus,
        addOfficeBalance, officeBalances,
        addPersonalCredential, deletePersonalCredential,
        addCaptador, deleteCaptador,
        createCommissionReceipt, deleteCommissionReceipt, confirmReceiptSignature, uploadReceiptFile,
        getInstallments, generateInstallments, updateInstallment, toggleInstallmentPaid,
        updateGPS,
        syncClientDocuments,
        addReminder, toggleReminder, deleteReminder,
        reminders,
        toasts, showToast, isLoading,
        isNewCaseModalOpen, setIsNewCaseModalOpen,
        isNewClientModalOpen, setIsNewClientModalOpen,
        newCaseParams, openNewCaseWithParams,
        caseToView, setCaseToView,
        clientDetailTab, setClientDetailTab,
        chats, chatMessages, fetchChatMessages, assumeChat, sendMessage, markChatAsRead, deleteChat, finishChat,
        triggerRgpSync, triggerReapSync, refreshClient, reloadData,
        isAssistantOpen, setIsAssistantOpen,
        waitingChatsCount,
        isStatusBlinking
    }), [
        user, login, logout, updateUserProfile, saveUserPreferences,
        globalPreferences, mergedPreferences, saveGlobalPreferences,
        clients, cases, paginatedClients, totalClients, fetchClients,
        paginatedCases, totalCases, fetchCases,
        financial, officeExpenses, personalCredentials, events, tasks, captadores, commissionReceipts, notifications,
        currentView, setCurrentView, clientToView, setClientToView,
        addClient, updateClient, deleteClient, addCase, updateCase, deleteCase,
        getCaseHistory, getClientHistory,
        addEvent, updateEvent, deleteEvent, addTask, toggleTask, deleteTask,
        addFinancialRecord, deleteFinancialRecord,
        addOfficeExpense, updateOfficeExpense, deleteOfficeExpense, toggleOfficeExpenseStatus,
        addOfficeBalance, officeBalances,
        addPersonalCredential, deletePersonalCredential,
        addCaptador, deleteCaptador,
        createCommissionReceipt, deleteCommissionReceipt, confirmReceiptSignature, uploadReceiptFile,
        getInstallments, generateInstallments, updateInstallment, toggleInstallmentPaid,
        updateGPS,
        syncClientDocuments,
        addReminder, toggleReminder, deleteReminder,
        reminders,
        toasts, showToast, isLoading,
        isNewCaseModalOpen, setIsNewCaseModalOpen,
        isNewClientModalOpen, setIsNewClientModalOpen,
        newCaseParams, openNewCaseWithParams,
        caseToView, setCaseToView,
        clientDetailTab, setClientDetailTab,
        chats, chatMessages, fetchChatMessages, assumeChat, sendMessage, markChatAsRead, deleteChat, finishChat,
        triggerRgpSync, triggerReapSync, refreshClient, reloadData,
        isAssistantOpen, setIsAssistantOpen,
        waitingChatsCount,
        isStatusBlinking
    ]);

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp must be used within an AppProvider');
    return context;
};
