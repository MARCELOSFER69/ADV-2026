import React, { useState } from 'react';
import { Plus, X, Wallet, PiggyBank, TrendingDown, Check, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OfficeExpense } from '../../types';
import { formatCurrencyInput, parseCurrencyToNumber } from '../../services/formatters';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useApp } from '../../context/AppContext';
import CustomSelect from '../ui/CustomSelect';
import ReceiverFormModal from './ReceiverFormModal';

interface ExpenseAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddExpense: (expense: OfficeExpense) => Promise<void>;
    balancesWithRemaining: any[];
    existingPayers: string[];
    existingAccounts: string[];
}

const ExpenseAddModal: React.FC<ExpenseAddModalProps> = ({
    isOpen,
    onClose,
    onAddExpense,
    balancesWithRemaining,
    existingPayers,
    existingAccounts
}) => {
    // --- State do Formulário ---
    const [title, setTitle] = useState('');
    const [amountStr, setAmountStr] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<'Pago' | 'Pendente'>('Pago');
    const [observation, setObservation] = useState('');

    // State dos campos de Pagamento
    const [payer, setPayer] = useState('');
    const [accountType, setAccountType] = useState<'PF' | 'PJ'>('PJ');
    const [account, setAccount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [receiver, setReceiver] = useState('');
    const [useBalance, setUseBalance] = useState(false);
    const [selectedBalanceId, setSelectedBalanceId] = useState('');

    const { receivers, addReceiver } = useApp();
    const [isReceiverModalOpen, setIsReceiverModalOpen] = useState(false);

    const [isAddingPayer, setIsAddingPayer] = useState(false);
    const [isAddingAccount, setIsAddingAccount] = useState(false);

    const receiverOptions = React.useMemo(() => [
        ...(receivers || []).map(r => ({
            label: `${r.name} (${r.type || 'PF'}) - ${r.bank_name || 'S/ Banco'}`,
            value: r.id
        }))
    ], [receivers]);

    const handleReceiverChange = async (val: string) => {
        const relatedReceiver = (receivers || []).find(r => r.id === val);
        if (relatedReceiver) {
            setReceiver(relatedReceiver.name);
            if (relatedReceiver.bank_name) setAccount(relatedReceiver.bank_name);
            if (relatedReceiver.type) setAccountType(relatedReceiver.type);
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmountStr(formatCurrencyInput(e.target.value));
    };

    const resetForm = () => {
        setTitle('');
        setAmountStr('');
        setObservation('');
        setStatus('Pago');
        setPayer('');
        setAccount('');
        setPaymentMethod('');
        setReceiver('');
        setUseBalance(false);
        setSelectedBalanceId('');
        setIsAddingPayer(false);
        setIsAddingAccount(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !amountStr || !date) return;

        const newExpense: OfficeExpense = {
            id: crypto.randomUUID(),
            titulo: title,
            valor: parseCurrencyToNumber(amountStr),
            data_despesa: date,
            status: status,
            observacao: observation,
            pagador: status === 'Pago' ? payer : undefined,
            tipo_conta: status === 'Pago' ? accountType : undefined,
            conta: status === 'Pago' ? account : undefined,
            forma_pagamento: status === 'Pago' ? paymentMethod : undefined,
            recebedor: status === 'Pago' ? receiver : undefined,
            paid_with_balance_id: (status === 'Pago' && useBalance && selectedBalanceId) ? selectedBalanceId : undefined,
            created_at: new Date().toISOString()
        };

        await onAddExpense(newExpense);
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-[#09090b] border border-zinc-800 rounded-2xl max-w-lg w-full p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-[#09090b]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-500/10 rounded-lg text-gold-500 border border-gold-500/20">
                            <Plus size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white font-serif">Lançar Despesa</h3>
                            <p className="text-xs text-zinc-400 mt-0.5">Preencha os dados da nova despesa do escritório.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto custom-scrollbar p-6 bg-[#09090b]">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Descrição */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição</label>
                            <input
                                autoComplete="off"
                                className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-3 rounded-xl focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 placeholder:text-zinc-600 transition-all outline-none"
                                placeholder="Ex: Conta de Luz, Café..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        {/* Valor e Data */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</div>
                                    <input
                                        autoComplete="off"
                                        className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 pl-8 pr-4 py-3 rounded-xl focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 placeholder:text-zinc-600 transition-all font-mono outline-none"
                                        placeholder="0,00"
                                        value={amountStr}
                                        onChange={handleAmountChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data</label>
                                <input
                                    type="date"
                                    className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-3 text-sm rounded-xl focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 [color-scheme:dark] transition-all outline-none"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-3 rounded-xl focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 appearance-none transition-all cursor-pointer outline-none"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                >
                                    <option value="Pago">Pago</option>
                                    <option value="Pendente">Pendente</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <TrendingDown size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Observação */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observação</label>
                            <textarea
                                className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-3 rounded-xl focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 placeholder:text-zinc-600 resize-none h-24 transition-all outline-none"
                                placeholder="Detalhes adicionais..."
                                value={observation}
                                onChange={(e) => setObservation(e.target.value)}
                            />
                        </div>

                        {/* Seção Condicional: Pagamento */}
                        <AnimatePresence>
                            {status === 'Pago' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="pt-2 border-t border-zinc-800 space-y-4 overflow-hidden"
                                >
                                    <p className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-1 mt-2">
                                        <Wallet size={12} /> Dados do Pagamento
                                    </p>

                                    {/* Toggle: Pagar com Saldo */}
                                    <div
                                        onClick={() => {
                                            const newVal = !useBalance;
                                            setUseBalance(newVal);
                                            if (newVal) {
                                                setPayer('Escritório');
                                            } else {
                                                setPayer('');
                                                setSelectedBalanceId('');
                                            }
                                        }}
                                        className="flex items-center justify-between p-4 bg-[#0f1014] rounded-2xl border border-zinc-800 cursor-pointer group hover:border-gold-500/30 transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg transition-colors duration-300 ${useBalance ? 'bg-gold-500/20 text-gold-500' : 'bg-slate-800 text-slate-500'}`}>
                                                <PiggyBank size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">Usar Saldo de Escritório?</p>
                                                <p className="text-[10px] text-slate-500 font-medium">Debitar diretamente do caixa interno</p>
                                            </div>
                                        </div>

                                        <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${useBalance ? 'bg-gold-500' : 'bg-zinc-800'}`}>
                                            <motion.div
                                                animate={{ x: useBalance ? 26 : 4 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                                            />
                                        </div>
                                    </div>

                                    {useBalance ? (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Qual Saldo Utilizar?</label>
                                            <select
                                                required={useBalance}
                                                className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-3 text-sm rounded-xl focus:border-gold-500/50 transition-all outline-none"
                                                value={selectedBalanceId}
                                                onChange={(e) => setSelectedBalanceId(e.target.value)}
                                            >
                                                <option value="">Selecione...</option>
                                                {balancesWithRemaining.filter(b => b.remaining > 0).map(b => (
                                                    <option key={b.id} value={b.id}>
                                                        {formatDateDisplay(b.data_entrada)} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.remaining)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Pagador */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pagador</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsAddingPayer(!isAddingPayer); setPayer(''); }}
                                                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase transition-colors"
                                                    >
                                                        {isAddingPayer ? 'Selecionar Existente' : '+ Novo'}
                                                    </button>
                                                </div>
                                                {isAddingPayer ? (
                                                    <input
                                                        autoComplete="off"
                                                        className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-3 rounded-xl focus:border-emerald-500/50 transition-all outline-none"
                                                        placeholder="Nome do pagador..."
                                                        value={payer}
                                                        onChange={(e) => setPayer(e.target.value)}
                                                    />
                                                ) : (
                                                    <select
                                                        className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-3 rounded-xl focus:border-emerald-500/50 transition-all cursor-pointer outline-none"
                                                        value={payer}
                                                        onChange={(e) => setPayer(e.target.value)}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {existingPayers.map(p => <option key={p} value={p}>{p}</option>)}
                                                        <option value="Escritório">Escritório</option>
                                                    </select>
                                                )}
                                            </div>

                                            {/* Conta e Tipo */}
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
                                                    <select
                                                        className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-2 py-3 rounded-xl focus:border-emerald-500/50 text-sm outline-none"
                                                        value={accountType}
                                                        onChange={(e) => setAccountType(e.target.value as any)}
                                                    >
                                                        <option value="PJ">PJ</option>
                                                        <option value="PF">PF</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <CustomSelect
                                                        label="Conta"
                                                        options={[
                                                            { label: 'Pessoal', value: 'Pessoal' },
                                                            ...(receivers || []).filter(r => r.name === receiver).map(r => ({ label: r.bank_name || 'Conta', value: r.bank_name || 'Conta' }))
                                                        ]}
                                                        value={account}
                                                        onChange={setAccount}
                                                        placeholder="Selecione..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Forma Pagto</label>
                                                    <select
                                                        className="w-full bg-[#0f1014] border border-zinc-800 text-zinc-200 px-4 py-3 rounded-xl focus:border-gold-500/50 text-sm transition-all outline-none"
                                                        value={paymentMethod}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        <option value="Pix">Pix</option>
                                                        <option value="Boleto">Boleto</option>
                                                        <option value="Transferência">Transferência</option>
                                                        <option value="Cartão">Cartão</option>
                                                        <option value="Dinheiro">Dinheiro</option>
                                                    </select>
                                                </div>
                                                <div className="z-50 flex items-end gap-2">
                                                    <div className="flex-1">
                                                        <CustomSelect
                                                            label="Recebedor"
                                                            value={(receivers || []).find(r => r.name === receiver)?.id || ''}
                                                            onChange={handleReceiverChange}
                                                            options={receiverOptions}
                                                            placeholder="Ex: Receita Federal"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsReceiverModalOpen(true)}
                                                        className="mb-[2px] p-3 bg-white/5 border border-white/10 rounded-xl text-gold-500 hover:bg-gold-500/10 hover:border-gold-500/30 transition-all shadow-lg"
                                                        title="Cadastrar Novo Recebedor"
                                                    >
                                                        <UserPlus size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}
                            {/* Modal de Cadastro de Recebedor */}
                            <ReceiverFormModal
                                isOpen={isReceiverModalOpen}
                                onClose={() => setIsReceiverModalOpen(false)}
                                onAdd={async (newRec) => {
                                    const result = await addReceiver(newRec);
                                    if (result) {
                                        const res = result as any;
                                        setReceiver(res.name);
                                        if (res.bank_name) setAccount(res.bank_name);
                                        if (res.type) setAccountType(res.type);
                                    }
                                    setIsReceiverModalOpen(false);
                                }}
                            />
                        </AnimatePresence>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800 bg-[#09090b] flex justify-end gap-3 rounded-b-2xl mt-auto">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium text-sm">Cancelar</button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="px-6 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-black rounded-xl shadow-lg shadow-gold-600/20 shadow-gold-500/20 transition-all transform active:scale-[0.98] uppercase text-xs tracking-widest flex items-center gap-2"
                    >
                        <Plus size={18} className="stroke-[3px]" /> Salvar Despesa
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ExpenseAddModal;
