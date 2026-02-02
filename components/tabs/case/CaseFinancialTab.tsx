import React, { useState } from 'react';
import { FinancialRecord, FinancialType, Case, CaseStatus, GPS, Client, OfficeExpense } from '../../../types';
import { BadgeDollarSign, Plus, Trash2, AlertTriangle, Check, DollarSign, Wallet, FileText } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyToNumber } from '../../../services/formatters';
import { formatDateDisplay, getTodayBrasilia } from '../../../utils/dateUtils';
import CustomSelect from '../../ui/CustomSelect';

interface CaseFinancialTabProps {
    financials: FinancialRecord[];
    caseItem: Case;
    client?: Client;
    onAddFinancial: (record: Partial<FinancialRecord>) => Promise<void>;
    onDeleteFinancial: (id: string) => Promise<void>;
    onUpdateCase: (updatedCase: Case) => Promise<void>;
    // Props extras para contexto de pagamentos/recebedores
    existingReceivers: string[];
    existingAccounts: string[];
}

const CaseFinancialTab: React.FC<CaseFinancialTabProps> = ({
    financials,
    caseItem,
    client,
    onAddFinancial,
    onDeleteFinancial,
    onUpdateCase,
    existingReceivers,
    existingAccounts
}) => {
    // STATE: ADD FINANCIAL
    const [isAddingFinancial, setIsAddingFinancial] = useState(false);
    const [newFinancial, setNewFinancial] = useState<{ desc: string, type: FinancialType, val: string, date: string, isHonorary: boolean }>({
        desc: '',
        type: FinancialType.DESPESA,
        val: '',
        date: new Date().toISOString().substring(0, 10),
        isHonorary: false
    });
    const [captadorCommission, setCaptadorCommission] = useState<string | null>(null);

    // STATE: HONORARIOS CONFIRMATION
    const [isConfirmingHonorarios, setIsConfirmingHonorarios] = useState(false);
    const [honorariosData, setHonorariosData] = useState({
        method: 'Conta' as 'Especie' | 'Conta',
        receiver: existingReceivers[0] || '',
        accType: 'PJ' as 'PJ' | 'PF',
        account: existingAccounts[0] || '',
    });

    // --- CALCULATED VALUES ---
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
            descricao: newFinancial.desc || (isCommission ? `Pagamento de Comissão - ${captadorNome}` : (newFinancial.type === FinancialType.RECEITA ? (newFinancial.isHonorary ? 'Honorários' : 'Receita Avulsa') : 'Despesa Avulsa')),
            tipo: isCommission ? FinancialType.DESPESA : newFinancial.type,
            tipo_movimentacao: isCommission ? 'Comissao' : (newFinancial.isHonorary ? 'Honorários' : 'Outros'),
            valor: parseCurrencyToNumber(newFinancial.val),
            data_vencimento: newFinancial.date ? new Date(newFinancial.date).toISOString() : new Date().toISOString(),
            status_pagamento: true,
            captador_nome: captadorNome || undefined,
            is_honorary: newFinancial.isHonorary
        };

        await onAddFinancial(newRecord);
        setIsAddingFinancial(false);
        setNewFinancial({ desc: '', type: FinancialType.DESPESA, val: '', date: new Date().toISOString().substring(0, 10), isHonorary: false });
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
        }
        await onUpdateCase(payload);
        setIsConfirmingHonorarios(false);
    };

    return (
        <div className="space-y-8">
            {/* 1. STATUS DOS HONORÁRIOS */}
            <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 relative overflow-hidden group">
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
                        <div className="text-3xl font-serif text-white mb-1">
                            {((caseItem.valor_honorarios_pagos || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-xs text-zinc-500">Valor definido no contrato</p>
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

                            {caseItem.status_pagamento !== 'Pendente' && (
                                <button
                                    onClick={handleSaveHonorariosStatus}
                                    className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg text-xs flex items-center gap-2 transition-colors"
                                >
                                    <Check size={14} />
                                    Salvar Status
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

            {/* 2. LISTA FINANCEIRA (MOVIMENTAÇÕES) */}
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
                                    <label key={t} className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${newFinancial.type === t ? 'border-gold-500 bg-gold-500' : 'border-zinc-600 group-hover:border-gold-500'}`}>
                                            {newFinancial.type === t && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                                        </div>
                                        <span className={`text-sm ${newFinancial.type === t ? 'text-white font-medium' : 'text-zinc-400 group-hover:text-zinc-300'}`}>{t}</span>
                                    </label>
                                ))}
                                {/* Checkbox "É Honorário?" que aparece se for RECEITA */}
                                {newFinancial.type === FinancialType.RECEITA && (
                                    <label className="flex items-center gap-2 cursor-pointer group ml-4 border-l border-white/10 pl-4">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${newFinancial.isHonorary ? 'bg-gold-500 border-gold-500 text-black' : 'border-zinc-600 group-hover:border-gold-500'}`}>
                                            {newFinancial.isHonorary && <Check size={10} strokeWidth={4} />}
                                        </div>
                                        <span className={`text-sm ${newFinancial.isHonorary ? 'text-gold-500 font-bold' : 'text-zinc-400'}`}>É Honorário?</span>
                                    </label>
                                )}
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
                                    <div className="text-sm text-white font-medium">{record.descricao}</div>
                                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                                        <span>{formatDateDisplay(record.data_vencimento)}</span>
                                        {record.is_honorary && <span className="bg-gold-500/10 text-gold-500 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Honorário</span>}
                                        {record.tipo_movimentacao === 'Comissao' && <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Comissão</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`font-mono font-bold ${record.tipo === FinancialType.RECEITA ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                    {record.tipo === FinancialType.DESPESA ? '-' : '+'} {record.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                <button
                                    onClick={() => onDeleteFinancial(record.id)}
                                    className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

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
