import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Client, Case, CaseType, FinancialRecord, Event, ViewState, Task, FinancialType, CaseHistory,
    UserPreferences, User, OfficeExpense, Captador, CaseInstallment, CommissionReceipt,
    AppNotification, Reminder, UserPermission, GPS, PersonalCredential, OfficeBalance, CaseStatus,
    ClientHistory, EventType, Chat, ChatMessage, ClientDocument, Branch
} from '../types';
import { supabase } from '../services/supabaseClient';
import { getTodayBrasilia } from '../utils/dateUtils';
import { listClientFilesFromR2, uploadFileToR2 } from '../services/storageService';
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



    // --- DADOS PAGINADOS ---
    reloadData: () => Promise<void>;

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
    caseTypeFilter: string | 'all';
    setCaseTypeFilter: (filter: string | 'all') => void;
    globalBranchFilter: Branch | 'all';
    setGlobalBranchFilter: (branch: Branch | 'all') => void;
    clientToView: string | null;
    setClientToView: (id: string | null, tab?: 'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp') => void;
    clientDetailTab: 'visao360' | 'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp';
    setClientDetailTab: (tab: 'visao360' | 'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp') => void;

    addClient: (client: Client) => Promise<void>;
    updateClient: (updatedClient: Client) => Promise<void>;
    deleteClient: (id: string, reason?: string) => Promise<void>;
    syncClientDocuments: (clientId: string) => Promise<void>;
    addCase: (newCase: Case) => Promise<void>;
    updateCase: (updatedCase: Case, reason?: string) => Promise<void>;
    deleteCase: (id: string) => Promise<void>;
    getCaseHistory: (case_id: string) => Promise<CaseHistory[]>;
    getClientHistory: (client_id: string) => Promise<ClientHistory[]>;
    getUnifiedClientHistory: (client_id: string) => Promise<any[]>;
    addEvent: (newEvent: Event) => Promise<void>;
    updateEvent: (updatedEvent: Event) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    addTask: (newTask: Task) => Promise<void>;
    toggleTask: (taskId: string) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;

    addFinancialRecord: (record: FinancialRecord) => Promise<void>;
    deleteFinancialRecord: (id: string, caseId?: string, clientId?: string) => Promise<void>;
    addRetirementCalculation: (calc: any) => Promise<any>;
    promoteCalculationToCase: (calcId: string, caseId: string) => Promise<void>;

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
    newCaseParams: { clientId?: string; type?: CaseType; clientName?: string } | null;
    openNewCaseWithParams: (clientId: string, type: CaseType, clientName?: string) => void;
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

    // --- PERFORMANCE MODE ---
    isLowPerformance: boolean;
    togglePerformanceMode: () => void;

    // --- CUSTOM DIALOGS ---
    confirmCustom: (options: CustomConfirmOptions) => Promise<boolean>;
    confirmState: CustomConfirmState | null;
}

interface CustomConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    isAlert?: boolean;
}

interface CustomConfirmState extends CustomConfirmOptions {
    resolve: (val: boolean) => void;
}

interface ToastMessage {
    id: number;
    type: 'success' | 'error';
    message: string;
}

// Helper to determine notification urgency
const getUrgency = (dateStr: string): 'today' | 'tomorrow' | 'upcoming' => {
    if (!dateStr) return 'upcoming';
    const todayStr = getTodayBrasilia();
    const date = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

    if (date === todayStr) return 'today';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (date === tomorrowStr) return 'tomorrow';
    return 'upcoming';
};

