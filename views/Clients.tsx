import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, Phone, Mail, FileText, X, MapPin, Eye, Calendar, User, ChevronRight, Filter, Edit2, Camera, Save, Building2, Loader2, MessageCircle, Clock, LayoutGrid, LayoutList, Settings, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, SortAsc, CheckSquare, Copy, ArrowRight, CreditCard, Heart, Briefcase, Globe, Share2, AlertTriangle, CheckCircle2, Trash2, Archive, RefreshCw, Check, Lock, ChevronLeft } from 'lucide-react';
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

const DEFAULT_CLIENT_COLUMNS: ColumnConfig[] = [
    { id: 'nome', label: 'Nome / CPF', visible: true, order: 0 },
    { id: 'contato', label: 'Contato', visible: true, order: 1 },
    { id: 'filial', label: 'Filial', visible: true, order: 2 },
    { id: 'status', label: 'Status', visible: true, order: 3 },
    { id: 'gps', label: 'Situação GPS', visible: false, order: 4 },
    { id: 'endereco', label: 'Endereço', visible: false, order: 5 },
    { id: 'nascimento', label: 'Nascimento', visible: false, order: 6 },
    { id: 'captador', label: 'Captador', visible: false, order: 7 },
    { id: 'email', label: 'Email', visible: false, order: 8 },
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

const Clients: React.FC = () => {
    const {
        deleteClient, addClient, updateClient, cases, showToast,
        clientToView, setClientToView, user, saveUserPreferences,
        captadores, addCaptador, isLoading: appLoading, mergedPreferences,
        clients, isNewClientModalOpen, setIsNewClientModalOpen,
        clientDetailTab, setClientDetailTab
    } = useApp();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [showArchived, setShowArchived] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

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
    const [isClientEditMode, setIsClientEditMode] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Client | 'status', direction: 'asc' | 'desc' }>({ key: 'nome_completo', direction: 'asc' });
    const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_CLIENT_COLUMNS);
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        city: '', captador: '', status: 'all', filial: 'all', sexo: 'all',
        dateStart: '', dateEnd: '', pendencia: 'all', gps: 'all'
    });

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Callbacks - Declared before usage
    const handleRestoreClient = useCallback(async (client: Client) => {
        if (!window.confirm(`Deseja restaurar este cliente para a lista ativa?`)) return;
        try {
            await updateClient({ ...client, status: 'ativo', motivo_arquivamento: undefined });
            showToast('success', 'Cliente restaurado com sucesso!');
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
        const clientCases = cases.filter(c => c.client_id === clientId && c.status !== CaseStatus.ARQUIVADO);
        if (clientCases.length === 0) return { label: 'Inativo', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };

        const hasActive = clientCases.some(c =>
            [CaseStatus.PROTOCOLAR, CaseStatus.ANALISE, CaseStatus.EXIGENCIA,
            CaseStatus.AGUARDANDO_AUDIENCIA, CaseStatus.EM_RECURSO].includes(c.status)
        );

        if (hasActive) return { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };

        const hasConceded = clientCases.some(c => c.status === CaseStatus.CONCLUIDO_CONCEDIDO);
        if (hasConceded) return { label: 'Concedido', color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' };

        const hasDenied = clientCases.some(c => c.status === CaseStatus.CONCLUIDO_INDEFERIDO);
        if (hasDenied) return { label: 'Indeferido', color: 'bg-red-500/10 text-red-400 border-red-500/20' };

        return { label: 'Inativo', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
    }, [cases]);

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
        } catch (error: any) {
            console.error('Erro ao excluir:', error);
        }
    }, [clientToDelete, deleteReason, deleteClient]);

    // Data Logic
    const sortedAndFilteredClients = useMemo(() => {
        const filtered = (clients || []).filter(c => {
            const isArchived = c.status === 'arquivado';
            if (showArchived && !isArchived) return false;
            if (!showArchived && isArchived) return false;

            const searchMatch = !debouncedSearch ||
                (c.nome_completo || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                c.cpf_cnpj?.includes(debouncedSearch) ||
                c.telefone?.includes(debouncedSearch);
            if (!searchMatch) return false;

            if (activeFilters.city && c.cidade !== activeFilters.city) return false;
            if (activeFilters.captador && c.captador !== activeFilters.captador) return false;
            if (activeFilters.filial !== 'all' && c.filial !== activeFilters.filial) return false;
            if (activeFilters.sexo !== 'all' && c.sexo !== activeFilters.sexo) return false;
            if (activeFilters.pendencia !== 'all' && !c.pendencias?.includes(activeFilters.pendencia)) return false;

            return true;
        });

        return [...filtered].sort((a, b) => {
            const aCases = (cases || []).filter(c => c.client_id === a.id && c.status !== 'Arquivado').length;
            const bCases = (cases || []).filter(c => c.client_id === b.id && c.status !== 'Arquivado').length;

            const aValue = sortConfig.key === 'status' ? aCases : (a[sortConfig.key] || '');
            const bValue = sortConfig.key === 'status' ? bCases : (b[sortConfig.key] || '');

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [clients, debouncedSearch, activeFilters, showArchived, sortConfig, cases]);

    const totalClients = sortedAndFilteredClients.length;
    const paginatedClients = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedAndFilteredClients.slice(start, start + ITEMS_PER_PAGE).map(client => ({
            ...client,
            cases: (cases || []).filter(c => c.client_id === client.id)
        }));
    }, [sortedAndFilteredClients, currentPage, cases]);

    const totalPages = Math.ceil(totalClients / ITEMS_PER_PAGE);

    // Effects
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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
            const merged = [...user.preferences.clientsColumns];
            DEFAULT_CLIENT_COLUMNS.forEach(defCol => { if (!merged.find(c => c.id === defCol.id)) merged.push(defCol); });
            setColumns(merged.sort((a, b) => a.order - b.order));
        }
    }, [user]);

    useEffect(() => {
        if (clientToView) {
            const cached = (clients || []).find(c => c.id === clientToView);
            if (cached) {
                setSelectedClient(cached);
                setClientToView(null);
            } else {
                const fetchClient = async () => {
                    const { data, error } = await supabase.from('clients').select('*, cases(*)').eq('id', clientToView).single();
                    if (data) setSelectedClient(data);
                    setClientToView(null);
                };
                fetchClient();
            }
        }
    }, [clientToView, clients, setClientToView]);

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
        } catch (error) { showToast('error', 'Erro ao salvar cliente'); }
    };

    const handleAddCaptadorNew = async () => {
        if (!newCaptadorName.trim()) return;
        await addCaptador(newCaptadorName, newClient.filial as string);
        setNewClient({ ...newClient, captador: newCaptadorName });
        setIsAddingCaptador(false);
        setNewCaptadorName('');
    };

    const toggleColumn = (id: string) => {
        const newCols = columns.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
        setColumns(newCols);
        saveUserPreferences({ clientsColumns: newCols });
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        const newCols = [...columns];
        if (direction === 'up' && index > 0) [newCols[index], newCols[index - 1]] = [newCols[index - 1], newCols[index]];
        else if (direction === 'down' && index < newCols.length - 1) [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
        const reordered = newCols.map((col, idx) => ({ ...col, order: idx }));
        setColumns(reordered);
        saveUserPreferences({ clientsColumns: reordered });
    };

    const handleResetColumns = () => {
        setColumns(DEFAULT_CLIENT_COLUMNS);
        saveUserPreferences({ clientsColumns: DEFAULT_CLIENT_COLUMNS });
        showToast('success', 'Colunas restauradas.');
    };

    const clearFilters = () => setActiveFilters({ city: '', captador: '', status: 'all', filial: 'all', sexo: 'all', dateStart: '', dateEnd: '', pendencia: 'all', gps: 'all' });

    const duplicateClient = useMemo(() => {
        if (!newClient.cpf_cnpj || newClient.cpf_cnpj.length < 11) return null;
        return (clients || []).find(c => c.cpf_cnpj === newClient.cpf_cnpj);
    }, [newClient.cpf_cnpj, clients]);

    const filteredCaptadores = useMemo(() => {
        if (!newClient.filial) return [];
        return (captadores || []).filter(c => c.filial === newClient.filial).sort((a, b) => a.nome.localeCompare(b.nome));
    }, [captadores, newClient.filial]);

    const toggleNewPendencia = (option: string) => {
        const current = newClient.pendencias || [];
        setNewClient({ ...newClient, pendencias: current.includes(option) ? current.filter(p => p !== option) : [...current, option] });
    };

    const isFetching = appLoading;

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
                        {showArchived ? <><Archive size={24} className="text-slate-400" /> Arquivo Morto</> : 'Clientes Ativos'}
                    </h2>
                    <p className="text-slate-400">Total: {totalClients}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }}
                        className={`px-4 py-2.5 rounded-lg border font-medium flex items-center gap-2 transition-all text-sm ${showArchived ? 'bg-gold-500/10 border-gold-500 text-gold-500' : 'bg-navy-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'}`}
                    >
                        {showArchived ? 'Voltar para Ativos' : 'Ver Arquivo Morto'}
                    </button>
                    {!showArchived && (
                        <button onClick={() => setIsNewClientModalOpen(true)} className="bg-gold-600 hover:bg-gold-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-gold-600/20 font-medium text-sm">
                            <Plus size={18} /> Novo Cliente
                        </button>
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
                saveViewMode={(mode) => { setViewMode(mode); saveUserPreferences({ clientsViewMode: mode }); }}
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
                        />
                    )}

                    <div className="flex items-center justify-between p-4 border-t border-zinc-800 bg-[#0f1014] mt-auto">
                        <span className="text-sm text-zinc-500">Página {currentPage} de {totalPages || 1} | Total: {totalClients}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm disabled:opacity-50"><ChevronLeft size={16} /></button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm disabled:opacity-50"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </>
            )}

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

            {whatsAppClient && (
                <WhatsAppModal
                    isOpen={isWhatsAppModalOpen}
                    onClose={() => { setIsWhatsAppModalOpen(false); setWhatsAppClient(null); }}
                    clientName={whatsAppClient.name}
                    phone={whatsAppClient.phone}
                />
            )}

            {isDocEditorOpen && (
                <DocumentEditorModal
                    isOpen={isDocEditorOpen}
                    onClose={() => setIsDocEditorOpen(false)}
                    initialContent={docContent}
                    title={docTitle}
                />
            )}

            {selectedClient && (
                <ClientDetailsModal
                    client={selectedClient}
                    onClose={() => setSelectedClient(null)}
                    initialTab={(clientDetailTab as any) || 'info'}
                    initialEditMode={isClientEditMode}
                />
            )}
        </div>
    );
};

export default Clients;
