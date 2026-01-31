import React from 'react';
import { OfficeExpense } from '../../types';
import { Calendar, X, Circle, CheckCircle2, Trash2 } from 'lucide-react';

interface ExpenseDayDetailsModalProps {
    expenses: OfficeExpense[];
    onClose: () => void;
    onStatusClick: (expense: OfficeExpense) => void;
    onDelete: (expenseId: string) => void;
}

const ExpenseDayDetailsModal: React.FC<ExpenseDayDetailsModalProps> = ({
    expenses,
    onClose,
    onStatusClick,
    onDelete
}) => {
    const handleDelete = (expense: OfficeExpense) => {
        onDelete(expense.id);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-[#0f1014] border border-white/10 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#131418] rounded-t-xl">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calendar size={18} className="text-gold-500" />
                        {expenses.length > 0 ? new Date(expenses[0].data_despesa).toLocaleDateString('pt-BR', { dateStyle: 'long' }) : 'Detalhes do Dia'}
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <div className="p-4 overflow-y-auto custom-scrollbar space-y-3 flex-1">
                    {expenses.length > 0 ? (
                        expenses.map(expense => (
                            <div key={expense.id} className="p-3 bg-black/20 border border-white/10 rounded-lg flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-white text-sm">{expense.titulo}</h4>
                                    <span className="font-bold text-red-400 text-sm">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.valor)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <button
                                        onClick={() => onStatusClick(expense)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${expense.status === 'Pendente'
                                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                            }`}
                                    >
                                        {expense.status === 'Pendente' ? <Circle size={12} /> : <CheckCircle2 size={12} />}
                                        {expense.status || 'Pago'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(expense)}
                                        className="text-slate-500 hover:text-red-500 p-1.5 rounded hover:bg-slate-800 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <p>Nenhuma despesa para este dia.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 bg-[#131418] rounded-b-xl flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors border border-white/5">Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default ExpenseDayDetailsModal;
