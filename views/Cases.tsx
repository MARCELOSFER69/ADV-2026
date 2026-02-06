import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppContext as useApp } from '../context/AppContext';
import { CaseStatus, Case, CaseType, ColumnConfig, ProjectFilters, Branch } from '../types';
import {
    Plus, Gavel, FileText, Shield, Inbox, Archive, Trash2, X, Loader2, RefreshCw, AlertTriangle, LayoutGrid, LayoutList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BranchSelector from '../components/Layout/BranchSelector';
import { useCases, useKanbanCases, useCase } from '../hooks/useCases';
import CaseDetailsModal from '../components/modals/CaseDetailsModal';
import NewCaseModal from '../components/modals/NewCaseModal';
import CaseFilters from '../components/cases/CaseFilters';
import CaseKanbanBoard from '../components/cases/CaseKanbanBoard';
import CaseList from '../components/cases/CaseList';
import ExportCasesModal from '../components/modals/ExportCasesModal';
import { RetirementProjectionsView } from '../components/retirement/RetirementProjectionsView';

const DEFAULT_COLUMNS: ColumnConfig[] = [
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
        updateCase, deleteCase, deleteFinancialRecord,
        showToast, user, saveUserPreferences, isNewCaseModalOpen, setIsNewCaseModalOpen,
        caseToView, setCaseToView, currentView, mergedPreferences, setClientToView,
        financial, setCurrentView, caseTypeFilter, globalBranchFilter
    } = useApp();

    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    // View State
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [layoutMode, setLayoutMode] = useState<'kanban' | 'list'>('kanban');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [quickFilter, setQuickFilter] = useState<'all' | 'mine' | 'deadlines' | 'stale' | 'projections'>('all');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filters, setFilters] = useState({
        tipo: 'all',
        status: 'all',
        dateStart: '',
        dateEnd: '',
        minVal: '',
        maxVal: '',
        filial: 'all'
    });

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'data_abertura', direction: 'desc' });

    // Retirement Projection Filters
    const [projectionFilters, setProjectionFilters] = useState<ProjectFilters>({
        searchTerm: '',
        gender: 'Todos',
        modality: 'Todas',
        status: 'Todos',
        period: 60,
        branch: globalBranchFilter !== 'all' ? globalBranchFilter as Branch : 'Todas'
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = layoutMode === 'list' ? 50 : 100;

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

    // Bulk Selection
    const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
    const [isBulkArchiving, setIsBulkArchiving] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // --- CASE FETCHING (REACT QUERY) ---
    const activeCategory = useMemo(() => {
        if (currentView === 'cases-judicial') return 'Judicial';
        if (currentView === 'cases-administrative') return 'Administrativo';
        if (currentView === 'cases-insurance') return 'Seguro Defeso';
        return 'Todos';
    }, [currentView]);

    const queryFilters = useMemo(() => ({
        ...filters,
        search: debouncedSearch,
        viewMode,
        category: activeCategory as any,
        sortKey: sortConfig.key,
        sortDirection: sortConfig.direction,
        quickFilter,
        filial: filters.filial !== 'all' ? filters.filial : globalBranchFilter
    }), [filters, debouncedSearch, viewMode, activeCategory, sortConfig, quickFilter, globalBranchFilter]);

    // Sincroniza filtro global de filial
    useEffect(() => {
        setFilters(prev => ({ ...prev, filial: globalBranchFilter }));
        setProjectionFilters(prev => ({
            ...prev,
            branch: globalBranchFilter !== 'all' ? globalBranchFilter as Branch : 'Todas'
        }));
    }, [globalBranchFilter]);

    // Opcional: Sincroniza de volta se o usuário mudar no Filtros modal
    useEffect(() => {
        if (filters.filial !== 'all' && filters.filial !== globalBranchFilter) {
            // Se o usuário mudou explicitamente no modal, podemos querer atualizar o global?
            // Para consistência com Clientes.tsx, vamos manter o global como master.
        }
    }, [filters.filial, globalBranchFilter]);

    // Paginated list for table view
    const { data: paginatedCases, isLoading: isFetchingList, totalCount: totalCases, refetch: refetchList } = useCases(
        currentPage,
        ITEMS_PER_PAGE,
        queryFilters
    );

    const { data: kanbanData, isLoading: isFetchingKanban, refetch: refetchKanban } = useKanbanCases(
        debouncedSearch,
        queryFilters
    );

    // Sync sidebar filter to local filters and handle projections cleanup
    useEffect(() => {
        if (caseTypeFilter !== 'all') {
            setFilters(prev => ({ ...prev, tipo: caseTypeFilter }));

            // If switching TO a non-retirement type, disable projections mode
            if (caseTypeFilter !== 'Aposentadoria' && quickFilter === 'projections') {
                setQuickFilter('all');
            }
        }
    }, [caseTypeFilter, quickFilter]);

    // Cleanup projections if user changes type filter manually
    useEffect(() => {
        if (filters.tipo !== 'Aposentadoria' && quickFilter === 'projections') {
            setQuickFilter('all');
        }
    }, [filters.tipo, quickFilter]);

    const { data: caseToViewItem } = useCase(caseToView || undefined);

    useEffect(() => {
        if (caseToViewItem) {
            setSelectedCase(caseToViewItem);
        }
    }, [caseToViewItem]);

    const isFetching = layoutMode === 'list' ? isFetchingList : isFetchingKanban;
    const refetch = layoutMode === 'list' ? refetchList : refetchKanban;

    // const { data: clients = [] } = useAllClients(); // REMOVED: Heavy and unnecessary
    // Instead we rely on case.captador and case.client_name now available
    const clients: any[] = []; // Placeholder to satisfy types if any leftover usage exist (though we removed them)

    const displayedCases = useMemo(() => {
        let result = layoutMode === 'list' ? (paginatedCases || []) : (kanbanData || []);

        if (quickFilter === 'mine') {
            result = result.filter(c => c.captador === user?.name || true);
        }
        if (quickFilter === 'deadlines') {
            result = result.filter(c => c.data_fatal).sort((a, b) => new Date(a.data_fatal!).getTime() - new Date(b.data_fatal!).getTime());
        } else if (quickFilter === 'stale') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            result = result.filter(c => new Date(c.data_abertura) < thirtyDaysAgo);
        }

        return result;
    }, [paginatedCases, kanbanData, layoutMode, quickFilter, user]);

    // Handlers
    const handleToggleSelectCase = useCallback((id: string) => {
        setSelectedCaseIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, []);

    const handleBulkArchiveCases = useCallback(async () => {
        if (selectedCaseIds.length === 0) return;
        const reason = window.prompt(`Arquivar ${selectedCaseIds.length} processos?`, "Arquivamento em massa");
        if (!reason) return;
        setIsBulkArchiving(true);
        try {
            for (const id of selectedCaseIds) {
                const c = displayedCases.find(item => item.id === id);
                if (c) await updateCase({ ...c, status: CaseStatus.ARQUIVADO, motivo_arquivamento: reason });
            }
            showToast('success', `${selectedCaseIds.length} processos arquivados.`);
            setSelectedCaseIds([]);
            refetch();
        } catch (error) { showToast('error', 'Erro no arquivamento.'); }
        finally { setIsBulkArchiving(false); }
    }, [selectedCaseIds, displayedCases, updateCase, showToast, refetch]);

    const handleBulkDeleteCases = useCallback(async () => {
        if (selectedCaseIds.length === 0) return;
        const confirmText = "EXCLUIR";
        if (window.prompt(`Digite ${confirmText} para excluir ${selectedCaseIds.length} processos permanentemente.`) !== confirmText) return;
        const reason = window.prompt("Motivo:");
        if (!reason) return;
        setIsBulkDeleting(true);
        try {
            for (const id of selectedCaseIds) await deleteCase(id);
            showToast('success', `${selectedCaseIds.length} processos excluídos.`);
            setSelectedCaseIds([]);
            refetch();
        } catch (error) { showToast('error', 'Erro na exclusão.'); }
        finally { setIsBulkDeleting(false); }
    }, [selectedCaseIds, deleteCase, showToast, refetch]);

    const onCaseDrop = async (caseId: string, newStatus: CaseStatus) => {
        const draggedCase = displayedCases.find(c => c.id === caseId);
        if (draggedCase && draggedCase.status !== newStatus) {
            try {
                await updateCase({
                    ...draggedCase,
                    status: newStatus,
                    updated_at: new Date().toISOString()
                });
                showToast('success', `Status atualizado para: ${newStatus}`);
                refetch();
            } catch (error) {
                showToast('error', 'Erro ao atualizar status.');
            }
        }
    };

    // Determine Title and Description
    const pageHeader = useMemo(() => {
        const typeLabel = caseTypeFilter && caseTypeFilter !== 'all' ? ` - ${caseTypeFilter}` : '';

        // Special case for Seguro Defeso icon/desc even if in Administrativo
        if (caseTypeFilter === 'Seguro Defeso') {
            return { title: `Processos Administrativos - Seguro Defeso`, desc: 'Gestão de benefícios de pescadores.', icon: Shield };
        }

        switch (activeCategory) {
            case 'Judicial': return { title: `Processos Judiciais${typeLabel}`, desc: 'Ações Cíveis, Trabalhistas e Federais.', icon: Gavel };
            case 'Administrativo': return { title: `Processos Administrativos${typeLabel}`, desc: 'Requerimentos INSS e Benefícios.', icon: FileText };
            case 'Seguro Defeso': return { title: `Seguro Defeso${typeLabel}`, desc: 'Gestão de benefícios de pescadores.', icon: Shield };
            default: return { title: `Todos os Processos${typeLabel}`, desc: 'Visão geral de todos os casos do escritório.', icon: Inbox };
        }
    }, [activeCategory, caseTypeFilter]);

    const searchInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                e.stopPropagation();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    });
    useEffect(() => {
        if (caseTypeFilter) {
            setFilters(prev => ({ ...prev, tipo: caseTypeFilter }));
        }
    }, [caseTypeFilter]);

    // Effects for Preferences, Search, etc
    useEffect(() => {
        if (user?.preferences?.casesViewMode) setLayoutMode(user.preferences.casesViewMode);
        if (user?.preferences?.casesColumns) {
            const merged = [...user.preferences.casesColumns];
            DEFAULT_COLUMNS.forEach(defCol => {
                if (!merged.find(c => c.id === defCol.id)) merged.push(defCol);
            });
            setColumns(merged.sort((a, b) => a.order - b.order));
        }
        if (user?.preferences?.kanbanColumnWidth) setKanbanColumnWidth(user.preferences.kanbanColumnWidth);
        if (user?.preferences?.kanbanCardScale) setKanbanCardScale(user.preferences.kanbanCardScale);
    }, [user]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            if (layoutMode === 'list') setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, layoutMode]);

    const saveLayoutMode = (mode: 'kanban' | 'list') => {
        setLayoutMode(mode);
        saveUserPreferences({ casesViewMode: mode });
    };

    const handleSort = useCallback((key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ tipo: 'all', status: 'all', dateStart: '', dateEnd: '', minVal: '', maxVal: '', filial: 'all' });
        setQuickFilter('all');
        setSearchTerm('');
    }, []);

    // Column Helper
    const toggleColumn = (id: string) => {
        const newCols = columns.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
        setColumns(newCols);
        saveUserPreferences({ casesColumns: newCols });
    };
    const moveColumn = (index: number, direction: 'up' | 'down') => {
        const newCols = [...columns];
        if (direction === 'up' && index > 0) [newCols[index], newCols[index - 1]] = [newCols[index - 1], newCols[index]];
        else if (direction === 'down' && index < newCols.length - 1) [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
        const reordered = newCols.map((col, idx) => ({ ...col, order: idx }));
        setColumns(reordered);
        saveUserPreferences({ casesColumns: reordered });
    };
    const handleResetColumns = () => {
        setColumns(DEFAULT_COLUMNS);
        saveUserPreferences({ casesColumns: DEFAULT_COLUMNS });
        showToast('success', 'Colunas restauradas.');
    };

    const activeKanbanColumns = useMemo(() => {
        if (viewMode === 'archived') return [CaseStatus.ARQUIVADO];

        // Expand columns for all views to ensure consistency even if status changes
        const commonColumns = [
            CaseStatus.PROTOCOLAR,
            CaseStatus.ANALISE,
            CaseStatus.EXIGENCIA,
            CaseStatus.AGUARDANDO_AUDIENCIA,
            CaseStatus.EM_RECURSO,
            CaseStatus.CONCLUIDO_CONCEDIDO,
            CaseStatus.CONCLUIDO_INDEFERIDO
        ];

        if (activeCategory === 'Seguro Defeso' || activeCategory === 'Administrativo') {
            return commonColumns.filter(status =>
                status !== CaseStatus.AGUARDANDO_AUDIENCIA &&
                status !== CaseStatus.EM_RECURSO
            );
        }

        return commonColumns;
    }, [activeCategory, viewMode]);


    // Actions
    const confirmArchiveCase = async () => {
        if (caseToArchive && archiveReason.trim()) {
            await updateCase({ ...caseToArchive, status: CaseStatus.ARQUIVADO, motivo_arquivamento: archiveReason });
            setCaseToArchive(null); setArchiveReason('');
            showToast('success', 'Arquivado.');
            refetch();
        } else showToast('error', 'Informe motivo.');
    };

    const confirmRestoreCase = async () => {
        if (!caseToRestore || !restoreReason.trim()) return showToast('error', 'Informe motivo.');
        await updateCase({ ...caseToRestore, status: CaseStatus.ANALISE, motivo_arquivamento: undefined }, `Restaurado: ${restoreReason}`);
        setCaseToRestore(null); setRestoreReason('');
        showToast('success', 'Restaurado.');
        refetch();
    };

    const confirmDeleteCase = async () => {
        if (!caseToDelete) return;
        const hasFinancial = financial.some(f => f.case_id === caseToDelete.id);
        if (hasFinancial && deleteOption === 'delete') {
            financial.filter(f => f.case_id === caseToDelete.id).forEach(async r => await deleteFinancialRecord(r.id));
        }
        await deleteCase(caseToDelete.id);
        setCaseToDelete(null);
        showToast('success', 'Excluído.');
        refetch();
    };


    return (
        <div className="h-full overflow-y-auto custom-scrollbar flex flex-col space-y-8 pb-10 pr-2">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 hover:scale-105 transition-transform"><pageHeader.icon size={24} /></div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">{viewMode === 'active' ? pageHeader.title : `Arquivo Morto (${activeCategory})`}</h1>
                            {isFetching && <Loader2 size={20} className="text-gold-500 animate-spin" />}
                        </div>
                        <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">{viewMode === 'active' ? pageHeader.desc : 'Histórico arquivado.'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {quickFilter !== 'projections' && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setViewMode(viewMode === 'active' ? 'archived' : 'active'); setCurrentPage(1); }}
                            className={`group h-10 rounded-xl border flex items-center justify-center hover:justify-start w-10 hover:w-auto overflow-hidden px-0 hover:px-4 gap-0 hover:gap-2 transition-all duration-300 font-bold text-[10px] uppercase tracking-widest ${viewMode === 'archived' ? 'bg-gold-500/10 border-gold-500 text-gold-500' : 'bg-[#181818] border-white/10 text-slate-400 hover:text-white'}`}
                            title={viewMode === 'archived' ? 'Ver Ativos' : 'Arquivo Morto'}
                        >
                            <Archive size={16} className="shrink-0" />
                            <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 w-0 group-hover:w-auto">
                                {viewMode === 'archived' ? 'Ver Ativos' : 'Arquivo Morto'}
                            </span>
                        </motion.button>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsExportModalOpen(true)}
                        className="group h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center hover:justify-start w-10 hover:w-auto overflow-hidden px-0 hover:px-4 gap-0 hover:gap-2 transition-all duration-300"
                        title="Gerar Relatório Excel"
                    >
                        <FileText size={18} className="shrink-0" />
                        <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 w-0 group-hover:w-auto">Relatório Excel</span>
                    </motion.button>

                    {/* Layout Toggles */}
                    <div className="flex items-center bg-[#131418] border border-white/10 rounded-xl p-1 h-10">
                        <button
                            onClick={() => saveLayoutMode('kanban')}
                            className={`p-1.5 rounded-lg px-3 flex items-center gap-2 transition-all duration-300 ${layoutMode === 'kanban'
                                ? 'bg-gold-600 text-black shadow-lg shadow-gold-600/20 font-bold'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <LayoutGrid size={16} />
                            <span className="text-[9px] uppercase font-black tracking-widest hidden sm:inline">Kanban</span>
                        </button>
                        <button
                            onClick={() => saveLayoutMode('list')}
                            className={`p-1.5 rounded-lg px-3 flex items-center gap-2 transition-all duration-300 ${layoutMode === 'list'
                                ? 'bg-gold-600 text-black shadow-lg shadow-gold-600/20 font-bold'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <LayoutList size={16} />
                            <span className="text-[9px] uppercase font-black tracking-widest hidden sm:inline">Lista</span>
                        </button>
                    </div>

                    {quickFilter !== 'projections' && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsNewCaseModalOpen(true)}
                            className="group h-10 bg-gold-600 hover:bg-gold-700 text-black rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-gold-600/20 flex items-center justify-center hover:justify-start w-10 hover:w-auto overflow-hidden px-0 hover:px-4 gap-0 hover:gap-2 transition-all duration-300"
                        >
                            <Plus size={18} className="shrink-0" />
                            <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 w-0 group-hover:w-auto">Novo Processo</span>
                        </motion.button>
                    )}

                    <BranchSelector />
                </div>
            </div>

            <div className="flex-shrink-0">
                <CaseFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    searchInputRef={searchInputRef}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    showFilters={showAdvancedFilters}
                    setShowFilters={setShowAdvancedFilters}
                    layoutMode={layoutMode}
                    saveLayoutMode={saveLayoutMode}
                    showColumnConfig={showColumnConfig}
                    setShowColumnConfig={setShowColumnConfig}
                    columns={columns}
                    toggleColumn={toggleColumn}
                    moveColumn={moveColumn}
                    handleResetColumns={handleResetColumns}
                    mergedPreferences={mergedPreferences}
                    saveUserPreferences={saveUserPreferences}
                    filters={filters}
                    setFilters={setFilters}
                    clearFilters={clearFilters}
                    quickFilter={quickFilter}
                    setQuickFilter={setQuickFilter}
                    projectionFilters={projectionFilters}
                    setProjectionFilters={setProjectionFilters}
                />
            </div>

            {quickFilter === 'projections' ? (
                <RetirementProjectionsView filters={projectionFilters} layoutMode={layoutMode} />
            ) : viewMode === 'active' && layoutMode === 'kanban' ? (
                <CaseKanbanBoard
                    cases={displayedCases}
                    columns={activeKanbanColumns}
                    onCaseDrop={onCaseDrop}
                    onCardClick={setSelectedCase}
                    onArchiveClick={setCaseToArchive}
                    columnWidth={kanbanColumnWidth}
                    setColumnWidth={(w) => { setKanbanColumnWidth(w); saveUserPreferences({ kanbanColumnWidth: w }); }}
                    cardScale={kanbanCardScale}
                />
            ) : (
                <CaseList
                    cases={displayedCases}
                    columns={columns}
                    selectedCaseIds={selectedCaseIds}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    handleToggleSelectCase={handleToggleSelectCase}
                    setSelectedCase={setSelectedCase}
                    setCaseToArchive={setCaseToArchive}
                    setCaseToDelete={setCaseToDelete}
                    handleRestoreClick={(c) => { setCaseToRestore(c); setRestoreReason(''); }}
                    viewMode={viewMode}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalCases={totalCases}
                    itemsPerPage={ITEMS_PER_PAGE}
                    isFetching={isFetching}
                />
            )}

            <AnimatePresence>
                {selectedCase && (
                    <CaseDetailsModal
                        caseItem={selectedCase}
                        onClose={() => {
                            setSelectedCase(null);
                            setCaseToView(null);
                        }}
                        onSelectCase={setSelectedCase}
                        onViewClient={(clientId) => {
                            setClientToView(clientId, 'info');
                            setCurrentView('clients');
                            setSelectedCase(null);
                            setCaseToView(null);
                        }}
                    />
                )}

                {isNewCaseModalOpen && (
                    <NewCaseModal
                        isOpen={isNewCaseModalOpen}
                        onClose={() => setIsNewCaseModalOpen(false)}
                        forcedType={filters.tipo !== 'all' ? filters.tipo : (caseTypeFilter !== 'all' ? caseTypeFilter : undefined)}
                        forcedCategory={activeCategory}
                    />
                )}

                {isExportModalOpen && (
                    <ExportCasesModal
                        isOpen={isExportModalOpen}
                        onClose={() => setIsExportModalOpen(false)}
                        currentFilters={queryFilters}
                        searchTerm={debouncedSearch}
                        showToast={showToast}
                    />
                )}
            </AnimatePresence>

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
                        <h3 className="text-lg font-bold text-white text-center mb-2">Restaurar Processo</h3>
                        <textarea className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-emerald-500 resize-none h-24 mb-4" placeholder="Motivo..." value={restoreReason} onChange={(e) => setRestoreReason(e.target.value)} autoFocus />
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setCaseToRestore(null)} className="flex-1 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg">Cancelar</button>
                            <button onClick={confirmRestoreCase} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">Restaurar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {caseToDelete && (
                <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#0f1014] border border-zinc-800 p-6 rounded-xl max-w-sm w-full shadow-2xl text-center">
                        <h3 className="text-lg font-bold text-white mb-2">Excluir Definitivamente?</h3>
                        {financial.some(f => f.case_id === caseToDelete.id) && (
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4 text-left">
                                <p className="text-red-400 text-xs font-bold mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Atenção: Há lançamentos financeiros.</p>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer"><input type="radio" name="delOpt" checked={deleteOption === 'keep'} onChange={() => setDeleteOption('keep')} className="accent-red-500" /> Manter financeiro</label>
                                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer"><input type="radio" name="delOpt" checked={deleteOption === 'delete'} onChange={() => setDeleteOption('delete')} className="accent-red-500" /> Apagar financeiro</label>
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

            {/* Bulk Actions Bar */}
            <AnimatePresence>
                {selectedCaseIds.length > 0 && (
                    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 px-6 py-4 bg-zinc-900 border border-gold-500/30 rounded-2xl shadow-2xl">
                        <div className="flex items-center gap-3 pr-6 border-r border-zinc-700">
                            <span className="text-sm font-medium text-slate-200">{selectedCaseIds.length} Selecionados</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleBulkArchiveCases} disabled={isBulkArchiving} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-medium">
                                {isBulkArchiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />} Arquivar
                            </button>
                            <button onClick={handleBulkDeleteCases} disabled={isBulkDeleting} className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-xs font-medium">
                                {isBulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
                            </button>
                            <button onClick={() => setSelectedCaseIds([])} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default Cases;
