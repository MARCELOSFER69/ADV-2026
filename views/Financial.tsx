import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFinancialData } from '../services/financialService';
import { useApp } from '../context/AppContext';
import { FinancialType, Case, FinancialRecord, CaseType, CommissionReceipt } from '../types';
import {
    ArrowDownCircle, ArrowUpCircle, Filter, Search, Download, Calendar, DollarSign,
    Eye, ChevronDown, ChevronRight, Trash2, Building, HandCoins, ChevronLeft,
    CalendarRange, Infinity, FileText, CheckSquare, Square, FileCheck, Paperclip,
    CheckCircle, ExternalLink, Clock, FilePlus, Wallet, CreditCard, User, Building2, Plus, X
} from 'lucide-react';
import CaseDetailsModal from '../components/modals/CaseDetailsModal';
import CommissionReceiptModal from '../components/modals/CommissionReceiptModal';
import { formatDateDisplay } from '../utils/dateUtils';
import { formatCurrencyInput, parseCurrencyToNumber } from '../services/formatters';

type FinancialViewItem =
    | { type: 'group'; id: string; caseId?: string; clientId: string; title: string; clientName: string; totalEntradas: number; totalSaidas: number; saldo: number; children: FinancialRecord[]; dataReferencia: string; status: 'PAGO' | 'PARCIAL' | 'PENDENTE' | 'DESPESA'; valorColorClass: string }
    | { type: 'single'; data: FinancialRecord };

type TabType = 'overview' | 'commissions';
type SubTabType = 'list' | 'receipts';
type PeriodMode = 'month' | 'year' | 'all';

