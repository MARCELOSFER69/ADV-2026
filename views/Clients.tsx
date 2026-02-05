import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Search, Plus, Phone, Mail, FileText, X, MapPin, Eye, Calendar, User, ChevronRight, Filter, Edit2, Camera, Save, Building2, Loader2, MessageCircle, Clock, LayoutGrid, LayoutList, Settings, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, SortAsc, CheckSquare, Copy, ArrowRight, CreditCard, Heart, Briefcase, Globe, Share2, AlertTriangle, CheckCircle2, Trash2, Archive, RefreshCw, Check, Lock, ChevronLeft, Users } from 'lucide-react';
import { Client, Case, Branch, CaseStatus, ColumnConfig, Captador } from '../types';
import CaseDetailsModal from '../components/modals/CaseDetailsModal';
import WhatsAppModal from '../components/modals/WhatsAppModal';
import DocumentEditorModal from '../components/modals/DocumentEditorModal';
import CustomSelect from '../components/ui/CustomSelect';
import ClientDetailsModal from '../components/modals/ClientDetailsModal';
import { fetchAddressByCep } from '../services/cepService';
import { fetchCnpjData } from '../services/brasilApiService';
import { formatCPFOrCNPJ, formatPhone } from '../services/formatters';
import { formatDateDisplay } from '../utils/dateUtils';
import ClientRow from '../components/clients/ClientRow';
import { supabase } from '../services/supabaseClient';
import SizeScaler from '../components/ui/SizeScaler';
import ClientActionModals from '../components/modals/ClientActionModals';
import ClientFormModal from '../components/modals/ClientFormModal';
import ClientFilters from '../components/clients/ClientFilters';
import ClientGridView from '../components/clients/ClientGridView';
import ClientTableView from '../components/clients/ClientTableView';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_CLIENT_COLUMNS: ColumnConfig[] = [
    { id: 'nome_completo', label: 'Nome', visible: true, order: 0 },
    { id: 'cpf_cnpj', label: 'CPF / CNPJ', visible: true, order: 1 },
    { id: 'contato', label: 'Contato', visible: true, order: 2 },
    { id: 'filial', label: 'Filial', visible: true, order: 3 },
    { id: 'status', label: 'Status', visible: true, order: 4 },
    { id: 'gps', label: 'Situação GPS', visible: false, order: 5 },
    { id: 'endereco', label: 'Endereço', visible: false, order: 6 },
    { id: 'nascimento', label: 'Nascimento', visible: false, order: 7 },
    { id: 'captador', label: 'Captador', visible: false, order: 8 },
    { id: 'email', label: 'Email', visible: false, order: 9 },
];

const PENDING_OPTIONS = [
    'Senha',
    'Duas Etapas',
    'Nível da Conta (Bronze)',
    'Pendência na Receita Federal',
    'Documentação Incompleta'
];

const SEX_OPTIONS = [
    { label: 'Masculino', value: 'Masculino' },
    { label: 'Feminino', value: 'Feminino' }
];

const CIVIL_STATUS_OPTIONS = [
    { label: 'Solteiro(a)', value: 'Solteiro(a)' },
    { label: 'Casado(a)', value: 'Casado(a)' },
    { label: 'Divorciado(a)', value: 'Divorciado(a)' },
    { label: 'Viúvo(a)', value: 'Viúvo(a)' },
    { label: 'União Estável', value: 'União Estável' }
];

const BRANCH_OPTIONS = Object.values(Branch).map(b => ({ label: b, value: b }));

import { fetchAllFilteredClientsData, checkCpfExists } from '../services/clientsService';
import { useClients } from '../hooks/useClients';
import * as XLSX from 'xlsx';

