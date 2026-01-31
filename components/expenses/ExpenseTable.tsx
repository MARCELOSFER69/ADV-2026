import React from 'react';
import { OfficeExpense } from '../../types';
import {
    Search, X, Filter, ChevronDown, ChevronRight, PiggyBank,
    Trash2, AlertTriangle, Clock, FileText, User, CreditCard,
    CheckCircle2, Circle, Calendar
} from 'lucide-react';
import { formatDateDisplay } from '../../utils/dateUtils';

interface ExpenseTableProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    filterMonth: string;
    onFilterMonthChange: (val: string) => void;
    filterPayer: string;
    onFilterPayerChange: (val: string) => void;
    filterAccount: string;
    onFilterAccountChange: (val: string) => void;
    filterStatus: string;
    onFilterStatusChange: (val: string) => void;
    existingPayers: string[];
    existingAccounts: string[];
    groupedList: (OfficeExpense | { type: 'group', balanceId: string, expenses: OfficeExpense[], total: number, latestDate: string, description: string })[];
    expandedExpenseGroups: Set<string>;
    onToggleGroup: (id: string) => void;
    onDelete: (id: string) => void;
    onStatusClick: (expense: OfficeExpense) => void;
    getExpenseStatus: (expense: OfficeExpense) => 'pago' | 'vencido' | 'hoje' | 'pendente';
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({
    searchTerm,
    onSearchChange,
    filterMonth,
    onFilterMonthChange,
    filterPayer,
    onFilterPayerChange,
    filterAccount,
    onFilterAccountChange,
    filterStatus,
    onFilterStatusChange,
    existingPayers,
    existingAccounts,
    groupedList,
    expandedExpenseGroups,
    onToggleGroup,
    onDelete,
    onStatusClick,
    getExpenseStatus
}) => {
    return (
        <div className="bg-[#0f1014] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full animate-in fade-in duration-300">
            {/* Toolbar de Filtros */}
            <div className="p-4 border-b border-white/10 bg-[#0f1014] space-y-3">
                {/* Linha 1: Mes e Busca */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex items-center gap-2 bg-[#18181b] border border-white/5 rounded-xl px-4 py-2 flex-1 relative transition-colors focus-within:border-white/20">
                        <Search size={16} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar despesa ou obs..."
                            className="bg-transparent border-none text-sm text-white outline-none w-full pr-8 placeholder:text-slate-600 font-medium"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                title="Limpar busca"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Filter size={16} />
                        <input
                            type="month"
                            className="bg-[#18181b] border border-white/5 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-gold-500/50 [color-scheme:dark] transition-all font-medium"
                            value={filterMonth}
                            onChange={(e) => onFilterMonthChange(e.target.value)}
                        />
                    </div>
                </div>

                {/* Linha 2: Filtros Select */}
                <div className="grid grid-cols-3 gap-3">
                    <select
                        className="bg-[#18181b] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-white/20 transition-all cursor-pointer font-medium"
                        value={filterPayer}
                        onChange={(e) => onFilterPayerChange(e.target.value)}
                    >
                        <option value="all">Todos Pagadores</option>
                        {existingPayers.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select
                        className="bg-[#18181b] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-white/20 transition-all cursor-pointer font-medium"
                        value={filterAccount}
                        onChange={(e) => onFilterAccountChange(e.target.value)}
                    >
                        <option value="all">Todas Contas</option>
                        {existingAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select
                        className="bg-[#18181b] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-white/20 transition-all cursor-pointer font-medium"
                        value={filterStatus}
                        onChange={(e) => onFilterStatusChange(e.target.value)}
                    >
                        <option value="all">Todos Status</option>
                        <option value="Pago">Pagos</option>
                        <option value="Pendente">Pendentes</option>
                    </select>
                </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#131418] border-b border-white/5 sticky top-0 z-10 shadow-md">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {groupedList.length > 0 ? (
                            groupedList.map((item, index) => {
                                // --- RENDERIZAÇÃO DE GRUPO ---
                                if ('type' in item && item.type === 'group') {
                                    const isExpanded = expandedExpenseGroups.has(item.balanceId);
                                    return (
                                        <React.Fragment key={`group-${item.balanceId}`}>
                                            {/* Linha do Grupo */}
                                            <tr
                                                onClick={() => onToggleGroup(item.balanceId)}
                                                className={`cursor-pointer transition-all border-l-2 ${isExpanded ? 'bg-white/5 border-l-gold-500 shadow-inner' : 'hover:bg-white/5 border-l-transparent'}`}
                                            >
                                                <td className="px-6 py-4 text-sm text-slate-300 font-mono flex items-center gap-2">
                                                    <button className="text-slate-500 hover:text-white transition-colors">
                                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </button>
                                                    {formatDateDisplay(item.latestDate)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-white flex items-center gap-2">
                                                        <PiggyBank size={14} className="text-gold-500" />
                                                        {item.description}
                                                        <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                                                            {item.expenses.length} itens
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs text-slate-400">Escritório</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-right text-red-400 whitespace-nowrap">
                                                    - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        Pago
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                </td>
                                            </tr>

                                            {/* Itens do Grupo (Expandido) */}
                                            {isExpanded && item.expenses.map(expense => (
                                                <tr key={expense.id} className="bg-black/20 hover:bg-white/5 transition-colors animate-in fade-in slide-in-from-top-1 border-l-2 border-l-transparent hover:border-l-white/10">
                                                    <td className="px-6 py-3 text-xs text-slate-500 font-mono pl-12">
                                                        {formatDateDisplay(expense.data_despesa)}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="text-sm text-slate-300 ml-4 border-l-2 border-slate-700 pl-3">
                                                            {expense.titulo}
                                                            {expense.observacao && <div className="text-[10px] text-slate-500">{expense.observacao}</div>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                    </td>
                                                    <td className="px-6 py-3 text-xs font-medium text-right text-red-400/80">
                                                        - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.valor)}
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
                                                            className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                            title="Excluir item"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                }

                                // --- RENDERIZAÇÃO NORMAL (ITEM INDIVIDUAL) ---
                                const expense = item as OfficeExpense;
                                const status = getExpenseStatus(expense);
                                return (
                                    <tr key={expense.id} className="group hover:bg-white/5 transition-all duration-200 border-l-2 border-l-transparent hover:border-l-gold-500/50">
                                        <td className="px-6 py-4 text-sm text-slate-300 whitespace-nowrap font-mono">
                                            <div className="flex items-center gap-2">
                                                {formatDateDisplay(expense.data_despesa)}
                                                {status === 'vencido' && (
                                                    <span title="Vencido" className="text-red-500 animate-pulse">
                                                        <AlertTriangle size={14} />
                                                    </span>
                                                )}
                                                {status === 'hoje' && (
                                                    <span title="Vence Hoje" className="text-yellow-500 animate-bounce">
                                                        <Clock size={14} />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-white">{expense.titulo}</div>
                                            {expense.observacao && (
                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                    <FileText size={10} /> {expense.observacao}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {expense.status === 'Pago' ? (
                                                <>
                                                    <div className="text-xs text-slate-300 flex items-center gap-1">
                                                        <User size={10} className="text-emerald-500" /> {expense.pagador || '-'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                        <CreditCard size={10} /> {expense.tipo_conta} - {expense.conta}
                                                    </div>
                                                    {(expense.forma_pagamento || expense.recebedor) && (
                                                        <div className="text-[10px] text-gold-500/70 mt-0.5 flex items-center gap-1 font-medium">
                                                            <span>{expense.forma_pagamento}</span>
                                                            {expense.recebedor && <span>→ {expense.recebedor}</span>}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-600 italic">-</span>
                                            )}
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${expense.status === 'Pendente' ? 'text-yellow-500' : 'text-red-400'}`}>
                                            - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.valor)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => onStatusClick(expense)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95
                                                        ${status === 'pago'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:shadow-emerald-500/10'
                                                        : status === 'vencido'
                                                            ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:shadow-red-500/10 animate-pulse'
                                                            : status === 'hoje'
                                                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 hover:shadow-yellow-500/10 animate-bounce'
                                                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white'
                                                    }
                                                    `}
                                            >
                                                {status === 'pago' && <CheckCircle2 size={12} strokeWidth={3} />}
                                                {status === 'vencido' && <AlertTriangle size={12} strokeWidth={3} />}
                                                {status === 'hoje' && <Clock size={12} strokeWidth={3} />}
                                                {status === 'pendente' && <Circle size={12} strokeWidth={3} />}

                                                {status === 'pago' ? 'Pago' : status === 'vencido' ? 'Vencido' : status === 'hoje' ? 'Hoje' : 'Pendente'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => onDelete(expense.id)}
                                                className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <Calendar size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Nenhuma despesa encontrada.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExpenseTable;
