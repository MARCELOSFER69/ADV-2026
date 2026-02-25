import React, { useState } from 'react';
import { OfficeExpense, OfficeBalance } from '../../types';
import {
    PiggyBank, X, Plus, DollarSign, Receipt, TrendingDown,
    FileText, User, CreditCard
} from 'lucide-react';
import { formatCurrencyInput, parseCurrencyToNumber } from '../../services/formatters';
import { formatDateDisplay } from '../../utils/dateUtils';

interface ExpenseBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    balancesWithRemaining: (OfficeBalance & { remaining: number, used: number })[];
    officeExpenses: OfficeExpense[];
    onAddBalance: (balance: OfficeBalance) => Promise<void>;
}

const ExpenseBalanceModal: React.FC<ExpenseBalanceModalProps> = ({
    isOpen,
    onClose,
    balancesWithRemaining,
    officeExpenses,
    onAddBalance
}) => {
    // Form State
    const [newBalanceAmount, setNewBalanceAmount] = useState('');
    const [newBalanceDate, setNewBalanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [newBalanceDesc, setNewBalanceDesc] = useState('');
    const [newBalanceMethod, setNewBalanceMethod] = useState<'Pix' | 'Especie'>('Pix');
    const [newBalancePayer, setNewBalancePayer] = useState('');
    const [newBalanceAccountType, setNewBalanceAccountType] = useState<'PF' | 'PJ'>('PJ');
    const [newBalanceAccount, setNewBalanceAccount] = useState('');

    // UI State
    const [expandedBalanceId, setExpandedBalanceId] = useState<string | null>(null);

    const handleBalanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBalanceAmount || !newBalanceDate) return;

        const newBalance: OfficeBalance = {
            id: crypto.randomUUID(),
            valor_inicial: parseCurrencyToNumber(newBalanceAmount),
            data_entrada: newBalanceDate,
            descricao: newBalanceDesc,
            forma_pagamento: newBalanceMethod,
            pagador: newBalancePayer,
            tipo_conta: newBalanceMethod === 'Pix' ? newBalanceAccountType : undefined,
            conta: newBalanceMethod === 'Pix' ? newBalanceAccount : undefined,
            created_at: new Date().toISOString()
        };

        await onAddBalance(newBalance);

        // Reset fields
        setNewBalanceAmount('');
        setNewBalanceDate(new Date().toISOString().split('T')[0]);
        setNewBalanceDesc('');
        setNewBalancePayer('');
        setNewBalanceAccount('');
        setNewBalanceMethod('Pix');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-[#0f1014] border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#131418] rounded-t-xl">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <PiggyBank size={24} className="text-emerald-500" /> Gerenciar Saldo
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                    {/* Novo Aporte */}
                    <section>
                        <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                            <Plus size={16} /> Adicionar Novo Saldo
                        </h4>
                        <form onSubmit={handleBalanceSubmit} className="bg-black/20 p-4 rounded-xl border border-white/10 space-y-4">
                            {/* Linha 1: Valor, Data, Descrição */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor</label>
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            className="w-full bg-[#18181b] border border-white/5 rounded-lg pl-8 pr-2 py-2 text-white text-sm outline-none focus:border-emerald-500 transition-all"
                                            placeholder="0,00"
                                            value={newBalanceAmount}
                                            onChange={(e) => setNewBalanceAmount(formatCurrencyInput(e.target.value))}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                                    <input
                                        type="date"
                                        className="w-full bg-[#18181b] border border-white/5 rounded-lg px-2 py-2 text-white text-sm outline-none focus:border-emerald-500 [color-scheme:dark] transition-all"
                                        value={newBalanceDate}
                                        onChange={(e) => setNewBalanceDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ref / Descrição</label>
                                    <input
                                        className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition-all"
                                        placeholder="Ex: Aporte Inicial..."
                                        value={newBalanceDesc}
                                        onChange={(e) => setNewBalanceDesc(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Linha 2: Método e Detalhes */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-800">
                                {/* Método */}
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Forma de Entrada</label>
                                    <div className="flex bg-[#18181b] p-1 rounded-lg border border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => setNewBalanceMethod('Pix')}
                                            className={`flex-1 text-xs font-bold py-1.5 rounded transition-all ${newBalanceMethod === 'Pix' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Pix
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewBalanceMethod('Especie')}
                                            className={`flex-1 text-xs font-bold py-1.5 rounded transition-all ${newBalanceMethod === 'Especie' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Espécie
                                        </button>
                                    </div>
                                </div>

                                {/* Campos Condicionais */}
                                <div className="md:col-span-3 grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-left-2">
                                    {/* Pagador (Sempre visível) */}
                                    <div className={newBalanceMethod === 'Pix' ? 'col-span-1' : 'col-span-3'}>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quem Pagou?</label>
                                        <input
                                            className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition-all"
                                            placeholder="Nome do pagador..."
                                            value={newBalancePayer}
                                            onChange={(e) => setNewBalancePayer(e.target.value)}
                                        />
                                    </div>

                                    {/* Campos Extra para Pix */}
                                    {newBalanceMethod === 'Pix' && (
                                        <>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo Conta</label>
                                                <select
                                                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-2 py-2 text-white text-sm outline-none focus:border-emerald-500 transition-all"
                                                    value={newBalanceAccountType}
                                                    onChange={(e) => setNewBalanceAccountType(e.target.value as 'PF' | 'PJ')}
                                                >
                                                    <option value="PJ">PJ</option>
                                                    <option value="PF">PF</option>
                                                </select>
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conta</label>
                                                <input
                                                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition-all"
                                                    placeholder="Ex: Nubank..."
                                                    value={newBalanceAccount}
                                                    onChange={(e) => setNewBalanceAccount(e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Botão Salvar */}
                            <div className="flex justify-end pt-2">
                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2">
                                    <Plus size={18} /> Adicionar Saldo
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Histórico e Saldos */}
                    <section>
                        <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                            <Receipt size={16} /> Saldos Disponíveis
                        </h4>
                        <div className="space-y-3">
                            {balancesWithRemaining.length > 0 ? (
                                balancesWithRemaining.map(bal => (
                                    <div
                                        key={bal.id}
                                        onClick={() => setExpandedBalanceId(expandedBalanceId === bal.id ? null : bal.id)}
                                        className={`bg-[#131418] border rounded-xl overflow-hidden transition-all cursor-pointer ${expandedBalanceId === bal.id ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-white/10 hover:border-white/20'}`}
                                    >
                                        {/* Cabeçalho do Card */}
                                        <div className="p-4 flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${bal.remaining > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/30 text-slate-500'}`}>
                                                    {expandedBalanceId === bal.id ? <TrendingDown size={20} /> : <PiggyBank size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-base">
                                                        {bal.descricao || 'Sem descrição'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-2">
                                                        {formatDateDisplay(bal.data_entrada)}
                                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                        Inicial: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bal.valor_inicial)}
                                                        {bal.forma_pagamento && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                                {bal.forma_pagamento}
                                                                {bal.pagador && ` (${bal.pagador})`}
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Restante</p>
                                                <p className={`text-lg font-bold ${bal.remaining > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bal.remaining)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Detalhes Expandidos (Gastos) */}
                                        {expandedBalanceId === bal.id && (
                                            <div className="border-t border-white/10 bg-black/20 p-4 animate-in slide-in-from-top-2">
                                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                                    <TrendingDown size={14} /> Histórico de uso
                                                </h5>
                                                {officeExpenses.filter(e => e.paid_with_balance_id === bal.id).length > 0 ? (
                                                    <div className="space-y-0.5">
                                                        {officeExpenses.filter(e => e.paid_with_balance_id === bal.id).map(exp => (
                                                            <div key={exp.id} className="flex justify-between items-center p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                                                {/* Data e Título */}
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-slate-400 font-mono text-xs w-20">{formatDateDisplay(exp.data_despesa)}</span>
                                                                        <div>
                                                                            <p className="text-white font-medium text-sm">{exp.titulo}</p>
                                                                            {exp.observacao && (
                                                                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                                    <FileText size={10} /> {exp.observacao}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Detalhes Pagamento */}
                                                                <div className="hidden sm:block px-4 text-right">
                                                                    <div className="text-xs text-slate-300 flex items-center justify-end gap-1">
                                                                        <User size={10} className="text-emerald-500" /> {exp.pagador || '-'}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-end gap-1">
                                                                        <CreditCard size={10} /> {exp.tipo_conta || '-'}
                                                                    </div>
                                                                </div>

                                                                {/* Valor e Status */}
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-red-400 font-bold text-sm">
                                                                        - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.valor)}
                                                                    </span>
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                        Pago
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-600 text-sm italic">Nenhum gasto vinculado a este saldo.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                                    <PiggyBank size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Nenhum saldo adicionado ainda.</p>
                                </div>
                            )}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default ExpenseBalanceModal;