const Clients: React.FC = () => {
    const {
        deleteClient, addClient, updateClient, showToast,
        clientToView, setClientToView, user, saveUserPreferences,
        captadores, addCaptador, mergedPreferences,
        isNewClientModalOpen, setIsNewClientModalOpen,
        clientDetailTab, setClientDetailTab
    } = useAppContext();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [showArchived, setShowArchived] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    const [activeFilters, setActiveFilters] = useState({
        city: '', captador: '', status: 'all', filial: 'all', sexo: 'all',
        dateStart: '', dateEnd: '', pendencia: 'all', gps: 'all'
    });

    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppClient, setWhatsAppClient] = useState<{ name: string, phone: string } | null>(null);
    const [clientToArchive, setClientToArchive] = useState<Client | null>(null);
    const [archiveReason, setArchiveReason] = useState('');
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDocEditorOpen, setIsDocEditorOpen] = useState(false);
    const [docContent, setDocContent] = useState('');
    const [docTitle, setDocTitle] = useState('');
    const [newClient, setNewClient] = useState<Partial<Client>>({ nacionalidade: 'Brasileira', uf: 'MA', pendencias: [] });
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
    const [isAddingCaptador, setIsAddingCaptador] = useState(false);
    const [newCaptadorName, setNewCaptadorName] = useState('');
    const [hasRepresentative, setHasRepresentative] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [isClientEditMode, setIsClientEditMode] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Client | 'status', direction: 'asc' | 'desc' }>({ key: 'nome_completo', direction: 'asc' });
    const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_CLIENT_COLUMNS);
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [isBulkArchiving, setIsBulkArchiving] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [duplicateClient, setDuplicateClient] = useState<Client | null>(null);

    // Hook useClients (React Query)
    const { data: paginatedClients, isLoading: isFetching, totalCount: totalClients, refetch } = useClients({
        page: currentPage,
        perPage: ITEMS_PER_PAGE,
        filters: {
            ...activeFilters,
            search: debouncedSearch,
            status: showArchived ? 'arquivado' : activeFilters.status,
            sortKey: sortConfig.key,
            sortDirection: sortConfig.direction
        }
    });

    const totalPages = Math.ceil(totalClients / ITEMS_PER_PAGE);

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Bulk Handlers
    const handleToggleSelectClient = useCallback((id: string) => {
        setSelectedClientIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const handleSelectAllClients = useCallback((idsOnPage: string[]) => {
        if (selectedClientIds.length === idsOnPage.length) {
            setSelectedClientIds([]);
        } else {
            setSelectedClientIds(idsOnPage);
        }
    }, [selectedClientIds]);

    const handleBulkArchive = useCallback(async () => {
        if (selectedClientIds.length === 0) return;
        const reason = window.prompt(`Arquivar ${selectedClientIds.length} clientes selecionados? Digite o motivo:`, "Arquivamento em massa");
        if (!reason) return;

        setIsBulkArchiving(true);
        try {
            const clientsToArchive = paginatedClients.filter(c => selectedClientIds.includes(c.id));
            for (const client of clientsToArchive) {
                await updateClient({ ...client, status: 'arquivado', motivo_arquivamento: reason });
            }
            showToast('success', `${selectedClientIds.length} clientes arquivados.`);
            setSelectedClientIds([]);
            refetch();
        } catch (error) {
            showToast('error', 'Erro no arquivamento em massa.');
        } finally {
            setIsBulkArchiving(false);
        }
    }, [selectedClientIds, paginatedClients, updateClient, showToast]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedClientIds.length === 0) return;
        const confirmText = "EXCLUIR";
        const userInput = window.prompt(`CUIDADO: Você está prestes a excluir ${selectedClientIds.length} clientes e todos os seus processos vinculados.\n\nPara confirmar, digite ${confirmText} abaixo:`);

        if (userInput !== confirmText) {
            showToast('error', 'Exclusão cancelada ou texto incorreto.');
            return;
        }

        const reason = window.prompt("Informe o motivo da exclusão em massa:");
        if (!reason) return;

        setIsBulkDeleting(true);
        try {
            for (const id of selectedClientIds) {
                await deleteClient(id, reason);
            }
            showToast('success', `${selectedClientIds.length} clientes excluídos permanentemente.`);
            setSelectedClientIds([]);
            refetch();
        } catch (error) {
            showToast('error', 'Erro na exclusão em massa.');
        } finally {
            setIsBulkDeleting(false);
        }
    }, [selectedClientIds, deleteClient, showToast]);

    const activeFiltersRef = useRef(activeFilters);
    useEffect(() => { activeFiltersRef.current = activeFilters; }, [activeFilters]);

    // Callbacks - Declared before usage
    const handleRestoreClient = useCallback(async (client: Client) => {
        if (!window.confirm(`Deseja restaurar este cliente para a lista ativa?`)) return;
        try {
            await updateClient({ ...client, status: 'ativo', motivo_arquivamento: undefined });
            showToast('success', 'Cliente restaurado com sucesso!');
            refetch();
        } catch (error: any) {
            console.error('Erro ao restaurar:', error);
            showToast('error', `Erro: ${error.message}`);
        }
    }, [updateClient, showToast]);

    const handleSort = useCallback((key: keyof Client | 'status') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    const getClientStatus = useCallback((clientId: string) => {
        const client = paginatedClients.find(c => c.id === clientId);
        if (!client) return { label: 'Inativo', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };

        // @ts-ignore - status_calculado vem da View
        const status = client.status_calculado || 'Inativo';

        if (status === 'Ativo') return { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
        if (status === 'Concedido') return { label: 'Concedido', color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' };
        if (status === 'Indeferido') return { label: 'Indeferido', color: 'bg-red-500/10 text-red-400 border-red-500/20' };

        return { label: 'Inativo', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
    }, [paginatedClients]);

    const handleWhatsAppClick = useCallback((name: string, phone: string) => {
        setWhatsAppClient({ name, phone });
        setIsWhatsAppModalOpen(true);
    }, []);

    const handleCopyPhone = useCallback((phone: string) => {
        navigator.clipboard.writeText(phone);
        showToast('success', 'Telefone copiado!');
    }, [showToast]);

    const handleArchiveClick = useCallback((client: Client) => {
        if (client.status === 'arquivado') {
            handleRestoreClient(client);
        } else {
            setClientToArchive(client);
            setArchiveReason('');
        }
    }, [handleRestoreClient]);

    const confirmArchiveClient = useCallback(async () => {
        if (!clientToArchive) return;
        if (!archiveReason.trim()) {
            showToast('error', 'Por favor, informe o motivo do arquivamento.');
            return;
        }

        try {
            await updateClient({
                ...clientToArchive,
                status: 'arquivado',
                motivo_arquivamento: archiveReason
            });
            showToast('success', 'Cliente movido para o Arquivo Morto.');
            setClientToArchive(null);
            refetch();
        } catch (error: any) {
            console.error('Erro ao arquivar:', error);
            showToast('error', `Erro: ${error.message}`);
        }
    }, [clientToArchive, archiveReason, updateClient, showToast]);

    const handleDeleteClick = useCallback((client: Client) => {
        setClientToDelete(client);
        setDeleteReason('');
    }, []);

    const confirmDeleteClient = useCallback(async () => {
        if (!clientToDelete) return;
        if (!deleteReason.trim()) {
            showToast('error', 'Por favor, informe o motivo da exclusão.');
            return;
        }

        try {
            await deleteClient(clientToDelete.id, deleteReason);
            setClientToDelete(null);
            refetch();
        } catch (error: any) {
            console.error('Erro ao excluir:', error);
        }
    }, [clientToDelete, deleteReason, deleteClient, showToast]);

    // O logic de dados agora é gerenciado pelo useClients no topo do componente


    // Effects
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Check for duplicate CPF/CNPJ
    useEffect(() => {
        const checkDuplicate = async () => {
            const rawCpf = newClient.cpf_cnpj?.replace(/\D/g, '');
            if (!rawCpf || rawCpf.length < 11) {
                setDuplicateClient(null);
                return;
            }

            try {
                const { exists, client } = await checkCpfExists(newClient.cpf_cnpj!);
                if (exists && client) {
                    setDuplicateClient(client as any);
                } else {
                    setDuplicateClient(null);
                }
            } catch (error) {
                console.error("Erro ao verificar duplicidade:", error);
                setDuplicateClient(null);
            }
        };

        const timer = setTimeout(checkDuplicate, 500);
        return () => clearTimeout(timer);
    }, [newClient.cpf_cnpj]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, []);

    useEffect(() => {
        if (user?.preferences?.clientsViewMode) setViewMode(user.preferences.clientsViewMode);
        if (user?.preferences?.clientsColumns) {
            // Filter out columns that are no longer in DEFAULT_CLIENT_COLUMNS (like the old 'nome' column)
            const validColumnIds = DEFAULT_CLIENT_COLUMNS.map(c => c.id);
            const filteredPreferences = user.preferences.clientsColumns.filter((c: any) => validColumnIds.includes(c.id));

            const merged = [...filteredPreferences];
            DEFAULT_CLIENT_COLUMNS.forEach(defCol => {
                if (!merged.find(c => c.id === defCol.id)) merged.push(defCol);
            });
            setColumns(merged.sort((a, b) => a.order - b.order));
        }
    }, [user]);

    useEffect(() => {
        if (clientToView) {
            const fetchClient = async () => {
                const { data, error } = await supabase.from('clients').select('*, cases(*)').eq('id', clientToView).single();
                if (data) setSelectedClient(data as Client);
                setClientToView(null);
            };
            fetchClient();
        }
    }, [clientToView, setClientToView]);

    // Helpers
    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
        setNewClient(prev => ({ ...prev, cep: val.replace(/^(\d{5})(\d)/, '$1-$2') }));
        if (val.length === 8) {
            setIsLoadingCep(true);
            const data = await fetchAddressByCep(val);
            setIsLoadingCep(false);
            if (data) setNewClient(prev => ({ ...prev, endereco: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf }));
        }
    };

    const handleCnpjSearch = async () => {
        const cnpj = newClient.cpf_cnpj?.replace(/\D/g, '') || '';
        if (cnpj.length !== 14) return showToast('error', 'CNPJ inválido');
        setIsLoadingCnpj(true);
        const data = await fetchCnpjData(cnpj);
        setIsLoadingCnpj(false);
        if (data) setNewClient(prev => ({ ...prev, nome_completo: data.razao_social, endereco: data.logradouro, bairro: data.bairro, cidade: data.municipio, uf: data.uf }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClient.nome_completo || !newClient.cpf_cnpj) return showToast('error', 'Preencha os campos obrigatórios');
        try {
            await addClient({ ...newClient, id: crypto.randomUUID(), status: 'ativo', data_cadastro: new Date().toISOString() } as Client);
            setIsNewClientModalOpen(false);
            setNewClient({ nacionalidade: 'Brasileira', uf: 'MA', pendencias: [] });
            refetch();
        } catch (error) { showToast('error', 'Erro ao salvar cliente'); }
    };

    const handleAddCaptadorNew = async () => {
        if (!newCaptadorName.trim()) return;
        await addCaptador(newCaptadorName, newClient.filial as string);
        setNewClient({ ...newClient, captador: newCaptadorName });
        setIsAddingCaptador(false);
        setNewCaptadorName('');
    };

    const toggleColumn = useCallback((id: string) => {
        setColumns(currentCols => {
            const newCols = currentCols.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
            saveUserPreferences({ clientsColumns: newCols });
            return newCols;
        });
    }, [saveUserPreferences]);

    const moveColumn = useCallback((index: number, direction: 'up' | 'down') => {
        setColumns(currentCols => {
            const newCols = [...currentCols];
            if (direction === 'up' && index > 0) [newCols[index], newCols[index - 1]] = [newCols[index - 1], newCols[index]];
            else if (direction === 'down' && index < newCols.length - 1) [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];

            const reordered = newCols.map((col, idx) => ({ ...col, order: idx }));
            saveUserPreferences({ clientsColumns: reordered });
            return reordered;
        });
    }, [saveUserPreferences]);

    const handleResetColumns = useCallback(() => {
        setColumns(DEFAULT_CLIENT_COLUMNS);
        saveUserPreferences({ clientsColumns: DEFAULT_CLIENT_COLUMNS });
        showToast('success', 'Colunas restauradas.');
    }, [saveUserPreferences, showToast]);

    const handleExportExcel = useCallback(async () => {
        setIsExporting(true);
        try {
            const allFilteredClients = await fetchAllFilteredClientsData(debouncedSearch, {
                ...activeFilters,
                status: showArchived ? 'arquivado' : activeFilters.status,
                sortKey: sortConfig.key,
                sortDirection: sortConfig.direction
            });

            if (allFilteredClients.length === 0) {
                showToast('error', 'Nenhum dado para exportar.');
                return;
            }

            const visibleColumns = columns.filter(col => col.visible).sort((a, b) => a.order - b.order);

            const exportData = allFilteredClients.map(client => {
                const row: any = {};
                visibleColumns.forEach(col => {
                    let value = '';
                    switch (col.id) {
                        case 'nome_completo':
                            value = client.nome_completo || 'N/A';
                            break;
                        case 'cpf_cnpj':
                            value = client.cpf_cnpj ? formatCPFOrCNPJ(client.cpf_cnpj) : 'N/A';
                            break;
                        case 'contato':
                            value = client.telefone ? formatPhone(client.telefone) : 'N/A';
                            break;
                        case 'filial':
                            value = client.filial || 'N/A';
                            break;
                        case 'status':
                            value = getClientStatus(client.id).label;
                            break;
                        case 'gps':
                            if (client.gps_status_calculado) {
                                value = client.gps_status_calculado === 'puxada' ? 'Puxada' :
                                    client.gps_status_calculado === 'pendente' ? 'Pendente' : 'Regular';
                            } else {
                                value = 'N/A';
                            }
                            break;
                        case 'endereco':
                            value = `${client.endereco || ''}, ${client.bairro || ''}, ${client.cidade || ''} - ${client.uf || ''}`;
                            break;
                        case 'nascimento':
                            value = client.data_nascimento ? formatDateDisplay(client.data_nascimento) : 'N/A';
                            break;
                        case 'captador':
                            value = client.captador || 'N/A';
                            break;
                        case 'email':
                            value = client.email || 'N/A';
                            break;
                    }
                    row[col.label] = value;
                });
                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

            const fileName = `Relatorio_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            showToast('success', 'Relatório Excel gerado com sucesso!');
        } catch (error) {
            console.error('Erro ao exportar Excel:', error);
            showToast('error', 'Erro ao gerar relatório Excel.');
        } finally {
            setIsExporting(false);
        }
    }, [debouncedSearch, activeFilters, showArchived, sortConfig, columns, getClientStatus, showToast]);

    const clearFilters = useCallback(() => setActiveFilters({ city: '', captador: '', status: 'all', filial: 'all', sexo: 'all', dateStart: '', dateEnd: '', pendencia: 'all', gps: 'all' }), []);

    // const duplicateClient = null; // Removido useMemo de filtro local. Recomenda-se query JIT se necessário.

    const filteredCaptadores = useMemo(() => {
        if (!newClient.filial) return [];
        return (captadores || []).filter(c => c.filial === newClient.filial).sort((a, b) => a.nome.localeCompare(b.nome));
    }, [captadores, newClient.filial]);

    const toggleNewPendencia = (option: string) => {
        const current = newClient.pendencias || [];
        setNewClient({ ...newClient, pendencias: current.includes(option) ? current.filter(p => p !== option) : [...current, option] });
    };

    const handleSaveViewMode = useCallback((mode: 'list' | 'grid') => {
        setViewMode(mode);
        saveUserPreferences({ clientsViewMode: mode });
    }, [saveUserPreferences]);

    const handleSelectCurrentPage = useCallback(() => {
        handleSelectAllClients(paginatedClients.map(c => c.id));
    }, [handleSelectAllClients, paginatedClients]);

    // const isFetching = appLoading; // Removido pois já é declarado pelo hook no topo

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
                            {showArchived ? 'Arquivo Morto' : 'Base de Clientes'}
                        </h1>
                        <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
                            {showArchived ? 'Histórico de clientes desativados e arquivados.' : 'Gerencie todos os clientes vinculados ao escritório.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <motion.button
                        layout
                        initial={false}
                        onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }}
                        className={`group relative h-10 rounded-xl border flex items-center transition-all duration-300 overflow-hidden text-[10px] font-black uppercase tracking-widest ${showArchived
                            ? 'bg-gold-500/10 border-gold-500 text-gold-500 shadow-lg shadow-gold-500/10 w-auto px-4 gap-2'
                            : 'bg-[#181818] border-white/10 text-slate-400 hover:text-white hover:border-white/20 w-10 hover:w-auto px-0 hover:px-4 justify-center hover:justify-start gap-0 hover:gap-2'
                            }`}
                    >
                        <Archive size={16} className={showArchived ? 'text-gold-500' : 'group-hover:text-white'} />
                        <span className={`whitespace-nowrap transition-all duration-300 ${showArchived ? 'opacity-100 w-auto' : 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto'}`}>
                            {showArchived ? 'Voltar para Ativos' : 'Ver Arquivo'}
                        </span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleExportExcel}
                        disabled={isExporting}
                        className="group h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center hover:justify-start w-10 hover:w-auto overflow-hidden px-0 hover:px-4 gap-0 hover:gap-2 transition-all duration-300 disabled:opacity-50"
                        title="Exportar para Excel"
                    >
                        {isExporting ? <Loader2 size={18} className="animate-spin shrink-0" /> : <FileText size={18} className="shrink-0" />}
                        <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 w-0 group-hover:w-auto">Exportar Excel</span>
                    </motion.button>

                    {!showArchived && (
                        <>
                            {/* View Mode Toggle */}
                            <div className="bg-[#181818] border border-white/10 rounded-xl flex p-1 items-center h-10">
                                <button
                                    onClick={() => { setViewMode('grid'); saveUserPreferences({ clientsViewMode: 'grid' }); }}
                                    className={`p-1.5 rounded-lg transition-all duration-300 flex items-center gap-2 px-3 ${viewMode === 'grid'
                                        ? 'bg-gold-600 text-black shadow-lg shadow-gold-600/20 font-bold'
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <LayoutGrid size={16} />
                                    <span className="text-[9px] uppercase font-black tracking-widest hidden sm:inline">Kanban</span>
                                </button>
                                <button
                                    onClick={() => { setViewMode('list'); saveUserPreferences({ clientsViewMode: 'list' }); }}
                                    className={`p-1.5 rounded-lg transition-all duration-300 flex items-center gap-2 px-3 ${viewMode === 'list'
                                        ? 'bg-gold-600 text-black shadow-lg shadow-gold-600/20 font-bold'
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <LayoutList size={16} />
                                    <span className="text-[9px] uppercase font-black tracking-widest hidden sm:inline">Lista</span>
                                </button>

                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsNewClientModalOpen(true)}
                                className="group h-10 bg-gold-600 hover:bg-gold-700 text-black rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-gold-600/20 flex items-center justify-center hover:justify-start w-10 hover:w-auto overflow-hidden px-0 hover:px-4 gap-0 hover:gap-2 transition-all duration-300"
                            >
                                <Plus size={18} className="shrink-0" />
                                <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 w-0 group-hover:w-auto">Novo Cliente</span>
                            </motion.button>
                        </>
                    )}
                </div>
            </div>

            <ClientFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchInputRef={searchInputRef}
                sortConfig={sortConfig}
                handleSort={handleSort}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                viewMode={viewMode}
                saveViewMode={handleSaveViewMode}
                showColumnConfig={showColumnConfig}
                setShowColumnConfig={setShowColumnConfig}
                columns={columns}
                toggleColumn={toggleColumn}
                moveColumn={moveColumn}
                handleResetColumns={handleResetColumns}
                mergedPreferences={mergedPreferences}
                saveUserPreferences={saveUserPreferences}
                activeFilters={activeFilters}
                setActiveFilters={setActiveFilters}
                clearFilters={clearFilters}
            />

            {isFetching ? (
                <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-gold-500" size={40} /></div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar relative">
                        {viewMode === 'grid' ? (
                            <ClientGridView
                                sortedClients={paginatedClients}
                                selectedClient={selectedClient}
                                setSelectedClient={setSelectedClient}
                                getClientStatus={getClientStatus}
                                handleWhatsAppClick={handleWhatsAppClick}
                                handleArchiveClick={handleArchiveClick}
                                handleDeleteClick={handleDeleteClick}
                                mergedPreferences={mergedPreferences}
                            />
                        ) : (
                            <ClientTableView
                                sortedClients={paginatedClients}
                                columns={columns}
                                sortConfig={sortConfig}
                                handleSort={handleSort}
                                getClientStatus={getClientStatus}
                                setSelectedClient={setSelectedClient}
                                setIsClientEditMode={setIsClientEditMode}
                                handleWhatsAppClick={handleWhatsAppClick}
                                handleArchiveClick={handleArchiveClick}
                                handleDeleteClick={handleDeleteClick}
                                handleCopyPhone={handleCopyPhone}
                                mergedPreferences={mergedPreferences}
                                selectedIds={selectedClientIds}
                                onToggleSelect={handleToggleSelectClient}
                                onSelectAll={handleSelectCurrentPage}
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between p-4 border-t border-zinc-800 bg-[#0f1014] mt-auto">
                        <span className="text-sm text-zinc-500">Página {currentPage} de {totalPages || 1} | Total: {totalClients}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm disabled:opacity-50"><ChevronLeft size={16} /></button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm disabled:opacity-50"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </>
            )
            }

            {/* Bulk Actions Bar */}
            <AnimatePresence>
                {selectedClientIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 20, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 px-6 py-4 bg-zinc-900 border border-gold-500/30 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3 pr-6 border-r border-zinc-700">
                            <div className="w-8 h-8 rounded-full bg-gold-600 flex items-center justify-center text-white font-bold text-sm">
                                {selectedClientIds.length}
                            </div>
                            <span className="text-sm font-medium text-slate-200">Selecionados</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleBulkArchive}
                                disabled={isBulkArchiving}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 hover:text-white rounded-xl transition-all font-medium text-xs border border-white/5 disabled:opacity-50"
                            >
                                {isBulkArchiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                                Arquivar
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all font-medium text-xs border border-red-500/20 disabled:opacity-50"
                            >
                                {isBulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Excluir Permanentemente
                            </button>
                            <div className="w-px h-6 bg-zinc-700 mx-2" />
                            <button
                                onClick={() => setSelectedClientIds([])}
                                className="p-2 text-slate-500 hover:text-white transition-colors"
                                title="Cancelar Seleção"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ClientFormModal
                isOpen={isNewClientModalOpen}
                onClose={() => setIsNewClientModalOpen(false)}
                newClient={newClient}
                setNewClient={setNewClient}
                duplicateClient={duplicateClient}
                isLoadingCep={isLoadingCep}
                isLoadingCnpj={isLoadingCnpj}
                handleCnpjSearch={handleCnpjSearch}
                handleCepChange={handleCepChange}
                handleSubmit={handleSubmit}
                hasRepresentative={hasRepresentative}
                setHasRepresentative={setHasRepresentative}
                isAddingCaptador={isAddingCaptador}
                setIsAddingCaptador={setIsAddingCaptador}
                newCaptadorName={newCaptadorName}
                setNewCaptadorName={setNewCaptadorName}
                handleAddCaptadorNew={handleAddCaptadorNew}
                filteredCaptadores={filteredCaptadores}
                toggleNewPendencia={toggleNewPendencia}
                SEX_OPTIONS={SEX_OPTIONS}
                CIVIL_STATUS_OPTIONS={CIVIL_STATUS_OPTIONS}
                BRANCH_OPTIONS={BRANCH_OPTIONS}
                PENDING_OPTIONS={PENDING_OPTIONS}
                formatCPFOrCNPJ={formatCPFOrCNPJ}
                formatPhone={formatPhone}
            />

            <ClientActionModals
                clientToArchive={clientToArchive}
                archiveReason={archiveReason}
                setArchiveReason={setArchiveReason}
                onCloseArchive={() => setClientToArchive(null)}
                onConfirmArchive={confirmArchiveClient}
                clientToDelete={clientToDelete}
                deleteReason={deleteReason}
                setDeleteReason={setDeleteReason}
                onCloseDelete={() => setClientToDelete(null)}
                onConfirmDelete={confirmDeleteClient}
            />

            {
                whatsAppClient && (
                    <WhatsAppModal
                        isOpen={isWhatsAppModalOpen}
                        onClose={() => { setIsWhatsAppModalOpen(false); setWhatsAppClient(null); }}
                        clientName={whatsAppClient.name}
                        phone={whatsAppClient.phone}
                    />
                )
            }

            {
                isDocEditorOpen && (
                    <DocumentEditorModal
                        isOpen={isDocEditorOpen}
                        onClose={() => setIsDocEditorOpen(false)}
                        initialContent={docContent}
                        title={docTitle}
                    />
                )
            }

            <AnimatePresence>
                {selectedClient && (
                    <ClientDetailsModal
                        client={selectedClient}
                        onClose={() => setSelectedClient(null)}
                        onSelectCase={(c) => setSelectedCase(c)}
                        initialTab={(clientDetailTab as any) || 'info'}
                        initialEditMode={isClientEditMode}
                    />
                )}
            </AnimatePresence>

            {
                selectedCase && (
                    <CaseDetailsModal
                        caseItem={selectedCase}
                        onClose={() => setSelectedCase(null)}
                    />
                )
            }
        </div >
    );
};

export default Clients;
