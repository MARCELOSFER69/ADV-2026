import React, { useState } from 'react';
import { FinancialRecord, FinancialType, Case, CaseStatus, GPS, Client, OfficeExpense, CaseInstallment, CaseType } from '../../../types';
import { BadgeDollarSign, Plus, Trash2, AlertTriangle, Check, DollarSign, Wallet, FileText, Calendar, User, Building, MessageCircle, Clock } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyToNumber } from '../../../services/formatters';
import { formatDateDisplay, getTodayBrasilia } from '../../../utils/dateUtils';
import CustomSelect from '../../ui/CustomSelect';
import { useApp } from '../../../context/AppContext';

interface CaseFinancialTabProps {
    financials: FinancialRecord[];
    installments?: CaseInstallment[];
    caseItem: Case;
    client?: Client;
    onAddFinancial: (record: Partial<FinancialRecord>) => Promise<void>;
    onDeleteFinancial: (id: string, caseId?: string) => Promise<void>;
    onUpdateCase: (updatedCase: Case) => Promise<void>;
    existingReceivers: string[];
    existingAccounts: string[];
}

const CaseFinancialTab: React.FC<CaseFinancialTabProps> = ({
    financials,
    installments = [],
    caseItem,
    client,
    onAddFinancial,
    onDeleteFinancial,
    onUpdateCase,
    existingReceivers,
    existingAccounts
}) => {
    const { generateInstallments, updateInstallment, toggleInstallmentPaid, showToast } = useApp();
    // STATE: ADD FINANCIAL
    const [isAddingFinancial, setIsAddingFinancial] = useState(false);
    const [newFinancial, setNewFinancial] = useState<{ desc: string, type: FinancialType, val: string, date: string, isHonorary: boolean, isPaidNow: boolean }>({
        desc: '',
        type: FinancialType.DESPESA,
        val: '',
        date: new Date().toISOString().substring(0, 10),
        isHonorary: false,
        isPaidNow: true
    });
    const [captadorCommission, setCaptadorCommission] = useState<string | null>(null);

    // STATE: RECORD CONFIRMATION (for pending records in list)
    const [isConfirmingRecord, setIsConfirmingRecord] = useState<FinancialRecord | null>(null);
    const [recordConfirmationData, setRecordConfirmationData] = useState({
        method: 'Conta' as 'Especie' | 'Conta',
        receiver: existingReceivers[0] || '',
        accType: 'PJ' as 'PJ' | 'PF', // Fixed: actually use existing receivers/accounts logic or defaults
        account: existingAccounts[0] || '',
    });

    // STATE: HONORARIOS CONFIRMATION
    const [isConfirmingHonorarios, setIsConfirmingHonorarios] = useState(false);
    const [honorariosData, setHonorariosData] = useState({
        method: 'Conta' as 'Especie' | 'Conta',
        receiver: existingReceivers[0] || '',
        accType: 'PJ' as 'PJ' | 'PF',
        account: existingAccounts[0] || '',
    });

    const [isGeneratingParcels, setIsGeneratingParcels] = useState(false);
    const [parcelStartDate, setParcelStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);

    // STATE: INSTALLMENT CONFIRMATION
    const [isConfirmingInstallment, setIsConfirmingInstallment] = useState<CaseInstallment | null>(null);
    const [installmentData, setInstallmentData] = useState({
        method: 'Conta' as 'Especie' | 'Conta',
        receiver: existingReceivers[0] || '',
        accType: 'PJ' as 'PJ' | 'PF',
        account: existingAccounts[0] || '',
    });

    // --- CALCULATED VALUES ---
    const isHonoraryPaid = financials.some(f => f.is_honorary && f.tipo_movimentacao === 'Honorários');
    const totalFees = financials.filter(f => f.is_honorary).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    const totalExpenses = financials.filter(f => !f.is_honorary && f.tipo === FinancialType.DESPESA).reduce((acc, curr) => acc + (curr.valor || 0), 0);

    // --- HANDLERS ---
    const handleAdd = async () => {
        if (!newFinancial.val) return;

        const isCommission = newFinancial.type === FinancialType.COMISSAO;
        const captadorNome = isCommission ? (client?.captador || null) : null;

        const newRecord: Partial<FinancialRecord> = {
            id: crypto.randomUUID(),
            case_id: caseItem.id,
            client_id: caseItem.client_id,
            titulo: newFinancial.desc || (isCommission ? `Pagamento de Comissão - ${captadorNome}` : (newFinancial.type === FinancialType.RECEITA ? (newFinancial.isHonorary ? 'Honorários' : 'Receita Avulsa') : 'Despesa Avulsa')),
            tipo: isCommission ? FinancialType.DESPESA : newFinancial.type,
            tipo_movimentacao: isCommission ? 'Comissao' : (newFinancial.isHonorary ? 'Honorários' : 'Outros'),
            valor: parseCurrencyToNumber(newFinancial.val),
            data_vencimento: newFinancial.date ? new Date(newFinancial.date).toISOString() : new Date().toISOString(),
            status_pagamento: newFinancial.isPaidNow,
            captador_nome: captadorNome || undefined,
            is_honorary: newFinancial.isHonorary
        };

        await onAddFinancial(newRecord);
        setIsAddingFinancial(false);
        setNewFinancial({ desc: '', type: FinancialType.DESPESA, val: '', date: new Date().toISOString().substring(0, 10), isHonorary: false, isPaidNow: true });
    };

    const handleConfirmRecordPayment = async () => {
        if (!isConfirmingRecord) return;

        const updatedRecord: Partial<FinancialRecord> = {
            ...isConfirmingRecord,
            status_pagamento: true,
            forma_pagamento: recordConfirmationData.method,
            recebedor: recordConfirmationData.method === 'Conta' ? recordConfirmationData.receiver : undefined,
            conta: recordConfirmationData.method === 'Conta' ? recordConfirmationData.account : undefined,
            tipo_conta: recordConfirmationData.method === 'Conta' ? recordConfirmationData.accType : undefined,
            data_vencimento: new Date().toISOString() // Set current date as payment date
        };

        // We use onAddFinancial to update because it usually handles the merge/overwrite in this app's pattern
        // Or if there is a specific update method in context, we should use it.
        // Checking CaseFinancialTabProps, we only have onAddFinancial. 
        // In this codebase, "adding" often means "upserting" if id is provided.
        await onAddFinancial(updatedRecord);
        setIsConfirmingRecord(null);
    };

    const handleSaveHonorariosStatus = async () => {
        // Validação: Só permite salvar como "Pago" se estiver Concluído (Concedido)
        if (caseItem.status_pagamento === 'Pago' && caseItem.status !== CaseStatus.CONCLUIDO_CONCEDIDO) {
            alert('Honorários só podem ser pagos se o status for Concluído (Concedido).');
            return;
        }

        if (caseItem.status_pagamento === 'Pago' && !isConfirmingHonorarios) {
            setIsConfirmingHonorarios(true);
            return;
        }

        // Finalize Save
        const payload = { ...caseItem };
        if (isConfirmingHonorarios) {
            payload.honorarios_forma_pagamento = honorariosData.method;
            if (honorariosData.method === 'Conta') {
                payload.honorarios_recebedor = honorariosData.receiver;
                payload.honorarios_tipo_conta = honorariosData.accType;
                payload.honorarios_conta = honorariosData.account;
            } else {
                payload.honorarios_recebedor = undefined;
                payload.honorarios_tipo_conta = undefined;
                payload.honorarios_conta = undefined;
            }

            // Integração Financeira: Se salvou como PAGO, gera lançamento automático de Receita
            if (caseItem.status_pagamento === 'Pago' && caseItem.valor_causa > 0) {
                const financialRecord: Partial<FinancialRecord> = {
                    id: crypto.randomUUID(),
                    case_id: caseItem.id,
                    client_id: caseItem.client_id,
                    titulo: `Recebimento de Honorários - ${caseItem.titulo || 'Processo'}`,
                    tipo: FinancialType.RECEITA,
                    tipo_movimentacao: 'Honorários',
                    valor: caseItem.valor_causa,
                    data_vencimento: new Date().toISOString(),
                    status_pagamento: true,
                    is_honorary: true,
                    forma_pagamento: honorariosData.method,
                    recebedor: honorariosData.receiver || undefined,
                    conta: honorariosData.account || undefined
                };
                await onAddFinancial(financialRecord);
            }
        }
        await onUpdateCase(payload);
        setIsConfirmingHonorarios(false);
    };

    const handleToggleInstallment = async (inst: CaseInstallment, clientName: string) => {
        // Se estiver desmarcando, ou se destino for Cliente, faz o toggle direto
        if (inst.pago || inst.destino === 'Cliente') {
            await toggleInstallmentPaid(inst, clientName);
            return;
        }

        // Se estiver marcando como PAGO para o ESCRITÓRIO, abre o modal de detalhes
        setIsConfirmingInstallment(inst);
    };

    const confirmInstallmentPayment = async () => {
        if (!isConfirmingInstallment) return;

        const paymentDetails = {
            forma_pagamento: installmentData.method,
            recebedor: installmentData.receiver,
            tipo_conta: installmentData.accType,
            conta: installmentData.account
        };

        await toggleInstallmentPaid(isConfirmingInstallment, client?.nome_completo || 'Cliente', paymentDetails);
        setIsConfirmingInstallment(null);
    };

    const handleGenerate = async () => {
        await generateInstallments(caseItem.id, parcelStartDate);
        setIsGeneratingParcels(false);
    };

    return (
        <div className="space-y-8">
            {/* 0. ESCOLHA DE MODALIDADE (Sempre visível para Seguro Defeso, mas bloqueada se não concedido) */}
            {caseItem.tipo === CaseType.SEGURO_DEFESO && (
                <div className={`bg-gold-500/5 border border-gold-500/20 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in duration-500 ${caseItem.status !== CaseStatus.CONCLUIDO_CONCEDIDO ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                            <BadgeDollarSign size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-tight">Forma de Recebimento</h4>
                            <p className="text-[10px] text-slate-400 uppercase font-medium">
                                {caseItem.status !== CaseStatus.CONCLUIDO_CONCEDIDO ? 'Aguardando concessão do benefício' : 'Defina como os honorários serão processados'}
                            </p>
                        </div>
                    </div>

                    <div className={`flex bg-black/40 p-1 rounded-xl border border-white/5 w-full md:w-auto ${caseItem.status !== CaseStatus.CONCLUIDO_CONCEDIDO ? 'pointer-events-none' : ''}`}>
                        <button
                            onClick={() => onUpdateCase({ ...caseItem, forma_recebimento: 'Completo' })}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${caseItem.forma_recebimento === 'Completo'
                                ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Pagamento Completo
                        </button>
                        <button
                            onClick={() => onUpdateCase({ ...caseItem, forma_recebimento: 'Parcelado' })}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${caseItem.forma_recebimento === 'Parcelado'
                                ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Parcelamento
                        </button>
                    </div>
                </div>
            )}

            {/* 1. STATUS DOS HONORÁRIOS */}
            {(
                caseItem.tipo !== CaseType.SEGURO_DEFESO ||
                caseItem.status !== CaseStatus.CONCLUIDO_CONCEDIDO ||
                caseItem.forma_recebimento === 'Completo'
            ) && (
                    <div className={`bg-[#18181b] p-6 rounded-xl border border-white/5 relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 ${caseItem.tipo === CaseType.SEGURO_DEFESO && caseItem.status !== CaseStatus.CONCLUIDO_CONCEDIDO ? 'opacity-40 grayscale pointer-events-none' : ''
                        }`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BadgeDollarSign size={80} className="text-gold-500" />
                        </div>

                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                            <Wallet size={20} className="text-gold-500" />
                            Status dos Honorários
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Valor Acordado</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        className="text-3xl font-serif bg-transparent border-b border-white/10 text-white outline-none focus:border-gold-500 w-48"
                                        value={formatCurrencyInput((caseItem.valor_causa || 0).toFixed(2))}
                                        onChange={(e) => onUpdateCase({ ...caseItem, valor_causa: parseCurrencyToNumber(e.target.value) })}
                                    />
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">Valor definido no contrato</p>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Status do Pagamento</label>
                                <div className="flex items-center gap-3">
                                    <select
                                        className={`bg-[#131418] border border-white/10 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:border-gold-500 appearance-none min-w-[150px] ${caseItem.status_pagamento === 'Pago' ? 'text-green-500' :
                                            caseItem.status_pagamento === 'Parcial' ? 'text-yellow-500' : 'text-zinc-400'
                                            }`}
                                        value={caseItem.status_pagamento || 'Pendente'}
                                        onChange={(e) => onUpdateCase({ ...caseItem, status_pagamento: e.target.value as any })}
                                    >
                                        <option value="Pendente">Pendente</option>
                                        <option value="Parcial">Parcial</option>
                                        <option value="Pago">Pago</option>
                                    </select>

                                    {caseItem.status_pagamento === 'Pendente' && (
                                        <button
                                            onClick={() => {
                                                setIsAddingFinancial(true);
                                                setNewFinancial({
                                                    ...newFinancial,
                                                    type: FinancialType.RECEITA,
                                                    isHonorary: true,
                                                    isPaidNow: false,
                                                    desc: `Honorários - ${caseItem.titulo}`
                                                });
                                            }}
                                            className="px-4 py-2 bg-gold-500/10 hover:bg-gold-500/20 text-gold-500 font-bold rounded-lg text-xs flex items-center gap-2 transition-all border border-gold-500/20"
                                        >
                                            <Calendar size={14} />
                                            Agendar Pagamento
                                        </button>
                                    )}

                                    {caseItem.status_pagamento !== 'Pendente' && (
                                        <button
                                            onClick={handleSaveHonorariosStatus}
                                            disabled={caseItem.status_pagamento === 'Pago' && isHonoraryPaid}
                                            className={`px-4 py-2 font-bold rounded-lg text-xs flex items-center gap-2 transition-colors ${caseItem.status_pagamento === 'Pago' && isHonoraryPaid
                                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                                                : 'bg-gold-500 hover:bg-gold-600 text-black'
                                                }`}
                                        >
                                            <Check size={14} />
                                            {caseItem.status_pagamento === 'Pago' && isHonoraryPaid ? 'Status Salvo' : 'Salvar Status'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* MODAL DE CONFIRMAÇÃO DE RECEBIMENTO */}
                        {isConfirmingHonorarios && (
                            <div className="mt-6 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-4">
                                <div className="bg-[#131418] p-4 rounded-lg border border-gold-500/30">
                                    <h4 className="text-sm font-bold text-gold-500 mb-4 flex items-center gap-2">
                                        <DollarSign size={16} />
                                        Detalhes do Recebimento
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Forma</label>
                                            <div className="flex gap-2">
                                                {['Especie', 'Conta'].map(m => (
                                                    <button
                                                        key={m}
                                                        onClick={() => setHonorariosData(prev => ({ ...prev, method: m as any }))}
                                                        className={`flex-1 py-1.5 px-3 rounded text-xs font-bold border transition-colors ${honorariosData.method === m
                                                            ? 'bg-gold-500 text-black border-gold-500'
                                                            : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                                                            }`}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {honorariosData.method === 'Conta' && (
                                            <>
                                                <div>
                                                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Recebedor</label>
                                                    <CustomSelect
                                                        label="Recebedor"
                                                        options={existingReceivers.map(r => ({ label: r, value: r }))}
                                                        value={honorariosData.receiver}
                                                        onChange={val => setHonorariosData(prev => ({ ...prev, receiver: val }))}
                                                        placeholder="Selecione..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Conta (Destino)</label>
                                                    <CustomSelect
                                                        label="Conta Destino"
                                                        options={existingAccounts.map(a => ({ label: a, value: a }))}
                                                        value={honorariosData.account}
                                                        onChange={val => setHonorariosData(prev => ({ ...prev, account: val }))}
                                                        placeholder="Selecione..."
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button
                                            onClick={() => setIsConfirmingHonorarios(false)}
                                            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSaveHonorariosStatus}
                                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-black font-bold rounded text-xs flex items-center gap-1"
                                        >
                                            <Check size={12} /> Confirmar Recebimento
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            {/* 2. PARCELAMENTO DO BENEFÍCIO (Exclusivo Seguro Defeso) */}
            {caseItem.tipo === CaseType.SEGURO_DEFESO && (
                caseItem.status !== CaseStatus.CONCLUIDO_CONCEDIDO ||
                caseItem.forma_recebimento === 'Parcelado'
            ) && (
                    <div className={`bg-[#18181b] p-6 rounded-xl border border-white/5 relative group animate-in fade-in slide-in-from-bottom-4 ${caseItem.status !== CaseStatus.CONCLUIDO_CONCEDIDO ? 'opacity-40 grayscale pointer-events-none' : ''
                        }`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Calendar size={20} className="text-gold-500" />
                                Parcelamento do Benefício
                            </h3>

                            {installments.length === 0 ? (
                                <div className="flex items-center gap-3">
                                    {caseItem.status !== 'Concluído (Concedido)' && (
                                        <span className="text-[10px] text-zinc-500 font-medium bg-zinc-500/10 px-2 py-1 rounded border border-white/5">
                                            Aguardando status "Concluído (Concedido)"
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setIsGeneratingParcels(true)}
                                        disabled={caseItem.status !== 'Concluído (Concedido)'}
                                        className="text-xs font-bold text-gold-500 hover:text-gold-400 uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Plus size={14} /> Gerar Parcelas (Seguro Defeso)
                                    </button>
                                </div>
                            ) : (
                                <div className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 uppercase">
                                    Parcelamento Ativo
                                </div>
                            )}
                        </div>

                        {isGeneratingParcels && (
                            <div className="bg-[#131418] p-4 rounded-lg border border-gold-500/30 mb-6 flex flex-col md:flex-row items-end gap-4 animate-in slide-in-from-top-2">
                                <div className="flex-1">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1.5">Data da 1ª Parcela</label>
                                    <input
                                        type="date"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500"
                                        value={parcelStartDate}
                                        onChange={e => setParcelStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsGeneratingParcels(false)} className="px-4 py-2 text-xs text-zinc-500 hover:text-white font-bold uppercase">Cancelar</button>
                                    <button onClick={handleGenerate} className="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg text-xs uppercase tracking-widest">Gerar 4 Parcelas</button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {installments.length === 0 ? (
                                <div className="text-center py-6 text-zinc-600 italic text-sm">Nenhum parcelamento gerado para este benefício.</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {installments.map(inst => (
                                        <div key={inst.id} className={`p-4 rounded-xl border transition-all ${inst.pago ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#131418] border-white/5 hover:border-gold-500/20'}`}>
                                            <div className="flex flex-col md:flex-row items-center gap-4">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${inst.pago ? 'bg-emerald-500 text-black' : 'bg-white/5 text-zinc-400'}`}>
                                                        {inst.parcela_numero}º
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                                                        <div>
                                                            <label className="text-[10px] text-zinc-500 uppercase block mb-1">Vencimento</label>
                                                            <div className="flex items-center gap-2 group/date relative">
                                                                <input
                                                                    type="date"
                                                                    className="bg-[#131418] border border-white/5 rounded px-2 py-1 text-sm text-white font-medium outline-none focus:border-gold-500/50 transition-colors cursor-pointer w-full appearance-none"
                                                                    value={inst.data_vencimento}
                                                                    onChange={e => updateInstallment({ ...inst, data_vencimento: e.target.value }, client?.nome_completo || 'Cliente')}
                                                                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                                                />
                                                                <Calendar size={12} className="absolute right-2 text-zinc-500 pointer-events-none group-hover/date:text-gold-500 transition-colors" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-zinc-500 uppercase block">Valor</label>
                                                            <input
                                                                className="bg-transparent border-none p-0 text-sm text-white font-mono font-bold outline-none w-24"
                                                                value={formatCurrencyInput(inst.valor.toFixed(2))}
                                                                onChange={e => updateInstallment({ ...inst, valor: parseCurrencyToNumber(e.target.value) }, client?.nome_completo || 'Cliente')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-zinc-500 uppercase block">Destino</label>
                                                            <select
                                                                className="bg-transparent border-none p-0 text-sm text-gold-500 font-bold outline-none cursor-pointer"
                                                                value={inst.destino}
                                                                onChange={e => updateInstallment({ ...inst, destino: e.target.value as any }, client?.nome_completo || 'Cliente')}
                                                            >
                                                                <option value="Cliente" className="bg-[#131418]">Cliente</option>
                                                                <option value="Escritório" className="bg-[#131418]">Escritório</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center justify-end md:justify-start">
                                                            <button
                                                                onClick={() => handleToggleInstallment(inst, client?.nome_completo || 'Cliente')}
                                                                className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all ${inst.pago ? 'bg-emerald-500 text-black' : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'}`}
                                                            >
                                                                {inst.pago ? 'Pago' : 'Pendente'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* MODAL DE CONFIRMAÇÃO DE PARCELA */}
                            {isConfirmingInstallment && (
                                <div className="mt-6 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-4">
                                    <div className="bg-[#131418] p-4 rounded-xl border border-gold-500/30">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-bold text-gold-500 flex items-center gap-2 uppercase tracking-tight">
                                                <DollarSign size={16} />
                                                Detalhes do Recebimento (Parcela {isConfirmingInstallment.parcela_numero})
                                            </h4>
                                            <span className="text-xs text-zinc-500 font-mono">
                                                Valor: {isConfirmingInstallment.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-zinc-500 uppercase font-black block mb-2 tracking-widest">Forma</label>
                                                <div className="flex gap-2">
                                                    {['Especie', 'Conta'].map(m => (
                                                        <button
                                                            key={m}
                                                            onClick={() => setInstallmentData(prev => ({ ...prev, method: m as any }))}
                                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-tighter border transition-all ${installmentData.method === m
                                                                ? 'bg-gold-500 text-black border-gold-500 shadow-lg shadow-gold-500/10'
                                                                : 'bg-transparent text-zinc-500 border-white/5 hover:border-white/20'
                                                                }`}
                                                        >
                                                            {m}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {installmentData.method === 'Conta' && (
                                                <>
                                                    <div>
                                                        <label className="text-[10px] text-zinc-500 uppercase font-black block mb-2 tracking-widest">Recebedor</label>
                                                        <CustomSelect
                                                            label="Recebedor"
                                                            options={existingReceivers.map(r => ({ label: r, value: r }))}
                                                            value={installmentData.receiver}
                                                            onChange={val => setInstallmentData(prev => ({ ...prev, receiver: val }))}
                                                            placeholder="Selecione..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-zinc-500 uppercase font-black block mb-2 tracking-widest">Conta (Destino)</label>
                                                        <CustomSelect
                                                            label="Conta Destino"
                                                            options={existingAccounts.map(a => ({ label: a, value: a }))}
                                                            value={installmentData.account}
                                                            onChange={val => setInstallmentData(prev => ({ ...prev, account: val }))}
                                                            placeholder="Selecione..."
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex justify-end gap-3 mt-6">
                                            <button
                                                onClick={() => setIsConfirmingInstallment(null)}
                                                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={confirmInstallmentPayment}
                                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-widest"
                                            >
                                                <Check size={16} strokeWidth={3} />
                                                Confirmar Recebimento
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            {/* 3. LISTA FINANCEIRA (MOVIMENTAÇÕES) */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText size={20} className="text-gold-500" />
                        Movimentações Financeiras
                    </h3>
                    <button
                        onClick={() => setIsAddingFinancial(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gold-500/10 text-gold-500 rounded-lg hover:bg-gold-500/20 transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                        <Plus size={14} />
                        Lançar Novo
                    </button>
                </div>

                {/* FORMULÁRIO DE ADIÇÃO */}
                {isAddingFinancial && (
                    <div className="bg-[#18181b] p-4 rounded-xl border border-dashed border-gold-500/30 mb-6 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                            <div className="lg:col-span-2">
                                <label className="text-xs text-slate-400 block mb-1">Descrição</label>
                                <input
                                    className="w-full bg-[#131418] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                    value={newFinancial.desc}
                                    onChange={e => setNewFinancial({ ...newFinancial, desc: e.target.value })}
                                    placeholder={newFinancial.type === FinancialType.COMISSAO ? `Comissão - ${client?.captador}` : "Descrição..."}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Valor (R$)</label>
                                <input
                                    className="w-full bg-[#131418] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                    value={newFinancial.val}
                                    onChange={e => setNewFinancial({ ...newFinancial, val: formatCurrencyInput(e.target.value) })}
                                    placeholder="0,00"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Data</label>
                                <input
                                    type="date"
                                    className="w-full bg-[#131418] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                    value={newFinancial.date}
                                    onChange={e => setNewFinancial({ ...newFinancial, date: e.target.value })}
                                />
                            </div>
                            <div className="lg:col-span-4 flex gap-4 pt-2">
                                {Object.values(FinancialType).map(t => (
                                    <label key={t} className="flex items-center gap-2 cursor-pointer group" onClick={() => setNewFinancial({ ...newFinancial, type: t })}>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${newFinancial.type === t ? 'border-gold-500 bg-gold-500' : 'border-zinc-600 group-hover:border-gold-500'}`}>
                                            {newFinancial.type === t && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                                        </div>
                                        <span className={`text-sm ${newFinancial.type === t ? 'text-white font-medium' : 'text-zinc-400 group-hover:text-zinc-300'}`}>{t}</span>
                                    </label>
                                ))}
                                {/* Checkbox "É Honorário?" que aparece se for RECEITA */}
                                {newFinancial.type === FinancialType.RECEITA && (
                                    <label className="flex items-center gap-2 cursor-pointer group ml-4 border-l border-white/10 pl-4" onClick={() => setNewFinancial({ ...newFinancial, isHonorary: !newFinancial.isHonorary })}>
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${newFinancial.isHonorary ? 'bg-gold-500 border-gold-500 text-black' : 'border-zinc-600 group-hover:border-gold-500'}`}>
                                            {newFinancial.isHonorary && <Check size={10} strokeWidth={4} />}
                                        </div>
                                        <span className={`text-sm ${newFinancial.isHonorary ? 'text-gold-500 font-bold' : 'text-zinc-400'}`}>É Honorário?</span>
                                    </label>
                                )}
                                <label className="flex items-center gap-2 cursor-pointer group ml-4 border-l border-white/10 pl-4" onClick={() => setNewFinancial({ ...newFinancial, isPaidNow: !newFinancial.isPaidNow })}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${newFinancial.isPaidNow ? 'bg-green-500 border-green-500 text-black' : 'border-zinc-600 group-hover:border-green-500'}`}>
                                        {newFinancial.isPaidNow && <Check size={10} strokeWidth={4} />}
                                    </div>
                                    <span className={`text-sm ${newFinancial.isPaidNow ? 'text-green-500 font-bold' : 'text-zinc-400'}`}>Pago agora?</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsAddingFinancial(false)} className="px-3 py-1.5 text-xs text-zinc-500 hover:text-white">Cancelar</button>
                            <button onClick={handleAdd} className="px-4 py-1.5 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded text-xs">Adicionar</button>
                        </div>
                    </div>
                )}

                {/* LISTA DE REGISTROS */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {financials.length === 0 ? (
                        <div className="text-center py-8 text-zinc-600 italic text-sm">Nenhuma movimentação registrada.</div>
                    ) : financials.map(record => (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-[#18181b] rounded-lg border border-white/5 hover:border-gold-500/20 group transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${record.tipo === FinancialType.RECEITA ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                    <DollarSign size={14} />
                                </div>
                                <div>
                                    <div className="text-sm text-white font-medium">{record.titulo}</div>
                                    <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                                        <span>{formatDateDisplay(record.data_vencimento)}</span>
                                        {record.is_honorary && <span className="bg-gold-500/10 text-gold-500 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Honorário</span>}
                                        {record.tipo_movimentacao === 'Comissao' && <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Comissão</span>}
                                    </div>

                                    {(record.forma_pagamento || record.recebedor) && (
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-400 font-medium">
                                            {record.forma_pagamento && (
                                                <div className="flex items-center gap-1.5">
                                                    <Wallet size={12} className="text-green-500" />
                                                    {record.forma_pagamento}
                                                </div>
                                            )}
                                            {record.recebedor && (
                                                <div className="flex items-center gap-1.5">
                                                    <User size={12} className="text-zinc-500" />
                                                    {record.recebedor}
                                                </div>
                                            )}
                                            {record.conta && (
                                                <div className="flex items-center gap-1.5">
                                                    <Building size={12} className="text-zinc-500" />
                                                    {record.conta}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`font-mono font-bold ${record.tipo === FinancialType.RECEITA ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                    {record.tipo === FinancialType.DESPESA ? '-' : '+'} {record.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                {record.tipo === FinancialType.RECEITA && !record.status_pagamento && (
                                    <button
                                        onClick={() => setIsConfirmingRecord(record)}
                                        className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 text-emerald-500 hover:text-black rounded-lg text-xs font-black uppercase tracking-widest transition-all border border-emerald-500/20"
                                    >
                                        Confirmar Recebimento
                                    </button>
                                )}
                                <button
                                    onClick={() => onDeleteFinancial(record.id, caseItem.id)}
                                    className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* MODAL DE CONFIRMAÇÃO DE REGISTRO PENDENTE (SCHEDULED) */}
                {isConfirmingRecord && (
                    <div className="mt-4 p-4 bg-[#131418] rounded-xl border border-emerald-500/30 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-emerald-500 flex items-center gap-2 uppercase tracking-tight">
                                <DollarSign size={16} />
                                Detalhes do Recebimento (Agendamento)
                            </h4>
                            <span className="text-xs text-zinc-500 font-mono">
                                {isConfirmingRecord.titulo}: {isConfirmingRecord.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase font-black block mb-2 tracking-widest">Forma</label>
                                <div className="flex gap-2">
                                    {['Especie', 'Conta'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setRecordConfirmationData(prev => ({ ...prev, method: m as any }))}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-tighter border transition-all ${recordConfirmationData.method === m
                                                ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/10'
                                                : 'bg-transparent text-zinc-500 border-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {recordConfirmationData.method === 'Conta' && (
                                <>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-black block mb-2 tracking-widest">Recebedor</label>
                                        <CustomSelect
                                            label="Recebedor"
                                            options={existingReceivers.map(r => ({ label: r, value: r }))}
                                            value={recordConfirmationData.receiver}
                                            onChange={val => setRecordConfirmationData(prev => ({ ...prev, receiver: val }))}
                                            placeholder="Selecione..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-black block mb-2 tracking-widest">Conta (Destino)</label>
                                        <CustomSelect
                                            label="Conta Destino"
                                            options={existingAccounts.map(a => ({ label: a, value: a }))}
                                            value={recordConfirmationData.account}
                                            onChange={val => setRecordConfirmationData(prev => ({ ...prev, account: val }))}
                                            placeholder="Selecione..."
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsConfirmingRecord(null)}
                                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmRecordPayment}
                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-widest"
                            >
                                <Check size={16} strokeWidth={3} />
                                Confirmar Recebimento
                            </button>
                        </div>
                    </div>
                )}

                {/* TOTAIS */}
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-end gap-6 text-sm">
                    <div className="text-green-500">
                        <span className="text-zinc-500 mr-2">Honorários Recebidos:</span>
                        <span className="font-bold">{totalFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="text-red-500">
                        <span className="text-zinc-500 mr-2">Despesas:</span>
                        <span className="font-bold">{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CaseFinancialTab;