const Financial: React.FC = () => {
    const { cases, clients, showToast, officeExpenses, setCurrentView, currentView, setCaseToView, deleteFinancialRecord, commissionReceipts, confirmReceiptSignature, deleteCommissionReceipt, uploadReceiptFile, addFinancialRecord, setClientToView } = useApp();

    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [subTab, setSubTab] = useState<SubTabType>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());

    // --- FILTROS ---
    const [filterType, setFilterType] = useState<FinancialType | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');

    // NOVOS FILTROS (Imagem 3)
    const [filterMethod, setFilterMethod] = useState('all');
    const [filterReceiver, setFilterReceiver] = useState('all');
    const [filterAccount, setFilterAccount] = useState('all');

    const [showFilters, setShowFilters] = useState(false);

    // REACT QUERY
    const { data: financial = [], isLoading } = useQuery({
        queryKey: ['financial', filterType, filterStatus],
        queryFn: () => fetchFinancialData({
            type: filterType,
            status: filterStatus as any
        }),
    });

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'dataReferencia', direction: 'desc' });
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const [selectedCommissionIds, setSelectedCommissionIds] = useState<Set<string>>(new Set());
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<CommissionReceipt | undefined>(undefined);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

    // Estados Modal Novo Lançamento (Avulso)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRecord, setNewRecord] = useState<Partial<FinancialRecord>>({
        descricao: '', valor: 0, tipo: FinancialType.RECEITA, data_vencimento: new Date().toISOString().split('T')[0], status_pagamento: true
    });
    const [amountStr, setAmountStr] = useState('');

    // --- LISTAS DINÂMICAS PARA OS DROPDOWNS ---
    const uniqueMethods = useMemo(() => Array.from(new Set(financial.map(f => f.forma_pagamento).filter(Boolean))), [financial]);
    const uniqueReceivers = useMemo(() => Array.from(new Set(financial.map(f => f.recebedor || f.captador_nome).filter(Boolean))), [financial]);
    const uniqueAccounts = useMemo(() => Array.from(new Set(financial.map(f => f.conta).filter(Boolean))), [financial]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get('tab');
        if (currentView === 'commissions' || urlTab === 'commissions') setActiveTab('commissions');
        else setActiveTab('overview');
    }, [currentView]);

    const navigatePeriod = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        if (periodMode === 'month') newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        else if (periodMode === 'year') newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
        setSelectedDate(newDate);
    };

    const getPeriodLabel = () => {
        if (periodMode === 'all') return 'Todo o Período';
        if (periodMode === 'year') return selectedDate.getFullYear().toString();
        const month = selectedDate.toLocaleString('pt-BR', { month: 'long' });
        const year = selectedDate.getFullYear();
        return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
    };

    const aggregatedOfficeExpenses: FinancialRecord[] = useMemo(() => {
        const groups: Record<string, number> = {};
        const paidExpenses = officeExpenses.filter(e => e.status === 'Pago');

        paidExpenses.forEach(expense => {
            const key = expense.data_despesa.substring(0, 7);
            if (!groups[key]) groups[key] = 0;
            groups[key] += expense.valor;
        });

        return Object.entries(groups).map(([monthKey, totalValue]) => {
            const [year, month] = monthKey.split('-');
            const date = `${monthKey}-01`;
            return {
                id: `office-agg-${monthKey}`,
                descricao: `Despesas Administrativas (Ref: ${month}/${year})`,
                tipo: FinancialType.DESPESA,
                valor: totalValue,
                data_vencimento: date,
                status_pagamento: true,
                is_office_expense: true
            };
        });
    }, [officeExpenses]);

    const matchesPeriod = (dateStr: string) => {
        if (periodMode === 'all') return true;
        if (!dateStr) return false;
        const recordDate = dateStr.substring(0, 10);
        const targetYear = selectedDate.getFullYear();
        if (periodMode === 'year') return recordDate.startsWith(`${targetYear}`);
        if (periodMode === 'month') {
            const targetMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
            return recordDate.startsWith(`${targetYear}-${targetMonth}`);
        }
        return false;
    };

    // --- LÓGICA PRINCIPAL DE DADOS E FILTRAGEM ---
    const processedData = useMemo(() => {
        if (!financial) return [];
        const groups: Record<string, any> = {};
        const standaloneItems: FinancialViewItem[] = [];

        const allRecords = [...financial, ...aggregatedOfficeExpenses];

        const filteredRecords = allRecords.filter(record => {
            if (!matchesPeriod(record.data_vencimento)) return false;

            let searchClientName = '';
            let searchCpf = '';
            if (record.client_id) {
                const c = clients.find(x => x.id === record.client_id);
                if (c) { searchClientName = c.nome_completo; searchCpf = c.cpf_cnpj; }
            } else if (record.case_id) {
                const caseItem = cases.find(x => x.id === record.case_id);
                if (caseItem) {
                    const c = clients.find(x => x.id === caseItem.client_id);
                    if (c) { searchClientName = c.nome_completo; searchCpf = c.cpf_cnpj; }
                }
            }

            const desc = typeof record.descricao === 'string' ? record.descricao.toLowerCase() : '';
            const search = searchTerm.toLowerCase();

            const matchesSearch =
                desc.includes(search) ||
                searchClientName.toLowerCase().includes(search) ||
                searchCpf.includes(search) ||
                (record.recebedor && record.recebedor.toLowerCase().includes(search)) ||
                (record.is_office_expense && "despesas administrativas".includes(search));

            if (!matchesSearch) return false;
            // Filter Type
            if (filterType !== 'all' && record.tipo !== filterType) return false;
            // Filter Status
            if (filterStatus === 'paid' && !record.status_pagamento) return false;
            if (filterStatus === 'pending' && record.status_pagamento) return false;

            // --- APLICAÇÃO DOS NOVOS FILTROS (ROBUSTA) ---
            if (filterMethod !== 'all') {
                // Aceitar correspondência exata ou nulo se o filtro for genérico (se isso fizer sentido, mas aqui vamos ser estritos)
                if (!record.forma_pagamento || record.forma_pagamento !== filterMethod) return false;
            }

            if (filterAccount !== 'all') {
                if (!record.conta || record.conta !== filterAccount) return false;
            }

            if (filterReceiver !== 'all') {
                const rec = record.recebedor || record.captador_nome;
                // Verificação segura de string
                if (!rec || rec !== filterReceiver) return false;
            }

            return true;
        });

        filteredRecords.forEach(record => {
            let effectiveClientId = record.client_id;
            if (!effectiveClientId && record.case_id) {
                const relatedCase = cases.find(c => c.id === record.case_id);
                if (relatedCase) effectiveClientId = relatedCase.client_id;
            }

            if (effectiveClientId) {
                const clientId = effectiveClientId;
                if (!groups[clientId]) {
                    const client = clients.find(c => c.id === clientId);
                    const mainCase = cases.find(c => c.client_id === clientId && c.tipo === CaseType.SEGURO_DEFESO) ||
                        cases.find(c => c.client_id === clientId && c.status !== 'Arquivado');

                    groups[clientId] = {
                        type: 'group',
                        id: `group-${clientId}`,
                        clientId: clientId,
                        caseId: mainCase?.id,
                        title: client?.nome_completo || 'Cliente Desconhecido',
                        clientName: client?.nome_completo || '',
                        children: [],
                        totalEntradas: 0,
                        totalSaidas: 0,
                        dataReferencia: record.data_vencimento
                    };
                }
                const g = groups[clientId];
                g.children.push(record);

                if (new Date(record.data_vencimento) > new Date(g.dataReferencia)) {
                    g.dataReferencia = record.data_vencimento;
                }

                if (record.status_pagamento) {
                    if (record.tipo === FinancialType.RECEITA) g.totalEntradas += Number(record.valor);
                    else g.totalSaidas += Number(record.valor);
                }
            } else {
                standaloneItems.push({ type: 'single', data: record });
            }
        });

        const processedGroups = Object.values(groups).map((g: any) => {
            const saldo = g.totalEntradas - g.totalSaidas;
            let status = 'PENDENTE';
            if (g.totalEntradas > 0) status = 'PAGO';
            else if (g.totalSaidas > 0 && g.totalEntradas === 0) status = 'DESPESA';
            else if (g.totalEntradas > 0 && g.totalEntradas < 500) status = 'PARCIAL';

            let valorColorClass = 'text-zinc-200';
            if (saldo > 0) valorColorClass = 'text-blue-400';
            else if (saldo < 0) valorColorClass = 'text-red-400';

            return { ...g, saldo, status, valorColorClass, children: g.children.sort((a: any, b: any) => new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime()) } as FinancialViewItem;
        });

        return [...processedGroups, ...standaloneItems].sort((a, b) => {
            const dateA = a.type === 'group' ? a.dataReferencia : a.data.data_vencimento;
            const dateB = b.type === 'group' ? b.dataReferencia : b.data.data_vencimento;
            return sortConfig.direction === 'asc'
                ? new Date(dateA).getTime() - new Date(dateB).getTime()
                : new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }, [financial, aggregatedOfficeExpenses, clients, cases, searchTerm, filterType, filterStatus, filterMethod, filterReceiver, filterAccount, periodMode, selectedDate, sortConfig]);

    const commissionsData = useMemo(() => {
        const comms = financial.filter(f => {
            const isCommission = f.tipo === FinancialType.COMISSAO || f.tipo_movimentacao === 'Comissao';
            if (!isCommission) return false;
            if (!matchesPeriod(f.data_vencimento)) return false;
            return true;
        });
        return comms.sort((a, b) => new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime());
    }, [financial, periodMode, selectedDate]);

    const totals = useMemo(() => {
        let income = 0;
        let expense = 0;
        processedData.forEach(item => {
            if (item.type === 'group') {
                income += item.totalEntradas;
                expense += item.totalSaidas;
            } else {
                if (item.data.status_pagamento) {
                    if (item.data.tipo === FinancialType.RECEITA) income += item.data.valor;
                    else expense += item.data.valor;
                }
            }
        });
        return { income, expense, balance: income - expense };
    }, [processedData]);

    const totalCommissions = useMemo(() => {
        return commissionsData.reduce((acc, curr) => acc + (curr.status_pagamento ? curr.valor : 0), 0);
    }, [commissionsData]);

    const toggleGroup = (id: string) => { const newSet = new Set(expandedGroups); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setExpandedGroups(newSet); };
    const navigateToCase = (caseId: string) => { setCaseToView(caseId); const c = cases.find(x => x.id === caseId); if (c && c.tipo === CaseType.SEGURO_DEFESO) setCurrentView('cases-insurance'); else setCurrentView('cases'); };
    const handleExportCSV = () => { showToast('success', 'Função de exportação em manutenção.'); };
    const getImplicitCaptador = (record?: FinancialRecord) => { if (!record) return 'Desconhecido'; if (record.captador_nome) return record.captador_nome; if (record.descricao && record.descricao.includes(' - ')) return record.descricao.split(' - ')[1]; return 'Não identificado'; };

    const handleSelectCommission = (record: FinancialRecord) => { if (record.receipt_id) { showToast('error', 'Este item já possui recibo gerado.'); return; } const firstSelectedId = Array.from(selectedCommissionIds)[0]; if (firstSelectedId) { const firstRecord = commissionsData.find(c => c.id === firstSelectedId); const firstCaptador = getImplicitCaptador(firstRecord); const currentCaptador = getImplicitCaptador(record); if (firstCaptador !== currentCaptador) { if (!confirm(`Atenção: Seleção de outro captador. Limpar atual?`)) return; const newSet = new Set<string>(); newSet.add(record.id); setSelectedCommissionIds(newSet); return; } } const newSet = new Set(selectedCommissionIds); if (newSet.has(record.id)) newSet.delete(record.id); else newSet.add(record.id); setSelectedCommissionIds(newSet); };
    const currentCaptadorName = useMemo(() => { if (selectedCommissionIds.size === 0) return ''; const firstId = Array.from(selectedCommissionIds)[0]; const record = commissionsData.find(c => c.id === firstId); return record ? getImplicitCaptador(record) : ''; }, [selectedCommissionIds, commissionsData]);
    const handleOpenReceipt = (receipt: CommissionReceipt) => { setSelectedReceipt(receipt); setReceiptModalOpen(true); };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file && activeUploadId) await uploadReceiptFile(activeUploadId, file); setActiveUploadId(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

    const handleAddAvulso = async () => {
        if (!newRecord.descricao || !newRecord.valor) { showToast('error', 'Preencha dados.'); return; }
        await addFinancialRecord({ id: crypto.randomUUID(), ...newRecord as FinancialRecord });
        setIsModalOpen(false); setNewRecord({ descricao: '', valor: 0, tipo: FinancialType.RECEITA, data_vencimento: new Date().toISOString().split('T')[0], status_pagamento: true }); setAmountStr('');
        showToast('success', 'Adicionado!');
        queryClient.invalidateQueries({ queryKey: ['financial'] });
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value; setAmountStr(formatCurrencyInput(val));
        setNewRecord({ ...newRecord, valor: parseCurrencyToNumber(formatCurrencyInput(val)) });
    };

    // --- HELPER DE RENDERIZAÇÃO DE DETALHES ---
    const renderPaymentDetails = (record: FinancialRecord) => {
        if (record.is_office_expense) return <span className="text-zinc-500 text-xs italic">Agrupado</span>;

        const hasDetails = record.forma_pagamento || record.recebedor || record.conta || record.captador_nome;
        if (!hasDetails) return <span className="text-zinc-600 text-xs italic">-</span>;

        return (
            <div className="space-y-0.5">
                {record.forma_pagamento && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                        {record.forma_pagamento === 'Especie' ? <Wallet size={12} className="text-emerald-500" /> : <CreditCard size={12} className="text-blue-400" />}
                        {record.forma_pagamento}
                    </div>
                )}
                {(record.recebedor || record.captador_nome) && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <User size={12} /> {record.recebedor || record.captador_nome}
                    </div>
                )}
                {record.conta && (
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                        <Building2 size={10} /> {record.tipo_conta ? `${record.tipo_conta} - ` : ''}{record.conta}
                    </div>
                )}
            </div>
        );
    };

    const renderOverview = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-[#0f1014] p-5 rounded-xl border border-zinc-800 hover:border-emerald-500/20 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><ArrowUpCircle size={60} className="text-emerald-500" /></div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Receitas (Visíveis)</p>
                    <h3 className="text-2xl font-bold text-emerald-400">+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.income)}</h3>
                </div>
                <div className="bg-[#0f1014] p-5 rounded-xl border border-zinc-800 hover:border-red-500/20 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><ArrowDownCircle size={60} className="text-red-500" /></div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Despesas + Comissões</p>
                    <h3 className="text-2xl font-bold text-red-400">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.expense)}</h3>
                </div>
                <div className="bg-[#0f1014] p-5 rounded-xl border border-zinc-800 hover:border-gold-500/20 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><DollarSign size={60} className="text-gold-500" /></div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Saldo Líquido</p>
                    <h3 className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.balance)}</h3>
                </div>
            </div>

            <div className="bg-[#0f1014] rounded-xl border border-zinc-800 overflow-hidden flex flex-col shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 cursor-pointer hover:text-white">Descrição / Cliente</th>
                                <th className="px-6 py-4 text-center">Tipo / Status</th>
                                <th className="px-6 py-4">Detalhes Pagamento</th>
                                <th className="px-6 py-4 text-right">Valor Líquido</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {processedData.map((item) => {
                                if (item.type === 'group') {
                                    const isExpanded = expandedGroups.has(item.id);
                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className={`group cursor-pointer transition-colors ${isExpanded ? 'bg-zinc-800/50' : 'hover:bg-zinc-900'}`} onClick={() => toggleGroup(item.id)}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-md transition-colors ${isExpanded ? 'bg-gold-500/20 text-gold-500' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'}`}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>
                                                        <div><span className="font-bold text-zinc-200 block group-hover:text-gold-500 transition-colors text-sm">{item.title}</span><span className="text-[10px] text-zinc-500 flex items-center gap-1"><Calendar size={10} /> Ref: {formatDateDisplay(item.dataReferencia)}</span></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-zinc-800 border-zinc-700 text-zinc-400`}>{item.status}</span></td>
                                                <td className="px-6 py-4 text-xs text-zinc-500">{item.children.length} itens</td>
                                                <td className="px-6 py-4 text-right"><span className={`text-sm font-bold ${item.valorColorClass}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.saldo)}</span></td>
                                                <td className="px-6 py-4 text-right">
                                                    {item.caseId && <button onClick={(e) => { e.stopPropagation(); navigateToCase(item.caseId!); }} className="p-2 text-zinc-500 hover:text-gold-500 hover:bg-gold-500/10 rounded-lg transition-colors"><Eye size={18} /></button>}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-black/40 shadow-inner">
                                                    <td colSpan={5} className="p-0">
                                                        <div className="border-l-2 border-gold-500/30 ml-8 my-2">
                                                            <table className="w-full">
                                                                <tbody>
                                                                    {item.children.map(child => (
                                                                        <tr key={child.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-white/5 transition-colors">
                                                                            <td className="py-2 px-4 text-xs text-zinc-400 w-32 font-mono">{formatDateDisplay(child.data_vencimento)}</td>
                                                                            <td className="py-2 px-4 text-xs text-zinc-300">
                                                                                {child.tipo === FinancialType.COMISSAO && <span className="mr-2 text-[9px] font-bold bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded uppercase">COMISSÃO</span>}
                                                                                {child.descricao}
                                                                            </td>
                                                                            {/* COLUNA DETALHES DENTRO DO GRUPO */}
                                                                            <td className="py-2 px-4">
                                                                                {renderPaymentDetails(child)}
                                                                            </td>
                                                                            <td className={`py-2 px-4 text-xs font-bold text-right w-32 ${child.tipo === FinancialType.RECEITA ? 'text-emerald-500' : 'text-red-500'}`}>{child.tipo === FinancialType.RECEITA ? '+' : '-'} {child.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                                            <td className="py-2 px-4 w-16 text-right"><button onClick={() => deleteFinancialRecord(child.id)} className="text-zinc-600 hover:text-red-500 p-1 rounded"><Trash2 size={12} /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                } else {
                                    const record = item.data;
                                    return (
                                        <tr key={record.id} className="group hover:bg-zinc-900 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-md bg-zinc-800 text-zinc-500`}>{record.is_office_expense ? <Building size={16} /> : <DollarSign size={16} />}</div>
                                                    <div>
                                                        <span className="font-medium text-zinc-300 block group-hover:text-white transition-colors text-sm">{record.descricao}</span>
                                                        <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5"><Calendar size={10} /> {formatDateDisplay(record.data_vencimento)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center"><span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">Avulso</span></td>

                                            {/* COLUNA DETALHES AVULSO */}
                                            <td className="px-6 py-4">
                                                {renderPaymentDetails(record)}
                                            </td>

                                            <td className="px-6 py-4 text-right"><span className={`text-sm font-bold ${record.tipo === FinancialType.RECEITA ? 'text-emerald-400' : 'text-red-400'}`}>{record.tipo === FinancialType.RECEITA ? '+' : '-'} {record.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => deleteFinancialRecord(record.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    );
                                }
                            })}
                            {processedData.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-zinc-500 italic">Nenhuma movimentação encontrada neste período.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );

    const renderCommissions = () => (
        <>
            <div className="mb-6 flex gap-4">
                <div className="bg-[#0f1014] p-5 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all relative overflow-hidden group max-w-sm flex-1">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"><HandCoins size={60} className="text-purple-500" /></div>
                    <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">Total Comissões Pagas</p>
                    <h3 className="text-2xl font-bold text-white">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCommissions)}</h3>
                </div>
                <div className="bg-[#0f1014] p-5 rounded-xl border border-zinc-800 flex-1 flex flex-col justify-center">
                    <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg w-fit">
                        <button onClick={() => setSubTab('list')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${subTab === 'list' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Lista de Comissões</button>
                        <button onClick={() => setSubTab('receipts')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${subTab === 'receipts' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Recibos Gerados</button>
                    </div>
                </div>
            </div>

            {subTab === 'list' ? (
                <div className="bg-[#0f1014] rounded-xl border border-zinc-800 overflow-hidden flex flex-col shadow-2xl relative">
                    {selectedCommissionIds.size > 0 && (
                        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-4 fade-in">
                            <button onClick={() => { setSelectedReceipt(undefined); setReceiptModalOpen(true); }} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] flex items-center gap-3 font-bold text-sm transform transition-all hover:scale-105 active:scale-95 border-2 border-purple-400/50">
                                <FileText size={22} /> Gerar Recibo ({selectedCommissionIds.size})
                            </button>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                <tr><th className="px-6 py-4 w-12 text-center"><CheckSquare size={16} /></th><th className="px-6 py-4">Captador</th><th className="px-6 py-4">Cliente / Processo</th><th className="px-6 py-4">Data Pagamento</th><th className="px-6 py-4 text-right">Valor</th><th className="px-6 py-4 text-center">Status Recibo</th><th className="px-6 py-4 text-right">Ação</th></tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {commissionsData.map(comm => {
                                    const relatedCase = comm.case_id ? cases.find(c => c.id === comm.case_id) : null;
                                    const relatedClient = relatedCase ? clients.find(c => c.id === relatedCase.client_id) : null;
                                    let displayCaptador = getImplicitCaptador(comm);
                                    const isSelected = selectedCommissionIds.has(comm.id);
                                    const hasReceipt = !!comm.receipt_id;
                                    const receiptInfo = hasReceipt ? commissionReceipts.find(r => r.id === comm.receipt_id) : null;
                                    return (
                                        <tr key={comm.id} className={`transition-colors ${isSelected ? 'bg-purple-500/10' : 'hover:bg-zinc-900'}`}>
                                            <td className="px-6 py-4 text-center">{!hasReceipt ? (<button onClick={() => handleSelectCommission(comm)} className={`text-zinc-500 hover:text-purple-400 transition-colors ${isSelected ? 'text-purple-500' : ''}`}>{isSelected ? <CheckSquare size={18} /> : <Square size={18} />}</button>) : (<div className="w-4 h-4 mx-auto" />)}</td>
                                            <td className="px-6 py-4"><div className="font-bold text-purple-400">{displayCaptador}</div></td>
                                            <td className="px-6 py-4"><div className="text-sm text-zinc-300 font-bold">{relatedClient?.nome_completo || 'N/A'}</div><div className="text-xs text-zinc-500">{relatedCase?.titulo || 'Avulso'}</div></td>
                                            <td className="px-6 py-4 text-sm text-zinc-400 font-mono">{formatDateDisplay(comm.data_vencimento)}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-right text-red-400">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comm.valor)}</td>
                                            <td className="px-6 py-4 text-center">{hasReceipt ? ((receiptInfo?.status_assinatura === 'assinado' || receiptInfo?.status === 'signed') ? (<span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full"><FileCheck size={12} /> Assinado</span>) : (<span className="inline-flex items-center gap-1 text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full"><FileText size={12} /> Gerado</span>)) : (<span className="text-zinc-600 text-xs">-</span>)}</td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => deleteFinancialRecord(comm.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                    {commissionReceipts.length > 0 ? commissionReceipts.map(receipt => {
                        const countItems = financial.filter(f => f.receipt_id === receipt.id).length;
                        const isSigned = receipt.status_assinatura === 'assinado' || receipt.status === 'signed';
                        let borderClass = isSigned ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]';
                        let badge = isSigned ? <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 font-bold"><CheckCircle size={10} /> Assinado</span> : <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1 font-bold"><Clock size={10} /> Pendente</span>;

                        return (
                            <div key={receipt.id} className={`bg-[#0f1014] border ${borderClass} rounded-xl p-5 hover:border-opacity-50 transition-all group relative flex flex-col`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col"><h4 className="font-bold text-white text-lg line-clamp-1" title={receipt.captador_nome}>{receipt.captador_nome}</h4><p className="text-xs text-zinc-500 font-mono mt-0.5">Gerado: {new Date(receipt.data_geracao).toLocaleDateString('pt-BR')}</p></div>
                                    <div className="flex items-start gap-2">
                                        {badge}
                                        <button onClick={(e) => { e.stopPropagation(); deleteCommissionReceipt(receipt.id); }} className="p-1 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="mb-4 flex-1"><div className="flex justify-between items-end"><span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Total</span><p className="text-xl font-bold text-purple-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.valor_total)}</p></div><div className="w-full h-px bg-zinc-800 my-2"></div><p className="text-xs text-zinc-400 flex items-center gap-1"><FileText size={12} /> Referente a <strong>{countItems}</strong> comissões</p></div>
                                <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
                                    {!isSigned && (<button onClick={() => confirmReceiptSignature(receipt.id)} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-600/20">Confirmar Assinatura</button>)}
                                    <div className="flex gap-2"><button onClick={() => handleOpenReceipt(receipt)} className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${!isSigned ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'}`}>{!isSigned ? <><Paperclip size={14} /> Anexar Arquivo</> : <><ExternalLink size={14} /> Ver Comprovante</>}</button></div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-full py-16 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20"><div className="bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><FilePlus size={32} className="text-zinc-600" /></div><p className="text-sm font-medium text-zinc-400">Nenhum recibo gerado ainda.</p></div>
                    )}
                </div>
            )}
        </>
    );

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div><h2 className="text-2xl font-bold text-white font-serif">Financeiro</h2><p className="text-zinc-500">Gestão agrupada de honorários e despesas.</p></div>
                <div className="flex gap-2">
                    <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"><Plus size={18} /> Novo Lançamento</button>
                </div>
            </div>

            <div className="flex border-b border-zinc-800"><button onClick={() => { setCurrentView('financial'); setActiveTab('overview'); }} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-gold-500 text-gold-500' : 'border-transparent text-zinc-400 hover:text-white'}`}>Visão Geral</button><button onClick={() => setCurrentView('office-expenses')} className={`px-6 py-3 text-sm font-bold border-b-2 border-transparent text-zinc-400 hover:text-white transition-colors`}>Despesas Fixas</button><button onClick={() => { setCurrentView('commissions'); setActiveTab('commissions'); }} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'commissions' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-white'}`}>Comissões</button></div>

            <div className="flex flex-col gap-4">
                <div className="bg-[#0f1014] p-2 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex bg-zinc-900 rounded-lg p-1"><button onClick={() => setPeriodMode('month')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${periodMode === 'month' ? 'bg-gold-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}>Mês</button><button onClick={() => setPeriodMode('year')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${periodMode === 'year' ? 'bg-gold-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}>Ano</button><button onClick={() => setPeriodMode('all')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${periodMode === 'all' ? 'bg-gold-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}><Infinity size={12} /> Tudo</button></div>
                    {periodMode !== 'all' && (<div className="flex items-center gap-4 bg-zinc-900/50 px-2 py-1 rounded-lg border border-zinc-800"><button onClick={() => navigatePeriod('prev')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"><ChevronLeft size={18} /></button><div className="text-sm font-bold text-white min-w-[120px] text-center capitalize flex items-center justify-center gap-2"><CalendarRange size={14} className="text-gold-500" />{getPeriodLabel()}</div><button onClick={() => navigatePeriod('next')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"><ChevronRight size={18} /></button></div>)}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                            <input
                                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-9 pr-9 py-1.5 text-sm text-zinc-100 outline-none focus:border-gold-500 placeholder:text-zinc-600 transition-colors"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                    title="Limpar busca"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg border transition-all ${showFilters ? 'bg-zinc-900 border-gold-500 text-gold-500' : 'bg-[#09090b] border-zinc-800 text-zinc-400 hover:text-white'}`}><Filter size={16} /></button>
                        <button onClick={handleExportCSV} className="p-2 rounded-lg border border-zinc-800 bg-[#09090b] text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"><Download size={16} /></button>
                    </div>
                </div>

                {/* NOVOS FILTROS */}
                {showFilters && (
                    <div className="bg-[#0f1014] p-3 rounded-xl border border-zinc-800 animate-in slide-in-from-top-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {activeTab === 'overview' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tipo</label>
                                    <select className="w-full bg-[#09090b] border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none" value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
                                        <option value="all">Todos</option>
                                        <option value={FinancialType.RECEITA}>Receita</option>
                                        <option value={FinancialType.DESPESA}>Despesa</option>
                                        <option value={FinancialType.COMISSAO}>Comissão</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                                    <select className="w-full bg-[#09090b] border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                                        <option value="all">Todos</option>
                                        <option value="paid">Pago</option>
                                        <option value="pending">Pendente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Forma</label>
                                    <select className="w-full bg-[#09090b] border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
                                        <option value="all">Todas</option>
                                        <option value="Especie">Espécie</option>
                                        <option value="Conta">Conta</option>
                                        <option value="Pix">Pix</option>
                                        <option value="Boleto">Boleto</option>
                                        {uniqueMethods.filter(m => !['Especie', 'Conta', 'Pix', 'Boleto'].includes(m as string)).map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Conta</label>
                                    <select className="w-full bg-[#09090b] border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
                                        <option value="all">Todas</option>
                                        {uniqueAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Recebedor</label>
                                    <select className="w-full bg-[#09090b] border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none" value={filterReceiver} onChange={(e) => setFilterReceiver(e.target.value)}>
                                        <option value="all">Todos</option>
                                        {uniqueReceivers.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end col-span-2 md:col-span-4">
                                    <button onClick={() => { setFilterType('all'); setFilterStatus('all'); setFilterMethod('all'); setFilterReceiver('all'); setFilterAccount('all'); setSearchTerm(''); }} className="text-xs text-zinc-500 hover:text-white underline pb-2">Limpar Todos os Filtros</button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {activeTab === 'overview' ? renderOverview() : renderCommissions()}

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

            <CommissionReceiptModal
                isOpen={receiptModalOpen}
                onClose={() => { setReceiptModalOpen(false); setSelectedCommissionIds(new Set()); setSelectedReceipt(undefined); }}
                selectedRecords={commissionsData.filter(c => selectedCommissionIds.has(c.id))}
                captadorName={currentCaptadorName}
                existingReceipt={selectedReceipt}
            />

            {/* Modal Add Avulso */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-white mb-4">Novo Lançamento Avulso</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
                                <input className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none focus:border-emerald-500" value={newRecord.descricao} onChange={e => setNewRecord({ ...newRecord, descricao: e.target.value })} autoFocus />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Valor</label>
                                    <input className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none focus:border-emerald-500" value={amountStr} onChange={handleAmountChange} placeholder="R$ 0,00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tipo</label>
                                    <select className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none focus:border-emerald-500" value={newRecord.tipo} onChange={e => setNewRecord({ ...newRecord, tipo: e.target.value as any })}>
                                        <option value={FinancialType.RECEITA}>Receita</option>
                                        <option value={FinancialType.DESPESA}>Despesa</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleAddAvulso} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-2">Salvar</button>
                            <button onClick={() => setIsModalOpen(false)} className="w-full text-zinc-500 hover:text-white py-2 text-sm">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Financial;
