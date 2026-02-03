import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../services/supabaseClient';
import { CaseStatus, CaseType, Case } from '../../types';
import { X, Save, FileText, User, Gavel, DollarSign, Hash, CreditCard, Search, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { formatCurrencyInput, formatProcessNumber, parseCurrencyToNumber } from '../../services/formatters';
import { formatDateForDB } from '../../utils/dateUtils';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { fetchClientsData } from '../../services/clientsService';

interface NewCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    forcedType?: string;
}

type PaymentStatus = 'Pendente' | 'Parcial' | 'Pago' | 'Não Aplicável';
const paymentStatuses: PaymentStatus[] = ['Pendente', 'Parcial', 'Pago', 'Não Aplicável'];

// Hard-coded safe defaults to prevent crashes if Enum is undefined
const SAFE_CIVIL = 'Cível/Outros';
const SAFE_SEGURO = 'Seguro Defeso';
const SAFE_APOSENTADORIA = 'Aposentadoria';
const SAFE_MATERNIDADE = 'Salário Maternidade';
const SAFE_BPC = 'BPC/LOAS';

const MODALITY_OPTIONS: Record<string, string[]> = {
    [SAFE_APOSENTADORIA]: ['Rural', 'Urbana', 'Híbrida'],
    [SAFE_MATERNIDADE]: ['Rural', 'Urbana', 'Outros'],
    [SAFE_BPC]: ['Deficiente', 'Idoso'],
    ['Auxílio Doença']: ['Previdenciário', 'Acidentário']
};

const BENEFIT_FIELDS: Record<string, { label: string, key: string, placeholder: string, type?: string }[]> = {
    [SAFE_APOSENTADORIA]: [
        { label: 'NIT', key: 'nit', placeholder: '000.00000.00-0' },
        { label: 'DER (Data de Entrada)', key: 'der', placeholder: '', type: 'date' }
    ],
    [SAFE_MATERNIDADE]: [
        { label: 'Data do Parto / Atestado', key: 'data_parto', placeholder: '', type: 'date' },
        { label: 'NIT', key: 'nit', placeholder: '000.00000.00-0' }
    ],
    [SAFE_BPC]: [
        { label: 'NIS / CadÚnico', key: 'nis', placeholder: '000.00000.00-0' },
        { label: 'Renda Familiar Est.', key: 'renda_familiar', placeholder: 'R$ 0,00' }
    ],
    ['Auxílio Doença']: [
        { label: 'NIT', key: 'nit', placeholder: '000.00000.00-0' },
        { label: 'CID (Opcional)', key: 'cid', placeholder: 'Ex: M54.5' },
        { label: 'Data Início Incapacidade', key: 'data_incapacidade', placeholder: '', type: 'date' }
    ]
};

