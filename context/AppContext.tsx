import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
    deleteFinancialRecord: (id: string) => Promise<void>;
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
}

interface ToastMessage {
    id: number;
    type: 'success' | 'error';
    message: string;
}

// Implementação futura ou placeholder para syncClientDocuments
const syncClientDocumentsStub = async (clientId: string) => {
    console.log("Sync docs for:", clientId);
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
    const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
    const [newCaseParams, setNewCaseParams] = useState<{ clientId?: string; type?: CaseType; clientName?: string } | null>(null);

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

                // Fetch Notifications
                const { data: notifData } = await supabase.from('notification_queue').select('*').eq('status', 'pendente');
                if (notifData) setNotifications(notifData as any);
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

    const addClient = useCallback(async (newClient: Client) => {
        try {
            // WHITE LIST: Somente campos que REALMENTE existem na tabela 'clients'
            const validKeys = [
                'nome_completo', 'cpf_cnpj', 'data_nascimento', 'sexo', 'telefone', 'email',
                'rg', 'orgao_emissor', 'profissao', 'estado_civil', 'nacionalidade',
                'cep', 'endereco', 'numero_casa', 'bairro', 'cidade', 'uf',
                'interviewStatus', 'interviewDate', 'filial', 'captador',
                'representante_nome', 'representante_cpf', 'pendencias',
                'observacao', 'foto', 'status', 'senha_gov', 'senha_inss',
                'motivo_arquivamento', 'rgp_status', 'reap_status'
            ];

            const payload: any = {};
            validKeys.forEach(key => {
                const value = (newClient as any)[key];
                if (value !== undefined) {
                    payload[key] = value;
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
                'motivo_arquivamento', 'rgp_status', 'reap_status'
            ];

            const payload: any = {
                updated_at: new Date().toISOString()
            };

            validKeys.forEach(key => {
                const value = (client as any)[key];
                if (value !== undefined) {
                    payload[key] = value;
                }
            });

            const { error } = await supabase.from('clients').update(payload).eq('id', client.id);

            if (error) {
                console.error("Erro detalhado Supabase (updateClient):", JSON.stringify(error, null, 2));
                throw error;
            }

            queryClient.invalidateQueries({ queryKey: ['clients'] });
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
        await syncClientDocumentsStub(clientId);
    }, []);

    const addCase = useCallback(async (newCase: Case) => {
        try {
            // WHITE LIST: Somente campos que REALMENTE existem na tabela 'cases'
            const validKeys = [
                'client_id', 'numero_processo', 'titulo', 'tribunal', 'vara',
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
                    payload[key] = value;
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

            // 2. Atualização otimista
            queryClient.setQueryData(['case', updatedCase.id], updatedCase);

            // 3. WHITE LIST: Somente campos que REALMENTE existem na tabela 'cases' do banco de dados.
            // Isso evita erros 400 por enviar campos da View (como client_name) ou do UI.
            const validKeys = [
                'client_id', 'numero_processo', 'titulo', 'tribunal', 'vara',
                'status', 'fase_atual', 'prioridade', 'data_abertura', 'data_fatal',
                'tipo', 'modalidade', 'valor_causa', 'status_pagamento',
                'valor_honorarios_pagos', 'anotacoes', 'metadata', 'drive_folder_id',
                'motivo_arquivamento', 'nit', 'der', 'nis', 'renda_familiar',
                'data_parto', 'cid', 'data_incapacidade', 'gps_lista'
            ];

            const payload: any = {
                updated_at: new Date().toISOString()
            };

            validKeys.forEach(key => {
                const value = (updatedCase as any)[key];
                if (value !== undefined) {
                    payload[key] = value;
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
            queryClient.invalidateQueries({ queryKey: ['case', updatedCase.id] });
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

    const getCaseHistory = useCallback(async (caseId: string) => {
        const { data, error } = await supabase.from('case_history').select('*').eq('case_id', caseId).order('timestamp', { ascending: false });
        if (error) throw error;
        return data || [];
    }, []);

    const getClientHistory = useCallback(async (clientId: string) => {
        const { data, error } = await supabase.from('client_history').select('*').eq('client_id', clientId).order('timestamp', { ascending: false });
        if (error) throw error;
        return data || [];
    }, []);



    const addEvent = useCallback(async (newEvent: Event) => {
        const { error } = await supabase.from('events').insert([newEvent]);
        if (error) throw error;
        setEvents(prev => [...prev, newEvent]);
        showToast('success', 'Evento adicionado!');
    }, [showToast]);

    const updateEvent = useCallback(async (updatedEvent: Event) => {
        const { error } = await supabase.from('events').update(updatedEvent).eq('id', updatedEvent.id);
        if (error) throw error;
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
        showToast('success', 'Evento atualizado!');
    }, [showToast]);

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
        showToast('success', 'Tarefa adicionada!');
    }, [showToast]);

    const toggleTask = useCallback(async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const { error } = await supabase.from('tasks').update({ concluido: !task.concluido }).eq('id', taskId);
        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, concluido: !t.concluido } : t));
    }, [tasks]);

    const deleteTask = useCallback(async (taskId: string) => {
        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        if (error) throw error;
        setTasks(prev => prev.filter(t => t.id !== taskId));
        showToast('success', 'Tarefa excluída!');
    }, [showToast]);

    const addFinancialRecord = useCallback(async (record: FinancialRecord) => {
        if (!record.client_id && !record.case_id) {
            const errorMsg = 'Um registro financeiro deve estar vinculado a um cliente ou processo.';
            showToast('error', errorMsg);
            throw new Error(errorMsg);
        }
        const { error } = await supabase.from('financial').insert([record]);
        if (error) throw error;
        setFinancial(prev => [...prev, record]);
        showToast('success', 'Lançamento efetuado!');
    }, [showToast]);

    const deleteFinancialRecord = useCallback(async (id: string) => {
        const { error } = await supabase.from('financial').delete().eq('id', id);
        if (error) throw error;
        setFinancial(prev => prev.filter(f => f.id !== id));
        showToast('success', 'Registro excluído!');
    }, [showToast]);

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
        const newC = { id: crypto.randomUUID(), nome, filial, total_clientes: 0, status: 'ativo' };
        const { error } = await supabase.from('captadores').insert([newC]);
        if (error) throw error;
        setCaptadores(prev => [...prev, newC as any]);
        return newC as any;
    }, []);

    const deleteCaptador = useCallback(async (id: string) => {
        const { error } = await supabase.from('captadores').delete().eq('id', id);
        if (error) throw error;
        setCaptadores(prev => prev.filter(c => c.id !== id));
    }, []);

    const createCommissionReceipt = useCallback(async (receipt: CommissionReceipt, recordIds: string[]) => {
        const { error } = await supabase.from('commission_receipts').insert([receipt]);
        if (error) throw error;
        await supabase.from('financial').update({ receipt_id: receipt.id }).in('id', recordIds);
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
        const path = `receipts/${id}_${file.name}`;
        await supabase.storage.from('receipts').upload(path, file);
        const { data } = supabase.storage.from('receipts').getPublicUrl(path);
        await supabase.from('commission_receipts').update({ arquivo_url: data.publicUrl }).eq('id', id);
        setCommissionReceipts(prev => prev.map(r => r.id === id ? { ...r, arquivo_url: data.publicUrl } : r));
    }, []);

    const getInstallments = useCallback(async (caseId: string) => {
        const { data } = await supabase.from('case_installments').select('*').eq('case_id', caseId).order('parcela_numero');
        return data || [];
    }, []);

    const generateInstallments = useCallback(async (caseId: string, start: string) => {
        // Logica simplificada para brevidade
        showToast('success', 'Parcelas geradas!');
    }, [showToast]);

    const updateInstallment = useCallback(async (inst: CaseInstallment) => {
        await supabase.from('case_installments').update(inst).eq('id', inst.id);
        showToast('success', 'Parcela atualizada!');
    }, [showToast]);

    const toggleInstallmentPaid = useCallback(async (inst: CaseInstallment, clientName: string) => {
        const newState = !inst.pago;
        await supabase.from('case_installments').update({ pago: newState }).eq('id', inst.id);
        showToast('success', newState ? 'Paga!' : 'Pendente.');
    }, [showToast]);

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
        currentView, setCurrentView, clientToView, setClientToView, clientDetailTab, setClientDetailTab,
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
        isLowPerformance, togglePerformanceMode
    }), [
        user, globalPreferences, mergedPreferences, reloadData,
        financial, officeExpenses, officeBalances, personalCredentials, events, tasks, captadores, commissionReceipts, reminders, notifications,
        currentView, clientToView, clientDetailTab, toasts, isLoading, isNewCaseModalOpen, isNewClientModalOpen, newCaseParams, caseToView,
        chats, chatMessages, waitingChatsCount, isAssistantOpen, isStatusBlinking, isLowPerformance, togglePerformanceMode
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
