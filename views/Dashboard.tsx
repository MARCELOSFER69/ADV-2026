import React, { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';
import {
    ArrowDownRight, Users, Plus, TrendingUp, Activity, CheckCircle2,
    Maximize2, Minimize2, Save, RotateCcw, Download, Upload,
    ChevronLeft, ChevronRight, Settings, X, ArrowUpRight,
    PieChart as PieChartIcon, BarChart, List, Grid, CheckSquare,
    AlertTriangle, Cake, MessageCircle, Calendar, Trash2,
    Filter, DollarSign, StickyNote, UserPlus, Square, Shield,
    Radar as RadarIcon, History, FileText, Trophy, AlertOctagon,
    Wallet, Bell, Check, Building2, Briefcase, Scale, PlusCircle,
    Search, Eye, RefreshCcw, MoreVertical, Clock, MapPin, Phone, Mail,
    MessageSquare, Gavel, BookOpen, AlertCircle, Info, Menu,
    LayoutDashboard, LogOut, ChevronDown, DownloadIcon, Share2, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, BarChart as ReBarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie,
    Cell, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis
} from 'recharts';
import { CaseStatus, FinancialType, DashboardWidget, WidgetType, WidgetPeriod, CaseHistory, Branch, CaseType, Category, TransactionType, PENDING_OPTIONS_LIST } from '../types';
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
import AgendaWidget from '../components/dashboard/AgendaWidget';
import BirthdayList from '../components/dashboard/BirthdayList';
import { useDashboardData } from '../hooks/useDashboardData';
import CaptadoresDetailedWidget from '../components/dashboard/CaptadoresDetailedWidget';
import PendenciasOverviewWidget from '../components/dashboard/PendenciasOverviewWidget';
import DashboardCalendarWidget from '../components/dashboard/DashboardCalendarWidget';
import { CashFlowWidget, RadarFinancialWidget, FunnelChartWidget, TypeDistributionWidget } from '../components/dashboard/DashboardWidgets';

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

const Dashboard: React.FC = () => {
    const { clients, cases, financial, events, tasks, toggleTask, user, setCurrentView, setCaseToView, setClientToView, setIsNewCaseModalOpen, setIsNewClientModalOpen, saveUserPreferences, showToast, reminders, addReminder, toggleReminder, deleteReminder } = useApp();

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

    const {
        calculateKPI,
        getChartData,
        topCaptadores,
        stagnantCasesCount,
        cashFlowData,
        funnelData,
        radarData,
        insuranceDueData,
        overdueOrImpendingDeadlines,
        pendingTasks,
        upcomingEvents,
        birthdaysThisMonth,
        receivablesData,
        typeDistributionData
    } = useDashboardData({ clients, cases, financial, events, tasks, reminders });

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
                        outline={true}
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
                        outline={true}
                    />
                );
            }

            case 'list-captadores-detailed':
                return (
                    <CaptadoresDetailedWidget
                        clients={clients}
                        cases={cases}
                        capWidgetFilial={capWidgetFilial}
                        setCapWidgetFilial={setCapWidgetFilial}
                        selectedCaptadorForDetail={selectedCaptadorForDetail}
                        setSelectedCaptadorForDetail={setSelectedCaptadorForDetail}
                        customTitle={customTitle}
                    />
                );

            case 'list-pendencias-overview':
                return (
                    <PendenciasOverviewWidget
                        clients={clients}
                        penWidgetFilial={penWidgetFilial}
                        setPenWidgetFilial={setPenWidgetFilial}
                        selectedPendenciaType={selectedPendenciaType}
                        setSelectedPendenciaType={setSelectedPendenciaType}
                        pendingOptionsList={PENDING_OPTIONS_LIST}
                        setClientToView={setClientToView}
                        setCurrentView={setCurrentView}
                        customTitle={customTitle}
                    />
                );

            case 'calendar-reminders':
                return (
                    <DashboardCalendarWidget
                        reminders={reminders}
                        reminderDate={reminderDate}
                        setReminderDate={setReminderDate}
                        newReminderTitle={newReminderTitle}
                        setNewReminderTitle={setNewReminderTitle}
                        handleAddReminder={handleAddReminder}
                        toggleReminder={toggleReminder}
                        deleteReminder={deleteReminder}
                    />
                );

            case 'chart-cash-flow':
                return (
                    <CashFlowWidget
                        data={cashFlowData}
                        onClick={() => handleWidgetClick(widget.type)}
                        customTitle={customTitle}
                    />
                );

            case 'radar-financial':
                return (
                    <RadarFinancialWidget
                        data={radarData}
                        onClick={() => handleWidgetClick(widget.type)}
                        customTitle={customTitle}
                    />
                );

            case 'chart-funnel':
                return (
                    <FunnelChartWidget
                        data={funnelData}
                        onClick={() => handleWidgetClick(widget.type)}
                        customTitle={customTitle}
                    />
                );

            case 'chart-types':
                return (
                    <TypeDistributionWidget
                        data={typeDistributionData}
                        totalCases={cases.length}
                        onClick={() => handleWidgetClick(widget.type)}
                        customTitle={customTitle}
                    />
                );

            case 'chart-origin':
                const originData = [{ name: 'Indicação', value: 45 }, { name: 'Instagram', value: 30 }, { name: 'Google', value: 25 }];
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
                        outline={true}
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

            case 'text-welcome':
                return <WelcomeSection userName={user?.name} />;

            case 'list-shortcuts':
                return (
                    <DashboardShortcuts
                        onNewCase={() => { setCurrentView('cases'); setIsNewCaseModalOpen(true); }}
                        onFinancial={() => setCurrentView('financial')}
                        onNewClient={() => { setCurrentView('clients'); setIsNewClientModalOpen(true); }}
                        onCommissions={() => setCurrentView('commissions')}
                    />
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
                        outline={['kpi-income', 'kpi-expense'].includes(widget.type)}
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
        <div className="h-full overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-6 pb-20">
                {/* EDIT TOOLBAR */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-8">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditMode(!isEditMode)} className={`group flex items-center p-2 rounded-full transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isEditMode ? 'bg-yellow-600 text-white w-64' : 'bg-zinc-800 text-zinc-400 hover:text-white w-10 hover:w-64'}`}>
                            <div className="shrink-0">{isEditMode ? <Save size={20} /> : <Settings size={20} />}</div>
                            <span className="ml-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">{isEditMode ? 'Salvar Layout' : 'Personalizar Dashboard'}</span>
                        </button>
                        {isEditMode && (<>
                            <button onClick={() => { if (confirm('Restaurar layout padrão? Isso removerá itens antigos.')) setWidgets(DEFAULT_LAYOUT); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white flex items-center gap-2 text-xs font-bold px-3" title="Limpar Layout"><RotateCcw size={16} /> Restaurar Padrão</button>
                        </>)}
                    </div>
                    {/* Rest of toolbar */}
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
                        <motion.div
                            key={widget.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                            className={`relative rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col
                                ${isEditMode ? 'border-2 border-dashed border-gold-500/50 cursor-move bg-[#131418]/60' :
                                    (widget.type.startsWith('kpi-') ? 'bg-[#131418] border border-white/5 hover:border-gold-500/30' : 'bg-[#131418] border border-white/5 hover:border-white/10')}
                            `}
                            style={{ gridColumn: `span ${widget.width}` }}
                        >
                            {isEditMode && (
                                <div className="absolute top-0 left-0 w-full h-full bg-black/60 z-20 flex items-center justify-center gap-2 backdrop-blur-sm">
                                    <button onClick={() => { const n = [...widgets]; if (index > 0) { [n[index], n[index - 1]] = [n[index - 1], n[index]]; setWidgets(n); } }} className="p-2 bg-[#18181b] rounded-xl text-white hover:bg-zinc-700 border border-white/10" title="Mover Esq"><ChevronLeft size={20} /></button>
                                    <button onClick={() => { const n = widgets.map(w => w.id === widget.id ? { ...w, width: (w.width === 4 ? 1 : w.width + 1) as any } : w); setWidgets(n); }} className="p-2 bg-[#18181b] border border-gold-500/50 rounded-xl text-gold-500 hover:bg-gold-500 hover:text-black transition-colors shadow-lg shadow-gold-500/20" title="Redimensionar"><Maximize2 size={20} /></button>
                                    <button onClick={() => openWidgetConfig(widget)} className="p-2 bg-[#18181b] rounded-xl text-gold-500 hover:bg-zinc-700 border border-white/10" title="Configurar"><Settings size={20} /></button>
                                    <button onClick={() => removeWidget(widget.id)} className="p-2 bg-red-900/20 rounded-xl text-red-400 hover:bg-red-900/40 border border-red-500/20" title="Excluir"><Trash2 size={20} /></button>
                                    <button onClick={() => { const n = [...widgets]; if (index < n.length - 1) { [n[index], n[index + 1]] = [n[index + 1], n[index]]; setWidgets(n); } }} className="p-2 bg-[#18181b] rounded-xl text-white hover:bg-zinc-700 border border-white/10" title="Mover Dir"><ChevronRight size={20} /></button>
                                </div>
                            )}
                            <div className="flex-1 p-5 overflow-hidden">
                                {renderWidgetContent(widget)}
                            </div>
                        </motion.div>
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
        </div>
    );
};

export default Dashboard;