const NewCaseModal: React.FC<NewCaseModalProps> = ({ isOpen, onClose, forcedType }) => {
    useLockBodyScroll(isOpen);
    const { addCase, showToast, newCaseParams, user, saveUserPreferences } = useApp();

    // Async Search State
    const [clientsList, setClientsList] = useState<Partial<import('../../types').Client>[]>([]);
    const [isSearchingClients, setIsSearchingClients] = useState(false);
    const [existingCasesForClient, setExistingCasesForClient] = useState<Case[]>([]);
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

    // Ensure CaseType is defined before using it
    const safeAllTypes = useMemo(() => {
        // Fallback robusto se o Enum falhar
        const defaults = [SAFE_SEGURO, 'Aposentadoria', 'BPC/LOAS', 'Auxílio Doença', 'Salário Maternidade', 'Trabalhista', SAFE_CIVIL];

        try {
            if (typeof CaseType !== 'undefined' && Object.keys(CaseType).length > 0) {
                return Object.values(CaseType);
            }
        } catch (e) {
            console.warn("CaseType access error", e);
        }
        return defaults;
    }, []);

    const [newCase, setNewCase] = useState<Partial<Case>>({
        status: CaseStatus.PROTOCOLAR,
        tipo: SAFE_CIVIL as any, // Start with string to be safe
        tribunal: '',
        data_abertura: formatDateForDB(new Date()) || new Date().toISOString().split('T')[0],
        titulo: '',
        numero_processo: '',
        valor_causa: 0,
        status_pagamento: 'Pendente' as any,
        valor_honorarios_pagos: 0,
        data_fatal: '',
        metadata: {}
    });
    const [currencyInput, setCurrencyInput] = useState('');
    const [showNewModalityInput, setShowNewModalityInput] = useState(false);
    const [newModalityValue, setNewModalityValue] = useState('');
    const [showNewTypeInput, setShowNewTypeInput] = useState(false);
    const [newTypeValue, setNewTypeValue] = useState('');

    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [isClientListOpen, setIsClientListOpen] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    // Filter types logic - Defensive
    const availableTypes = useMemo(() => {
        const types = [...safeAllTypes] as CaseType[];
        const customTypes = user?.preferences?.customCaseTypes || [];

        // Merge custom types
        const mergedTypes = Array.from(new Set([...types, ...customTypes]));

        const seguroDefeso = SAFE_SEGURO;

        // If parameters forced a type, allow it even if view is different (prioritize params)
        if (newCaseParams?.type) return mergedTypes;

        if (forcedType === seguroDefeso) return [seguroDefeso as any];

        if (forcedType === 'Judicial' || forcedType === 'Administrativo') return mergedTypes.filter(t => t !== seguroDefeso);
        return mergedTypes.filter(t => t !== (seguroDefeso as any));
    }, [forcedType, safeAllTypes, newCaseParams, user?.preferences?.customCaseTypes]);

    // Filter statuses logic - Defensive
    const availableStatuses = useMemo(() => {
        if (!newCase.tipo) return Object.values(CaseStatus);

        const seguroDefeso = SAFE_SEGURO;

        if (newCase.tipo === seguroDefeso) {
            return [
                CaseStatus.PROTOCOLAR,
                CaseStatus.ANALISE,
                CaseStatus.EXIGENCIA,
                CaseStatus.CONCLUIDO_CONCEDIDO,
                CaseStatus.CONCLUIDO_INDEFERIDO
            ];
        }

        const administrativeTypes = [
            'Aposentadoria',
            'Salário Maternidade',
            'BPC/LOAS',
            'Auxílio Doença'
        ];

        // Flexible check
        if (administrativeTypes.includes(String(newCase.tipo))) {
            return [
                CaseStatus.PROTOCOLAR,
                CaseStatus.ANALISE,
                CaseStatus.EXIGENCIA,
                CaseStatus.CONCLUIDO_CONCEDIDO,
                CaseStatus.CONCLUIDO_INDEFERIDO
            ];
        }

        return Object.values(CaseStatus);
    }, [newCase.tipo]);

    // Merged Modality Options
    const currentModalityOptions = useMemo(() => {
        const type = newCase.tipo as string;
        if (!type) return [];

        const baseOptions = MODALITY_OPTIONS[type] || [];
        const customOptions = user?.preferences?.customModalities?.[type] || [];

        // Unique options
        return Array.from(new Set([...baseOptions, ...customOptions]));
    }, [newCase.tipo, user?.preferences?.customModalities]);

    // Initialization Effect
    useEffect(() => {
        if (isOpen) {
            const CIVIL = SAFE_CIVIL;
            const SEGURO = SAFE_SEGURO;
            const APOSENTADORIA = 'Aposentadoria';

            let initialType: any = CIVIL;
            let initialTribunal = '';
            let initialStatus = CaseStatus.PROTOCOLAR;
            let initialClientId = '';
            let initialClientName = '';
            let initialValor = 0;

            // 1. Dashboard forced params
            if (forcedType === SEGURO) {
                initialType = SEGURO;
                initialTribunal = 'INSS';
                initialValor = 6508;
            }
            else if (forcedType === 'Administrativo') {
                initialType = APOSENTADORIA;
                initialTribunal = 'INSS';
            }
            else if (forcedType === 'Judicial') {
                initialType = CIVIL;
                initialTribunal = 'TJ/TRF';
            }

            // 2. Client Details params (Priority)
            if (newCaseParams) {
                if (newCaseParams.type) {
                    initialType = newCaseParams.type;
                }

                if (newCaseParams.clientId) {
                    initialClientId = newCaseParams.clientId;
                    // For prepopulation, we can't look up name easily without 'clients'. 
                    initialClientName = newCaseParams.clientName || '';
                }

                // Adjust tribunal
                const adminTypes = [APOSENTADORIA, 'BPC/LOAS', 'Salário Maternidade', 'Auxílio Doença'];

                if (initialType === SEGURO) {
                    initialTribunal = 'INSS';
                    initialValor = 6508;
                }
                else if (adminTypes.includes(String(initialType))) initialTribunal = 'INSS';
                else initialTribunal = 'TJ/TRF';
            }

            setNewCase(prev => ({
                ...prev,
                status: initialStatus,
                tipo: initialType,
                tribunal: initialTribunal,
                client_id: initialClientId,
                data_abertura: formatDateForDB(new Date()) || new Date().toISOString().split('T')[0],
                status_pagamento: 'Pendente' as any,
                valor_causa: initialValor,
                valor_honorarios_pagos: 0,
                titulo: '',
                numero_processo: '',
                data_fatal: '',
                modalidade: MODALITY_OPTIONS[initialType] ? MODALITY_OPTIONS[initialType][0] : undefined,
                metadata: {}
            }));

            setCurrencyInput(initialValor > 0 ? formatCurrencyInput(String(initialValor * 100)) : '');
            setClientSearchTerm(initialClientName);
            setIsClientListOpen(false);
        }
    }, [isOpen, forcedType, newCaseParams]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setIsClientListOpen(false);
            }
        }
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Safe effect for Seguro Defeso values
    useEffect(() => {
        if (newCase.tipo === SAFE_SEGURO) {
            // Only auto-set if it's currently 0 or empty to allow edits
            if (!newCase.valor_causa) {
                setNewCase(prev => ({ ...prev, valor_causa: 6508 }));
                setCurrencyInput(formatCurrencyInput('650800'));
            }
        }
    }, [newCase.tipo]);

    const handleAddNewModality = async () => {
        const type = newCase.tipo as string;
        if (!type || !newModalityValue.trim()) return;

        const val = newModalityValue.trim();
        const currentCustom = user?.preferences?.customModalities || {};
        const typeCustom = currentCustom[type] || [];

        if (typeCustom.includes(val) || (MODALITY_OPTIONS[type] || []).includes(val)) {
            showToast('error', 'Esta modalidade já existe.');
            return;
        }

        const updatedCustom = {
            ...currentCustom,
            [type]: [...typeCustom, val]
        };

        await saveUserPreferences({ customModalities: updatedCustom });
        setNewCase(prev => ({ ...prev, modalidade: val }));
        setShowNewModalityInput(false);
        setNewModalityValue('');
        showToast('success', 'Nova modalidade adicionada!');
    };

    const handleAddNewType = async () => {
        if (!newTypeValue.trim()) return;
        const val = newTypeValue.trim();
        const currentCustom = user?.preferences?.customCaseTypes || [];

        if (safeAllTypes.includes(val as any) || currentCustom.includes(val)) {
            showToast('error', 'Este tipo já existe.');
            return;
        }

        const updatedCustom = [...currentCustom, val];
        await saveUserPreferences({ customCaseTypes: updatedCustom });

        setNewCase(prev => ({
            ...prev,
            tipo: val as any,
            modalidade: undefined // Reset modality for new type
        }));
        setShowNewTypeInput(false);
        setNewTypeValue('');
        showToast('success', 'Novo tipo adicionado!');
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCurrencyInput(e.target.value);
        setCurrencyInput(formatted);
        setNewCase({ ...newCase, valor_causa: parseCurrencyToNumber(formatted) });
    };

    // Async Search Logic
    useEffect(() => {
        const searchClients = async () => {
            if (!clientSearchTerm || clientSearchTerm.length < 2) {
                setClientsList([]);
                return;
            }

            // If we already have a selected client and the name matches, don't search again
            // optimization to avoid searching when user clicks a result
            // But here we just debounce and search. 
            // Better: if clientSearchTerm matches current client name, skip?
            // For now, keep it simple.

            setIsSearchingClients(true);
            try {
                // Fetch first 10 matches
                const { data } = await fetchClientsData(1, 10, clientSearchTerm);
                setClientsList(data || []);
            } catch (err) {
                console.error("Error searching clients", err);
            } finally {
                setIsSearchingClients(false);
            }
        };

        const timer = setTimeout(searchClients, 300);
        return () => clearTimeout(timer);
    }, [clientSearchTerm]);

    const filteredClients = clientsList;

    const handleSelectClient = (client: any) => {
        setNewCase(prev => ({ ...prev, client_id: client.id }));
        setClientSearchTerm(client.nome_completo);
        setIsClientListOpen(false);
        // Clean up previous client's cases
        setExistingCasesForClient([]);
    };

    // Duplicate Check logic
    useEffect(() => {
        const checkDuplicate = async () => {
            if (!newCase.client_id || !newCase.tipo) return;

            setIsCheckingDuplicates(true);
            try {
                // Fetch active cases for this client in this category
                const { data, error } = await supabase
                    .from('view_cases_dashboard')
                    .select('*')
                    .eq('client_id', newCase.client_id)
                    .eq('tipo', newCase.tipo)
                    .neq('status', 'Arquivado');

                if (error) throw error;
                setExistingCasesForClient(data || []);
            } catch (err) {
                console.error("Error checking duplicates", err);
            } finally {
                setIsCheckingDuplicates(false);
            }
        };

        checkDuplicate();
    }, [newCase.client_id, newCase.tipo]);

    const hasDuplicate = existingCasesForClient.length > 0;
    const handleCreateCase = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCase.client_id) { showToast('error', 'Selecione um cliente.'); return; }

        if (hasDuplicate) {
            const confirm = window.confirm(`O cliente já possui ${existingCasesForClient.length} processo(s) ativo(s) nesta categoria (${newCase.tipo}). Deseja criar mesmo assim?`);
            if (!confirm) return;
        }

        const modalidadeStr = newCase.modalidade ? ` (${newCase.modalidade})` : '';

        const caseType = (newCase.tipo as any) || SAFE_CIVIL;
        const caseData: Case = {
            id: crypto.randomUUID(),
            client_id: newCase.client_id,
            titulo: `${caseType}${modalidadeStr}`,
            numero_processo: newCase.numero_processo || 'S/N',
            modalidade: newCase.modalidade,
            tribunal: newCase.tribunal || 'Administrativo',
            valor_causa: newCase.valor_causa || 0,
            status: (newCase.status as CaseStatus) || CaseStatus.PROTOCOLAR,
            tipo: (newCase.tipo as any) || SAFE_CIVIL,
            data_abertura: newCase.data_abertura || new Date().toISOString(),
            acessos: [],
            status_pagamento: (newCase.status_pagamento === 'Pago' ? 'Pago' : 'Pendente'),
            valor_honorarios_pagos: newCase.valor_honorarios_pagos || 0,
            data_fatal: newCase.data_fatal || undefined,
            metadata: newCase.metadata
        };

        addCase(caseData);
        onClose();
    };

    if (!isOpen) return null;

    const seguroDefeso = SAFE_SEGURO;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-[#0f1014] border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-zinc-800 flex justify-end items-center bg-[#09090b] rounded-t-xl">
                    <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleCreateCase} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Client Search */}
                    <div className="relative" ref={searchWrapperRef}>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Cliente (Busca por Nome ou CPF) *</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input
                                type="text"
                                className="w-full bg-[#09090b] border border-zinc-700 rounded-lg pl-10 pr-10 py-3 text-sm text-white outline-none focus:border-yellow-600 placeholder:text-zinc-600"
                                placeholder="Digite o nome ou cole o CPF..."
                                value={clientSearchTerm}
                                onChange={(e) => {
                                    setClientSearchTerm(e.target.value);
                                    setIsClientListOpen(true);
                                    if (e.target.value === '') setNewCase(prev => ({ ...prev, client_id: '' }));
                                }}
                                onFocus={() => setIsClientListOpen(true)}
                                autoFocus={!newCase.client_id}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                                {isSearchingClients ? <div className="animate-spin h-4 w-4 border-2 border-zinc-500 border-t-transparent rounded-full" /> : <ChevronDown size={16} />}
                            </div>
                        </div>
                        {isClientListOpen && filteredClients.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f1014] border border-zinc-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50 custom-scrollbar">
                                {filteredClients.map(client => (
                                    <button key={client.id} type="button" onClick={() => handleSelectClient(client)} className={`w-full text-left px-4 py-3 text-sm hover:bg-zinc-800 transition-colors flex justify-between items-center border-b border-zinc-800 last:border-0 ${newCase.client_id === client.id ? 'bg-zinc-800/50' : ''}`}>
                                        <div><span className="block text-white font-medium">{client.nome_completo}</span><span className="block text-zinc-500 text-xs font-mono">{client.cpf_cnpj}</span></div>
                                        {newCase.client_id === client.id && <Check size={16} className="text-yellow-600" />}
                                    </button>
                                ))}
                            </div>
                        )}
                        {isClientListOpen && clientSearchTerm.length >= 2 && !isSearchingClients && filteredClients.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f1014] border border-zinc-700 rounded-lg shadow-2xl p-4 text-center z-50">
                                <span className="text-zinc-500 text-xs">Nenhum cliente encontrado.</span>
                            </div>
                        )}

                        {hasDuplicate && (
                            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                <AlertTriangle className="text-red-500 shrink-0" size={18} />
                                <div className="text-xs text-red-200">
                                    <span className="font-bold block">Atenção: Duplicidade Detectada</span>
                                    O cliente já possui {existingCasesForClient.length} processo(s) ativos nesta categoria ({newCase.tipo}).
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Número do Processo</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input className="w-full bg-[#09090b] border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-yellow-600 placeholder:text-zinc-600 font-mono" placeholder="0000000-00..." value={newCase.numero_processo} onChange={(e) => setNewCase({ ...newCase, numero_processo: formatProcessNumber(e.target.value) })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Valor da Causa</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input className="w-full bg-[#09090b] border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-yellow-600 placeholder:text-zinc-600" placeholder="R$ 0,00" value={currencyInput} onChange={handleCurrencyChange} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {!showNewTypeInput ? (
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 flex justify-between">
                                    Tipo de Ação
                                    <button type="button" onClick={() => setShowNewTypeInput(true)} className="text-yellow-600 hover:text-yellow-500 lowercase text-[10px] font-bold">+ adicionar</button>
                                </label>
                                <select
                                    className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-3 text-sm text-white outline-none focus:border-yellow-600 appearance-none"
                                    value={newCase.tipo}
                                    onChange={(e) => {
                                        const nextType = e.target.value;
                                        setNewCase({
                                            ...newCase,
                                            tipo: nextType as CaseType,
                                            modalidade: MODALITY_OPTIONS[nextType] ? MODALITY_OPTIONS[nextType][0] : undefined
                                        });
                                    }}
                                    disabled={forcedType === seguroDefeso && !newCaseParams}
                                >
                                    {availableTypes.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="animate-in fade-in zoom-in duration-200">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 flex justify-between">
                                    Novo Tipo de Ação
                                    <button type="button" onClick={() => setShowNewTypeInput(false)} className="text-zinc-500 hover:text-white lowercase text-[10px] font-bold">cancelar</button>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        className="flex-1 bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-600"
                                        placeholder="Ex: Revisionista"
                                        value={newTypeValue}
                                        onChange={(e) => setNewTypeValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewType())}
                                    />
                                    <button type="button" onClick={handleAddNewType} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-sm font-bold border border-zinc-700">Add</button>
                                </div>
                            </div>
                        )}
                        {currentModalityOptions.length > 0 && !showNewModalityInput && (
                            <div className="animate-in fade-in slide-in-from-left-2">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 flex justify-between">
                                    Modalidade / Tipo
                                    <button type="button" onClick={() => setShowNewModalityInput(true)} className="text-yellow-600 hover:text-yellow-500 lowercase text-[10px] font-bold">+ adicionar</button>
                                </label>
                                <select
                                    className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-3 text-sm text-white outline-none focus:border-yellow-600 appearance-none"
                                    value={newCase.modalidade}
                                    onChange={(e) => setNewCase({ ...newCase, modalidade: e.target.value })}
                                >
                                    {currentModalityOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        )}
                        {showNewModalityInput && (
                            <div className="animate-in fade-in zoom-in duration-200">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 flex justify-between">
                                    Nova Modalidade
                                    <button type="button" onClick={() => setShowNewModalityInput(false)} className="text-zinc-500 hover:text-white lowercase text-[10px] font-bold">cancelar</button>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        className="flex-1 bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-600"
                                        placeholder="Ex: Rural Alternativo"
                                        value={newModalityValue}
                                        onChange={(e) => setNewModalityValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewModality())}
                                    />
                                    <button type="button" onClick={handleAddNewModality} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-sm font-bold border border-zinc-700">Add</button>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tribunal / Vara</label>
                            <div className="relative">
                                <Gavel className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input className="w-full bg-[#09090b] border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-yellow-600 placeholder:text-zinc-600" value={newCase.tribunal} onChange={(e) => setNewCase({ ...newCase, tribunal: e.target.value })} placeholder="Ex: INSS / TRF-1" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Status Inicial</label>
                            <select className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-3 text-sm text-white outline-none focus:border-yellow-600 appearance-none" value={newCase.status} onChange={(e) => setNewCase({ ...newCase, status: e.target.value as CaseStatus })}>
                                {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* DYNAMIC BENEFIT FIELDS */}
                    {BENEFIT_FIELDS[newCase.tipo as string] && (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 space-y-4 animate-in fade-in zoom-in duration-300">
                            <h4 className="text-[10px] font-black text-yellow-600 uppercase tracking-[0.2em] mb-4">Informações Específicas do Benefício</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {BENEFIT_FIELDS[newCase.tipo as string].map(field => (
                                    <div key={field.key}>
                                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">{field.label}</label>
                                        <input
                                            type={field.type || 'text'}
                                            className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-600 placeholder:text-zinc-700 [color-scheme:dark]"
                                            placeholder={field.placeholder}
                                            value={newCase.metadata?.[field.key] || ''}
                                            onChange={(e) => setNewCase({
                                                ...newCase,
                                                metadata: {
                                                    ...newCase.metadata,
                                                    [field.key]: e.target.value
                                                }
                                            })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Pagamento Honorários ({newCase.status_pagamento})</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <select className="w-full bg-[#09090b] border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-yellow-600 appearance-none cursor-pointer" value={newCase.status_pagamento} onChange={(e) => setNewCase({ ...newCase, status_pagamento: e.target.value as any })}>
                                    {paymentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Data Abertura</label>
                            <input type="date" className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-yellow-600 [color-scheme:dark]" value={newCase.data_abertura} onChange={(e) => setNewCase({ ...newCase, data_abertura: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Prazo Fatal (SLA)</label>
                            <input type="date" className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-yellow-600 [color-scheme:dark]" value={newCase.data_fatal || ''} onChange={(e) => setNewCase({ ...newCase, data_fatal: e.target.value })} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800 mt-auto">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-sm font-medium">Cancelar</button>
                        <button type="submit" className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-yellow-900/20 flex items-center gap-2 transition-all"><Save size={18} /> Criar Processo</button>
                    </div>
                </form >
            </div >
        </div >
    );
};

export default NewCaseModal;