// Map database notification_queue item to AppNotification interface
const mapDBNotification = (dbItem: any): AppNotification => {
    return {
        id: dbItem.id,
        type: 'benefit',
        title: 'Atualização de Sistema',
        message: dbItem.message,
        date: dbItem.scheduled_for || dbItem.created_at,
        amount: 0,
        urgency: getUrgency(dbItem.scheduled_for || dbItem.created_at),
        clientName: dbItem.clients?.nome_completo || 'Notificação',
        clientId: dbItem.client_id,
        caseId: dbItem.case_id,
        status: 'unread'
    };
};

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
    const queryClient = useQueryClient();
    const [user, setUser] = useState<User | null>(null);



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
    const [caseTypeFilter, setCaseTypeFilter] = useState<string | 'all'>('all');
    const [globalBranchFilter, _setGlobalBranchFilter] = useState<Branch | 'all'>('all');
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [clientToView, _setClientToView] = useState<string | null>(null);
    const [clientDetailTab, setClientDetailTab] = useState<'visao360' | 'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp'>('visao360');
    const [isStatusBlinking, setIsStatusBlinking] = useState(false);

    // --- PERFORMANCE MODE (Detecção Automática + Manual) ---
    const detectLowPerformance = useCallback(() => {
        // Verificar RAM (navigator.deviceMemory)
        const lowMemory = typeof (navigator as any).deviceMemory === 'number' && (navigator as any).deviceMemory < 4;
        // Verificar núcleos de CPU
        const lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency < 4;
        // Verificar preferência do sistema por movimento reduzido
        const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        return lowMemory || lowCpu || prefersReducedMotion;
    }, []);

    const [isLowPerformance, setIsLowPerformance] = useState<boolean>(() => {
        // Primeiro, tenta ler do LocalStorage (cache)
        try {
            const stored = localStorage.getItem('app_low_performance_mode');
            if (stored !== null) {
                return stored === 'true';
            }
        } catch (e) {
            // Ignore localStorage errors
        }
        // Fallback: detecção automática
        return detectLowPerformance();
    });

    // Sincroniza com UserPreferences do Supabase quando o usuário loga
    useEffect(() => {
        if (user?.preferences?.lowPerformanceMode !== undefined) {
            setIsLowPerformance(user.preferences.lowPerformanceMode);
            try {
                localStorage.setItem('app_low_performance_mode', String(user.preferences.lowPerformanceMode));
            } catch (e) { /* ignore */ }
        }
    }, [user?.preferences?.lowPerformanceMode]);

    // APLICA CLASSE CSS NO BODY PARA MODO DE BAIXO DESEMPENHO
    useEffect(() => {
        if (typeof document !== 'undefined') {
            if (isLowPerformance) {
                document.body.classList.add('low-performance');
            } else {
                document.body.classList.remove('low-performance');
            }
        }
    }, [isLowPerformance]);

    const setClientToView = useCallback((id: string | null, tab?: 'info' | 'docs' | 'credentials' | 'history' | 'cnis' | 'rgp') => {
        _setClientToView(id);
        if (tab) setClientDetailTab(tab);
    }, []);

    const [caseToView, setCaseToView] = useState<string | null>(null);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewCaseModalOpen, setIsNewCaseModalOpenInternal] = useState(false);
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
    const [newCaseParams, setNewCaseParams] = useState<{ clientId?: string; type?: CaseType; clientName?: string } | null>(null);

    // Custom Modal State
    const [confirmState, setConfirmState] = useState<CustomConfirmState | null>(null);

    const confirmCustom = useCallback((options: CustomConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({
                ...options,
                resolve: (val: boolean) => {
                    setConfirmState(null);
                    resolve(val);
                }
            });
        });
    }, []);

    const setIsNewCaseModalOpen = useCallback((isOpen: boolean) => {
        setIsNewCaseModalOpenInternal(isOpen);
        if (!isOpen) {
            setNewCaseParams(null);
        }
    }, []);

    const openNewCaseWithParams = useCallback((clientId: string, type: CaseType, clientName?: string) => {
        setNewCaseParams({ clientId, type, clientName });
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

    // --- TOGGLE PERFORMANCE MODE (Declarado após showToast) ---
    const togglePerformanceMode = useCallback(async () => {
        const newValue = !isLowPerformance;
        setIsLowPerformance(newValue);

        // Salvar no localStorage para persistência imediata
        try {
            localStorage.setItem('app_low_performance_mode', String(newValue));
        } catch (e) { /* ignore */ }

        // Salvar no Supabase (UserPreferences) se logado
        if (user?.id) {
            try {
                const updatedPrefs = { ...(user.preferences || {}), lowPerformanceMode: newValue };
                await supabase.from('users').update({ preferences: updatedPrefs }).eq('id', user.id);
                setUser(prev => prev ? { ...prev, preferences: updatedPrefs } : null);
            } catch (err) {
                console.error('Erro ao salvar preferência de performance:', err);
            }
        }

        showToast('success', newValue ? 'Modo de baixo desempenho ativado' : 'Modo de alto desempenho ativado');
    }, [isLowPerformance, user, showToast]);


    // --- CARREGAMENTO DE DADOS ---

    // --- LOAD DATA ---
    const loadData = useCallback(async (currentUserId?: string, silent = false) => {
        if (!silent && (isLoadingRef.current || isDataLoaded.current)) return;

        if (!silent) {
            setIsLoading(true);
            isLoadingRef.current = true;
        }

        if (usingDb) {
            try {
                const [
                    // { data: financeData }, // REMOVED: Managed by useFinancial/dashboardService
                    { data: eventsData },
                    { data: tasksData },
                    { data: expensesData },
                    { data: balancesData },
                    { data: captadoresData },
                    { data: receiptsData },
                    { data: credsData }
                ] = await Promise.all([
                    // supabase.from('financial_records').select('*'), // REMOVED
                    supabase.from('events').select('*').order('data_hora', { ascending: true }),
                    supabase.from('tasks').select('*'),
                    supabase.from('office_expenses').select('*').order('data_despesa', { ascending: false }),
                    supabase.from('office_balances').select('*').order('data_entrada', { ascending: false }),
                    supabase.from('captadores').select('*'),
                    supabase.from('commission_receipts').select('*').order('data_geracao', { ascending: false }),
                    supabase.from('personal_credentials').select('*').order('created_at', { ascending: false })
                ]);

                // if (financeData) setFinancial(financeData as any);

                // --- Notification System: Database + Dynamic Map ---
                const today = getTodayBrasilia();
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                const nextWeekStr = nextWeek.toISOString().split('T')[0];

                // 1. Fetch from notification_queue (Real notifications/Bot updates)
                const { data: dbNotifs } = await supabase
                    .from('notification_queue')
                    .select('*, clients(nome_completo)')
                    .eq('status', 'pendente');

                const mappedDbNotifs = (dbNotifs || []).map(mapDBNotification);

                // 2. Dynamic Notifications: Financial (Near due)
                const { data: nearDueFinancial } = await supabase
                    .from('financial_records')
                    .select('*, clients(nome_completo)')
                    .eq('status_pagamento', false)
                    .gte('data_vencimento', today)
                    .lte('data_vencimento', nextWeekStr)
                    .limit(20);

                const financialNotifs: AppNotification[] = (nearDueFinancial || []).map(f => ({
                    id: `fin-${f.id}`,
                    type: f.tipo === 'Receita' ? 'income' : 'expense',
                    title: f.tipo === 'Receita' ? 'Recebimento Pendente' : 'Pagamento Pendente',
                    message: f.titulo,
                    date: f.data_vencimento,
                    amount: f.valor,
                    urgency: getUrgency(f.data_vencimento),
                    clientName: f.clients?.nome_completo || 'Escritório',
                    clientId: f.client_id,
                    caseId: f.case_id,
                    status: 'unread'
                }));

                // 3. Dynamic Notifications: Events (Near due)
                const { data: nearDueEvents } = await supabase
                    .from('events')
                    .select('*, cases(titulo, client_id, clients(nome_completo))')
                    .gte('data_hora', today)
                    .lte('data_hora', nextWeekStr)
                    .limit(20);

                const eventNotifs: AppNotification[] = (nearDueEvents || []).map(e => ({
                    id: `evt-${e.id}`,
                    type: (e.tipo === 'Perícia' || e.tipo === 'Perícia Médica') ? 'interview' : 'reminder',
                    title: e.tipo || 'Evento Agendado',
                    message: e.titulo,
                    date: e.data_hora,
                    amount: 0,
                    urgency: getUrgency(e.data_hora),
                    clientName: (e.cases as any)?.clients?.nome_completo || 'Agenda',
                    clientId: (e.cases as any)?.client_id,
                    caseId: e.case_id,
                    status: 'unread'
                }));

                // Combined & Sorted by urgency
                const combinedNotifications = [...mappedDbNotifs, ...financialNotifs, ...eventNotifs]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                setNotifications(combinedNotifications);
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

                const { data: chatsData } = await supabase.from('chats')
                    .select('*')
                    .order('last_message_at', { ascending: false });
                if (chatsData) setChats(chatsData);

                supabase.channel('whatsapp-realtime')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, payload => {
                        if (payload.eventType === 'INSERT') {
                            setChats(prev => [payload.new as Chat, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            setChats(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
                        }
                    })
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
                        const newMessage = payload.new as ChatMessage;
                        setChatMessages(prev => [...prev, newMessage]);
                    })
                    .subscribe();

            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            }
        }

        isDataLoaded.current = true;
        if (!silent) {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, [usingDb]);

    const reloadData = useCallback(async () => {
        if (user?.id) {
            await loadData(user.id, true);
        }
    }, [user, loadData]);

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
        }
        return undefined;
    }, []);

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
                setCurrentView('dashboard');

                setFinancial([]);
                setOfficeExpenses([]);
                setOfficeBalances([]);
                setCaptadores([]);
                setCommissionReceipts([]);
                setPersonalCredentials([]);
                setReminders([]);
                setNotifications([]);
                setCaseTypeFilter('all');
                isDataLoaded.current = false;
                isLoadingRef.current = false;
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const login = useCallback(async (email: string, pass: string, remember: boolean) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
    }, []);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
    }, []);

    const updateUserProfile = useCallback(async (updates: Partial<User>) => {
        const { error } = await supabase.auth.updateUser({
            data: updates
        });
        if (error) throw error;
        setUser(prev => prev ? { ...prev, ...updates } : null);
    }, []);

    const saveUserPreferences = useCallback(async (prefs: UserPreferences) => {
        const currentPrefs = user?.preferences || {};
        const mergedPrefs = { ...currentPrefs, ...prefs };

        const { error } = await supabase.auth.updateUser({
            data: { preferences: mergedPrefs }
        });
        if (error) throw error;
        setUser(prev => prev ? { ...prev, preferences: mergedPrefs } : null);
    }, [user?.preferences]);

    const saveGlobalPreferences = useCallback(async (prefs: UserPreferences) => {
        const { error } = await supabase.from('system_settings').upsert({
            key: 'global_preferences',
            value: prefs
        }, { onConflict: 'key' });
        if (error) throw error;
        setGlobalPreferences(prefs);
    }, []);

    // Sincroniza filial quando usuario carrega
    useEffect(() => {
        if (user?.preferences?.selectedBranch) {
            _setGlobalBranchFilter(user.preferences.selectedBranch);
        }
    }, [user?.preferences?.selectedBranch]);

    const setGlobalBranchFilter = useCallback(async (branch: Branch | 'all') => {
        _setGlobalBranchFilter(branch);
        if (user?.id) {
            const updatedPrefs = { ...(user.preferences || {}), selectedBranch: branch };
            await saveUserPreferences(updatedPrefs);
        }
    }, [user, saveUserPreferences]);

    const addClient = useCallback(async (newClient: Client) => {
        try {
            // WHITE LIST: Somente campos que REALMENTE existem na tabela 'clients'
            const validKeys = [
                'id', 'nome_completo', 'cpf_cnpj', 'data_nascimento', 'sexo', 'telefone', 'email',
                'rg', 'orgao_emissor', 'profissao', 'estado_civil', 'nacionalidade',
                'cep', 'endereco', 'numero_casa', 'bairro', 'cidade', 'uf',
                'interviewStatus', 'interviewDate', 'filial', 'captador',
                'representante_nome', 'representante_cpf', 'pendencias',
                'observacao', 'foto', 'status', 'senha_gov', 'senha_inss',
                'motivo_arquivamento', 'rgp_status', 'reap_status', 'reap_ano_base', 'reap_history', 'documentos',
                'import_source', 'data_cadastro'
            ];

            const payload: any = {};
            validKeys.forEach(key => {
                const value = (newClient as any)[key];
                if (value !== undefined) {
                    // Sanitização: String vazia vira null (evita erro de sintaxe em colunas DATE)
                    payload[key] = (typeof value === 'string' && value.trim() === '') ? null : value;
                }
            });

            const { error } = await supabase.from('clients').insert([payload]);

            if (error) {
                console.error("Erro detalhado Supabase (addClient):", JSON.stringify(error, null, 2));
                throw error;
            }

            queryClient.invalidateQueries({ queryKey: ['clients'] });
            showToast('success', 'Cliente adicionado!');
        } catch (err: any) {
            console.error("Falha ao adicionar cliente:", err);
            const msg = err.message || JSON.stringify(err);
            showToast('error', `Erro ao adicionar cliente: ${msg}`);
        }
    }, [queryClient, showToast]);

    const updateClient = useCallback(async (client: Client) => {
        try {
            if (!client.id) throw new Error("ID do cliente é obrigatório.");

            // WHITE LIST: Somente campos que REALMENTE existem na tabela 'clients'
            const validKeys = [
                'nome_completo', 'cpf_cnpj', 'data_nascimento', 'sexo', 'telefone', 'email',
                'rg', 'orgao_emissor', 'profissao', 'estado_civil', 'nacionalidade',
                'cep', 'endereco', 'numero_casa', 'bairro', 'cidade', 'uf',
                'interviewStatus', 'interviewDate', 'filial', 'captador',
                'representante_nome', 'representante_cpf', 'pendencias',
                'observacao', 'foto', 'status', 'senha_gov', 'senha_inss',
                'motivo_arquivamento', 'rgp_status', 'reap_status', 'reap_ano_base', 'reap_history', 'documentos',
                'import_source'
            ];

            const payload: any = {
                updated_at: new Date().toISOString()
            };

            validKeys.forEach(key => {
                const value = (client as any)[key];
                if (value !== undefined) {
                    // Sanitização: String vazia vira null (evita erro de sintaxe em colunas DATE)
                    payload[key] = (typeof value === 'string' && value.trim() === '') ? null : value;
                }
            });

            // 2. Atualização otimista com merge
            queryClient.setQueryData(['client', client.id], (old: any) => ({ ...old, ...payload }));

            const { error } = await supabase.from('clients').update(payload).eq('id', client.id);

            if (error) {
                console.error("Erro detalhado Supabase (updateClient):", JSON.stringify(error, null, 2));
                queryClient.invalidateQueries({ queryKey: ['client', client.id] }); // Rollback if error
                throw error;
            }

            // 3. Invalidação em cascata (Pre-fixo garante que todos os 'case' e 'client' individuais atualizem)
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client'] });
            queryClient.invalidateQueries({ queryKey: ['cases'] });
            queryClient.invalidateQueries({ queryKey: ['case'] });



            showToast('success', 'Cliente atualizado!');
        } catch (err: any) {
            console.error("Falha ao atualizar cliente:", err);
            const msg = err.message || JSON.stringify(err);
            showToast('error', `Erro ao salvar cliente: ${msg}`);
        }
    }, [queryClient, showToast]);

    const deleteClient = useCallback(async (id: string, reason?: string) => {
        await deleteClientService(id, reason);
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        showToast('success', 'Cliente excluído!');
    }, [queryClient, showToast]);

    const syncClientDocuments = useCallback(async (clientId: string) => {
        try {
            console.log("Syncing docs for:", clientId);

            // 1. Lista arquivos do R2
            const r2Files = await listClientFilesFromR2(clientId);

            if (!r2Files || r2Files.length === 0) {
                showToast('error', 'Nenhum arquivo encontrado na nuvem para este cliente.');
                return;
            }

            // 2. Formata para o tipo ClientDocument
            const syncedDocs: ClientDocument[] = r2Files.map(file => ({
                id: crypto.randomUUID(), // Gera novo ID para referência local se necessário
                nome: file.path.split('/').pop() || 'Arquivo',
                tipo: (file.path.toLowerCase().endsWith('.pdf')) ? 'PDF' : 'IMG',
                data_upload: file.lastModified?.toISOString() || new Date().toISOString(),
                url: file.url,
                path: file.path
            }));

            // 3. Busca o cliente atual para não sobrescrever outros campos
            const { data: client, error: fetchError } = await supabase
                .from('clients')
                .select('documentos')
                .eq('id', clientId)
                .single();

            if (fetchError) throw fetchError;

            // 4. União inteligente (evitar duplicatas pelo path)
            const currentDocs = client?.documentos || [];
            const mergedDocs = [...currentDocs];

            syncedDocs.forEach(synced => {
                const exists = mergedDocs.find(d => d.path === synced.path);
                if (!exists) {
                    mergedDocs.push(synced);
                }
            });

            // 5. Atualiza o banco
            const { error: updateError } = await supabase
                .from('clients')
                .update({ documentos: mergedDocs })
                .eq('id', clientId);

            if (updateError) throw updateError;

            // 6. Invalida cache para forçar recarregamento UI
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client', clientId] });

            showToast('success', `${syncedDocs.length} documentos sincronizados com a nuvem!`);
        } catch (error: any) {
            console.error("Erro na sincronização:", error);
            showToast('error', `Falha na sincronização: ${error.message}`);
        }
    }, [queryClient, showToast]);

    const addCase = useCallback(async (newCase: Case) => {
        try {
            // WHITE LIST: Somente campos que REALMENTE existem na tabela 'cases'
            const validKeys = [
                'id', 'client_id', 'numero_processo', 'titulo', 'tribunal', 'vara',
                'status', 'fase_atual', 'prioridade', 'data_abertura', 'data_fatal',
                'tipo', 'modalidade', 'valor_causa', 'status_pagamento',
                'valor_honorarios_pagos', 'anotacoes', 'metadata', 'drive_folder_id',
                'motivo_arquivamento', 'nit', 'der', 'nis', 'renda_familiar',
                'data_parto', 'cid', 'data_incapacidade', 'gps_lista'
            ];

            const payload: any = {};
            validKeys.forEach(key => {
                const value = (newCase as any)[key];
                if (value !== undefined) {
                    // Sanitização: String vazia vira null (evita erro de sintaxe em colunas DATE)
                    payload[key] = (typeof value === 'string' && value.trim() === '') ? null : value;
                }
            });

            const { error } = await supabase.from('cases').insert([payload]);
            if (error) {
                console.error("Erro detalhado Supabase (addCase):", JSON.stringify(error, null, 2));
                throw error;
            }
            queryClient.invalidateQueries({ queryKey: ['cases'] });
            showToast('success', 'Processo adicionado!');
        } catch (err: any) {
            console.error("Falha ao adicionar processo:", err);
            const msg = err.message || JSON.stringify(err);
            showToast('error', `Erro ao adicionar: ${msg}`);
        }
    }, [queryClient, showToast]);

    const updateCase = useCallback(async (updatedCase: Case, reason?: string) => {
        try {
            if (!updatedCase.id) throw new Error("ID do processo é obrigatório para atualização.");

            // 1. Obter estado anterior para log e segurança
            const { data: oldCase } = await supabase.from('cases').select('*').eq('id', updatedCase.id).single();

            // 2. Atualização otimista com merge (Preserva campos de join como client_name)
            queryClient.setQueryData(['case', updatedCase.id], (old: any) => ({ ...old, ...updatedCase }));

            // 3. WHITE LIST: Somente campos que REALMENTE existem na tabela 'cases' do banco de dados.
            // Isso evita erros 400 por enviar campos da View (como client_name) ou do UI.
            const validKeys = [
                'client_id', 'numero_processo', 'titulo', 'tribunal', 'vara',
                'status', 'fase_atual', 'prioridade', 'data_abertura', 'data_fatal',
                'tipo', 'modalidade', 'valor_causa', 'status_pagamento', 'forma_recebimento',
                'valor_honorarios_pagos', 'anotacoes', 'metadata', 'drive_folder_id',
                'motivo_arquivamento', 'nit', 'der', 'nis', 'renda_familiar',
                'data_parto', 'cid', 'data_incapacidade', 'gps_lista',
                'honorarios_forma_pagamento', 'honorarios_recebedor', 'honorarios_tipo_conta', 'honorarios_conta'
            ];

            const payload: any = {
                updated_at: new Date().toISOString()
            };

            validKeys.forEach(key => {
                const value = (updatedCase as any)[key];
                if (value !== undefined) {
                    // Sanitização: String vazia vira null (evita erro de sintaxe em colunas DATE)
                    // Também garante que não enviamos objetos se a coluna for simples
                    if (typeof value === 'string' && value.trim() === '') {
                        payload[key] = null;
                    } else {
                        payload[key] = value;
                    }
                }
            });

            // Garantia de campos obrigatórios
            if (!payload.titulo) payload.titulo = oldCase?.titulo || 'Processo sem Título';
            if (!payload.status) payload.status = oldCase?.status || 'Análise';

            // 4. Salvar no Supabase
            const { error: updateError } = await supabase.from('cases').update(payload).eq('id', updatedCase.id);

            if (updateError) {
                console.error("Erro Supabase (UpdateCase):", JSON.stringify(updateError, null, 2));
                if (oldCase) queryClient.setQueryData(['case', updatedCase.id], oldCase);
                throw updateError;
            }

            // 5. Histórico (com sua própria proteção)
            if (reason || (oldCase && oldCase.status !== updatedCase.status)) {
                try {
                    await supabase.from('case_history').insert([{
                        id: crypto.randomUUID(),
                        case_id: updatedCase.id,
                        user_id: user?.id,
                        action: 'Atualização',
                        details: reason || `Status alterado de ${oldCase?.status} para ${updatedCase.status}`,
                        old_value: oldCase?.status,
                        new_value: updatedCase.status,
                        is_bot_update: false
                    }]);
                } catch (historyErr) {
                    console.warn("Aviso: Falha ao salvar histórico (Gatilho deve resolver), mas o processo foi salvo.");
                }
            }

            queryClient.invalidateQueries({ queryKey: ['cases'] });
            queryClient.invalidateQueries({ queryKey: ['case'] }); // Invalida todos para garantir sync

            showToast('success', 'Processo atualizado!');
        } catch (err: any) {
            console.error("Erro final updateCase:", err);
            const msg = err.message || JSON.stringify(err);
            showToast('error', `Erro ao salvar: ${msg}`);
        }
    }, [queryClient, showToast, user?.id]);

    const deleteCase = useCallback(async (id: string) => {
        const { error } = await supabase.from('cases').delete().eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['cases'] });
        queryClient.invalidateQueries({ queryKey: ['case', id] });
        showToast('success', 'Processo excluído!');
    }, [queryClient, showToast]);

    const getCaseHistory = useCallback(async (caseId: string): Promise<CaseHistory[]> => {
        try {
            // Tentamos buscar com join para pegar o nome do usuário
            // Usamos 'created_at' ou 'timestamp' dependendo do que existir, mas o padrao é created_at
            const { data, error } = await supabase
                .from('case_history')
                .select(`
                    *,
                    user:user_id ( full_name )
                `)
                .eq('case_id', caseId)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn("Erro ao buscar histórico (tentando fallback sem join):", error);
                // Fallback se o join falhar ou coluna created_at não existir
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('case_history')
                    .select('*')
                    .eq('case_id', caseId);

                if (fallbackError) throw fallbackError;

                return (fallbackData || []).map((item: any) => ({
                    ...item,
                    user_name: 'Usuário',
                    timestamp: item.created_at || item.timestamp || new Date().toISOString()
                })) as CaseHistory[];
            }

            return (data || []).map((item: any) => ({
                ...item,
                user_name: item.user?.full_name || 'Sistema',
                timestamp: item.created_at || item.timestamp || new Date().toISOString()
            })) as CaseHistory[];
        } catch (error) {
            console.error("Erro final getCaseHistory:", error);
            return [];
        }
    }, []);

    const getClientHistory = useCallback(async (clientId: string) => {
        const { data, error } = await supabase.from('client_history').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }, []);



    const addEvent = useCallback(async (newEvent: Event) => {
        const { error } = await supabase.from('events').insert([newEvent]);
        queryClient.invalidateQueries({ queryKey: ['events'] });
        if (newEvent.case_id) queryClient.invalidateQueries({ queryKey: ['case_events', newEvent.case_id] });
        showToast('success', 'Evento adicionado!');
    }, [showToast, queryClient]);

    const updateEvent = useCallback(async (updatedEvent: Event) => {
        const { error } = await supabase.from('events').update(updatedEvent).eq('id', updatedEvent.id);
        if (error) throw error;
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
        queryClient.invalidateQueries({ queryKey: ['events'] });
        if (updatedEvent.case_id) queryClient.invalidateQueries({ queryKey: ['case_events', updatedEvent.case_id] });
        showToast('success', 'Evento atualizado!');
    }, [showToast, queryClient]);

    const deleteEvent = useCallback(async (id: string) => {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) throw error;
        setEvents(prev => prev.filter(e => e.id !== id));
        showToast('success', 'Evento excluído!');
    }, [showToast]);

    const addTask = useCallback(async (newTask: Task) => {
        const { error } = await supabase.from('tasks').insert([newTask]);
        if (error) throw error;
        setTasks(prev => [...prev, newTask]);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        if (newTask.case_id) queryClient.invalidateQueries({ queryKey: ['case_tasks', newTask.case_id] });
        showToast('success', 'Tarefa adicionada!');
    }, [showToast, queryClient]);

    const toggleTask = useCallback(async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const { error } = await supabase.from('tasks').update({ concluido: !task.concluido }).eq('id', taskId);
        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, concluido: !t.concluido } : t));
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        if (task.case_id) queryClient.invalidateQueries({ queryKey: ['case_tasks', task.case_id] });
    }, [tasks, queryClient]);

    const deleteTask = useCallback(async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        if (error) throw error;
        setTasks(prev => prev.filter(t => t.id !== taskId));
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        if (task?.case_id) queryClient.invalidateQueries({ queryKey: ['case_tasks', task.case_id] });
        showToast('success', 'Tarefa excluída!');
    }, [showToast, queryClient, tasks]);

    const addFinancialRecord = useCallback(async (record: FinancialRecord) => {
        if (!record.client_id && !record.case_id) {
            const errorMsg = 'Um registro financeiro deve estar vinculado a um cliente ou processo.';
            showToast('error', errorMsg);
            throw new Error(errorMsg);
        }

        // WHITE LIST para evitar erros 400 com campos virtuais/join
        const validKeys = [
            'id', 'client_id', 'case_id', 'titulo', 'tipo', 'valor',
            'data_vencimento', 'status_pagamento', 'data_pagamento',
            'forma_pagamento', 'recebedor', 'tipo_conta', 'conta', 'tipo_movimentacao', 'is_honorary'
        ];

        const payload: any = {};
        validKeys.forEach(key => {
            const value = (record as any)[key];
            if (value !== undefined) {
                // Sanitização: String vazia vira null (evita erro de sintaxe em colunas DATE)
                payload[key] = (typeof value === 'string' && value.trim() === '') ? null : value;
            }
        });

        const { error } = await supabase.from('financial_records').upsert([payload]);
        if (error) {
            console.error("Erro Supabase (addFinancialRecord):", error);
            throw error;
        }
        queryClient.invalidateQueries({ queryKey: ['financial'] });
        queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
        if (record.case_id) {
            queryClient.invalidateQueries({ queryKey: ['case_financials', record.case_id] });
            queryClient.invalidateQueries({ queryKey: ['case', record.case_id] });
            queryClient.invalidateQueries({ queryKey: ['cases'] }); // Para atualizar ícones de pagamento na lista
        }
        if (record.client_id) {
            queryClient.invalidateQueries({ queryKey: ['client_financials', record.client_id] });
        }
        setFinancial(prev => [...prev, record]);
        showToast('success', 'Lançamento efetuado!');
    }, [showToast, queryClient, setFinancial]);

    const deleteFinancialRecord = useCallback(async (id: string, caseId?: string, clientId?: string) => {
        const { error } = await supabase.from('financial_records').delete().eq('id', id);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['financial'] });
        queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
        if (caseId) {
            queryClient.invalidateQueries({ queryKey: ['case_financials', caseId] });
            queryClient.invalidateQueries({ queryKey: ['case'] }); // Prefix invalidation for all cases
        }
        if (clientId) {
            queryClient.invalidateQueries({ queryKey: ['client_financials', clientId] });
        }

        setFinancial(prev => prev.filter(f => f.id !== id));
        showToast('success', 'Registro excluído!');
    }, [showToast, queryClient]);

    const addOfficeExpense = useCallback(async (expense: OfficeExpense) => {
        const { error } = await supabase.from('office_expenses').insert([expense]);
        if (error) throw error;
        setOfficeExpenses(prev => [...prev, expense]);
        showToast('success', 'Despesa fixa adicionada!');
    }, [showToast]);

    const updateOfficeExpense = useCallback(async (expense: OfficeExpense) => {
        const { error } = await supabase.from('office_expenses').update(expense).eq('id', expense.id);
        if (error) throw error;
        setOfficeExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
    }, []);

    const deleteOfficeExpense = useCallback(async (id: string) => {
        const { error } = await supabase.from('office_expenses').delete().eq('id', id);
        if (error) throw error;
        setOfficeExpenses(prev => prev.filter(e => e.id !== id));
        showToast('success', 'Despesa excluída!');
    }, [showToast]);

    const toggleOfficeExpenseStatus = useCallback(async (id: string) => {
        const exp = officeExpenses.find(e => e.id === id);
        if (!exp) return;
        const newStatus = exp.status === 'Pago' ? 'Pendente' : 'Pago';
        const { error } = await supabase.from('office_expenses').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        setOfficeExpenses(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    }, [officeExpenses]);

    const addOfficeBalance = useCallback(async (balance: OfficeBalance) => {
        const { error } = await supabase.from('office_balances').insert([balance]);
        if (error) throw error;
        setOfficeBalances(prev => [...prev, balance]);
    }, []);

    const addPersonalCredential = useCallback(async (cred: PersonalCredential) => {
        const { error } = await supabase.from('personal_credentials').insert([cred]);
        if (error) throw error;
        setPersonalCredentials(prev => [...prev, cred]);
    }, []);

    const deletePersonalCredential = useCallback(async (id: string) => {
        const { error } = await supabase.from('personal_credentials').delete().eq('id', id);
        if (error) throw error;
        setPersonalCredentials(prev => prev.filter(c => c.id !== id));
    }, []);

    const addCaptador = useCallback(async (nome: string, filial: string) => {
        try {
            const upperNome = nome.toUpperCase();
            const newC = { id: crypto.randomUUID(), nome: upperNome, filial };
            const { error } = await supabase.from('captadores').insert([newC]);
            if (error) throw error;
            setCaptadores(prev => [...prev, newC as any]);
            return newC as any;
        } catch (error: any) {
            console.error('Erro ao adicionar captador:', error);
            showToast('error', `Erro ao adicionar captador: ${error.message || 'Verifique sua conexão'}`);
            throw error;
        }
    }, [showToast]);

    const deleteCaptador = useCallback(async (id: string) => {
        const { error } = await supabase.from('captadores').delete().eq('id', id);
        if (error) throw error;
        setCaptadores(prev => prev.filter(c => c.id !== id));
    }, []);

    const createCommissionReceipt = useCallback(async (receipt: CommissionReceipt, recordIds: string[]) => {
        const { error } = await supabase.from('commission_receipts').insert([receipt]);
        if (error) throw error;
        await supabase.from('financial_records').update({ receipt_id: receipt.id }).in('id', recordIds);

        // Update local state to ensure they disappear from the "active" commissions list
        setFinancial(prev => prev.map(f => recordIds.includes(f.id) ? { ...f, receipt_id: receipt.id } : f));

        queryClient.invalidateQueries({ queryKey: ['financial'] });
        queryClient.invalidateQueries({ queryKey: ['financial_summary'] });

        setCommissionReceipts(prev => [receipt, ...prev]);
        showToast('success', 'Recibo gerado!');
    }, [showToast]);

    const deleteCommissionReceipt = useCallback(async (id: string) => {
        await supabase.from('financial').update({ receipt_id: null }).eq('receipt_id', id);
        await supabase.from('commission_receipts').delete().eq('id', id);
        setCommissionReceipts(prev => prev.filter(r => r.id !== id));
        showToast('success', 'Recibo excluído!');
    }, [showToast]);

    const confirmReceiptSignature = useCallback(async (id: string) => {
        await supabase.from('commission_receipts').update({ status_assinatura: 'assinado' }).eq('id', id);
        setCommissionReceipts(prev => prev.map(r => r.id === id ? { ...r, status_assinatura: 'assinado' } : r));
    }, []);

    const uploadReceiptFile = useCallback(async (id: string, file: File) => {
        const { url } = await uploadFileToR2(file, 'receipts');
        await supabase.from('commission_receipts').update({
            arquivo_url: url,
            status: 'signed',
            status_assinatura: 'assinado'
        }).eq('id', id);
        setCommissionReceipts(prev => prev.map(r => r.id === id ? { ...r, arquivo_url: url, status_assinatura: 'assinado' } : r));
    }, []);

    const getInstallments = useCallback(async (caseId: string) => {
        const { data } = await supabase.from('case_installments').select('*').eq('case_id', caseId).order('parcela_numero');
        return (data || []) as CaseInstallment[];
    }, []);

    const generateInstallments = useCallback(async (caseId: string, start: string) => {
        try {
            // Regra: Só pode gerar parcelas se o benefício estiver Concedido
            const { data: currentCase } = await supabase.from('cases').select('status').eq('id', caseId).single();
            if (currentCase?.status !== 'Concluído (Concedido)') {
                showToast('error', 'Apenas processos com o status "Concluído (Concedido)" podem gerar parcelas de benefício.');
                return;
            }

            const installments: any[] = [];
            const baseDate = new Date(start);

            // Valor do Salário Mínimo Atualizado
            const valorParcela = 1621.00;

            for (let i = 1; i <= 4; i++) {
                const date = new Date(baseDate);
                date.setMonth(baseDate.getMonth() + (i - 1));

                installments.push({
                    id: crypto.randomUUID(),
                    case_id: caseId,
                    parcela_numero: i,
                    data_vencimento: date.toISOString().split('T')[0],
                    valor: valorParcela,
                    pago: false,
                    destino: 'Escritório'
                });
            }

            const { error } = await supabase.from('case_installments').insert(installments);
            if (error) throw error;

            showToast('success', '4 parcelas geradas com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['case_installments', caseId] });
        } catch (err: any) {
            showToast('error', 'Erro ao gerar parcelas: ' + err.message);
        }
    }, [showToast, queryClient]);

    const updateInstallment = useCallback(async (inst: CaseInstallment, clientName: string) => {
        try {
            const { error } = await supabase.from('case_installments').update(inst).eq('id', inst.id);
            if (error) throw error;
            showToast('success', 'Parcela atualizada!');
            queryClient.invalidateQueries({ queryKey: ['case_installments', inst.case_id] });
        } catch (err: any) {
            showToast('error', 'Erro ao atualizar: ' + err.message);
        }
    }, [showToast, queryClient]);

    const toggleInstallmentPaid = useCallback(async (inst: CaseInstallment, clientName: string, paymentDetails?: any) => {
        try {
            const newState = !inst.pago;
            const payload: any = {
                pago: newState,
                data_pagamento: newState ? new Date().toISOString() : null
            };

            if (paymentDetails) {
                Object.assign(payload, paymentDetails);
            }

            const { error } = await supabase.from('case_installments').update(payload).eq('id', inst.id);

            if (error) throw error;

            // Integração Financeira: Se destino for Escritório e marcado como PAGO, gera lançamento
            if (newState && inst.destino === 'Escritório') {
                const financialRecord = {
                    id: crypto.randomUUID(),
                    case_id: inst.case_id,
                    client_id: (await supabase.from('cases').select('client_id').eq('id', inst.case_id).single()).data?.client_id,
                    titulo: `${inst.parcela_numero}ª Parcela - Seguro Defeso (Ref. ${inst.data_vencimento})`,
                    tipo: 'Receita',
                    tipo_movimentacao: 'Honorários',
                    valor: inst.valor,
                    data_vencimento: inst.data_vencimento,
                    status_pagamento: true,
                    is_honorary: true,
                    forma_pagamento: paymentDetails?.forma_pagamento,
                    recebedor: paymentDetails?.recebedor,
                    conta: paymentDetails?.conta
                };

                const { error: finError } = await supabase.from('financial_records').insert([financialRecord]);
                if (finError) throw finError;

                queryClient.invalidateQueries({ queryKey: ['financial'] });
                queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
                queryClient.invalidateQueries({ queryKey: ['case_financials', inst.case_id] });
                queryClient.invalidateQueries({ queryKey: ['case', inst.case_id] });
                queryClient.invalidateQueries({ queryKey: ['cases'] });
                setFinancial(prev => [...prev, financialRecord as any]);
            }
            // Limpeza Financeira: Se desmarcou como PAGO, remove o lançamento automático
            else if (!newState && inst.destino === 'Escritório') {
                const targetTitulo = `${inst.parcela_numero}ª Parcela - Seguro Defeso (Ref. ${inst.data_vencimento})`;
                const { error: delError } = await supabase.from('financial_records')
                    .delete()
                    .eq('case_id', inst.case_id)
                    .eq('titulo', targetTitulo);

                if (delError) console.error("Erro ao remover lançamento financeiro da parcela:", delError);

                queryClient.invalidateQueries({ queryKey: ['financial'] });
                queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
                queryClient.invalidateQueries({ queryKey: ['case_financials', inst.case_id] });
                queryClient.invalidateQueries({ queryKey: ['case', inst.case_id] });
                queryClient.invalidateQueries({ queryKey: ['cases'] });
            }

            queryClient.invalidateQueries({ queryKey: ['case_installments', inst.case_id] });
            showToast('success', newState ? `Parcela de ${clientName} marcada como Paga!` : 'Parcela marcada como Pendente.');
        } catch (err: any) {
            showToast('error', 'Erro ao alterar status: ' + err.message);
        }
    }, [showToast, queryClient, setFinancial]);

    const updateGPS = useCallback(async (caseId: string, list: GPS[]) => {
        await supabase.from('cases').update({ gps_lista: list }).eq('id', caseId);
        queryClient.invalidateQueries({ queryKey: ['cases'] });
    }, [queryClient]);

    const addReminder = useCallback(async (r: Reminder) => {
        await supabase.from('reminders').insert([r]);
        setReminders(prev => [...prev, r]);
    }, []);

    const addRetirementCalculation = useCallback(async (calc: any) => {
        const { data, error } = await supabase.from('retirement_calculations').insert([calc]).select().single();
        if (error) throw error;
        showToast('success', 'Cálculo salvo!');
        return data;
    }, [showToast]);

    const promoteCalculationToCase = useCallback(async (calcId: string, caseId: string) => {
        const { error } = await supabase.from('retirement_calculations').update({ promoted_to_case_id: caseId, ready_for_process: true }).eq('id', calcId);
        if (error) throw error;
        showToast('success', 'Cálculo vinculado ao processo!');
    }, [showToast]);

    const toggleReminder = useCallback(async (id: string) => {
        const rem = reminders.find(r => r.id === id);
        if (!rem) return;
        await supabase.from('reminders').update({ completed: !rem.completed }).eq('id', id);
        setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
    }, [reminders]);

    const deleteReminder = useCallback(async (id: string) => {
        await supabase.from('reminders').delete().eq('id', id);
        setReminders(prev => prev.filter(r => r.id !== id));
    }, []);

    const fetchChatMessages = useCallback(async (id: string) => {
        const { data } = await supabase.from('chat_messages').select('*').eq('chat_id', id).order('timestamp');
        if (data) setChatMessages(data);
    }, []);

    const assumeChat = useCallback(async (id: string) => {
        await supabase.from('chats').update({ status: 'active', assigned_to_id: user?.id }).eq('id', id);
        setChats(prev => prev.map(c => c.id === id ? { ...c, status: 'active', assigned_to_id: user?.id } : c));
    }, [user?.id]);

    const sendMessage = useCallback(async (chatId: string, content: string) => {
        // Implementar lógica de envio
    }, []);

    const markChatAsRead = useCallback(async (id: string) => {
        await supabase.from('chats').update({ unread_count: 0 }).eq('id', id);
        setChats(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
    }, []);

    const deleteChat = useCallback(async (id: string) => {
        await supabase.from('chats').delete().eq('id', id);
        setChats(prev => prev.filter(c => c.id !== id));
    }, []);

    const finishChat = useCallback(async (id: string) => {
        await supabase.from('chats').update({ status: 'finished' }).eq('id', id);
        setChats(prev => prev.map(c => c.id === id ? { ...c, status: 'finished' } : c));
    }, []);

    const triggerRgpSync = useCallback(async (list: any) => { /* Robot trigger */ }, []);
    const triggerReapSync = useCallback(async (list: any) => { /* Robot trigger */ }, []);

    // --- NEW FUNCTION: Unified History ---
    const getUnifiedClientHistory = useCallback(async (clientId: string) => {
        // 1. Get Case IDs and Titles
        const { data: casesData } = await supabase.from('cases').select('id, titulo').eq('client_id', clientId);
        if (!casesData || casesData.length === 0) return [];

        const caseIds = casesData.map(c => c.id);
        const caseMap = Object.fromEntries(casesData.map(c => [c.id, c.titulo]));

        // 2. Get History for these cases
        const { data: historyData, error } = await supabase
            .from('case_history')
            .select('*')
            .in('case_id', caseIds)
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Error fetching unified history:', error);
            return [];
        }

        return historyData.map(h => ({
            ...h,
            case_title: caseMap[h.case_id] || 'Processo Desconhecido'
        }));
    }, []);

    const mergedPreferences = useMemo(() => ({ ...globalPreferences, ...(user?.preferences || {}) }), [globalPreferences, user?.preferences]);
    const waitingChatsCount = useMemo(() => chats.filter(c => c.status === 'waiting').length, [chats]);

    const contextValue = useMemo(() => ({
        user, login, logout, updateUserProfile, saveUserPreferences,
        globalPreferences, mergedPreferences, saveGlobalPreferences,
        reloadData,
        financial, officeExpenses, officeBalances, personalCredentials, events, tasks, captadores, commissionReceipts, reminders, notifications,
        currentView, setCurrentView, caseTypeFilter, setCaseTypeFilter, globalBranchFilter, setGlobalBranchFilter, clientToView, setClientToView, clientDetailTab, setClientDetailTab,
        addClient, updateClient, deleteClient, syncClientDocuments, addCase, updateCase, deleteCase, getCaseHistory, getClientHistory, getUnifiedClientHistory,
        addEvent, updateEvent, deleteEvent, addTask, toggleTask, deleteTask,
        addFinancialRecord, deleteFinancialRecord, addRetirementCalculation, promoteCalculationToCase, addOfficeExpense, updateOfficeExpense, deleteOfficeExpense, toggleOfficeExpenseStatus, addOfficeBalance,
        addPersonalCredential, deletePersonalCredential, addCaptador, deleteCaptador,
        createCommissionReceipt, deleteCommissionReceipt, confirmReceiptSignature, uploadReceiptFile,
        getInstallments, generateInstallments, updateInstallment, toggleInstallmentPaid, updateGPS,
        addReminder, toggleReminder, deleteReminder, toasts, showToast, isLoading,
        isNewCaseModalOpen, setIsNewCaseModalOpen, isNewClientModalOpen, setIsNewClientModalOpen, newCaseParams, openNewCaseWithParams, caseToView, setCaseToView,
        chats, chatMessages, fetchChatMessages, assumeChat, sendMessage, markChatAsRead, deleteChat, finishChat, waitingChatsCount,
        triggerRgpSync, triggerReapSync, isAssistantOpen, setIsAssistantOpen, isStatusBlinking,
        isLowPerformance, togglePerformanceMode,
        confirmCustom, confirmState
    }), [
        user, globalPreferences, mergedPreferences, reloadData,
        financial, officeExpenses, officeBalances, personalCredentials, events, tasks, captadores, commissionReceipts, reminders, notifications,
        currentView, caseTypeFilter, globalBranchFilter, clientToView, clientDetailTab, toasts, isLoading, isNewCaseModalOpen, isNewClientModalOpen, newCaseParams, caseToView,
        chats, chatMessages, waitingChatsCount, isAssistantOpen, isStatusBlinking, isLowPerformance, togglePerformanceMode,
        confirmCustom, confirmState
    ]);

    return <AppContext.Provider value={contextValue as any}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext deve ser usado dentro de um AppProvider');
    return context;
};

// Alias para compatibilidade retroativa
export const useApp = useAppContext;
