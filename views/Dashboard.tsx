import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';
import {
    ArrowDownRight,
    Users,
    Plus,
    TrendingUp,
    Activity,
    CheckCircle2,
    Maximize2,
    Minimize2,
    Save,
    RotateCcw,
    Download,
    Upload,
    ChevronLeft,
    ChevronRight,
    Settings,
    X,
    ArrowUpRight,
    PieChart as PieChartIcon,
    BarChart,
    List,
    Grid,
    CheckSquare,
    AlertTriangle,
    Cake,
    MessageCircle,
    Calendar,
    Trash2,
    Filter,
    DollarSign,
    StickyNote,
    UserPlus,
    Square,
    Shield,
    Radar as RadarIcon,
    History,
    FileText,
    Trophy,
    AlertOctagon,
    Wallet,
    Bell,
    Check,
    Building2,
    Briefcase,
    Scale
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart as ReBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis
} from 'recharts';
import { CaseStatus, FinancialType, DashboardWidget, WidgetType, WidgetPeriod, CaseHistory, Branch, CaseType } from '../types';
import WhatsAppModal from '../components/modals/WhatsAppModal';
import { formatDateDisplay } from '../utils/dateUtils';
import KPITile from '../components/dashboard/KPITile';
import DashboardShortcuts from '../components/dashboard/DashboardShortcuts';
import DashboardChart from '../components/dashboard/DashboardChart';
import AuditList from '../components/dashboard/AuditList';
import InsuranceList from '../components/dashboard/InsuranceList';
import WelcomeSection from '../components/dashboard/WelcomeSection';
import ReceivablesList from '../components/dashboard/ReceivablesList';
import DeadlinesList from '../components/dashboard/DeadlinesList';
import TasksList from '../components/dashboard/TasksList';
import BirthdayList from '../components/dashboard/BirthdayList';
import AgendaWidget from '../components/dashboard/AgendaWidget';
import { memo } from 'react';

// --- CATÁLOGO PROFISSIONAL COMPLETO ---
const WIDGET_CATALOG: { category: string, items: { type: WidgetType; label: string; defaultWidth: 1 | 2 | 3 | 4 }[] }[] = [
    {
        category: 'Gestão Estratégica',
        items: [
            { type: 'kpi-total-processes-branch', label: 'Clientes por Filial', defaultWidth: 2 },
            { type: 'kpi-total-processes-type', label: 'Processos por Tipo (Filtravel)', defaultWidth: 2 },
            { type: 'list-captadores-detailed', label: 'Gestão de Captadores', defaultWidth: 2 },
            { type: 'list-pendencias-overview', label: 'Painel de Pendências', defaultWidth: 2 },
            { type: 'kpi-stagnation', label: 'Alerta de Estagnação', defaultWidth: 1 },
            { type: 'list-top-captadores', label: 'Top Captadores (Ranking)', defaultWidth: 1 },
            { type: 'list-audit', label: 'Feed de Auditoria', defaultWidth: 2 },
        ]
    },
    {
        category: 'Financeiro',
        items: [
            { type: 'chart-cash-flow', label: 'Fluxo de Caixa (Previsão)', defaultWidth: 2 },
            { type: 'radar-financial', label: 'Radar Financeiro 360º', defaultWidth: 1 },
            { type: 'list-insurance-due', label: 'Seguro Defeso (Vencimentos)', defaultWidth: 1 },
            { type: 'list-receivables', label: 'Lista A Receber', defaultWidth: 1 },
            { type: 'chart-financial', label: 'Gráfico Evolutivo', defaultWidth: 2 },
            { type: 'kpi-income', label: 'KPI: Receita Total', defaultWidth: 1 },
            { type: 'kpi-expense', label: 'KPI: Despesa Total', defaultWidth: 1 },
        ]
    },
    {
        category: 'Operacional',
        items: [
            { type: 'list-deadlines', label: 'Prazos Fatais', defaultWidth: 1 },
            { type: 'list-tasks', label: 'Minhas Tarefas', defaultWidth: 1 },
            { type: 'chart-funnel', label: 'Funil de Processos', defaultWidth: 2 },
            { type: 'chart-types', label: 'Distribuição por Tipo', defaultWidth: 1 },
            { type: 'kpi-active-cases', label: 'KPI: Processos Ativos', defaultWidth: 1 },
            { type: 'kpi-success-rate', label: 'KPI: Taxa de Êxito', defaultWidth: 1 },
            { type: 'kpi-new-clients', label: 'KPI: Novos Clientes', defaultWidth: 1 },
        ]
    },
    {
        category: 'Geral',
        items: [
            { type: 'text-welcome', label: 'Boas Vindas', defaultWidth: 2 },
            { type: 'list-shortcuts', label: 'Ações Rápidas', defaultWidth: 2 },
            { type: 'calendar-reminders', label: 'Agenda & Lembretes', defaultWidth: 2 },
            { type: 'list-agenda', label: 'Agenda (Simples)', defaultWidth: 1 },
            { type: 'list-birthdays', label: 'Aniversariantes', defaultWidth: 1 },
            { type: 'sticky-note', label: 'Bloco de Notas', defaultWidth: 1 },
        ]
    }
];

// Layout Padrão Otimizado
const DEFAULT_LAYOUT: DashboardWidget[] = [
    { id: 'w1', type: 'text-welcome', width: 2, order: 0 },
    { id: 'w2', type: 'list-shortcuts', width: 2, order: 1 },
    { id: 'w_proc_branch', type: 'kpi-total-processes-branch', width: 2, order: 2 },
    { id: 'w_proc_type', type: 'kpi-total-processes-type', width: 2, order: 3 },
    { id: 'w_cap_new', type: 'list-captadores-detailed', width: 2, order: 4 },
    { id: 'w_pen_new', type: 'list-pendencias-overview', width: 2, order: 5 },
    { id: 'w3', type: 'chart-cash-flow', width: 2, order: 6 },
    { id: 'w4', type: 'kpi-stagnation', width: 1, order: 7 },
];

const PERIOD_LABELS: Record<WidgetPeriod, string> = {
    'this_month': 'Este Mês',
    'last_month': 'Mês Passado',
    'this_year': 'Este Ano',
    'all_time': 'Total Geral'
};

const PENDING_OPTIONS_LIST = [
    'Senha',
    'Duas Etapas',
    'Nível da Conta (Bronze)',
    'Pendência na Receita Federal',
    'Documentação Incompleta',
    'Outros'
];

