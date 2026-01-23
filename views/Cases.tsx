import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCasesData } from '../services/casesService';
import { useApp } from '../context/AppContext';
import { CaseStatus, Case, CaseType, ColumnConfig } from '../types';
import {
    Plus, Eye, Filter, X, Gavel, DollarSign, User, FileText, Trash2,
    Archive, Inbox, Search, LayoutList, LayoutGrid, Settings, ChevronDown,
    ChevronUp, ArrowUpDown, Clock, Shield, RefreshCw, AlertTriangle,
    ChevronLeft, ChevronRight, Loader2, FolderOpen
} from 'lucide-react';
import CaseDetailsModal from '../components/modals/CaseDetailsModal';
import NewCaseModal from '../components/modals/NewCaseModal';
import { formatCurrencyInput, formatProcessNumber, parseCurrencyToNumber } from '../services/formatters';
import { formatDateDisplay } from '../utils/dateUtils';
import CaseKanbanCard from '../components/CaseKanbanCard';
import SizeScaler from '../components/ui/SizeScaler';

const DEFAULT_COLUMNS: ColumnConfig[] = [
    // Mudei o label de Título para Prazos/Alertas, já que o texto do título será removido
    { id: 'titulo', label: 'Prazos/Alertas', visible: true, order: 0 },
    { id: 'numero', label: 'Número', visible: true, order: 1 },
    { id: 'cliente', label: 'Cliente', visible: true, order: 2 },
    { id: 'status', label: 'Status', visible: true, order: 3 },
    { id: 'tipo', label: 'Tipo de Ação', visible: true, order: 4 },
    { id: 'tribunal', label: 'Tribunal', visible: false, order: 5 },
    { id: 'valor', label: 'Valor da Causa', visible: true, order: 6 },
    { id: 'data_abertura', label: 'Data Abertura', visible: false, order: 7 },
    { id: 'pagamento', label: 'Pagamento', visible: true, order: 8 },
];

