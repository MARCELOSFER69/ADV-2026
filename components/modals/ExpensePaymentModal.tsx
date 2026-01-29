import React, { useState } from 'react';
import { OfficeExpense } from '../../types';
import { PiggyBank } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDateDisplay } from '../../utils/dateUtils';

interface BalanceWithRemaining {
    id: string;
    data_entrada: string;
    remaining: number;
}

interface ExpensePaymentModalProps {
    isOpen: boolean;
    expense: OfficeExpense | null;
    balancesWithRemaining: BalanceWithRemaining[];
    existingPayers: (string | undefined)[];
    existingAccounts: (string | undefined)[];
    onClose: () => void;
    onConfirm: (data: {
        useBalance: boolean;
        balanceId: string;
        payer: string;
        accountType: 'PF' | 'PJ';
        account: string;
    }) => void;
}


const ExpensePaymentModal: React.FC<ExpensePaymentModalProps> = ({
    isOpen,
    expense,
    balancesWithRemaining,
    existingPayers,
    existingAccounts,
    onClose,
    onConfirm
}) => {
    const [useBalancePayment, setUseBalancePayment] = useState(false);
    const [selectedBalancePaymentId, setSelectedBalancePaymentId] = useState('');
    const [confirmPaymentData, setConfirmPaymentData] = useState({
        payer: '',
        accountType: 'PJ' as 'PF' | 'PJ',
        account: ''
    });
    const [isAddingPayerPayment, setIsAddingPayerPayment] = useState(false);
    const [isAddingAccountPayment, setIsAddingAccountPayment] = useState(false);

    const handleConfirm = () => {
        onConfirm({
            useBalance: useBalancePayment,
            balanceId: selectedBalancePaymentId,
            payer: confirmPaymentData.payer,
            accountType: confirmPaymentData.accountType,
            account: confirmPaymentData.account
        });
    };

    const handleUseBalanceChange = (checked: boolean) => {
        setUseBalancePayment(checked);
        if (checked) {
            setConfirmPaymentData({ ...confirmPaymentData, payer: 'Escritório' });
        } else {
            setConfirmPaymentData({ ...confirmPaymentData, payer: '' });
            setSelectedBalancePaymentId('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-[#0f1014] border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
                <div className="p-5 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white">Confirmar Pagamento</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Informe os dados para dar baixa em: <span className="text-white">{expense?.titulo}</span>
                    </p>
                </div>
                <div className="p-5 space-y-4">

                    {/* Custom Toggle: Pagar com Saldo (Modal) */}
                    <div
                        onClick={() => handleUseBalanceChange(!useBalancePayment)}
                        className="flex items-center justify-between p-4 bg-[#18181b] rounded-xl border border-white/10 cursor-pointer group hover:border-gold-500/30 transition-all duration-300"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors duration-300 ${useBalancePayment ? 'bg-gold-500/20 text-gold-500' : 'bg-slate-800 text-slate-500'}`}>
                                <PiggyBank size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Usar Saldo de Escritório?</p>
                                <p className="text-[10px] text-slate-500 font-medium">Baixa imediata no caixa</p>
                            </div>
                        </div>

                        <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${useBalancePayment ? 'bg-gold-500' : 'bg-[#27272a]'}`}>
                            <motion.div
                                animate={{ x: useBalancePayment ? 26 : 4 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                            />
                        </div>
                    </div>

                    {useBalancePayment ? (
                        <div className="animate-in fade-in slide-in-from-top-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qual Saldo Utilizar?</label>
                            <select
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-gold-500 text-sm"
                                value={selectedBalancePaymentId}
                                onChange={(e) => setSelectedBalancePaymentId(e.target.value)}
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
                            {/* Pagador (Com Toggle) */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Quem Pagou?</label>
                                    <button
                                        type="button"
                                        onClick={() => { setIsAddingPayerPayment(!isAddingPayerPayment); setConfirmPaymentData({ ...confirmPaymentData, payer: '' }) }}
                                        className="text-[10px] text-blue-400 hover:text-blue-300"
                                    >
                                        {isAddingPayerPayment ? 'Selecionar Existente' : '+ Novo'}
                                    </button>
                                </div>

                                {isAddingPayerPayment ? (
                                    <input
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
                                        value={confirmPaymentData.payer}
                                        onChange={(e) => setConfirmPaymentData({ ...confirmPaymentData, payer: e.target.value })}
                                        placeholder="Nome do pagador..."
                                    />
                                ) : (
                                    <select
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
                                        value={confirmPaymentData.payer}
                                        onChange={(e) => setConfirmPaymentData({ ...confirmPaymentData, payer: e.target.value })}
                                    >
                                        <option value="">Selecione...</option>
                                        {existingPayers.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
                                        <option value="Escritório">Escritório</option>
                                    </select>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {/* Tipo Conta */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                    <select
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-2 text-white outline-none focus:border-emerald-500"
                                        value={confirmPaymentData.accountType}
                                        onChange={(e) => setConfirmPaymentData({ ...confirmPaymentData, accountType: e.target.value as 'PF' | 'PJ' })}
                                    >
                                        <option value="PJ">PJ</option>
                                        <option value="PF">PF</option>
                                    </select>
                                </div>

                                {/* Conta (Com Toggle) */}
                                <div className="col-span-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Conta</label>
                                        <button
                                            type="button"
                                            onClick={() => { setIsAddingAccountPayment(!isAddingAccountPayment); setConfirmPaymentData({ ...confirmPaymentData, account: '' }) }}
                                            className="text-[10px] text-blue-400 hover:text-blue-300"
                                        >
                                            {isAddingAccountPayment ? 'Selecionar' : '+ Nova'}
                                        </button>
                                    </div>

                                    {isAddingAccountPayment ? (
                                        <input
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
                                            value={confirmPaymentData.account}
                                            onChange={(e) => setConfirmPaymentData({ ...confirmPaymentData, account: e.target.value })}
                                            placeholder="Ex: Nubank..."
                                        />
                                    ) : (
                                        <select
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
                                            value={confirmPaymentData.account}
                                            onChange={(e) => setConfirmPaymentData({ ...confirmPaymentData, account: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {existingAccounts.filter(Boolean).map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="p-4 border-t border-white/10 bg-black/20 rounded-b-xl flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-emerald-600/20"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpensePaymentModal;