const Dashboard: React.FC = () => {
    const { clients, cases, financial, events, tasks, toggleTask, user, setCurrentView, setCaseToView, setClientToView, setIsNewCaseModalOpen, saveUserPreferences, showToast, reminders, addReminder, toggleReminder, deleteReminder } = useApp();

    // State
    const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_LAYOUT);
    const [isEditMode, setIsEditMode] = useState(false);

    // Extra Data States
    const [auditLogs, setAuditLogs] = useState<CaseHistory[]>([]);
    const [stickyNote, setStickyNote] = useState(() => localStorage.getItem('dashboard_note') || '');

    // REMINDER STATE
    const [reminderDate, setReminderDate] = useState(new Date());
    const [newReminderTitle, setNewReminderTitle] = useState('');

    // WhatsApp Modal
    const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
    const [whatsAppClient, setWhatsAppClient] = useState<{ name: string, phone: string, title?: string } | null>(null);

    // Config Modal
    const [configWidgetId, setConfigWidgetId] = useState<string | null>(null);
    const [tempConfig, setTempConfig] = useState<any>({});

    // --- STATES PARA OS FILTROS DOS WIDGETS ---
    const [capWidgetFilial, setCapWidgetFilial] = useState<string>('Santa Inês');
    const [selectedCaptadorForDetail, setSelectedCaptadorForDetail] = useState<string | null>(null);
    const [penWidgetFilial, setPenWidgetFilial] = useState<string>('Todos');
    const [selectedPendenciaType, setSelectedPendenciaType] = useState<string | null>(null);

    // States para os NOVOS widgets de processos
    const [procBranchFilter, setProcBranchFilter] = useState<string>('Todos');
    const [procTypeFilter, setProcTypeFilter] = useState<string>('Total');

    const isInitialLoad = useRef(true);

    // Load Preferences
    useEffect(() => {
        if (user?.preferences?.dashboardLayout) {
            setWidgets(user.preferences.dashboardLayout);
        }
        if (user) isInitialLoad.current = false;
    }, [user]);

    // Auto-Save Layout
    useEffect(() => {
        if (isInitialLoad.current || !user) return;
        const savedLayout = JSON.stringify(user.preferences?.dashboardLayout);
        const currentLayout = JSON.stringify(widgets);
        if (savedLayout === currentLayout) return;
        const timer = setTimeout(() => { saveUserPreferences({ dashboardLayout: widgets }); }, 2500);
        return () => clearTimeout(timer);
    }, [widgets, user]);

    useEffect(() => { localStorage.setItem('dashboard_note', stickyNote); }, [stickyNote]);

    useEffect(() => {
        const fetchAudit = async () => {
            const { data } = await supabase.from('case_history').select('*').order('timestamp', { ascending: false }).limit(20);
            if (data) setAuditLogs(data);
        };
        fetchAudit();
    }, []);

    // --- DYNAMIC DATA CALCULATION ---

    const getDateRange = (period: WidgetPeriod = 'this_month') => {
        const now = new Date();
        let start = new Date(0), end = new Date(), prevStart = new Date(0), prevEnd = new Date(0);

        if (period === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        } else if (period === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
        } else if (period === 'this_year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            prevStart = new Date(now.getFullYear() - 1, 0, 1);
            prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        }
        return { start, end, prevStart, prevEnd };
    };

    const calculateKPI = useCallback((type: WidgetType, period: WidgetPeriod = 'this_month') => {
        const { start, end, prevStart, prevEnd } = getDateRange(period);
        let currentValue = 0, previousValue = 0, label = '', format = 'number';

        if (type === 'kpi-income' || type === 'kpi-expense') {
            const finType = type === 'kpi-income' ? FinancialType.RECEITA : FinancialType.DESPESA;
            label = type === 'kpi-income' ? 'Receita' : 'Despesas';
            format = 'currency';
            currentValue = financial.filter(f => f.tipo === finType && f.status_pagamento && new Date(f.data_vencimento) >= start && new Date(f.data_vencimento) <= end).reduce((acc, curr) => acc + curr.valor, 0);
            previousValue = financial.filter(f => f.tipo === finType && f.status_pagamento && new Date(f.data_vencimento) >= prevStart && new Date(f.data_vencimento) <= prevEnd).reduce((acc, curr) => acc + curr.valor, 0);
        } else if (type === 'kpi-new-clients') {
            label = 'Novos Clientes';
            currentValue = clients.filter(c => new Date(c.data_cadastro) >= start && new Date(c.data_cadastro) <= end).length;
            previousValue = clients.filter(c => new Date(c.data_cadastro) >= prevStart && new Date(c.data_cadastro) <= prevEnd).length;
        } else if (type === 'kpi-active-cases') {
            label = 'Processos Ativos';
            currentValue = cases.filter(c => c.status !== CaseStatus.ARQUIVADO).length;
            previousValue = currentValue;
        } else if (type === 'kpi-success-rate') {
            label = 'Taxa de Êxito';
            format = 'percentage';
            const total = cases.filter(c => c.status === CaseStatus.CONCLUIDO_CONCEDIDO || c.status === CaseStatus.CONCLUIDO_INDEFERIDO).length;
            const wins = cases.filter(c => c.status === CaseStatus.CONCLUIDO_CONCEDIDO).length;
            currentValue = total > 0 ? (wins / total) * 100 : 0;
            previousValue = currentValue;
        }

        let trend = 0;
        if (previousValue > 0) trend = ((currentValue - previousValue) / previousValue) * 100;
        else if (currentValue > 0) trend = 100;

        return { currentValue, previousValue, trend, label, format };
    }, [clients, cases, financial]);

    const getChartData = useCallback((dataType: 'financial' | 'clients' | 'cases' = 'financial') => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const monthKey = d.toLocaleString('pt-BR', { month: 'short' });
            const m = d.getMonth(), y = d.getFullYear();
            if (dataType === 'financial') {
                const income = financial.filter(f => f.tipo === FinancialType.RECEITA && f.status_pagamento && new Date(f.data_vencimento).getMonth() === m && new Date(f.data_vencimento).getFullYear() === y).reduce((acc, curr) => acc + curr.valor, 0);
                const expense = financial.filter(f => f.tipo === FinancialType.DESPESA && f.status_pagamento && new Date(f.data_vencimento).getMonth() === m && new Date(f.data_vencimento).getFullYear() === y).reduce((acc, curr) => acc + curr.valor, 0);
                data.push({ name: monthKey, Receita: income, Despesa: expense, Lucro: income - expense });
            } else if (dataType === 'clients') {
                data.push({ name: monthKey, Clientes: clients.filter(c => new Date(c.data_cadastro).getMonth() === m && new Date(c.data_cadastro).getFullYear() === y).length });
            } else {
                data.push({ name: monthKey, Processos: cases.filter(c => new Date(c.data_abertura).getMonth() === m && new Date(c.data_abertura).getFullYear() === y).length });
            }
        }
        return data;
    }, [clients, cases, financial]);

    // --- CALCULATIONS ---

    const topCaptadores = useMemo(() => {
        const ranking: Record<string, number> = {};
        clients.forEach(c => { if (c.captador) ranking[c.captador] = (ranking[c.captador] || 0) + 1; });
        return Object.entries(ranking).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    }, [clients]);

    const stagnantCasesCount = useMemo(() => {
        const limitDate = new Date(); limitDate.setDate(limitDate.getDate() - 60);
        return cases.filter(c => c.status !== CaseStatus.ARQUIVADO && !c.status.includes('Concluído') && new Date(c.data_abertura) < limitDate).length;
    }, [cases]);

    const cashFlowData = useMemo(() => {
        const today = new Date(); const next30 = new Date(); next30.setDate(today.getDate() + 30);
        const currentBalance = financial.reduce((acc, curr) => { if (!curr.status_pagamento) return acc; return acc + (curr.tipo === FinancialType.RECEITA ? curr.valor : -curr.valor); }, 0);
        const projectedIncome = financial.filter(f => !f.status_pagamento && f.tipo === FinancialType.RECEITA && new Date(f.data_vencimento) <= next30).reduce((acc, curr) => acc + curr.valor, 0);
        return [{ name: 'Saldo Atual', valor: currentBalance, fill: '#10B981' }, { name: 'Projeção (30d)', valor: currentBalance + projectedIncome, fill: '#3B82F6' }];
    }, [financial]);

    const funnelData = useMemo(() => {
        const counts = { inicial: 0, andamento: 0, decisao: 0, finalizado: 0 };
        cases.forEach(c => {
            if ([CaseStatus.ANALISE, CaseStatus.EXIGENCIA, CaseStatus.AGUARDANDO_AUDIENCIA].includes(c.status)) counts.inicial++;
            else if (c.status === CaseStatus.EM_RECURSO) counts.andamento++;
            else if (c.status.includes('Aguardando')) counts.decisao++;
            else if ([CaseStatus.CONCLUIDO_CONCEDIDO, CaseStatus.CONCLUIDO_INDEFERIDO, CaseStatus.ARQUIVADO].includes(c.status)) counts.finalizado++;
        });
        return [{ name: 'Inicial', value: counts.inicial, fill: '#60A5FA' }, { name: 'Andamento', value: counts.andamento, fill: '#EAB308' }, { name: 'Decisão', value: counts.decisao, fill: '#A855F7' }, { name: 'Finalizado', value: counts.finalizado, fill: '#10B981' }];
    }, [cases]);

    const radarData = useMemo(() => {
        const { start, end } = getDateRange('this_month');
        const income = financial.filter(f => f.tipo === FinancialType.RECEITA && f.status_pagamento && new Date(f.data_vencimento) >= start && new Date(f.data_vencimento) <= end).reduce((acc, curr) => acc + curr.valor, 0);
        const expense = financial.filter(f => f.tipo === FinancialType.DESPESA && f.status_pagamento && new Date(f.data_vencimento) >= start && new Date(f.data_vencimento) <= end).reduce((acc, curr) => acc + curr.valor, 0);
        const commissions = financial.filter(f => f.tipo === FinancialType.COMISSAO && f.status_pagamento && new Date(f.data_vencimento) >= start && new Date(f.data_vencimento) <= end).reduce((acc, curr) => acc + curr.valor, 0);
        const max = Math.max(income, expense, commissions, 1);
        return [{ subject: 'Receitas', A: income, fullMark: max }, { subject: 'Despesas', A: expense, fullMark: max }, { subject: 'Comissões', A: commissions, fullMark: max }];
    }, [financial]);

    const insuranceDueData = useMemo(() => {
        const today = new Date(); const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7);
        return financial.filter(f => !f.status_pagamento && f.tipo === FinancialType.RECEITA && (f.descricao.includes('Seguro Defeso') || f.descricao.includes('Benefício')) && new Date(f.data_vencimento) >= today && new Date(f.data_vencimento) <= nextWeek).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
    }, [financial]);

    const overdueOrImpendingDeadlines = useMemo(() => cases.filter(c => c.data_fatal && c.status !== CaseStatus.ARQUIVADO && c.status !== CaseStatus.CONCLUIDO_CONCEDIDO).sort((a, b) => new Date(a.data_fatal!).getTime() - new Date(b.data_fatal!).getTime()).slice(0, 5), [cases]);
    const pendingTasks = useMemo(() => tasks.filter(t => !t.concluido).slice(0, 5), [tasks]);
    const upcomingEvents = useMemo(() => events.filter(e => new Date(e.data_hora) >= new Date()).sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()).slice(0, 5), [events]);
    const birthdaysThisMonth = useMemo(() => { const currentMonth = new Date().getMonth(); return clients.filter(c => { if (!c.data_nascimento) return false; const bDate = new Date(c.data_nascimento); const correctedDate = new Date(bDate.getTime() + bDate.getTimezoneOffset() * 60000); return correctedDate.getMonth() === currentMonth; }).sort((a, b) => new Date(a.data_nascimento!).getDate() - new Date(b.data_nascimento!).getDate()); }, [clients]);
    const receivablesData = useMemo(() => financial.filter(f => f.tipo === FinancialType.RECEITA && !f.status_pagamento).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()), [financial]);
    const originData = useMemo(() => [{ name: 'Indicação', value: 45 }, { name: 'Instagram', value: 30 }, { name: 'Google', value: 25 }], []);
    const typeDistributionData = useMemo(() => { const counts: Record<string, number> = {}; cases.forEach(c => { counts[c.tipo] = (counts[c.tipo] || 0) + 1; }); return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [cases]);

    const COLORS = ['#EAB308', '#10B981', '#3B82F6', '#F97316', '#EF4444', '#8B5CF6'];

    const handleWidgetClick = (type: WidgetType) => {
        if (isEditMode) return;
        if (type.includes('financial') || type.includes('income') || type.includes('expense') || type.includes('receivables') || type.includes('insurance') || type.includes('cash-flow')) setCurrentView('financial');
        else if (type.includes('cases') || type.includes('deadlines') || type.includes('funnel') || type.includes('types') || type.includes('stagnation') || type.includes('processes')) setCurrentView('cases');
        else if (type.includes('clients') || type.includes('birthdays') || type.includes('origin') || type.includes('captadores')) setCurrentView('clients');
    };

    const handleDeadlineClick = (caseId: string) => { if (!isEditMode) { setCaseToView(caseId); setCurrentView('cases'); } };
    const handleCollection = (e: React.MouseEvent, record: any) => { e.stopPropagation(); const client = clients.find(c => c.id === (record.client_id || cases.find(ca => ca.id === record.case_id)?.client_id)); if (client?.telefone) { window.open(`https://wa.me/55${client.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${client.nome_completo}, referente a: ${record.descricao}...`)}`, '_blank'); } else showToast('error', 'Sem telefone.'); };
    const handleNavigateToClient = (clientId: string) => { setClientToView(clientId); setCurrentView('clients'); };

    // NEW: Handle Reminder Add
    const handleAddReminder = async () => {
        if (!newReminderTitle.trim()) return;
        const newReminder = {
            id: crypto.randomUUID(),
            user_id: user?.id || '',
            title: newReminderTitle,
            date: reminderDate.toISOString().split('T')[0],
            completed: false
        };
        await addReminder(newReminder);
        setNewReminderTitle('');
    };

    // --- ACTIONS (EDIT MODE) ---
    const moveWidget = (index: number, direction: 'prev' | 'next') => { const newWidgets = [...widgets]; if (direction === 'prev' && index > 0) { [newWidgets[index], newWidgets[index - 1]] = [newWidgets[index - 1], newWidgets[index]]; } else if (direction === 'next' && index < newWidgets.length - 1) { [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]]; } setWidgets(newWidgets); };
    const resizeWidget = (id: string) => { setWidgets(widgets.map(w => { if (w.id === id) { const nextWidth = w.width === 4 ? 1 : (w.width + 1) as 1 | 2 | 3 | 4; return { ...w, width: nextWidth }; } return w; })); };
    const removeWidget = (id: string) => { if (confirm('Remover este widget da tela?')) { setWidgets(widgets.filter(w => w.id !== id)); } };
    const openWidgetConfig = (widget: DashboardWidget) => { setConfigWidgetId(widget.id); setTempConfig(widget.config || { period: 'this_month', title: '' }); };
    const saveWidgetConfig = () => { setWidgets(widgets.map(w => w.id === configWidgetId ? { ...w, config: tempConfig } : w)); setConfigWidgetId(null); };
    const updateSingleWidgetConfig = (id: string, key: string, value: any) => { const updatedWidgets = widgets.map(w => { if (w.id === id) { return { ...w, config: { ...w.config, [key]: value } }; } return w; }); setWidgets(updatedWidgets); };

    // --- RENDERERS ---


    const renderWidgetContent = (widget: DashboardWidget) => {
        const period = widget.config?.period || 'this_month';
        const customTitle = widget.config?.title;
        const dataType = widget.config?.dataType || 'financial';
        const financialViewMode = widget.config?.financialViewMode || 'all';

        switch (widget.type) {
            // --- WIDGET CORRIGIDO: CLIENTES POR FILIAL ---
            case 'kpi-total-processes-branch': {
                // Filtra apenas clientes ativos
                const activeClients = clients.filter(c => c.status !== 'arquivado');
                const filteredClientsCount = activeClients.filter(client => {
                    if (procBranchFilter === 'Todos') return true;
                    return client.filial === procBranchFilter;
                }).length;

                return (
                    <KPITile
                        title="CLIENTES POR FILIAL"
                        value={filteredClientsCount}
                        subtitle={procBranchFilter}
                        type={widget.type}
                        onClick={() => handleWidgetClick(widget.type)}
                        icon={Users}
                        colorClass="text-purple-400"
                        bgColorClass="bg-purple-500/10"
                    />
                );
            }

            case 'kpi-total-processes-type': {
                const activeCases = cases.filter(c => c.status !== CaseStatus.ARQUIVADO);
                const filteredTypeCasesCount = activeCases.filter(c => {
                    if (procTypeFilter === 'Total') return true;
                    if (procTypeFilter === 'Seguro Defeso') return c.tipo === CaseType.SEGURO_DEFESO;
                    if (procTypeFilter === 'Judicial') {
                        const isJudicialType = [CaseType.TRABALHISTA, CaseType.CIVIL].includes(c.tipo as any);
                        const isJudicialized = c.tribunal && c.tribunal.toUpperCase() !== 'INSS' && c.tribunal.trim() !== '';
                        return isJudicialType || isJudicialized;
                    }
                    if (procTypeFilter === 'Administrativo') {
                        const isAdminType = [CaseType.APOSENTADORIA, CaseType.BPC_LOAS, CaseType.SALARIO_MATERNIDADE, CaseType.AUXILIO_DOENCA].includes(c.tipo as any);
                        const isJudicialized = c.tribunal && c.tribunal.toUpperCase() !== 'INSS' && c.tribunal.trim() !== '';
                        return isAdminType && !isJudicialized;
                    }
                    return false;
                }).length;

                return (
                    <KPITile
                        title="PROCESSOS POR TIPO"
                        value={filteredTypeCasesCount}
                        subtitle={procTypeFilter}
                        type={widget.type}
                        onClick={() => handleWidgetClick(widget.type)}
                        icon={Scale}
                        colorClass="text-blue-400"
                        bgColorClass="bg-blue-500/10"
                    />
                );
            }

            case 'list-captadores-detailed':
                const filteredClientsByFilial = clients.filter(c => capWidgetFilial === 'Todas' || c.filial === capWidgetFilial);

                // Agrupamento
                const captadorGroups: Record<string, { count: number, id: string }> = {};
                filteredClientsByFilial.forEach(c => {
                    if (c.captador) {
                        if (!captadorGroups[c.captador]) captadorGroups[c.captador] = { count: 0, id: c.captador };
                        captadorGroups[c.captador].count++;
                    }
                });
                const captadoresList = Object.values(captadorGroups).sort((a, b) => b.count - a.count);

                // Detalhes do Captador Selecionado
                if (selectedCaptadorForDetail) {
                    const clientsOfCaptador = filteredClientsByFilial.filter(c => c.captador === selectedCaptadorForDetail);
                    const totalClients = clientsOfCaptador.length;
                    const withPending = clientsOfCaptador.filter(c => c.pendencias && c.pendencias.length > 0).length;
                    const regular = totalClients - withPending;

                    // Contagem de Processos por Tipo
                    let judicialCount = 0;
                    let adminCount = 0;
                    let insuranceCount = 0;

                    clientsOfCaptador.forEach(client => {
                        const clientCases = cases.filter(c => c.client_id === client.id && c.status !== CaseStatus.ARQUIVADO);
                        clientCases.forEach(c => {
                            if (c.tipo === CaseType.SEGURO_DEFESO) insuranceCount++;
                            else if ([CaseType.TRABALHISTA, CaseType.CIVIL].includes(c.tipo as any)) judicialCount++;
                            else adminCount++;
                        });
                    });

                    return (
                        <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 mb-4 border-b border-zinc-700 pb-2">
                                <button onClick={() => setSelectedCaptadorForDetail(null)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronLeft size={18} /></button>
                                <h3 className="text-sm font-bold text-white truncate flex-1">{selectedCaptadorForDetail}</h3>
                                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{capWidgetFilial}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                                    <p className="text-[10px] text-emerald-400 uppercase font-bold">Regular</p>
                                    <p className="text-xl font-bold text-white">{regular}</p>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                                    <p className="text-[10px] text-red-400 uppercase font-bold">Pendentes</p>
                                    <p className="text-xl font-bold text-white">{withPending}</p>
                                </div>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                                <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Processos Ativos</h4>
                                <div className="flex justify-between items-center p-2 bg-zinc-800/50 rounded-lg">
                                    <span className="text-xs text-zinc-300 flex items-center gap-2"><Shield size={14} className="text-cyan-400" /> Seguro Defeso</span>
                                    <span className="font-bold text-white text-sm">{insuranceCount}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-zinc-800/50 rounded-lg">
                                    <span className="text-xs text-zinc-300 flex items-center gap-2"><Briefcase size={14} className="text-purple-400" /> Administrativo</span>
                                    <span className="font-bold text-white text-sm">{adminCount}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-zinc-800/50 rounded-lg">
                                    <span className="text-xs text-zinc-300 flex items-center gap-2"><Building2 size={14} className="text-orange-400" /> Judicial</span>
                                    <span className="font-bold text-white text-sm">{judicialCount}</span>
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2"><Users size={16} className="text-gold-500" /> {customTitle || 'Gestão de Captadores'}</h3>
                        </div>

                        {/* Filtro de Filiais (Tabs) */}
                        <div className="flex gap-1 bg-black/40 p-1 rounded-lg mb-3 overflow-x-auto custom-scrollbar">
                            {['Santa Inês', 'Aspema', 'Alto Alegre', 'São João do Carú', 'Todas'].map(branch => (
                                <button
                                    key={branch}
                                    onClick={() => setCapWidgetFilial(branch)}
                                    className={`px-3 py-1.5 rounded text-[10px] font-bold whitespace-nowrap transition-colors ${capWidgetFilial === branch ? 'bg-gold-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                >
                                    {branch}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {captadoresList.length > 0 ? captadoresList.map((item, idx) => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedCaptadorForDetail(item.id)}
                                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-gold-500/30 hover:bg-zinc-800 cursor-pointer group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx < 3 ? 'bg-gold-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>{idx + 1}</span>
                                        <span className="text-xs font-bold text-zinc-200 group-hover:text-white">{item.id}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{item.count}</span>
                                        <ChevronRight size={14} className="text-zinc-600 group-hover:text-gold-500" />
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-zinc-500 text-xs">Nenhum captador nesta filial.</div>
                            )}
                        </div>
                    </div>
                );

            // --- WIDGET CORRIGIDO: PAINEL DE PENDÊNCIAS ---
            case 'list-pendencias-overview':
                const clientsForPendency = clients.filter(c => penWidgetFilial === 'Todos' || c.filial === penWidgetFilial);

                // Detalhe da Pendência (Lista de Clientes)
                if (selectedPendenciaType) {
                    const affectedClients = clientsForPendency.filter(c =>
                        selectedPendenciaType === 'Outros'
                            ? (c.pendencias && c.pendencias.some(p => !PENDING_OPTIONS_LIST.slice(0, 5).includes(p)))
                            : c.pendencias?.includes(selectedPendenciaType)
                    );

                    return (
                        <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 mb-4 border-b border-zinc-700 pb-2">
                                <button onClick={() => setSelectedPendenciaType(null)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronLeft size={18} /></button>
                                <h3 className="text-sm font-bold text-white truncate flex-1">{selectedPendenciaType}</h3>
                                <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">{affectedClients.length}</span>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                {affectedClients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => {
                                            setClientToView(client.id); // Define o cliente para visualização
                                            setCurrentView('clients'); // Navega para a tela (que abre o modal)
                                        }}
                                        className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-500/30 hover:bg-zinc-800 cursor-pointer group transition-all"
                                    >
                                        <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white mb-1">{client.nome_completo}</h4>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-500">{client.filial || 'Matriz'}</span>
                                            <ChevronRight size={14} className="text-zinc-600 group-hover:text-red-400" />
                                        </div>
                                    </div>
                                ))}
                                {affectedClients.length === 0 && <p className="text-xs text-zinc-500 text-center py-4">Nenhum cliente com esta pendência.</p>}
                            </div>
                        </div>
                    );
                }

                // Visão Geral das Pendências
                const pendencyCounts = PENDING_OPTIONS_LIST.map(opt => {
                    const count = clientsForPendency.filter(c => {
                        if (opt === 'Outros') return c.pendencias && c.pendencias.some(p => !PENDING_OPTIONS_LIST.slice(0, 5).includes(p));
                        return c.pendencias?.includes(opt);
                    }).length;
                    return { label: opt, count };
                }).sort((a, b) => b.count - a.count);

                return (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> {customTitle || 'Painel de Pendências'}</h3>
                        </div>

                        {/* Filtro de Filiais */}
                        <div className="flex gap-1 bg-black/40 p-1 rounded-lg mb-3 overflow-x-auto custom-scrollbar">
                            {['Todos', 'Santa Inês', 'Aspema', 'Alto Alegre', 'São João do Carú'].map(branch => (
                                <button
                                    key={branch}
                                    onClick={() => setPenWidgetFilial(branch)}
                                    className={`px-3 py-1.5 rounded text-[10px] font-bold whitespace-nowrap transition-colors ${penWidgetFilial === branch ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                >
                                    {branch}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {pendencyCounts.map((item) => (
                                <div
                                    key={item.label}
                                    onClick={() => setSelectedPendenciaType(item.label)}
                                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-500/30 hover:bg-zinc-800 cursor-pointer group transition-all"
                                >
                                    <span className="text-xs font-medium text-zinc-300 group-hover:text-white">{item.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.count > 0 ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-600'}`}>{item.count}</span>
                                        <ChevronRight size={14} className="text-zinc-600 group-hover:text-red-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'calendar-reminders':
                // Visualização Dupla: Calendário + Lista
                const now = new Date();
                const daysInMonth = new Date(reminderDate.getFullYear(), reminderDate.getMonth() + 1, 0).getDate();
                const startDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), 1).getDay();
                const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                const blanks = Array.from({ length: startDay }, (_, i) => i);
                const selectedDateStr = reminderDate.toISOString().split('T')[0];
                const remindersForDay = reminders.filter(r => r.date === selectedDateStr);

                return (
                    <div className="flex gap-4 h-full">
                        {/* Mini Calendar */}
                        <div className="w-1/2 flex flex-col border-r border-white/5 pr-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs font-bold text-zinc-400 capitalize">{reminderDate.toLocaleString('pt-BR', { month: 'long' })}</h4>
                                <div className="flex gap-1">
                                    <button onClick={() => setReminderDate(new Date(reminderDate.setMonth(reminderDate.getMonth() - 1)))} className="p-1 hover:text-white text-zinc-500"><ChevronLeft size={14} /></button>
                                    <button onClick={() => setReminderDate(new Date(reminderDate.setMonth(reminderDate.getMonth() + 1)))} className="p-1 hover:text-white text-zinc-500"><ChevronRight size={14} /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 text-[9px] text-center text-zinc-500 mb-1">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d}>{d}</div>)}</div>
                            <div className="grid grid-cols-7 gap-1 flex-1 content-start">
                                {blanks.map(b => <div key={`b-${b}`} />)}
                                {daysArr.map(day => {
                                    const dStr = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), day).toISOString().split('T')[0];
                                    const isSel = dStr === selectedDateStr;
                                    const hasRem = reminders.some(r => r.date === dStr && !r.completed);
                                    return (
                                        <div key={day} onClick={() => setReminderDate(new Date(reminderDate.getFullYear(), reminderDate.getMonth(), day))}
                                            className={`h-6 flex items-center justify-center rounded cursor-pointer relative text-xs transition-all ${isSel ? 'bg-gold-500 text-black font-bold' : 'text-zinc-400 hover:bg-white/5'}`}>
                                            {day}
                                            {hasRem && !isSel && <div className="absolute bottom-0.5 w-1 h-1 bg-gold-500 rounded-full" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        {/* Tasks List */}
                        <div className="flex-1 flex flex-col">
                            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2"><Bell size={12} className="text-gold-500" /> {reminderDate.getDate()} de {reminderDate.toLocaleString('pt-BR', { month: 'short' })}</h4>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                {remindersForDay.map(rem => (
                                    <div key={rem.id} className="flex items-center gap-2 p-2 rounded bg-white/5 group">
                                        <button onClick={() => toggleReminder(rem.id)} className={`w-4 h-4 rounded border flex items-center justify-center ${rem.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>{rem.completed && <Check size={10} className="text-black" />}</button>
                                        <span className={`text-xs flex-1 ${rem.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{rem.title}</span>
                                        <button onClick={() => deleteReminder(rem.id)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                                {remindersForDay.length === 0 && <p className="text-[10px] text-zinc-600 text-center py-4">Nada agendado.</p>}
                            </div>
                            <div className="mt-2 flex gap-2">
                                <input className="flex-1 bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-gold-500" placeholder="Novo lembrete..." value={newReminderTitle} onChange={e => setNewReminderTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddReminder()} />
                                <button onClick={handleAddReminder} className="bg-gold-600 text-white p-1 rounded hover:bg-gold-500"><Plus size={14} /></button>
                            </div>
                        </div>
                    </div>
                );
            case 'chart-cash-flow':
                return (
                    <div className="flex flex-col h-full cursor-pointer" onClick={() => handleWidgetClick(widget.type)}>
                        <h3 className="text-sm font-bold text-white mb-2 font-serif flex items-center gap-2"><Wallet size={16} className="text-emerald-500" /> {customTitle || 'Fluxo de Caixa'}</h3>
                        <div className="flex-1 min-h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ReBarChart data={cashFlowData} layout="vertical" margin={{ left: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#ccc', fontSize: 10 }} width={80} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} formatter={(val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} />
                                    <Bar dataKey="valor" barSize={20} radius={[0, 4, 4, 0]}>
                                        {cashFlowData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                    </Bar>
                                </ReBarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            case 'kpi-stagnation':
                return (
                    <KPITile
                        title={customTitle || 'Processos Parados (+60d)'}
                        value={stagnantCasesCount}
                        subtitle="Requer atenção imediata"
                        type={widget.type}
                        onClick={() => handleWidgetClick(widget.type)}
                        icon={AlertOctagon}
                        colorClass={stagnantCasesCount > 0 ? "text-red-500" : "text-emerald-500"}
                        bgColorClass="bg-red-500/10"
                    />
                );
            case 'list-top-captadores':
                return (
                    <div className="flex flex-col h-full cursor-pointer" onClick={() => handleWidgetClick(widget.type)}>
                        <h3 className="text-sm font-bold text-white mb-4 font-serif flex items-center gap-2"><Trophy size={16} className="text-yellow-500" /> {customTitle || 'Top Captadores'}</h3>
                        <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                            {topCaptadores.length > 0 ? topCaptadores.map((c, i) => (
                                <div key={c.name} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
                                    <div className="flex items-center gap-2"><span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-zinc-400 text-black' : i === 2 ? 'bg-orange-700 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{i + 1}</span><span className="text-xs text-zinc-200 truncate max-w-[100px]">{c.name}</span></div><span className="text-xs font-bold text-emerald-500">{c.count}</span>
                                </div>
                            )) : <div className="text-center py-8 text-zinc-500 text-xs">Sem dados.</div>}
                        </div>
                    </div>
                );
            // --- ANTIGOS (RESTAURADOS) ---
            case 'text-welcome':
                return <WelcomeSection userName={user?.name} />;
            case 'list-shortcuts':
                return (
                    <DashboardShortcuts
                        onNewCase={() => { setCurrentView('cases'); setIsNewCaseModalOpen(true); }}
                        onFinancial={() => setCurrentView('financial')}
                        onNewClient={() => setCurrentView('clients')}
                        onCommissions={() => setCurrentView('commissions')}
                    />
                );
            case 'radar-financial':
                return (
                    <div className="flex flex-col h-full cursor-pointer" onClick={() => handleWidgetClick(widget.type)}>
                        <h3 className="text-sm font-bold text-white mb-2 font-serif flex items-center gap-2"><RadarIcon size={16} className="text-yellow-500" /> {customTitle || 'Radar Financeiro'}</h3>
                        <div className="flex-1 min-h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#3f3f46" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                    <Radar name="Financeiro" dataKey="A" stroke="#EAB308" strokeWidth={2} fill="#EAB308" fillOpacity={0.3} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} formatter={(val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            case 'list-insurance-due':
                return (
                    <InsuranceList
                        title={customTitle || 'Seguro Defeso (7d)'}
                        data={insuranceDueData}
                        onCollection={handleCollection}
                    />
                );
            case 'list-audit':
                return (
                    <AuditList
                        title={customTitle || 'Auditoria em Tempo Real'}
                        logs={auditLogs}
                    />
                );
            // KPI e Charts
            case 'kpi-income':
            case 'kpi-expense':
            case 'kpi-active-cases':
            case 'kpi-new-clients':
            case 'kpi-success-rate':
                const kpi = calculateKPI(widget.type, period);
                let kpiIcon = Activity;
                if (widget.type === 'kpi-income') kpiIcon = TrendingUp;
                if (widget.type === 'kpi-expense') kpiIcon = ArrowDownRight;
                if (widget.type === 'kpi-new-clients') kpiIcon = Users;
                if (widget.type === 'kpi-success-rate') kpiIcon = CheckCircle2;

                return (
                    <KPITile
                        title={customTitle || kpi.label}
                        value={kpi.currentValue}
                        onClick={() => handleWidgetClick(widget.type)}
                        icon={kpiIcon}
                        colorClass={widget.type === 'kpi-income' ? 'text-emerald-500' : widget.type === 'kpi-expense' ? 'text-red-500' : widget.type === 'kpi-new-clients' ? 'text-purple-400' : widget.type === 'kpi-success-rate' ? 'text-yellow-500' : 'text-blue-400'}
                        bgColorClass={widget.type === 'kpi-income' ? 'bg-emerald-500/10' : widget.type === 'kpi-expense' ? 'bg-red-500/10' : widget.type === 'kpi-new-clients' ? 'bg-purple-500/10' : widget.type === 'kpi-success-rate' ? 'bg-yellow-500/10' : 'bg-blue-500/10'}
                        trend={widget.type !== 'kpi-active-cases' ? { value: kpi.trend, isPositive: kpi.trend >= 0 } : undefined}
                        format={kpi.format as any}
                        type={widget.type}
                    />
                );
            case 'chart-financial':
                const chartData = getChartData(dataType);
                return (
                    <DashboardChart
                        title={customTitle || (dataType === 'financial' ? 'Fluxo Financeiro' : dataType === 'clients' ? 'Novos Clientes' : 'Novos Processos')}
                        data={chartData}
                        dataType={dataType as any}
                        financialViewMode={financialViewMode}
                        onFilterChange={dataType === 'financial' ? (mode) => updateSingleWidgetConfig(widget.id, 'financialViewMode', mode) : undefined}
                        onClick={() => handleWidgetClick(widget.type)}
                    />
                );
            case 'chart-types':
                return (
                    <div className="flex flex-col h-full cursor-pointer" onClick={() => handleWidgetClick(widget.type)}>
                        <h3 className="text-sm font-bold text-white mb-4 font-serif flex items-center gap-2">
                            <PieChartIcon size={16} className="text-yellow-500" />
                            {customTitle || 'Distribuição'}
                        </h3>
                        <div className="flex-1 min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={typeDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {typeDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-zinc-400 text-[10px] ml-1">{value}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                                <span className="text-xl font-bold text-white">{cases.length}</span>
                                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Processos</span>
                            </div>
                        </div>
                    </div>
                );
            case 'chart-funnel':
                return (
                    <div className="flex flex-col h-full cursor-pointer" onClick={() => handleWidgetClick(widget.type)}>
                        <h3 className="text-sm font-bold text-white mb-4 font-serif flex items-center gap-2"><Filter size={16} className="text-blue-400" />{customTitle || 'Funil de Processos'}</h3>
                        <div className="flex-1 min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ReBarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} />
                                    <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>{funnelData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Bar>
                                </ReBarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            case 'chart-origin':
                return (
                    <div className="flex flex-col h-full cursor-pointer" onClick={() => handleWidgetClick(widget.type)}>
                        <h3 className="text-sm font-bold text-white mb-4 font-serif flex items-center gap-2"><UserPlus size={16} className="text-purple-400" />{customTitle || 'Origem de Clientes'}</h3>
                        <div className="flex-1 min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={originData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}>{originData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />)}</Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-zinc-400 text-[10px] ml-1">{value}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            case 'list-receivables':
                return (
                    <ReceivablesList
                        title={customTitle || 'A Receber'}
                        data={receivablesData}
                        onCollection={handleCollection}
                    />
                );
            case 'sticky-note':
                return (
                    <div className="flex flex-col h-full">
                        <h3 className="text-sm font-bold text-yellow-500 mb-2 font-serif flex items-center gap-2"><StickyNote size={16} />{customTitle || 'Bloco de Notas'}</h3>
                        <div className="flex-1 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 shadow-inner">
                            <textarea className="w-full h-full bg-transparent text-yellow-100/90 text-sm resize-none outline-none placeholder:text-yellow-500/30 font-medium custom-scrollbar leading-relaxed" placeholder="Digite anotações rápidas aqui..." value={stickyNote} onChange={(e) => setStickyNote(e.target.value)} />
                        </div>
                    </div>
                );
            case 'list-agenda':
                return (
                    <AgendaWidget
                        title={customTitle || 'Agenda & Lembretes'}
                        events={events}
                    />
                );
            case 'list-deadlines':
                return (
                    <DeadlinesList
                        title={customTitle || 'Prazos Fatais'}
                        deadlines={overdueOrImpendingDeadlines}
                        onDeadlineClick={handleDeadlineClick}
                    />
                );
            case 'list-tasks':
                return (
                    <TasksList
                        title={customTitle || 'Tarefas Pendentes'}
                        tasks={pendingTasks}
                        cases={cases}
                        onToggleTask={toggleTask}
                    />
                );
            case 'list-birthdays':
                return (
                    <BirthdayList
                        title={customTitle || 'Aniversariantes'}
                        data={birthdaysThisMonth}
                        onCollection={handleCollection}
                    />
                );
            default:
                return <div className="text-red-500">Widget desconhecido</div>;
        }
    };

    // --- LAYOUT PRINCIPAL ---
    return (
        <div className="space-y-6 pb-20">
            {/* EDIT TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-8">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`group flex items-center p-2 rounded-full transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isEditMode ? 'bg-yellow-600 text-white w-36' : 'bg-zinc-800 text-zinc-400 hover:text-white w-10 hover:w-48'}`}>
                        <div className="shrink-0">{isEditMode ? <Save size={20} /> : <Settings size={20} />}</div>
                        <span className="ml-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">{isEditMode ? 'Salvar Layout' : 'Personalizar Dashboard'}</span>
                    </button>
                    {isEditMode && (<>
                        <button onClick={() => { if (confirm('Restaurar layout padrão? Isso removerá itens antigos.')) setWidgets(DEFAULT_LAYOUT); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white flex items-center gap-2 text-xs font-bold px-3" title="Limpar Layout"><RotateCcw size={16} /> Restaurar Padrão</button>
                    </>)}
                </div>
                {isEditMode && (
                    <div className="relative group">
                        <button className="px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-yellow-500 rounded-lg text-sm text-zinc-300 hover:text-white flex items-center gap-2"><Plus size={16} className="text-yellow-500" /> Adicionar Widget</button>
                        <div className="absolute right-0 top-full mt-2 w-64 bg-black border border-zinc-800 rounded-xl shadow-2xl z-50 p-2 hidden group-hover:block max-h-80 overflow-y-auto custom-scrollbar">
                            {WIDGET_CATALOG.map(cat => (
                                <div key={cat.category} className="mb-2">
                                    <h4 className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-1">{cat.category}</h4>
                                    {cat.items.map(item => (
                                        <button key={item.type} onClick={() => setWidgets([...widgets, { id: `w-${Date.now()}`, type: item.type, width: item.defaultWidth, order: widgets.length, config: { period: 'this_month' } }])} className="w-full text-left px-2 py-1.5 hover:bg-zinc-800 rounded text-sm text-zinc-300 hover:text-white flex items-center gap-2">
                                            <Plus size={12} className="text-yellow-500" /> {item.label}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* WIDGET GRID */}
            <div className="grid grid-cols-4 gap-4 sm:gap-6">
                {widgets.map((widget, index) => (
                    <div
                        key={widget.id}
                        className={`relative bg-zinc-900/60 backdrop-blur-md border ${isEditMode ? 'border-dashed border-yellow-500/50 cursor-move' : 'border-white/5'} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col`}
                        style={{ gridColumn: `span ${widget.width}` }}
                    >
                        {isEditMode && (
                            <div className="absolute top-0 left-0 w-full h-full bg-black/60 z-20 flex items-center justify-center gap-2 backdrop-blur-sm">
                                <button onClick={() => { const n = [...widgets]; if (index > 0) { [n[index], n[index - 1]] = [n[index - 1], n[index]]; setWidgets(n); } }} className="p-2 bg-zinc-800 rounded text-white hover:bg-zinc-700" title="Mover Esq"><ChevronLeft size={20} /></button>
                                <button onClick={() => { const n = widgets.map(w => w.id === widget.id ? { ...w, width: (w.width === 4 ? 1 : w.width + 1) as any } : w); setWidgets(n); }} className="p-2 bg-zinc-800 rounded text-white hover:bg-zinc-700" title="Redimensionar"><Maximize2 size={20} /></button>
                                <button onClick={() => openWidgetConfig(widget)} className="p-2 bg-zinc-800 rounded text-yellow-500 hover:bg-zinc-700" title="Configurar"><Settings size={20} /></button>
                                <button onClick={() => removeWidget(widget.id)} className="p-2 bg-red-900/50 rounded text-red-400 hover:bg-red-900" title="Excluir"><Trash2 size={20} /></button>
                                <button onClick={() => { const n = [...widgets]; if (index < n.length - 1) { [n[index], n[index + 1]] = [n[index + 1], n[index]]; setWidgets(n); } }} className="p-2 bg-zinc-800 rounded text-white hover:bg-zinc-700" title="Mover Dir"><ChevronRight size={20} /></button>
                            </div>
                        )}
                        <div className="flex-1 p-5 overflow-hidden">
                            {renderWidgetContent(widget)}
                        </div>
                    </div>
                ))}
            </div>

            {/* WIDGET CONFIG MODAL */}
            {configWidgetId && (
                <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Configurar Widget</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Título</label>
                                <input className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none focus:border-yellow-500" value={tempConfig.title || ''} onChange={e => setTempConfig({ ...tempConfig, title: e.target.value })} placeholder="Título Personalizado" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Período</label>
                                <select className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none focus:border-yellow-500" value={tempConfig.period || 'this_month'} onChange={e => setTempConfig({ ...tempConfig, period: e.target.value })}>
                                    {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            {/* Agenda Config - Restored */}
                            {widgets.find(w => w.id === configWidgetId)?.type === 'list-agenda' && (
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Visualização</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setTempConfig({ ...tempConfig, viewMode: 'list' })}
                                            className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 ${tempConfig.viewMode === 'list' ? 'bg-yellow-600/20 border-yellow-500 text-yellow-500' : 'bg-black border-zinc-800 text-zinc-400'}`}
                                        >
                                            <List size={16} /> Lista
                                        </button>
                                        <button
                                            onClick={() => setTempConfig({ ...tempConfig, viewMode: 'calendar' })}
                                            className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-2 ${tempConfig.viewMode === 'calendar' ? 'bg-yellow-600/20 border-yellow-500 text-yellow-500' : 'bg-black border-zinc-800 text-zinc-400'}`}
                                        >
                                            <Grid size={16} /> Calendário
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setConfigWidgetId(null)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                            <button onClick={saveWidgetConfig} className="px-4 py-2 bg-yellow-600 text-white rounded">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modais Auxiliares */}
            {whatsAppClient && <WhatsAppModal isOpen={whatsAppModalOpen} onClose={() => { setWhatsAppModalOpen(false); setWhatsAppClient(null); }} clientName={whatsAppClient.name} phone={whatsAppClient.phone} caseTitle={whatsAppClient.title} />}
        </div>
    );
};

export default Dashboard;
