import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { FinancialType, Case, FinancialRecord, CommissionReceipt } from '../types';
import CaseDetailsModal from '../components/modals/CaseDetailsModal';
import CommissionReceiptModal from '../components/modals/CommissionReceiptModal';
import { formatCurrencyInput, parseCurrencyToNumber } from '../services/formatters';
import { useFinancial } from '../hooks/useFinancial';

// Sub-components
import FinancialHeader, { PeriodMode } from '../components/financial/FinancialHeader';
import FinancialSummaryCards from '../components/financial/FinancialSummaryCards';
import FinancialTable, { FinancialViewItem } from '../components/financial/FinancialTable';
import CommissionsTab from '../components/financial/CommissionsTab';
import NewFinancialModal from '../components/financial/NewFinancialModal';

type TabType = 'overview' | 'commissions';
type SubTabType = 'list' | 'receipts';

const Financial: React.FC = () => {
    const {
        showToast,
        officeExpenses,
        setCurrentView,
        currentView,
        setCaseToView,
        deleteFinancialRecord,
        commissionReceipts,
        confirmReceiptSignature,
        deleteCommissionReceipt,
        uploadReceiptFile,
        addFinancialRecord,
        setClientToView
    } = useApp();

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [subTab, setSubTab] = useState<SubTabType>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());

    // --- FILTROS ---
    const [filterType, setFilterType] = useState<FinancialType | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
    const [filterMethod, setFilterMethod] = useState('all');
    const [filterReceiver, setFilterReceiver] = useState('all');
    const [filterAccount, setFilterAccount] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    // --- DADOS OTIMIZADOS ---
    const { data: financial, summary: serverSummary, isLoading } = useFinancial({
        periodMode,
        selectedDate,
        filters: {
            type: filterType !== 'all' ? filterType : undefined,
            status: filterStatus !== 'all' ? filterStatus : undefined,
            method: filterMethod !== 'all' ? filterMethod : undefined,
            account: filterAccount !== 'all' ? filterAccount : undefined,
            receiver: filterReceiver !== 'all' ? filterReceiver : undefined,
            search: searchTerm || undefined
        }
    });

    const [sortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'dataReferencia', direction: 'desc' });
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

    const processedData = useMemo(() => {
        if (!financial) return [];
        const groups: Record<string, any> = {};
        const standaloneItems: FinancialViewItem[] = [];

        // Filtrar Despesas do Escritório pelo período selecionado
        const filteredOfficeExpenses = officeExpenses.filter(e => {
            const dateStr = e.data_despesa;
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
        });

        // Agregação de despesas
        const currentAggregatedOfficeExpenses: FinancialRecord[] = (() => {
            const groups: Record<string, number> = {};
            const paidExpenses = filteredOfficeExpenses.filter(e => e.status === 'Pago');

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
                } as FinancialRecord;
            });
        })();

        const allRecords = [...financial, ...currentAggregatedOfficeExpenses];

        const filteredRecords = allRecords.filter(record => {
            if (record.is_office_expense) return true;
            if (searchTerm) {
                const desc = record.descricao?.toLowerCase() || '';
                const search = searchTerm.toLowerCase();
                const clientName = record.clients?.nome_completo?.toLowerCase() || '';
                const cpf = record.clients?.cpf_cnpj || '';
                const rec = record.recebedor?.toLowerCase() || '';
                const cap = record.captador_nome?.toLowerCase() || '';

                return desc.includes(search) ||
                    clientName.includes(search) ||
                    cpf.includes(search) ||
                    rec.includes(search) ||
                    cap.includes(search);
            }
            return true;
        });

        filteredRecords.forEach(record => {
            let effectiveClientId = record.client_id;
            if (!effectiveClientId && record.cases?.client_id) {
                effectiveClientId = record.cases.client_id;
            }

            if (effectiveClientId) {
                const clientId = effectiveClientId;
                if (!groups[clientId]) {
                    const clientName = record.clients?.nome_completo || 'Cliente Desconhecido';

                    groups[clientId] = {
                        type: 'group',
                        id: `group-${clientId}`,
                        clientId: clientId,
                        caseId: record.case_id,
                        title: clientName,
                        clientName: clientName,
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
            let status: 'PAGO' | 'PARCIAL' | 'PENDENTE' | 'DESPESA' = 'PENDENTE';
            if (g.totalEntradas > 0) status = 'PAGO';
            else if (g.totalSaidas > 0 && g.totalEntradas === 0) status = 'DESPESA';
            else if (g.totalEntradas > 0 && g.totalEntradas < 500) status = 'PARCIAL';

            let valorColorClass = 'text-zinc-200';
            if (saldo > 0) valorColorClass = 'text-blue-400';
            else if (saldo < 0) valorColorClass = 'text-red-400';

            return { ...g, saldo, status, valorColorClass, children: g.children.sort((a: any, b: any) => new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime()) } as FinancialViewItem;
        });

        return [...processedGroups, standaloneItems].flat().sort((a, b) => {
            const dateA = a.type === 'group' ? a.dataReferencia : a.data.data_vencimento;
            const dateB = b.type === 'group' ? b.dataReferencia : b.data.data_vencimento;
            return sortConfig.direction === 'asc'
                ? new Date(dateA).getTime() - new Date(dateB).getTime()
                : new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }, [financial, officeExpenses, searchTerm, periodMode, selectedDate, sortConfig]);

    const commissionsData = useMemo(() => {
        return financial.filter(f => f.tipo === FinancialType.COMISSAO || f.tipo_movimentacao === 'Comissao')
            .sort((a, b) => new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime());
    }, [financial]);

    const totals = useMemo(() => {
        const hasExtraFilters = filterType !== 'all' || filterStatus !== 'all' || filterMethod !== 'all' || searchTerm;
        if (serverSummary && !hasExtraFilters) {
            return { income: serverSummary.income, expense: serverSummary.expense, balance: serverSummary.balance };
        }
        let income = 0;
        let expense = 0;
        processedData.forEach(item => {
            if (item.type === 'group') { income += item.totalEntradas; expense += item.totalSaidas; }
            else if (item.data.status_pagamento) {
                if (item.data.tipo === FinancialType.RECEITA) income += item.data.valor; else expense += item.data.valor;
            }
        });
        return { income, expense, balance: income - expense };
    }, [processedData, serverSummary, filterType, filterStatus, filterMethod, searchTerm]);

    const totalCommissions = useMemo(() => commissionsData.reduce((acc, curr) => acc + (curr.status_pagamento ? curr.valor : 0), 0), [commissionsData]);

    const toggleGroup = (id: string) => { const newSet = new Set(expandedGroups); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setExpandedGroups(newSet); };
    const navigateToCase = (caseId: string) => { setCaseToView(caseId); setCurrentView('cases'); };
    const handleExportCSV = () => { showToast('success', 'Função de exportação em manutenção.'); };

    const handleSelectCommission = (record: FinancialRecord) => {
        if (record.receipt_id) { showToast('error', 'Este item já possui recibo gerado.'); return; }
        const firstSelectedId = Array.from(selectedCommissionIds)[0];
        if (firstSelectedId) {
            const firstRecord = commissionsData.find(c => c.id === firstSelectedId);
            const getCaptador = (r?: FinancialRecord) => r?.captador_nome || r?.descricao?.split(' - ')[1] || 'Unknown';
            if (getCaptador(firstRecord) !== getCaptador(record)) {
                if (!confirm(`Atenção: Seleção de outro captador. Limpar atual?`)) return;
                setSelectedCommissionIds(new Set([record.id])); return;
            }
        }
        const newSet = new Set(selectedCommissionIds);
        if (newSet.has(record.id)) newSet.delete(record.id); else newSet.add(record.id);
        setSelectedCommissionIds(newSet);
    };

    const currentCaptadorName = useMemo(() => {
        if (selectedCommissionIds.size === 0) return '';
        const firstId = Array.from(selectedCommissionIds)[0];
        const record = commissionsData.find(c => c.id === firstId);
        return record?.captador_nome || record?.descricao?.split(' - ')[1] || 'Não identificado';
    }, [selectedCommissionIds, commissionsData]);

    const handleOpenReceipt = (receipt: CommissionReceipt) => { setSelectedReceipt(receipt); setReceiptModalOpen(true); };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (file && activeUploadId) await uploadReceiptFile(activeUploadId, file);
        setActiveUploadId(null); if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAddAvulso = async () => {
        if (!newRecord.descricao || !newRecord.valor) { showToast('error', 'Preencha dados.'); return; }
        await addFinancialRecord({ id: crypto.randomUUID(), ...newRecord as FinancialRecord });
        setIsModalOpen(false); setNewRecord({ descricao: '', valor: 0, tipo: FinancialType.RECEITA, data_vencimento: new Date().toISOString().split('T')[0], status_pagamento: true }); setAmountStr('');
        showToast('success', 'Adicionado!');
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value; setAmountStr(formatCurrencyInput(val));
        setNewRecord({ ...newRecord, valor: parseCurrencyToNumber(formatCurrencyInput(val)) });
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar space-y-8 pb-20 animate-in fade-in duration-500">
            <FinancialHeader
                periodMode={periodMode}
                setPeriodMode={setPeriodMode}
                navigatePeriod={navigatePeriod}
                getPeriodLabel={getPeriodLabel}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                handleExportCSV={handleExportCSV}
            />

            {showFilters && (
                <div className="bg-[#0f1014] p-4 rounded-xl border border-white/10 animate-in slide-in-from-top-2 grid grid-cols-2 md:grid-cols-4 gap-4 shadow-xl">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tipo</label>
                        <select className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold-500/50 transition-all cursor-pointer" value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
                            <option value="all">Todos</option>
                            <option value={FinancialType.RECEITA}>Receita</option>
                            <option value={FinancialType.DESPESA}>Despesa</option>
                            <option value={FinancialType.COMISSAO}>Comissão</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status</label>
                        <select className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold-500/50 transition-all cursor-pointer" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                            <option value="all">Todos</option>
                            <option value="paid">Pago</option>
                            <option value="pending">Pendente</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Forma</label>
                        <select className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold-500/50 transition-all cursor-pointer" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
                            <option value="all">Todas</option>
                            <option value="Especie">Espécie</option>
                            <option value="Conta">Conta</option>
                            <option value="Pix">Pix</option>
                            <option value="Boleto">Boleto</option>
                            {uniqueMethods.filter(m => !['Especie', 'Conta', 'Pix', 'Boleto'].includes(m)).map(m => <option key={m as string} value={m as string}>{m as string}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Conta</label>
                        <select className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold-500/50 transition-all cursor-pointer" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
                            <option value="all">Todas</option>
                            {uniqueAccounts.map(a => <option key={a as string} value={a as string}>{a as string}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {activeTab === 'overview' ? (
                <>
                    <FinancialSummaryCards totals={totals} />
                    <FinancialTable
                        processedData={processedData}
                        expandedGroups={expandedGroups}
                        toggleGroup={toggleGroup}
                        navigateToCase={navigateToCase}
                        deleteFinancialRecord={deleteFinancialRecord}
                    />
                </>
            ) : (
                <CommissionsTab
                    totalCommissions={totalCommissions}
                    subTab={subTab}
                    setSubTab={setSubTab}
                    selectedCommissionIds={selectedCommissionIds}
                    commissionsData={commissionsData}
                    commissionReceipts={commissionReceipts}
                    handleSelectCommission={handleSelectCommission}
                    deleteFinancialRecord={deleteFinancialRecord}
                    handleOpenReceipt={handleOpenReceipt}
                    confirmReceiptSignature={confirmReceiptSignature}
                    deleteCommissionReceipt={deleteCommissionReceipt}
                    setReceiptModalOpen={setReceiptModalOpen}
                    setActiveUploadId={setActiveUploadId}
                    fileInputRef={fileInputRef}
                />
            )}

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />

            {selectedCase && (
                <CaseDetailsModal
                    caseItem={selectedCase}
                    onClose={() => setSelectedCase(null)}
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

            <NewFinancialModal
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                newRecord={newRecord}
                setNewRecord={setNewRecord}
                amountStr={amountStr}
                handleAmountChange={handleAmountChange}
                handleAddAvulso={handleAddAvulso}
            />
        </div>
    );
};

export default Financial;