const Cases: React.FC = () => {
    const {
        cases,
        clients, financial, updateCase, deleteCase, deleteFinancialRecord,
        showToast, user, saveUserPreferences, saveGlobalPreferences, isNewCaseModalOpen, setIsNewCaseModalOpen,
        caseToView, setCaseToView, currentView, setCurrentView, mergedPreferences, setClientToView
    } = useApp();

    const queryClient = useQueryClient();

    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    // View State
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [layoutMode, setLayoutMode] = useState<'kanban' | 'list'>('kanban');

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [quickFilter, setQuickFilter] = useState<'all' | 'mine' | 'deadlines' | 'stale'>('all');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filters, setFilters] = useState({
        tipo: 'all',
        status: 'all', // Added missing status
        dateStart: '',
        dateEnd: '',
        minVal: '',
        maxVal: ''
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // Modals State
    const [caseToArchive, setCaseToArchive] = useState<Case | null>(null);
    const [archiveReason, setArchiveReason] = useState('');
    const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
    const [deleteOption, setDeleteOption] = useState<'keep' | 'delete'>('keep');

    const [caseToRestore, setCaseToRestore] = useState<Case | null>(null);
    const [restoreReason, setRestoreReason] = useState('');

    const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    const [kanbanColumnWidth, setKanbanColumnWidth] = useState(320);
    const [kanbanCardScale, setKanbanCardScale] = useState(1);
    const [isResizing, setIsResizing] = useState(false);

    // --- SCROLLING & DRAGGING REFS ---
    const kanbanContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // --- WHEEL HORIZONTAL SCROLL ---
    useEffect(() => {
        const container = kanbanContainerRef.current;
        if (!container) return;

        const handleNativeWheel = (e: WheelEvent) => {
            if (layoutMode !== 'kanban') return;

            // Se o scroll estiver acontecendo DENTRO de uma coluna que tem scroll, não interfere
            const isInsideColumn = (e.target as HTMLElement).closest('.kanban-column-scroll');
            if (isInsideColumn) {
                const column = isInsideColumn as HTMLElement;
                // Se a coluna puder rolar verticalmente, deixa o scroll vertical padrão
                if (column.scrollHeight > column.clientHeight) {
                    return;
                }
            }

            // Se for fora das colunas ou a coluna não tiver scroll, scroll horizontal
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault(); // Impede a página geral de descer
                container.scrollLeft += e.deltaY;
            }
        };

        container.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleNativeWheel);
    }, [layoutMode]);

    // --- DRAG TO SCROLL HANDLERS ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (layoutMode !== 'kanban') return;
        // Só arrasta se clicar no fundo (não em um card ou botão)
        if ((e.target as HTMLElement).closest('.kanban-card')) return;

        setIsDragging(true);
        setStartX(e.pageX - (kanbanContainerRef.current?.offsetLeft || 0));
        setScrollLeft(kanbanContainerRef.current?.scrollLeft || 0);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !kanbanContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - (kanbanContainerRef.current.offsetLeft || 0);
        const walk = (x - startX) * 2; // Velocidade do arraste
        kanbanContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    // Debounce Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            if (layoutMode === 'list') setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, layoutMode]);

    // Determine Active Category based on ViewState
    const activeCategory = useMemo(() => {
        if (currentView === 'cases-judicial') return 'Judicial';
        if (currentView === 'cases-administrative') return 'Administrativo';
        if (currentView === 'cases-insurance') return 'Seguro Defeso';
        return 'Todos';
    }, [currentView]);

    // Determine Title and Description
    const pageHeader = useMemo(() => {
        switch (activeCategory) {
            case 'Judicial': return { title: 'Processos Judiciais', desc: 'Ações Cíveis, Trabalhistas e Federais.', icon: Gavel };
            case 'Administrativo': return { title: 'Processos Administrativos', desc: 'Requerimentos INSS e Benefícios.', icon: FileText };
            case 'Seguro Defeso': return { title: 'Seguro Defeso', desc: 'Gestão de benefícios de pescadores.', icon: Shield };
            default: return { title: 'Todos os Processos', desc: 'Visão geral de todos os casos do escritório.', icon: Inbox };
        }
    }, [activeCategory]);

    // --- SEARCH SHORTCUT ---
    const searchInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ALT + P to Search
            if (e.altKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                e.stopPropagation();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, []);

    // REACT QUERY
    const { data: qData, isLoading: isFetching } = useQuery({
        queryKey: ['cases', currentPage, debouncedSearch, filters, viewMode, activeCategory, quickFilter, layoutMode],
        queryFn: () => fetchCasesData(currentPage, ITEMS_PER_PAGE, debouncedSearch, {
            ...filters,
            status: filters.status === 'all' ? (viewMode === 'archived' ? 'Arquivado' : 'all') : filters.status,
            viewMode: viewMode,
            quickFilter: quickFilter,
            category: activeCategory
        }),
    });

    const paginatedCases = qData?.data || [];
    const totalCases = qData?.count || 0;

    const getClientName = (id: string, caseItem?: Case) => {
        if ((caseItem as any)?.clients?.nome_completo) return (caseItem as any).clients.nome_completo;
        return clients.find(c => c.id === id)?.nome_completo || 'Cliente Desconhecido';
    };

    // --- KANBAN FILTER LOGIC (CLIENT SIDE) ---
    const filteredCasesKanban = useMemo(() => {
        if (layoutMode === 'list') return [];

        let result = cases.filter(c => {
            // 1. Status Logic
            const isArchived = c.status === CaseStatus.ARQUIVADO;
            if (viewMode === 'active' && isArchived) return false;
            if (viewMode === 'archived' && !isArchived) return false;

            // 2. Category Logic
            const isSeguro = c.tipo === (CaseType.SEGURO_DEFESO as string);
            const isJudicialType = [CaseType.TRABALHISTA, CaseType.CIVIL].includes(c.tipo);

            if (activeCategory === 'Seguro Defeso') {
                if (!isSeguro) return false;
            }
            else if (activeCategory === 'Judicial') {
                const isJudicialized = c.tribunal && c.tribunal.toUpperCase() !== 'INSS' && c.tribunal.trim() !== '';
                if (isSeguro) return false;
                if (!isJudicialType && !isJudicialized) return false;
            }
            else if (activeCategory === 'Administrativo') {
                const isJudicialized = c.tribunal && c.tribunal.toUpperCase() !== 'INSS' && c.tribunal.trim() !== '';
                if (isJudicialType) return false;
                if (isSeguro) return false;
                if (isJudicialized) return false;
            }

            // 3. Search Logic
            const searchMatch = c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.numero_processo.includes(searchTerm) ||
                getClientName(c.client_id, c).toLowerCase().includes(searchTerm.toLowerCase());
            if (!searchMatch) return false;

            // 4. Advanced Filters
            if (filters.tipo !== 'all' && c.tipo !== filters.tipo) return false;
            if (filters.dateStart && new Date(c.data_abertura) < new Date(filters.dateStart)) return false;
            if (filters.dateEnd && new Date(c.data_abertura) > new Date(filters.dateEnd)) return false;
            if (filters.minVal && c.valor_causa < parseFloat(filters.minVal)) return false;
            if (filters.maxVal && c.valor_causa > parseFloat(filters.maxVal)) return false;

            return true;
        });

        // Quick Filters
        if (quickFilter === 'mine') {
            result = result.filter(c => {
                const client = clients.find(cl => cl.id === c.client_id);
                return client?.captador === user?.name || true;
            });
        } else if (quickFilter === 'deadlines') {
            result = result.filter(c => c.data_fatal).sort((a, b) => new Date(a.data_fatal!).getTime() - new Date(b.data_fatal!).getTime());
        } else if (quickFilter === 'stale') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            result = result.filter(c => new Date(c.data_abertura) < thirtyDaysAgo);
        }

        return result;
    }, [cases, viewMode, searchTerm, filters, quickFilter, clients, user, activeCategory, layoutMode]);

    // Dynamic Kanban Columns
    const activeKanbanColumns = useMemo(() => {
        if (viewMode === 'archived') return [CaseStatus.ARQUIVADO];

        if (activeCategory === 'Seguro Defeso') {
            return [
                CaseStatus.PROTOCOLAR,
                CaseStatus.ANALISE,
                CaseStatus.EXIGENCIA,
                CaseStatus.CONCLUIDO_CONCEDIDO,
                CaseStatus.CONCLUIDO_INDEFERIDO
            ];
        }

        if (activeCategory === 'Administrativo') {
            return [
                CaseStatus.PROTOCOLAR,
                CaseStatus.ANALISE,
                CaseStatus.EXIGENCIA,
                CaseStatus.CONCLUIDO_CONCEDIDO,
                CaseStatus.CONCLUIDO_INDEFERIDO
            ];
        }

        return [
            CaseStatus.PROTOCOLAR,
            CaseStatus.ANALISE,
            CaseStatus.AGUARDANDO_AUDIENCIA,
            CaseStatus.EM_RECURSO,
            CaseStatus.CONCLUIDO_CONCEDIDO,
            CaseStatus.CONCLUIDO_INDEFERIDO
        ];
    }, [activeCategory, viewMode]);

    const getForcedType = () => {
        if (activeCategory === 'Seguro Defeso') return CaseType.SEGURO_DEFESO;
        if (activeCategory === 'Judicial') return 'Judicial';
        if (activeCategory === 'Administrativo') return 'Administrativo';
        return undefined;
    };

    // Effects & Helpers
    useEffect(() => {
        if (user?.preferences?.casesViewMode) {
            setLayoutMode(user.preferences.casesViewMode);
        }
        if (user?.preferences?.casesColumns) {
            const merged = [...user.preferences.casesColumns];
            DEFAULT_COLUMNS.forEach(defCol => {
                if (!merged.find(c => c.id === defCol.id)) {
                    merged.push(defCol);
                }
            });
            setColumns(merged.sort((a, b) => a.order - b.order));
        }

        if (user?.preferences?.kanbanColumnWidth) {
            setKanbanColumnWidth(user.preferences.kanbanColumnWidth);
        }
        if (user?.preferences?.kanbanCardScale) {
            setKanbanCardScale(user.preferences.kanbanCardScale);
        }
    }, [user]);

    useEffect(() => {
        if (caseToView) {
            const c = cases.find(c => c.id === caseToView);
            if (c) {
                setSelectedCase(c);
                if (c.status === CaseStatus.ARQUIVADO && viewMode === 'active') {
                    setViewMode('archived');
                } else if (c.status !== CaseStatus.ARQUIVADO && viewMode === 'archived') {
                    setViewMode('active');
                }
            }
            setCaseToView(null);
        }
    }, [caseToView, cases, setCaseToView]);

    const saveLayoutMode = (mode: 'kanban' | 'list') => {
        setLayoutMode(mode);
        saveUserPreferences({ casesViewMode: mode });
    };

    const saveColumns = (newCols: ColumnConfig[]) => {
        setColumns(newCols);
        saveUserPreferences({ casesColumns: newCols });
    };

    const handleColumnResizeDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        const startX = e.pageX;
        const startWidth = kanbanColumnWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.pageX;
            const newWidth = Math.max(250, Math.min(600, startWidth + (currentX - startX)));
            setKanbanColumnWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            saveUserPreferences({ kanbanColumnWidth: kanbanColumnWidth });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const updateCardScale = (scale: number) => {
        setKanbanCardScale(scale);
    };

    const persistCardScale = (scale: number) => {
        saveUserPreferences({ kanbanCardScale: scale });
    };

    const handleResetColumns = () => {
        setColumns(DEFAULT_COLUMNS);
        saveUserPreferences({ casesColumns: DEFAULT_COLUMNS });
        showToast('success', 'Colunas restauradas para o padrão.');
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        const newCols = [...columns];
        if (direction === 'up' && index > 0) {
            [newCols[index], newCols[index - 1]] = [newCols[index - 1], newCols[index]];
        } else if (direction === 'down' && index < newCols.length - 1) {
            [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
        }
        const reordered = newCols.map((col, idx) => ({ ...col, order: idx }));
        saveColumns(reordered);
    };

    const toggleColumn = (id: string) => {
        const newCols = columns.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
        saveColumns(newCols);
    };



    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getCaseTypeColor = (type: CaseType) => {
        switch (type) {
            case CaseType.SEGURO_DEFESO: return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
            case CaseType.SALARIO_MATERNIDADE: return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
            case CaseType.APOSENTADORIA: return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
            case CaseType.BPC_LOAS: return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case CaseType.AUXILIO_DOENCA: return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
        }
    };

    const getStatusHeaderColor = (status: CaseStatus) => {
        switch (status) {
            case CaseStatus.PROTOCOLAR: return 'bg-cyan-600 shadow-[0_0_8px_rgba(8,145,178,0.5)]';
            case CaseStatus.ANALISE: return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
            case CaseStatus.EXIGENCIA: return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]';
            case CaseStatus.AGUARDANDO_AUDIENCIA: return 'bg-purple-500';
            case CaseStatus.EM_RECURSO: return 'bg-yellow-600';
            case CaseStatus.CONCLUIDO_CONCEDIDO: return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
            case CaseStatus.CONCLUIDO_INDEFERIDO: return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
            case CaseStatus.ARQUIVADO: return 'bg-zinc-500';
            default: return 'bg-zinc-500';
        }
    };

    const getDeadlineStatus = (dateFatal?: string) => {
        if (!dateFatal) return null;
        try {
            const fatalDate = new Date(dateFatal);
            if (isNaN(fatalDate.getTime())) return null;

            const days = Math.ceil((fatalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

            if (isNaN(days)) return null;

            if (days < 0) return { color: 'text-red-500', label: `${Math.abs(days)}d atrasado`, days };
            if (days === 0) return { color: 'text-red-500 animate-pulse', label: 'Vence Hoje', days };
            if (days <= 3) return { color: 'text-red-400', label: `${days}d restante`, days };
            if (days <= 7) return { color: 'text-yellow-500', label: `${days}d restante`, days };
            return { color: 'text-emerald-500', label: fatalDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), days };
        } catch (e) {
            return null;
        }
    };

    const confirmArchiveCase = async () => {
        if (caseToArchive && archiveReason.trim()) {
            const updatedCase = { ...caseToArchive, status: CaseStatus.ARQUIVADO, motivo_arquivamento: archiveReason };
            await updateCase(updatedCase);
            setCaseToArchive(null); setArchiveReason('');
            showToast('success', 'Processo movido para o Arquivo Morto.');
            queryClient.invalidateQueries({ queryKey: ['cases'] });
        } else { showToast('error', 'Por favor, informe o motivo do arquivamento.'); }
    };

    const handleRestoreClick = (caseItem: Case) => {
        setCaseToRestore(caseItem);
        setRestoreReason('');
    };

    const confirmRestoreCase = async () => {
        if (!caseToRestore) return;
        if (!restoreReason.trim()) {
            showToast('error', 'Por favor, informe o motivo da restauração.');
            return;
        }

        const updatedCase = { ...caseToRestore, status: CaseStatus.ANALISE, motivo_arquivamento: undefined };
        await updateCase(updatedCase, `Motivo da Restauração: ${restoreReason}`);

        setCaseToRestore(null);
        setRestoreReason('');
        showToast('success', 'Processo desarquivado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['cases'] });
    };

    const confirmDeleteCase = async () => {
        if (!caseToDelete) return;

        const hasFinancial = financial.some(f => f.case_id === caseToDelete.id);

        if (hasFinancial && deleteOption === 'delete') {
            const recordsToDelete = financial.filter(f => f.case_id === caseToDelete.id);
            for (const record of recordsToDelete) {
                await deleteFinancialRecord(record.id);
            }
            showToast('success', 'Histórico financeiro removido.');
        }

        await deleteCase(caseToDelete.id);
        setCaseToDelete(null);
        queryClient.invalidateQueries({ queryKey: ['cases'] });
    };

    const totalPages = Math.ceil(totalCases / ITEMS_PER_PAGE);

    return (
        <div className="h-full flex flex-col">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
                            {viewMode === 'active' ? (
                                <><pageHeader.icon className="text-gold-500" /> {pageHeader.title}</>
                            ) : <><Archive className="text-zinc-400" /> Arquivo Morto ({activeCategory})</>}
                        </h2>
                        <p className="text-zinc-500 text-sm mt-1">
                            {viewMode === 'active' ? pageHeader.desc : 'Histórico de processos encerrados desta categoria.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="bg-[#0f1014] border border-zinc-800 rounded-lg p-1 flex">
                            <button onClick={() => setViewMode('active')} className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${viewMode === 'active' ? 'bg-gold-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Ativos</button>
                            <button onClick={() => setViewMode('archived')} className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 ${viewMode === 'archived' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}><Archive size={14} /> Arquivo</button>
                        </div>

                        {viewMode === 'active' && (
                            <button
                                onClick={() => setIsNewCaseModalOpen(true)}
                                className="bg-gold-600 hover:bg-gold-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap font-medium text-sm"
                            >
                                <Plus size={16} /> Novo Processo
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-[#0f1014] border border-zinc-800 rounded-xl p-3 flex flex-col gap-3 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input
                                ref={searchInputRef}
                                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-10 pr-10 py-2 text-sm text-white outline-none focus:border-gold-500"
                                placeholder="Buscar por número ou cliente... (Alt + P)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                    title="Limpar busca"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all ${showAdvancedFilters ? 'bg-zinc-900 border-gold-500 text-gold-500' : 'bg-[#09090b] border-zinc-800 text-zinc-400 hover:text-white'}`}
                            >
                                <Filter size={16} /> Filtros
                            </button>

                            {viewMode === 'active' && (
                                <div className="bg-[#09090b] border border-zinc-800 rounded-lg flex p-0.5 items-center">
                                    <button onClick={() => saveLayoutMode('kanban')} className={`p-1.5 rounded transition-colors ${layoutMode === 'kanban' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`} title="Visualização em Quadro"><LayoutGrid size={18} /></button>
                                    <button onClick={() => saveLayoutMode('list')} className={`p-1.5 rounded transition-colors ${layoutMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`} title="Visualização em Lista"><LayoutList size={18} /></button>
                                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                                    {layoutMode === 'kanban' ? (
                                        <SizeScaler
                                            value={mergedPreferences.kanbanCardScale || 1}
                                            onChange={(val) => saveUserPreferences({ kanbanCardScale: val })}
                                            min={0.5} max={1.5} step={0.05}
                                        />
                                    ) : (
                                        <SizeScaler
                                            value={mergedPreferences.casesFontSize || 14}
                                            onChange={(val) => saveUserPreferences({ casesFontSize: val })}
                                            min={10} max={20} step={1}
                                        />
                                    )}
                                </div>
                            )}

                            {layoutMode === 'list' && (
                                <div className="relative">
                                    <button onClick={() => setShowColumnConfig(!showColumnConfig)} className="px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all bg-[#09090b] border-zinc-800 text-zinc-400 hover:text-white"><Settings size={16} /> Colunas</button>
                                    {showColumnConfig && (
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-[#0f1014] border border-zinc-800 rounded-xl shadow-2xl z-50 p-4">
                                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-800">
                                                <h4 className="text-sm font-bold text-white">Editar Colunas</h4>
                                                <button onClick={() => setShowColumnConfig(false)}><X size={16} className="text-zinc-500 hover:text-white" /></button>
                                            </div>
                                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                {columns.map((col, idx) => (
                                                    <div key={col.id} className="flex items-center justify-between group p-1 hover:bg-zinc-800/50 rounded">
                                                        <div className="flex items-center gap-2">
                                                            <input type="checkbox" checked={col.visible} onChange={() => toggleColumn(col.id)} className="rounded bg-black border-zinc-600 text-gold-500 cursor-pointer" />
                                                            <span className="text-sm text-zinc-300">{col.label}</span>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                                            <button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} className="p-1 hover:text-white text-zinc-500 disabled:opacity-30"><ChevronUp size={14} /></button>
                                                            <button onClick={() => moveColumn(idx, 'down')} disabled={idx === columns.length - 1} className="p-1 hover:text-white text-zinc-500 disabled:opacity-30"><ChevronDown size={14} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={handleResetColumns} className="w-full mt-3 text-xs text-red-400 border border-red-500/20 rounded py-1 hover:bg-red-500/10">Restaurar Padrão</button>

                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Filters Pills */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                        <button onClick={() => setQuickFilter('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${quickFilter === 'all' ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>Todos</button>
                        <button onClick={() => setQuickFilter('mine')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${quickFilter === 'mine' ? 'bg-gold-500/20 text-gold-500 border border-gold-500/30' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}><User size={10} /> Meus Casos</button>
                        <button onClick={() => setQuickFilter('deadlines')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${quickFilter === 'deadlines' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}><AlertTriangle size={10} /> Prazos Próximos</button>
                        <button onClick={() => setQuickFilter('stale')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${quickFilter === 'stale' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}><Clock size={10} /> Parados +30d</button>
                    </div>

                    {showAdvancedFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-zinc-800 animate-in slide-in-from-top-2">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tipo de Ação</label>
                                <select className="w-full bg-[#09090b] border border-zinc-800 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-gold-500" value={filters.tipo} onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}><option value="all">Todos</option>{Object.values(CaseType).map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <div className="flex items-end"><button onClick={() => setFilters({ tipo: 'all', status: 'all', dateStart: '', dateEnd: '', minVal: '', maxVal: '' })} className="text-xs text-zinc-400 hover:text-white underline pb-2">Limpar Filtros</button></div>
                        </div>
                    )}
                </div>
            </div>

            {viewMode === 'active' && layoutMode === 'kanban' ? (
                <div
                    ref={kanbanContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={`flex-1 overflow-x-auto pb-4 custom-scrollbar select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{ '--kanban-card-scale': mergedPreferences.kanbanCardScale || 1 } as any}
                >
                    <div className="flex gap-6 min-w-max h-full px-2">
                        {activeKanbanColumns.map((status) => {
                            const columnCases = filteredCasesKanban.filter(c => c.status === status);
                            const totalColumnValue = columnCases.reduce((acc, curr) => acc + curr.valor_causa, 0);

                            return (
                                <div
                                    key={status}
                                    className="flex-shrink-0 flex flex-col h-full relative group/col"
                                    style={{ width: `${kanbanColumnWidth}px` }}
                                >
                                    {/* PREMIUM HEADER */}
                                    <div className="mb-4 px-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-bold text-zinc-300 flex items-center gap-2 text-sm">
                                                <span className={`w-2.5 h-2.5 rounded-full ${getStatusHeaderColor(status)}`} />
                                                {status}
                                            </h3>
                                            <span className="text-xs font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full shadow-inner">{columnCases.length}</span>
                                        </div>
                                        <div className="pl-4">
                                            <p className={`text-xs font-medium ${totalColumnValue > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                                {totalColumnValue > 0 ? formatCurrency(totalColumnValue) : 'R$ 0,00'}
                                                {totalColumnValue > 0 && <span className="text-[9px] text-zinc-500 ml-1 font-normal uppercase tracking-wider">Potencial</span>}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Resize Handle */}
                                    <div
                                        onMouseDown={handleColumnResizeDown}
                                        className="absolute right-[-12px] top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-gold-500/50 transition-colors z-20 group-hover/col:bg-zinc-800/50 flex items-center justify-center"
                                        title="Arraste para redimensionar coluna"
                                    >
                                        <div className="w-[1px] h-10 bg-zinc-700 group-hover:bg-gold-500/50" />
                                    </div>

                                    <div
                                        className={`kanban-column-scroll bg-zinc-900/20 p-2 rounded-xl flex-1 border border-dashed border-zinc-800 overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar`}
                                        style={{ zoom: kanbanCardScale }}
                                    >
                                        <div className="space-y-3">
                                            {columnCases.map(caseItem => {
                                                const client = clients.find(c => c.id === caseItem.client_id);
                                                return (
                                                    <CaseKanbanCard
                                                        key={caseItem.id}
                                                        caseItem={caseItem}
                                                        client={client}
                                                        onClick={setSelectedCase}
                                                        onArchiveClick={setCaseToArchive}
                                                    />
                                                );
                                            })}
                                            {columnCases.length === 0 && <div className="text-center py-12 text-zinc-600 text-xs italic opacity-50">Sem processos</div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-[#0f1014] rounded-xl border border-white/5 flex-1 overflow-hidden flex flex-col shadow-2xl relative z-0 backdrop-blur-md">
                    {isFetching && (
                        <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center">
                            <Loader2 className="animate-spin text-gold-500" size={40} />
                        </div>
                    )}
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse" style={{ fontSize: `${mergedPreferences.casesFontSize || 14}px` }}>
                            <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-sm border-b border-white/5">
                                <tr>
                                    {columns.filter(c => c.visible).map(col => (
                                        <th key={col.id} className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider select-none">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-300" onClick={() => { }}>{col.label}<ArrowUpDown size={12} /></div>
                                        </th>
                                    ))}
                                    <th className="py-4 px-6 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedCases
                                    .filter(caseItem => viewMode === 'archived'
                                        ? caseItem.status === CaseStatus.ARQUIVADO
                                        : caseItem.status !== CaseStatus.ARQUIVADO)
                                    .map(caseItem => {
                                        const deadline = getDeadlineStatus(caseItem.data_fatal);
                                        const clientName = getClientName(caseItem.client_id, caseItem);

                                        return (
                                            <tr key={caseItem.id} className="group hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedCase(caseItem)}>
                                                {columns.filter(c => c.visible).map(col => (
                                                    <td key={`${caseItem.id}-${col.id}`} className="py-4 px-6 text-sm align-middle">
                                                        {col.id === 'titulo' && (
                                                            <div>
                                                                {/* TÍTULO REMOVIDO DA LISTA AQUI */}
                                                                {deadline && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold inline-block bg-zinc-900/50 border border-white/10 ${deadline.color}`}>{deadline.label}</span>}
                                                            </div>
                                                        )}
                                                        {col.id === 'numero' && <span className="text-zinc-500 font-mono text-xs">{caseItem.numero_processo}</span>}
                                                        {col.id === 'cliente' && (
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm bg-zinc-700 text-zinc-300`}>
                                                                    {clientName.substring(0, 1)}
                                                                </div>
                                                                <span className="text-zinc-300 group-hover:text-white transition-colors">{clientName}</span>
                                                            </div>
                                                        )}
                                                        {col.id === 'status' && <span className="text-[10px] font-medium px-2 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded">{caseItem.status}</span>}
                                                        {col.id === 'tipo' && <span className={`text-[10px] px-2 py-1 rounded border font-medium ${getCaseTypeColor(caseItem.tipo as CaseType)}`}>{caseItem.tipo}{caseItem.modalidade ? ` (${caseItem.modalidade})` : ''}</span>}
                                                        {col.id === 'tribunal' && <span className="text-zinc-500">{caseItem.tribunal}</span>}
                                                        {col.id === 'valor' && <span className="text-zinc-200 font-medium">{formatCurrency(caseItem.valor_causa)}</span>}
                                                        {col.id === 'data_abertura' && <span className="text-zinc-500 text-xs">{(() => {
                                                            try {
                                                                return caseItem.data_abertura ? new Date(caseItem.data_abertura).toLocaleDateString() : '-';
                                                            } catch (e) { return '-'; }
                                                        })()}</span>}
                                                        {col.id === 'pagamento' && <span className={`text-xs font-bold px-2 py-1 rounded border ${caseItem.status_pagamento === 'Pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{caseItem.status_pagamento}</span>}
                                                    </td>
                                                ))}
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {viewMode === 'archived' && <button onClick={(e) => { e.stopPropagation(); handleRestoreClick(caseItem); }} className="text-zinc-400 hover:text-emerald-400 p-1.5 rounded transition-colors" title="Restaurar"><RefreshCw size={16} /></button>}
                                                        <button onClick={(e) => { e.stopPropagation(); setSelectedCase(caseItem); }} className="text-zinc-400 hover:text-white p-1.5 rounded transition-colors" title="Ver"><Eye size={16} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); viewMode === 'active' ? setCaseToArchive(caseItem) : setCaseToDelete(caseItem); }} className="text-zinc-400 hover:text-red-400 p-1.5 rounded transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                            </tbody>
                        </table>
                    </div>

                    {/* BARRA DE PAGINAÇÃO (LISTA) */}
                    <div className="flex items-center justify-between p-4 border-t border-zinc-800 bg-[#0f1014] mt-auto">
                        <span className="text-sm text-zinc-500">
                            Página <span className="text-white font-bold">{currentPage}</span> de <span className="text-white font-bold">{Math.ceil(totalCases / ITEMS_PER_PAGE) || 1}</span>
                            <span className="mx-2 text-zinc-700">|</span>
                            Total: {totalCases}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1 || isFetching}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <ChevronLeft size={16} /> Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCases / ITEMS_PER_PAGE), p + 1))}
                                disabled={currentPage >= Math.ceil(totalCases / ITEMS_PER_PAGE) || isFetching}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                Próximo <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {selectedCase && (
                <CaseDetailsModal
                    caseItem={selectedCase}
                    onClose={() => setSelectedCase(null)}
                    onSelectCase={setSelectedCase}
                    onViewClient={(clientId) => {
                        setClientToView(clientId);
                        setCurrentView('clients');
                        setSelectedCase(null);
                    }}
                />
            )}

            {/* Archive Modal */}
            {caseToArchive && (
                <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#0f1014] border border-zinc-800 p-6 rounded-xl max-w-sm w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-2 text-center">Arquivar Processo</h3>
                        <textarea className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-gold-500 resize-none h-24 mb-4" placeholder="Motivo..." value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} autoFocus />
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setCaseToArchive(null)} className="flex-1 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg">Cancelar</button>
                            <button onClick={confirmArchiveCase} className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg">Arquivar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Modal */}
            {caseToRestore && (
                <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#0f1014] border border-zinc-800 p-6 rounded-xl max-w-sm w-full shadow-2xl">
                        <div className="flex flex-col items-center mb-4">
                            <div className="p-3 bg-emerald-500/10 rounded-full mb-3 text-emerald-500 border border-emerald-500/20">
                                <RefreshCw size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white text-center">Restaurar Processo</h3>
                            <p className="text-xs text-zinc-500 text-center mt-1">{caseToRestore.titulo}</p>
                        </div>
                        <div className="mb-4"><label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Motivo da Restauração</label><textarea className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-emerald-500 resize-none h-24" placeholder="Ex: Cliente retornou..." value={restoreReason} onChange={(e) => setRestoreReason(e.target.value)} autoFocus /></div>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setCaseToRestore(null)} className="flex-1 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium">Cancelar</button>
                            <button onClick={confirmRestoreCase} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-emerald-600/20">Restaurar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {caseToDelete && (
                <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#0f1014] border border-zinc-800 p-6 rounded-xl max-w-sm w-full shadow-2xl text-center">
                        <h3 className="text-lg font-bold text-white mb-2">Excluir Definitivamente?</h3>
                        <p className="text-zinc-500 text-sm mb-4">Esta ação não pode ser desfeita.</p>

                        {financial.some(f => f.case_id === caseToDelete.id) && (
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4 text-left">
                                <p className="text-red-400 text-xs font-bold mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Atenção: Há lançamentos financeiros.</p>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer hover:text-white transition-colors">
                                        <input type="radio" name="delOpt" checked={deleteOption === 'keep'} onChange={() => setDeleteOption('keep')} className="accent-red-500" />
                                        Manter histórico financeiro (recomendado)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer hover:text-white transition-colors">
                                        <input type="radio" name="delOpt" checked={deleteOption === 'delete'} onChange={() => setDeleteOption('delete')} className="accent-red-500" />
                                        Apagar financeiro vinculado
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setCaseToDelete(null)} className="px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg">Cancelar</button>
                            <button onClick={confirmDeleteCase} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cases;
