import React, { useState } from 'react';
import { OfficeExpense } from '../../types';
import { PiggyBank } from 'lucide-react';
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
            <div className="bg-navy-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
                <div className="p-5 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white">Confirmar Pagamento</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Informe os dados para dar baixa em: <span className="text-white">{expense?.titulo}</span>
                    </p>
                </div>
                <div className="p-5 space-y-4">

                    {/* Checkbox Pagar com Saldo (Modal) */}
                    <div className="flex items-center gap-2 mb-2 p-2 bg-navy-800 rounded-lg border border-slate-700">
                        <input
                            type="checkbox"
                            id="use_balance_payment"
                            className="w-4 h-4 rounded border-slate-600 bg-navy-900 text-gold-500 focus:ring-offset-navy-900"
                            checked={useBalancePayment}
                            onChange={(e) => handleUseBalanceChange(e.target.checked)}
                        />
                        <label htmlFor="use_balance_payment" className="text-sm text-slate-300 font-medium select-none cursor-pointer flex items-center gap-2">
                            <PiggyBank size={14} className="text-gold-500" />
                            Usar Saldo de Escritório?
                        </label>
                    </div>

                    {useBalancePayment ? (
                        <div className="animate-in fade-in slide-in-from-top-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qual Saldo Utilizar?</label>
                            <select
                                className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-gold-500 text-sm"
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
                                        className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
                                        value={confirmPaymentData.payer}
                                        onChange={(e) => setConfirmPaymentData({ ...confirmPaymentData, payer: e.target.value })}
                                        placeholder="Nome do pagador..."
                                    />
                                ) : (
                                    <select
                                        className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
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
                                        className="w-full bg-navy-950 border border-slate-700 rounded-lg px-2 py-2 text-white outline-none focus:border-emerald-500"
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
                                            className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
                                            value={confirmPaymentData.account}
                                            onChange={(e) => setConfirmPaymentData({ ...confirmPaymentData, account: e.target.value })}
                                            placeholder="Ex: Nubank..."
                                        />
                                    ) : (
                                        <select
                                            className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
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
                <div className="p-4 border-t border-slate-800 bg-navy-950 rounded-b-xl flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
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
