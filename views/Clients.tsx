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

const DEFAULT_CLIENT_COLUMNS: ColumnConfig[] = [
    { id: 'nome', label: 'Nome / CPF', visible: true, order: 0 },
    { id: 'contato', label: 'Contato', visible: true, order: 1 },
    { id: 'filial', label: 'Filial', visible: true, order: 2 },
    { id: 'status', label: 'Status', visible: true, order: 3 },
    { id: 'gps', label: 'Situação GPS', visible: false, order: 4 }, // Nova Coluna
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
    // ATUALIZADO: Usando paginatedClients e fetchClients
    const {
        deleteClient, addClient, updateClient, cases, showToast,
        clientToView, setClientToView, clientDetailTab, setClientDetailTab, user, saveUserPreferences,
        captadores, addCaptador, isLoading: appLoading, mergedPreferences,
        clients // Mantemos clients para verificação de duplicidade
    } = useApp();



    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [showArchived, setShowArchived] = useState(false);

    // PAGINAÇÃO
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;



    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    // Sincroniza o selectedClient com a lista global quando houver mudanças (ex: após sync de documentos ou RGP)
    useEffect(() => {
        if (selectedClient) {
            const updated = clients.find(c => c.id === selectedClient.id);
            if (updated) {
                const docsChanged = JSON.stringify(updated.documentos) !== JSON.stringify(selectedClient.documentos);

                // Verifica mudanças no RGP (para atualizar o modal automaticamente)
                const rgpChanged =
                    updated.rgp_status !== selectedClient.rgp_status ||
                    updated.rgp_numero !== selectedClient.rgp_numero ||
                    updated.rgp_localidade !== selectedClient.rgp_localidade;

                if (docsChanged || rgpChanged) {
                    // Preserva os 'cases' do selectedClient atual, pois o 'updated' (da lista global) pode não ter os cases carregados
                    setSelectedClient(prev => prev ? { ...updated, cases: prev.cases } : updated as Client);
                }
            }
        }
    }, [clients, selectedClient]);

    const [isClientEditMode, setIsClientEditMode] = useState(false);

    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const [sortConfig, setSortConfig] = useState<{ key: keyof Client | 'status', direction: 'asc' | 'desc' }>({ key: 'nome_completo', direction: 'asc' });
    const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_CLIENT_COLUMNS);
    const [showColumnConfig, setShowColumnConfig] = useState(false);

    const [showFilters, setShowFilters] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        city: '', captador: '', status: 'all', filial: 'all', sexo: 'all',
        dateStart: '', dateEnd: '', pendencia: 'all', gps: 'all'
    });

    // --- DATA LOGIC (REVERTED TO LOCAL & FIXED) ---
    const sortedAndFilteredClients = useMemo(() => {
        // 1. Filter
        const filtered = clients.filter(c => {
            const isArchived = c.status === 'arquivado';
            if (showArchived && !isArchived) return false;
            if (!showArchived && isArchived) return false;

            const searchMatch = c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.cpf_cnpj?.includes(searchTerm) ||
                c.telefone?.includes(searchTerm);
            if (!searchMatch) return false;

            if (activeFilters.city && c.cidade !== activeFilters.city) return false;
            if (activeFilters.captador && c.captador !== activeFilters.captador) return false;
            if (activeFilters.filial !== 'all' && c.filial !== activeFilters.filial) return false;
            if (activeFilters.sexo !== 'all' && c.sexo !== activeFilters.sexo) return false;
            if (activeFilters.pendencia !== 'all' && !c.pendencias?.includes(activeFilters.pendencia)) return false;

            return true;
        });

        // 2. Sort (GLOBAL)
        return [...filtered].sort((a, b) => {
            const aValue = sortConfig.key === 'status' ? getClientActiveCases(a.id) : (a[sortConfig.key] || '');
            const bValue = sortConfig.key === 'status' ? getClientActiveCases(b.id) : (b[sortConfig.key] || '');

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [clients, searchTerm, activeFilters, showArchived, sortConfig]);

    const totalClients = sortedAndFilteredClients.length;

    const paginatedClients = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = sortedAndFilteredClients.slice(start, start + ITEMS_PER_PAGE);

        // 3. Join Cases (for GPS Status)
        return pageItems.map(client => ({
            ...client,
            cases: cases.filter(c => c.client_id === client.id)
        }));
    }, [sortedAndFilteredClients, currentPage, cases]);

    const isFetching = false;
    // Alias for compatibility with existing JSX
    const sortedClients = paginatedClients;

    // --- SEARCH REF & SHORTCUT ---
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



    // --- EFEITO DEBOUNCE PARA BUSCA ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // --- CORREÇÃO: VARIÁVEL DE DUPLICIDADE ---
    // Verifica se o CPF digitado no formulário "Novo Cliente" já existe na lista 'clients'
    const duplicateClient = useMemo(() => {
        if (!newClient.cpf_cnpj || newClient.cpf_cnpj.length < 11) return null;
        return clients.find(c => c.cpf_cnpj === newClient.cpf_cnpj);
    }, [newClient.cpf_cnpj, clients]);

    // Removido useEffect manual de carregamento



    const filteredCaptadores = useMemo(() => {
        if (!newClient.filial) return [];
        const caps = captadores.filter(c => c.filial === newClient.filial);
        return caps.sort((a, b) => a.nome.localeCompare(b.nome));
    }, [captadores, newClient.filial]);

    const handleAddCaptadorNew = async () => {
        if (!newCaptadorName.trim()) {
            showToast('error', 'Nome do captador é obrigatório.');
            return;
        }
        try {
            await addCaptador(newCaptadorName, newClient.filial as string);
            setNewClient({ ...newClient, captador: newCaptadorName });
            setIsAddingCaptador(false);
            setNewCaptadorName('');
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (user?.preferences?.clientsViewMode) { setViewMode(user.preferences.clientsViewMode); }
        if (user?.preferences?.clientsColumns) {
            const merged = [...user.preferences.clientsColumns];
            DEFAULT_CLIENT_COLUMNS.forEach(defCol => { if (!merged.find(c => c.id === defCol.id)) merged.push(defCol); });
            setColumns(merged.sort((a, b) => a.order - b.order));
        }
    }, [user]);

    useEffect(() => {
        const handleViewClient = async () => {
            if (clientToView) {
                // 1. Try to find in paginatedClients (current page)
                const cached = paginatedClients.find(c => c.id === clientToView);
                if (cached) {
                    setSelectedClient(cached);
                    setClientToView(null);
                    return;
                }

                // 2. Try to find in full clients list (if available)
                const inFull = clients.find(c => c.id === clientToView);
                if (inFull) {
                    setSelectedClient(inFull);
                    setClientToView(null);
                    return;
                }

                // 3. Fallback: Fetch from DB (server-side fetch for single client)
                // Usando loading interno para visualização individual
                setSelectedClient(null); // Feedback visual
                try {
                    const { data, error } = await supabase
                        .from('clients')
                        .select('*, cases(id, status, gps_lista, tipo, titulo)')
                        .eq('id', clientToView)
                        .single();

                    if (error) throw error;

                    if (data) {
                        const mapped: Client = {
                            ...data,
                            interviewStatus: data.interview_status || 'Pendente',
                            interviewDate: data.interview_date,
                            documentos: data.documentos || [],
                            cases: data.cases || []
                        };
                        setSelectedClient(mapped);
                    } else {
                        showToast('error', 'Cliente não encontrado.');
                    }
                } finally {
                    setClientToView(null);
                }
            }
        };

        handleViewClient();
    }, [clientToView, paginatedClients, clients, setClientToView, showToast]);

    const saveViewMode = (mode: 'list' | 'grid') => { setViewMode(mode); saveUserPreferences({ clientsViewMode: mode }); };
    const saveColumns = (newCols: ColumnConfig[]) => { setColumns(newCols); saveUserPreferences({ clientsColumns: newCols }); };
    const handleResetColumns = () => { setColumns(DEFAULT_CLIENT_COLUMNS); saveUserPreferences({ clientsColumns: DEFAULT_CLIENT_COLUMNS }); showToast('success', 'Colunas restauradas.'); };
    const moveColumn = (index: number, direction: 'up' | 'down') => {
        const newCols = [...columns];
        if (direction === 'up' && index > 0) [newCols[index], newCols[index - 1]] = [newCols[index - 1], newCols[index]];
        else if (direction === 'down' && index < newCols.length - 1) [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
        const reordered = newCols.map((col, idx) => ({ ...col, order: idx }));
        saveColumns(reordered);
    };
    const toggleColumn = (id: string) => { const newCols = columns.map(c => c.id === id ? { ...c, visible: !c.visible } : c); saveColumns(newCols); };
    const handleSort = (key: keyof Client | 'status') => { let direction: 'asc' | 'desc' = 'asc'; if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'; setSortConfig({ key, direction }); };

    function getClientActiveCases(clientId: string) {
        return cases.filter(c => c.client_id === clientId && c.status !== 'Arquivado').length;
    }

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

    const handleWhatsAppClick = (name: string, phone: string | undefined) => {
        if (!phone) { showToast('error', 'Cliente sem telefone.'); return; }
        setWhatsAppClient({ name, phone });
        setIsWhatsAppModalOpen(true);
    };

    const handleCopyPhone = (phone: string | undefined) => {
        if (!phone) return;
        navigator.clipboard.writeText(phone);
        showToast('success', 'Telefone copiado!');
    };

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawCep = e.target.value;
        const formattedCep = rawCep.replace(/\D/g, '').slice(0, 8);
        const displayCep = formattedCep.replace(/^(\d{5})(\d)/, '$1-$2');

        setNewClient({ ...newClient, cep: displayCep });

        if (formattedCep.length === 8) {
            setIsLoadingCep(true);
            const addressData = await fetchAddressByCep(formattedCep);
            setIsLoadingCep(false);
            if (addressData) {
                setNewClient(prev => ({ ...prev, endereco: addressData.logradouro, bairro: addressData.bairro, cidade: addressData.localidade, uf: addressData.uf }));
                showToast('success', 'Endereço preenchido automaticamente!');
            }
        }
    };

    const handleCnpjSearch = async () => {
        const cnpj = newClient.cpf_cnpj?.replace(/\D/g, '') || ''; if (cnpj.length !== 14) { showToast('error', 'Digite um CNPJ válido'); return; }
        setIsLoadingCnpj(true); const companyData = await fetchCnpjData(cnpj); setIsLoadingCnpj(false);
        if (companyData) { setNewClient(prev => ({ ...prev, nome_completo: companyData.razao_social, observacao: `Nome Fantasia: ${companyData.nome_fantasia}\nSituação: ${companyData.descricao_situacao_cadastral}`, endereco: companyData.logradouro, numero_casa: companyData.numero, bairro: companyData.bairro, cidade: companyData.municipio, uf: companyData.uf, telefone: companyData.ddd_telefone_1 ? `(${companyData.ddd_telefone_1.substring(0, 2)}) ${companyData.ddd_telefone_1.substring(2)}` : prev.telefone })); showToast('success', 'Dados da empresa importados!'); } else showToast('error', 'Erro na API.');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newClient.nome_completo || !newClient.cpf_cnpj || !newClient.data_nascimento || !newClient.sexo || !newClient.rg) {
            showToast('error', 'Preencha todos os Dados Pessoais (Nome, CPF, RG, Nascimento, Sexo).');
            return;
        }

        const temPendenciaSenha = newClient.pendencias?.includes('Senha');
        const temSenhaGov = newClient.senha_gov && newClient.senha_gov.trim() !== '';

        if (!temPendenciaSenha && !temSenhaGov) {
            showToast('error', 'A Senha Gov.br é obrigatória! Se não tiver, marque "Senha" nas Pendências.');
            return;
        }

        const numeroCasaFinal = newClient.numero_casa && newClient.numero_casa.trim() !== '' ? newClient.numero_casa : 'S/N';

        try {
            await addClient({
                id: crypto.randomUUID(),
                nome_completo: newClient.nome_completo,
                cpf_cnpj: newClient.cpf_cnpj,
                senha_gov: newClient.senha_gov || '',
                email: newClient.email || '',
                telefone: newClient.telefone || '',
                data_cadastro: new Date().toISOString(),
                data_nascimento: newClient.data_nascimento,
                sexo: newClient.sexo as any,
                endereco: newClient.endereco || '',
                numero_casa: numeroCasaFinal,
                bairro: newClient.bairro || '',
                cidade: newClient.cidade || '',
                uf: newClient.uf || '',
                cep: newClient.cep || '',
                rg: newClient.rg || '',
                orgao_emissor: newClient.orgao_emissor || '',
                nacionalidade: newClient.nacionalidade || 'Brasileira',
                estado_civil: newClient.estado_civil || '',
                profissao: newClient.profissao || '',
                senha: newClient.senha || '',
                captador: newClient.captador || '',
                filial: newClient.filial || '',
                observacao: newClient.observacao || '',
                foto: '',
                documentos: [],
                pendencias: newClient.pendencias || [],
                representante_nome: hasRepresentative ? newClient.representante_nome : undefined,
                representante_cpf: hasRepresentative ? newClient.representante_cpf : undefined,
                status: 'ativo'
            });

            setIsModalOpen(false);
            setNewClient({ nacionalidade: 'Brasileira', uf: 'MA', pendencias: [] });

        } catch (error: any) {
            console.error(error);
            if (error.message?.includes('duplicate key')) {
                showToast('error', 'Este CPF já está cadastrado.');
            } else {
                showToast('error', 'Erro ao salvar cliente.');
            }
        }
    };

    const clearFilters = () => { setActiveFilters({ city: '', captador: '', status: 'all', filial: 'all', sexo: 'all', dateStart: '', dateEnd: '', pendencia: 'all', gps: 'all' }); };

    const toggleNewPendencia = (option: string) => {
        const current = newClient.pendencias || [];
        const updated = current.includes(option) ? current.filter(p => p !== option) : [...current, option];
        setNewClient({ ...newClient, pendencias: updated });
    };

    const handleArchiveClick = (client: Client) => {
        if (client.status === 'arquivado') {
            handleRestoreClient(client);
        } else {
            setClientToArchive(client);
            setArchiveReason('');
        }
    };

    const handleRestoreClient = async (client: Client) => {
        if (!window.confirm(`Deseja restaurar este cliente para a lista ativa?`)) return;
        try {
            await updateClient({ ...client, status: 'ativo', motivo_arquivamento: undefined });
            showToast('success', 'Cliente restaurado com sucesso!');
        } catch (error: any) {
            console.error('Erro ao restaurar:', error);
            showToast('error', `Erro: ${error.message}`);
        }
    };

    const confirmArchiveClient = async () => {
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
    };

    const handleDeleteClick = (client: Client) => {
        setClientToDelete(client);
        setDeleteReason('');
    };

    const confirmDeleteClient = async () => {
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
    };

    const totalPages = Math.ceil(totalClients / ITEMS_PER_PAGE);

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
                        {showArchived ? <><Archive size={24} className="text-slate-400" /> Arquivo Morto</> : 'Clientes Ativos'}
                    </h2>
                    <p className="text-slate-400">Gerencie sua base de contatos. Total: {totalClients}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }}
                        className={`px-4 py-2.5 rounded-lg border font-medium flex items-center gap-2 transition-all text-sm ${showArchived ? 'bg-gold-500/10 border-gold-500 text-gold-500' : 'bg-navy-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'}`}
                    >
                        {showArchived ? 'Voltar para Ativos' : 'Ver Arquivo Morto'}
                    </button>
                    {!showArchived && (
                        <button onClick={() => setIsModalOpen(true)} className="bg-gold-600 hover:bg-gold-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-gold-600/20 font-medium text-sm">
                            <Plus size={18} /> Novo Cliente
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 p-3 rounded-xl shadow-lg mb-6 flex flex-col gap-3 relative z-50">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar por nome, CPF ou CNPJ... (Alt + P)"
                            className="w-full bg-navy-950/50 text-white pl-10 pr-10 py-2.5 border border-white/10 rounded-lg focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 outline-none transition-all placeholder:text-slate-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                title="Limpar busca"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group/sort">
                            <button className="px-3 py-2.5 rounded-lg border border-white/10 bg-navy-950/50 text-slate-400 hover:text-white flex items-center gap-2 transition-all text-sm font-medium"><SortAsc size={18} /> <span className="hidden sm:inline">{sortConfig.key === 'nome_completo' ? 'Nome' : sortConfig.key === 'filial' ? 'Filial' : sortConfig.key === 'captador' ? 'Captador' : 'Ordenar'}</span><ChevronDown size={14} /></button>
                            <div className="absolute right-0 top-full mt-2 w-40 bg-navy-950 border border-slate-700 rounded-xl shadow-2xl z-[100] p-2 hidden group-hover/sort:block animate-in fade-in zoom-in duration-100">
                                <button onClick={() => handleSort('nome_completo')} className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${sortConfig.key === 'nome_completo' ? 'bg-slate-800 text-gold-500' : 'text-slate-300 hover:bg-slate-800'}`}>Nome {sortConfig.key === 'nome_completo' && (sortConfig.direction === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}</button>
                                <button onClick={() => handleSort('filial')} className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${sortConfig.key === 'filial' ? 'bg-slate-800 text-gold-500' : 'text-slate-300 hover:bg-slate-800'}`}>Filial {sortConfig.key === 'filial' && (sortConfig.direction === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}</button>
                                <button onClick={() => handleSort('captador')} className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${sortConfig.key === 'captador' ? 'bg-slate-800 text-gold-500' : 'text-slate-300 hover:bg-slate-800'}`}>Captador {sortConfig.key === 'captador' && (sortConfig.direction === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}</button>
                            </div>
                        </div>
                        <button onClick={() => setShowFilters(!showFilters)} className={`px-3 py-2.5 rounded-lg border flex items-center gap-2 transition-all text-sm font-medium ${showFilters ? 'bg-navy-950 border-gold-500 text-gold-500' : 'bg-navy-950/50 border-white/10 text-slate-400 hover:text-white'}`}><Filter size={18} /> Filtros</button>
                        {viewMode === 'list' && (
                            <div className="relative">
                                <button onClick={() => setShowColumnConfig(!showColumnConfig)} className={`px-3 py-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all ${showColumnConfig ? 'bg-navy-950 border-gold-500 text-gold-500' : 'bg-navy-950/50 border-white/10 text-slate-400 hover:text-white'}`}><Settings size={18} /> <span className="hidden sm:inline">Colunas</span></button>
                                {showColumnConfig && (
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-navy-950 border border-slate-700 rounded-xl shadow-2xl z-[100] p-4 animate-in fade-in zoom-in duration-100">
                                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800"><h4 className="text-sm font-bold text-white">Editar Colunas</h4><button onClick={() => setShowColumnConfig(false)}><X size={16} className="text-slate-500 hover:text-white" /></button></div>
                                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                            {columns.map((col, idx) => (
                                                <div key={col.id} className="flex items-center justify-between group p-1 hover:bg-slate-800/50 rounded">
                                                    <div className="flex items-center gap-2"><input type="checkbox" checked={col.visible} onChange={() => toggleColumn(col.id)} className="rounded bg-navy-800 border-slate-600 text-gold-500 focus:ring-0 cursor-pointer" /><span className="text-sm text-slate-300">{col.label}</span></div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} className="p-1 hover:text-white text-slate-500 disabled:opacity-30"><ChevronUp size={14} /></button><button onClick={() => moveColumn(idx, 'down')} disabled={idx === columns.length - 1} className="p-1 hover:text-white text-slate-500 disabled:opacity-30"><ChevronDown size={14} /></button></div>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={handleResetColumns} className="w-full mt-3 text-xs text-red-400 hover:text-red-300 py-1 border border-red-500/20 rounded hover:bg-red-500/10">Restaurar Padrão</button>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="bg-navy-950/50 border border-white/10 rounded-lg flex p-0.5 items-center">
                            <button onClick={() => saveViewMode('grid')} className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={18} /></button>
                            <button onClick={() => saveViewMode('list')} className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}><LayoutList size={18} /></button>
                            <div className="w-px h-6 bg-white/10 mx-1"></div>
                            {viewMode === 'grid' ? (
                                <SizeScaler
                                    value={mergedPreferences.clientsCardScale || 1}
                                    onChange={(val) => saveUserPreferences({ clientsCardScale: val })}
                                    min={0.5} max={1.5} step={0.05}
                                />
                            ) : (
                                <SizeScaler
                                    value={mergedPreferences.clientsFontSize || 14}
                                    onChange={(val) => saveUserPreferences({ clientsFontSize: val })}
                                    min={10} max={20} step={1}
                                />
                            )}
                        </div>
                    </div>
                </div>
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-white/5 animate-in slide-in-from-top-2">
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Filial</label><select className="w-full bg-navy-950/50 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500" value={activeFilters.filial} onChange={(e) => setActiveFilters({ ...activeFilters, filial: e.target.value })}><option value="all">Todas</option>{Object.values(Branch).map(branch => <option key={branch} value={branch}>{branch}</option>)}</select></div>

                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Status (Processos)</label><select className="w-full bg-navy-950/50 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500" value={activeFilters.status} onChange={(e) => setActiveFilters({ ...activeFilters, status: e.target.value })}><option value="all">Todos</option><option value="active">Ativo</option><option value="concedido">Concedido</option><option value="indeferido">Indeferido</option><option value="inactive">Inativo</option></select></div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Pendências</label>
                            <select className="w-full bg-navy-950/50 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500" value={activeFilters.pendencia} onChange={(e) => setActiveFilters({ ...activeFilters, pendencia: e.target.value })}>
                                <option value="all">Todas</option>
                                <option value="com_pendencia">Com Pendências</option>
                                <option value="sem_pendencia">Regular</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Situação GPS</label>
                            <select className="w-full bg-navy-950/50 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500" value={activeFilters.gps} onChange={(e) => setActiveFilters({ ...activeFilters, gps: e.target.value })}>
                                <option value="all">Todas</option>
                                <option value="pendente">Pendente (Sem Guia)</option>
                                <option value="puxada">Puxada (A Pagar)</option>
                                <option value="regular">Regular (Pago)</option>
                            </select>
                        </div>

                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Sexo</label><select className="w-full bg-navy-950/50 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500" value={activeFilters.sexo} onChange={(e) => setActiveFilters({ ...activeFilters, sexo: e.target.value })}><option value="all">Todos</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select></div>
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Captador</label><input className="w-full bg-navy-950/50 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500" placeholder="Nome" value={activeFilters.captador} onChange={(e) => setActiveFilters({ ...activeFilters, captador: e.target.value })} /></div>
                        <div className="md:col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Data Cadastro</label><div className="flex gap-2"><input type="date" className="w-full bg-navy-950/50 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none [color-scheme:dark]" value={activeFilters.dateStart} onChange={(e) => setActiveFilters({ ...activeFilters, dateStart: e.target.value })} /><input type="date" className="w-full bg-navy-950/50 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none [color-scheme:dark]" value={activeFilters.dateEnd} onChange={(e) => setActiveFilters({ ...activeFilters, dateEnd: e.target.value })} /></div></div>
                        <div className="flex items-end md:col-span-4"><button onClick={clearFilters} className="w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-600">Limpar Filtros</button></div>
                    </div>
                )}
            </div>

            {
                isFetching ? (
                    <div className="flex-1 flex justify-center items-center">
                        <Loader2 className="animate-spin text-gold-500" size={40} />
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4" style={{ transform: `scale(${mergedPreferences.clientsCardScale || 1})`, transformOrigin: 'top left', width: `${100 / (mergedPreferences.clientsCardScale || 1)}%` }}>
                                {sortedClients.map(client => {
                                    // Use client.cases directly for Source of Truth
                                    const activeCases = (client.cases || []).filter(c => c.status && c.status.toLowerCase() !== 'arquivado').length;

                                    const hasPendencias = (client.pendencias || []).length > 0;
                                    return (
                                        <div key={client.id} onClick={() => setSelectedClient(client)} className={`bg-zinc-900/60 backdrop-blur-md border ${hasPendencias ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-white/5'} rounded-xl p-5 hover:border-gold-600/30 transition-all cursor-pointer group relative overflow-hidden shadow-lg hover:shadow-2xl`}>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-4">
                                                    {client.foto ? <img src={client.foto} alt={client.nome_completo} className="w-14 h-14 rounded-full border-2 border-slate-700 object-cover" /> : (
                                                        <div className={`w-14 h-14 rounded-full border-2 border-white/10 flex items-center justify-center font-bold text-xl shadow-inner ${hasPendencias ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-700 text-zinc-300'
                                                            }`}>
                                                            {String(client.nome_completo || '').substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="font-bold text-slate-200 group-hover:text-gold-500 transition-colors line-clamp-1">{client.nome_completo}</h3>
                                                        <p className="text-xs text-slate-500">{client.cpf_cnpj}</p>
                                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-100 font-medium"><Building2 size={12} /> {client.filial || 'Matriz'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            {hasPendencias && (
                                                <div className="mb-3">
                                                    <span className="text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded flex items-center gap-1 w-fit">
                                                        <AlertTriangle size={10} /> {client.pendencias!.length} Pendências
                                                    </span>
                                                </div>
                                            )}
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-400"><Phone size={14} /> {client.telefone || '-'}</div>
                                                <div className="flex items-center gap-2 text-sm text-slate-400 truncate"><MapPin size={14} /> {client.cidade ? `${client.cidade} - ${client.uf}` : (client.endereco ? client.endereco.split(',')[0] : 'Endereço não informado')}</div>
                                            </div>
                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                {(() => {
                                                    const status = getClientStatus(client.id);
                                                    return (
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                                                            {status.label === 'Ativo' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                                                            {status.label}
                                                        </span>
                                                    );
                                                })()}
                                                <div className="flex gap-1">
                                                    {client.telefone && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleWhatsAppClick(client.nome_completo, client.telefone); }} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors" title="WhatsApp"><MessageCircle size={16} /></button>
                                                    )}

                                                    <button onClick={(e) => { e.stopPropagation(); handleArchiveClick(client); }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title={client.status === 'arquivado' ? 'Restaurar' : 'Arquivar'}>
                                                        {client.status === 'arquivado' ? <RefreshCw size={16} /> : <Archive size={16} />}
                                                    </button>

                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(client); }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Excluir"><Trash2 size={16} /></button>

                                                    <button onClick={() => setSelectedClient(client)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"><Eye size={16} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {sortedClients.length === 0 && <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">Nenhum cliente encontrado.</div>}
                            </div>
                        ) : (
                            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl shadow-2xl overflow-hidden flex-1 flex flex-col relative z-0">
                                <div className="overflow-y-auto flex-1 custom-scrollbar">
                                    <table className="w-full text-left border-collapse" style={{ fontSize: `${mergedPreferences.clientsFontSize || 14}px` }}>
                                        <thead className="bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-white/5">
                                            <tr>
                                                {columns.filter(c => c.visible).map(col => (
                                                    <th key={col.id} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-white select-none" onClick={() => { if (col.id === 'nome') handleSort('nome_completo'); if (col.id === 'filial') handleSort('filial'); if (col.id === 'captador') handleSort('captador'); }}>
                                                        <div className="flex items-center gap-1">{col.label}{(col.id === 'nome' && sortConfig.key === 'nome_completo') || (col.id === 'filial' && sortConfig.key === 'filial') || (col.id === 'captador' && sortConfig.key === 'captador') ? (sortConfig.direction === 'asc' ? <ArrowDown size={12} className="text-gold-500" /> : <ArrowUp size={12} className="text-gold-500" />) : (['nome', 'filial', 'captador'].includes(col.id) && <ArrowUpDown size={12} className="text-slate-600" />)}</div>
                                                    </th>
                                                ))}
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {sortedClients.map(client => (
                                                <ClientRow
                                                    key={client.id}
                                                    client={client}
                                                    columns={columns}
                                                    hasPendencias={(client.pendencias || []).length > 0}
                                                    getClientStatus={getClientStatus}
                                                    setSelectedClient={setSelectedClient}
                                                    setIsClientEditMode={setIsClientEditMode}
                                                    handleWhatsAppClick={handleWhatsAppClick}
                                                    handleArchiveClick={handleArchiveClick}
                                                    handleDeleteClick={handleDeleteClick}
                                                    handleCopyPhone={handleCopyPhone}
                                                />
                                            ))}
                                            {sortedClients.length === 0 && <tr><td colSpan={columns.filter(c => c.visible).length + 1} className="text-center py-12 text-slate-500">Nenhum cliente encontrado.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* BARRA DE PAGINAÇÃO */}
                        <div className="flex items-center justify-between p-4 border-t border-zinc-800 bg-[#0f1014] mt-auto">
                            <span className="text-sm text-zinc-500">
                                Página <span className="text-white font-bold">{currentPage}</span> de <span className="text-white font-bold">{totalPages || 1}</span>
                                <span className="mx-2 text-zinc-700">|</span>
                                Total: {totalClients}
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
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages || isFetching}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    Próximo <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )
            }

            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#09090b] border border-zinc-800 rounded-2xl max-w-4xl w-full p-0 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-[#09090b]">
                                <div>
                                    <h3 className="text-xl font-bold text-white font-serif flex items-center gap-2">
                                        <User className="text-gold-500" size={24} /> Novo Cadastro
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-1">Preencha os dados completos para iniciar o atendimento.</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="overflow-y-auto custom-scrollbar p-6 bg-[#09090b]">
                                <form onSubmit={handleSubmit} className="space-y-6">

                                    <div className="grid grid-cols-12 gap-4">
                                        <div className="col-span-12 flex items-center gap-2 mb-2">
                                            <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1"><FileText size={14} /> Dados Pessoais</h4>
                                            <div className="h-px bg-zinc-800 flex-1"></div>
                                        </div>

                                        <div className="col-span-12 md:col-span-8">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome Completo <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                <input
                                                    required
                                                    className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none transition-all placeholder:text-zinc-600"
                                                    value={newClient.nome_completo || ''}
                                                    onChange={e => setNewClient({ ...newClient, nome_completo: e.target.value })}
                                                    placeholder="Ex: João da Silva"
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-12 md:col-span-4">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">CPF/CNPJ <span className="text-red-500">*</span></label>
                                            <div className="relative group flex gap-2">
                                                <div className="relative flex-1">
                                                    <CreditCard className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${newClient.cpf_cnpj && 'text-zinc-600 group-focus-within:text-yellow-600'}`} size={18} />
                                                    <input
                                                        required
                                                        className={`w-full bg-[#0f1014] border text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all placeholder:text-zinc-600 ${duplicateClient ? 'border-red-500 text-red-400' : 'border-zinc-800 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20'}`}
                                                        value={newClient.cpf_cnpj || ''}
                                                        onChange={e => setNewClient({ ...newClient, cpf_cnpj: formatCPFOrCNPJ(e.target.value) })}
                                                        placeholder="000.000.000-00"
                                                        maxLength={18}
                                                    />
                                                    {duplicateClient && (
                                                        <p className="text-[10px] text-red-500 mt-1 absolute left-0 top-full bg-red-500/10 px-2 py-1 rounded border border-red-500/20 z-10 w-full">
                                                            CPF já pertence a: <strong>{duplicateClient.nome_completo}</strong>
                                                        </p>
                                                    )}
                                                </div>
                                                <button type="button" onClick={handleCnpjSearch} disabled={isLoadingCnpj} className="px-3 bg-[#0f1014] border border-zinc-800 rounded-xl hover:border-yellow-600 hover:text-yellow-600 text-zinc-400 transition-colors disabled:opacity-50" title="Buscar CNPJ">{isLoadingCnpj ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}</button>
                                            </div>
                                        </div>

                                        <div className="col-span-6 md:col-span-3">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">RG <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                <input required className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.rg || ''} onChange={e => setNewClient({ ...newClient, rg: e.target.value })} placeholder="0000000" />
                                            </div>
                                        </div>

                                        <div className="col-span-6 md:col-span-2">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Org. Emissor</label>
                                            <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.orgao_emissor || ''} onChange={e => setNewClient({ ...newClient, orgao_emissor: e.target.value })} placeholder="SSP/MA" />
                                        </div>

                                        <div className="col-span-6 md:col-span-3">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nascimento <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 z-10 pointer-events-none" size={18} />
                                                <input
                                                    type="date"
                                                    required
                                                    className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none [color-scheme:dark] relative z-0 placeholder:text-zinc-600"
                                                    value={newClient.data_nascimento || ''}
                                                    onChange={e => setNewClient({ ...newClient, data_nascimento: e.target.value })}
                                                    style={{ colorScheme: 'dark' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-6 md:col-span-2">
                                            <CustomSelect
                                                label="Sexo"
                                                value={newClient.sexo || ''}
                                                onChange={(val) => setNewClient({ ...newClient, sexo: val as any })}
                                                options={SEX_OPTIONS}
                                                required
                                                placeholder="Selecione"
                                            />
                                        </div>

                                        <div className="col-span-6 md:col-span-2">
                                            <CustomSelect
                                                label="Est. Civil"
                                                value={newClient.estado_civil || ''}
                                                onChange={(val) => setNewClient({ ...newClient, estado_civil: val })}
                                                options={CIVIL_STATUS_OPTIONS}
                                                icon={Heart}
                                                placeholder="Selecione"
                                            />
                                        </div>

                                        <div className="col-span-12 md:col-span-3">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nacionalidade</label>
                                            <div className="relative group">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.nacionalidade || 'Brasileira'} onChange={e => setNewClient({ ...newClient, nacionalidade: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="col-span-12 md:col-span-3">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Profissão</label>
                                            <div className="relative group">
                                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.profissao || ''} onChange={e => setNewClient({ ...newClient, profissao: e.target.value })} placeholder="Ex: Lavrador(a)" />
                                            </div>
                                        </div>

                                        <div className="col-span-12 mt-2 mb-2">
                                            <div className="flex items-center gap-2 mb-3">
                                                <button type="button" onClick={() => setHasRepresentative(!hasRepresentative)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasRepresentative ? 'bg-gold-600 border-gold-600' : 'bg-zinc-800 border-zinc-600'}`}>
                                                    {hasRepresentative && <Check size={14} className="text-white" />}
                                                </button>
                                                <label onClick={() => setHasRepresentative(!hasRepresentative)} className="text-sm text-zinc-300 font-medium cursor-pointer select-none">Adicionar Representante Legal (Opcional)</label>
                                            </div>

                                            {hasRepresentative && (
                                                <div className="grid grid-cols-12 gap-4 animate-in slide-in-from-top-2 fade-in duration-200 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                                                    <div className="col-span-12 md:col-span-8">
                                                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome do Representante</label>
                                                        <div className="relative group">
                                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                            <input
                                                                className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600"
                                                                value={newClient.representante_nome || ''}
                                                                onChange={e => setNewClient({ ...newClient, representante_nome: e.target.value })}
                                                                placeholder="Nome do Pai, Mãe ou Responsável"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-4">
                                                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">CPF do Representante</label>
                                                        <div className="relative group">
                                                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                            <input
                                                                className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600"
                                                                value={newClient.representante_cpf || ''}
                                                                onChange={e => setNewClient({ ...newClient, representante_cpf: formatCPFOrCNPJ(e.target.value) })}
                                                                placeholder="000.000.000-00"
                                                                maxLength={14}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-span-12 md:col-span-3">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Telefone</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.telefone || ''} onChange={e => setNewClient({ ...newClient, telefone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                                            </div>
                                        </div>

                                        <div className="col-span-12 md:col-span-3">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                <input type="email" className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.email || ''} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="email@exemplo.com" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- BLOCO CREDENCIAIS GOV --- */}
                                    <div className="col-span-12 flex items-center gap-2 mb-2 mt-4">
                                        <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1"><Lock size={14} /> Acesso Gov.br</h4>
                                        <div className="h-px bg-zinc-800 flex-1"></div>
                                    </div>

                                    <div className="grid grid-cols-12 gap-4">
                                        <div className="col-span-12 md:col-span-6">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                                                Senha Gov.br {newClient.pendencias?.includes('Senha') ? '(Pendente)' : <span className="text-red-500">*</span>}
                                            </label>
                                            <input
                                                type="text"
                                                className={`w-full bg-[#0f1014] border px-4 py-2.5 rounded-xl outline-none transition-all placeholder:text-zinc-600 ${!newClient.senha_gov && !newClient.pendencias?.includes('Senha')
                                                    ? 'border-red-500/50 focus:border-red-500'
                                                    : 'border-zinc-800 focus:border-yellow-600'
                                                    }`}
                                                value={newClient.senha_gov || ''}
                                                onChange={e => setNewClient({ ...newClient, senha_gov: e.target.value })}
                                                placeholder={newClient.pendencias?.includes('Senha') ? "Senha marcada como pendente" : "Digite a senha do Gov.br"}
                                                disabled={newClient.pendencias?.includes('Senha')}
                                            />
                                            {newClient.pendencias?.includes('Senha') && (
                                                <p className="text-[10px] text-yellow-500 mt-1">
                                                    * Cadastro permitido sem senha pois a pendência "Senha" foi marcada abaixo.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-12 gap-4 mt-6">
                                        <div className="col-span-12 flex items-center gap-2 mb-2 mt-4">
                                            <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1"><MapPin size={14} /> Endereço</h4>
                                            <div className="h-px bg-zinc-800 flex-1"></div>
                                        </div>

                                        <div className="col-span-12 md:col-span-3">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">CEP</label>
                                            <div className="relative group">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-yellow-600 transition-colors" size={18} />
                                                <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-10 pr-8 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.cep || ''} onChange={(e) => handleCepChange(e)} placeholder="00000-000" maxLength={9} />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">{isLoadingCep && <Loader2 size={16} className="animate-spin text-yellow-500" />}</div>
                                            </div>
                                        </div>

                                        <div className="col-span-12 md:col-span-7">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Logradouro (Rua)</label>
                                            <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.endereco || ''} onChange={e => setNewClient({ ...newClient, endereco: e.target.value })} placeholder="Rua, Avenida..." />
                                        </div>

                                        <div className="col-span-12 md:col-span-2">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Número</label>
                                            <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.numero_casa || ''} onChange={e => setNewClient({ ...newClient, numero_casa: e.target.value })} placeholder="S/N" />
                                        </div>

                                        <div className="col-span-12 md:col-span-4">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Bairro</label>
                                            <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.bairro || ''} onChange={e => setNewClient({ ...newClient, bairro: e.target.value })} />
                                        </div>

                                        <div className="col-span-12 md:col-span-6">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Cidade</label>
                                            <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none placeholder:text-zinc-600" value={newClient.cidade || ''} onChange={e => setNewClient({ ...newClient, cidade: e.target.value })} />
                                        </div>

                                        <div className="col-span-12 md:col-span-2">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">UF</label>
                                            <input className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none uppercase placeholder:text-zinc-600" value={newClient.uf || ''} onChange={e => setNewClient({ ...newClient, uf: e.target.value })} maxLength={2} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-12 gap-4 mt-6">
                                        <div className="col-span-12 flex items-center gap-2 mb-2 mt-4">
                                            <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1"><Building2 size={14} /> Sistema & Origem</h4>
                                            <div className="h-px bg-zinc-800 flex-1"></div>
                                        </div>

                                        <div className="col-span-12 md:col-span-6">
                                            <CustomSelect
                                                label="Filial"
                                                value={newClient.filial as string || ''}
                                                onChange={(val) => setNewClient(prev => ({ ...prev, filial: val, captador: '' }))}
                                                options={BRANCH_OPTIONS}
                                                icon={Building2}
                                                placeholder="Selecione"
                                            />
                                        </div>

                                        <div className="col-span-12 md:col-span-6 relative">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                                                Captador / Origem
                                            </label>

                                            <div className="flex gap-2">
                                                {isAddingCaptador ? (
                                                    <div className="flex-1 flex gap-2 animate-in slide-in-from-left-2 fade-in duration-200">
                                                        <input
                                                            autoFocus
                                                            className="w-full bg-[#0f1014] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-gold-500"
                                                            placeholder="Nome do novo captador..."
                                                            value={newCaptadorName}
                                                            onChange={(e) => setNewCaptadorName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleAddCaptadorNew();
                                                                if (e.key === 'Escape') { setIsAddingCaptador(false); setNewCaptadorName(''); }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddCaptadorNew}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors"
                                                            title="Salvar Captador"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setIsAddingCaptador(false); setNewCaptadorName(''); }}
                                                            className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-colors"
                                                            title="Cancelar"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex gap-2">
                                                        <div className="flex-1">
                                                            <CustomSelect
                                                                label=""
                                                                value={newClient.captador || ''}
                                                                onChange={(val) => setNewClient({ ...newClient, captador: val })}
                                                                options={filteredCaptadores.map(c => ({ label: c.nome, value: c.nome }))}
                                                                icon={Share2}
                                                                placeholder={newClient.filial ? "Selecione..." : "Selecione uma filial"}
                                                            />
                                                        </div>

                                                        {newClient.filial && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsAddingCaptador(true)}
                                                                className="bg-zinc-800 border border-zinc-700 hover:border-gold-500 hover:text-gold-500 text-zinc-400 p-2.5 rounded-xl transition-all h-[42px] mt-auto"
                                                                title="Adicionar Novo Captador"
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-span-12">
                                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Observação</label>
                                            <textarea rows={3} className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 p-4 rounded-xl focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 outline-none resize-none placeholder:text-zinc-600" value={newClient.observacao || ''} onChange={e => setNewClient({ ...newClient, observacao: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-12 gap-4 mt-6">
                                        <div className="col-span-12 flex items-center gap-2 mb-2 mt-4">
                                            <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={14} /> Controle de Pendências</h4>
                                            <div className="h-px bg-zinc-800 flex-1"></div>
                                        </div>
                                        <div className="col-span-12 flex flex-wrap gap-2">
                                            {PENDING_OPTIONS.map(option => {
                                                const isSelected = newClient.pendencias?.includes(option);
                                                return (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => toggleNewPendencia(option)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}
                                                    >
                                                        {option}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </form>
                            </div>

                            <div className="p-6 border-t border-zinc-800 bg-[#09090b] flex justify-end gap-3 rounded-b-2xl">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium">Cancelar</button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={!!duplicateClient}
                                    className={`px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95 bg-yellow-600 text-white hover:bg-yellow-500 shadow-yellow-600/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <CheckSquare size={18} /> Salvar Cadastro
                                </button>
                            </div>
                        </div>
                    </div >
                )
            }

            {
                clientToArchive && (
                    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-[#0f1014] border border-zinc-800 p-6 rounded-xl max-w-sm w-full shadow-2xl">
                            <div className="flex flex-col items-center mb-4">
                                <div className="p-3 bg-zinc-800 rounded-full mb-3 text-zinc-400">
                                    <Archive size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">Arquivar Cliente</h3>
                                <p className="text-xs text-zinc-500 text-center mt-1">
                                    {clientToArchive.nome_completo}
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Motivo do Arquivamento</label>
                                <textarea
                                    className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-gold-500 resize-none h-24"
                                    placeholder="Ex: Falecimento, Troca de Advogado, Desistência..."
                                    value={archiveReason}
                                    onChange={(e) => setArchiveReason(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setClientToArchive(null)}
                                    className="flex-1 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmArchiveClient}
                                    className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    Arquivar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                clientToDelete && (
                    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-[#0f1014] border border-red-900/50 p-6 rounded-xl max-w-sm w-full shadow-2xl shadow-red-900/20">
                            <div className="flex flex-col items-center mb-4">
                                <div className="p-3 bg-red-900/20 rounded-full mb-3 text-red-500 border border-red-900/50">
                                    <Trash2 size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">Excluir Definitivamente</h3>
                                <p className="text-xs text-zinc-500 text-center mt-1">
                                    {clientToDelete.nome_completo}
                                </p>
                            </div>

                            <div className="mb-4">
                                <div className="bg-red-900/10 border border-red-900/30 p-3 rounded-lg mb-3">
                                    <p className="text-xs text-red-300 text-center font-medium">Atenção: Esta ação não pode ser desfeita. Todos os dados serão perdidos.</p>
                                </div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Motivo da Exclusão <span className="text-red-500">*</span></label>
                                <textarea
                                    className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 resize-none h-24"
                                    placeholder="Informe o motivo da exclusão..."
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setClientToDelete(null)}
                                    className="flex-1 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteClient}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-red-900/30"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

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

            {
                selectedClient && (
                    <ClientDetailsModal
                        client={selectedClient}
                        onClose={() => { setSelectedClient(null); setClientDetailTab('info'); }}
                        onSelectCase={(c) => { setSelectedCase(c); setIsEditMode(false); }}
                        initialEditMode={isClientEditMode}
                        initialTab={clientDetailTab}
                    />
                )
            }

            {
                selectedCase && (
                    <CaseDetailsModal
                        key={selectedCase.id}
                        caseItem={selectedCase}
                        initialEditMode={isEditMode}
                        onClose={() => { setSelectedCase(null); setIsEditMode(false); }}
                        onSelectCase={(c) => { setSelectedCase(c); setIsEditMode(false); }}
                        onViewClient={(clientId) => {
                            setClientToView(clientId);
                            setSelectedCase(null);
                        }}
                    />
                )
            }
        </div >
    );
};

export default Clients;
