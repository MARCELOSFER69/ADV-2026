import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { OfficeExpense, OfficeBalance } from '../types';
import {
    Plus, Calendar, DollarSign, Building, TrendingDown,
    LayoutList, CalendarRange, Wallet, PiggyBank, Briefcase
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDateDisplay } from '../utils/dateUtils';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import ExpenseDayDetailsModal from '../components/modals/ExpenseDayDetailsModal';
import ExpensePaymentModal from '../components/modals/ExpensePaymentModal';
import ExpenseBalanceModal from '../components/modals/ExpenseBalanceModal';
import ExpenseAddModal from '../components/modals/ExpenseAddModal';
import ExpenseTable from '../components/expenses/ExpenseTable';
import ExpenseCalendar from '../components/expenses/ExpenseCalendar';

const OfficeExpenses: React.FC = () => {
    const { officeExpenses, officeBalances, addOfficeExpense, deleteOfficeExpense, updateOfficeExpense, toggleOfficeExpenseStatus, addOfficeBalance } = useApp();

    // View Mode
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // --- State dos Filtros (Modo Lista) ---
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [filterMonth, setFilterMonth] = useState(currentMonthStr);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPayer, setFilterPayer] = useState('all');
    const [filterAccount, setFilterAccount] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // --- State do Calendário ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDayExpenses, setSelectedDayExpenses] = useState<OfficeExpense[] | null>(null);

    // --- State do Modal de Pagamento (Pendente -> Pago) ---
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [expenseToPay, setExpenseToPay] = useState<OfficeExpense | null>(null);

    // --- State do Modal de Saldo ---
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    useLockBodyScroll(isBalanceModalOpen || isAddModalOpen);

    const [expandedExpenseGroups, setExpandedExpenseGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (id: string) => {
        const newSet = new Set(expandedExpenseGroups);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedExpenseGroups(newSet);
    };

    // --- Listas Dinâmicas ---
    const existingPayers = useMemo(() => Array.from(new Set(officeExpenses.map(e => e.pagador).filter(Boolean))) as string[], [officeExpenses]);
    const existingAccounts = useMemo(() => Array.from(new Set(officeExpenses.map(e => e.conta).filter(Boolean))) as string[], [officeExpenses]);

    // --- Filtros Computados ---
    const filteredExpenses = useMemo(() => {
        return officeExpenses.filter(e => {
            const matchesMonth = searchTerm ? true : e.data_despesa.startsWith(filterMonth);
            const matchesSearch = searchTerm === '' ||
                e.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (e.observacao && e.observacao.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesPayer = filterPayer === 'all' || e.pagador === filterPayer;
            const matchesAccount = filterAccount === 'all' || e.conta === filterAccount;
            const matchesStatus = filterStatus === 'all' || e.status === filterStatus;

            return matchesMonth && matchesSearch && matchesPayer && matchesAccount && matchesStatus;
        }).sort((a, b) => new Date(b.data_despesa).getTime() - new Date(a.data_despesa).getTime());
    }, [officeExpenses, filterMonth, searchTerm, filterPayer, filterAccount, filterStatus]);

    // Agrupamento
    const groupedList = useMemo(() => {
        const list: (OfficeExpense | { type: 'group', balanceId: string, expenses: OfficeExpense[], total: number, latestDate: string, description: string })[] = [];
        const processedBalances = new Set<string>();

        filteredExpenses.forEach(expense => {
            if (!expense.paid_with_balance_id) {
                list.push(expense);
            } else {
                if (!processedBalances.has(expense.paid_with_balance_id)) {
                    const groupExpenses = filteredExpenses.filter(e => e.paid_with_balance_id === expense.paid_with_balance_id);
                    const total = groupExpenses.reduce((sum, e) => sum + e.valor, 0);
                    const balance = officeBalances.find(b => b.id === expense.paid_with_balance_id);

                    list.push({
                        type: 'group',
                        balanceId: expense.paid_with_balance_id,
                        expenses: groupExpenses,
                        total,
                        latestDate: expense.data_despesa,
                        description: balance?.descricao || 'Saldo Compartilhado'
                    });
                    processedBalances.add(expense.paid_with_balance_id);
                }
            }
        });
        return list;
    }, [filteredExpenses, officeBalances]);

    const totalMonth = useMemo(() => {
        return filteredExpenses
            .filter(e => e.status === 'Pago' || !e.status)
            .reduce((acc, curr) => acc + curr.valor, 0);
    }, [filteredExpenses]);

    const totalPending = useMemo(() => {
        return filteredExpenses
            .filter(e => e.status === 'Pendente')
            .reduce((acc, curr) => acc + curr.valor, 0);
    }, [filteredExpenses]);

    const getExpenseStatus = (expense: OfficeExpense) => {
        if (expense.status === 'Pago') return 'pago';
        const today = new Date().toISOString().split('T')[0];
        if (expense.data_despesa < today) return 'vencido';
        if (expense.data_despesa === today) return 'hoje';
        return 'pendente';
    };

    const balancesWithRemaining = useMemo(() => {
        return officeBalances.map(b => {
            const used = officeExpenses
                .filter(e => e.paid_with_balance_id === b.id)
                .reduce((acc, curr) => acc + curr.valor, 0);
            return {
                ...b,
                used,
                remaining: b.valor_inicial - used
            };
        }).sort((a, b) => new Date(b.data_entrada).getTime() - new Date(a.data_entrada).getTime());
    }, [officeBalances, officeExpenses]);

    const totalBalanceAvailable = useMemo(() => {
        return balancesWithRemaining.reduce((acc, curr) => acc + curr.remaining, 0);
    }, [balancesWithRemaining]);

    const handleStatusClick = (expense: OfficeExpense) => {
        if (expense.status === 'Pago') {
            if (toggleOfficeExpenseStatus) toggleOfficeExpenseStatus(expense.id);
        } else {
            setExpenseToPay(expense);
            setPaymentModalOpen(true);
        }
    };

    const confirmPayment = async (data: {
        useBalance: boolean;
        balanceId: string;
        payer: string;
        accountType: 'PF' | 'PJ';
        account: string;
    }) => {
        if (!expenseToPay || !updateOfficeExpense) return;

        const updatedExpense: OfficeExpense = {
            ...expenseToPay,
            status: 'Pago',
            pagador: data.useBalance ? 'Escritório' : data.payer,
            tipo_conta: data.useBalance ? undefined : data.accountType,
            conta: data.useBalance ? undefined : data.account,
            paid_with_balance_id: data.useBalance ? data.balanceId : undefined
        };

        await updateOfficeExpense(updatedExpense);
        setPaymentModalOpen(false);
        setExpenseToPay(null);
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
        else newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const handleDayClick = (day: number) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(month + 1).padStart(2, '0');
        const targetDate = `${year}-${monthStr}-${dayStr}`;

        const expenses = officeExpenses.filter(e => e.data_despesa === targetDate);
        setSelectedDayExpenses(expenses);
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg transition-transform hover:scale-105">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">Despesas de Escritório</h1>
                        <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">Gerenciamento de custos fixos e contas a pagar.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#131418] border border-white/10 rounded-xl p-1 shadow-inner h-10">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all duration-300 flex items-center gap-2 px-3 ${viewMode === 'list' ? 'bg-gold-600 text-black shadow-lg shadow-gold-600/20 font-bold' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <LayoutList size={16} />
                            <span className="text-[9px] uppercase font-black tracking-widest hidden sm:inline">Lista</span>
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-1.5 rounded-lg transition-all duration-300 flex items-center gap-2 px-3 ${viewMode === 'calendar' ? 'bg-gold-600 text-black shadow-lg shadow-gold-600/20 font-bold' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <CalendarRange size={16} />
                            <span className="text-[9px] uppercase font-black tracking-widest hidden sm:inline">Calendário</span>
                        </button>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsBalanceModalOpen(true)}
                        className="group h-10 bg-[#131418] text-gold-500 border border-gold-500/30 px-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg hover:border-gold-500 flex items-center justify-center hover:justify-start gap-0 hover:gap-2 w-10 hover:w-auto overflow-hidden px-0 hover:px-4"
                    >
                        <Wallet size={18} className="shrink-0" />
                        <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 w-0 group-hover:w-auto">Gerenciar Saldos</span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsAddModalOpen(true)}
                        className="group h-10 bg-gold-600 text-black border border-gold-700 px-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg hover:bg-gold-500 flex items-center justify-center hover:justify-start gap-0 hover:gap-2 w-10 hover:w-auto overflow-hidden px-0 hover:px-4"
                    >
                        <Plus size={18} className="shrink-0 stroke-[3px]" />
                        <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all duration-300 w-0 group-hover:w-auto">Lançar Despesa</span>
                    </motion.button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Pago */}
                <div className="bg-[#0b0909] p-6 rounded-2xl border-2 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.05)] relative overflow-hidden group hover:border-red-500 transition-all duration-300">
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-red-400 font-black uppercase tracking-[0.2em] mb-1">Total Pago</p>
                            <h3 className="text-3xl font-black text-white tracking-tight">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewMode === 'list' ? totalMonth : officeExpenses.filter(e => e.status !== 'Pendente' && e.data_despesa.startsWith(currentDate.toISOString().slice(0, 7))).reduce((acc, curr) => acc + curr.valor, 0))}
                            </h3>
                        </div>
                        <div className="p-3 bg-red-500/20 rounded-xl text-red-500 transition-all duration-300 group-hover:scale-105">
                            <TrendingDown size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* A Pagar */}
                <div className="bg-[#0b0a09] p-6 rounded-2xl border-2 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.05)] relative overflow-hidden group hover:border-amber-500 transition-all duration-300">
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-amber-400 font-black uppercase tracking-[0.2em] mb-1">A Pagar (Pendente)</p>
                            <h3 className="text-3xl font-black text-white tracking-tight">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewMode === 'list' ? totalPending : officeExpenses.filter(e => e.status === 'Pendente' && e.data_despesa.startsWith(currentDate.toISOString().slice(0, 7))).reduce((acc, curr) => acc + curr.valor, 0))}
                            </h3>
                        </div>
                        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500 transition-all duration-300 group-hover:scale-105">
                            <Calendar size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* Saldo Disponível */}
                <div onClick={() => setIsBalanceModalOpen(true)} className="cursor-pointer bg-[#090b0a] p-6 rounded-2xl border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.05)] relative overflow-hidden group hover:border-emerald-500 transition-all duration-300">
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mb-1">Saldo Disponível</p>
                            <h3 className="text-3xl font-black text-white tracking-tight">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBalanceAvailable)}
                            </h3>
                        </div>
                        <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-500 transition-all duration-300 group-hover:scale-105">
                            <PiggyBank size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>

            {/* List / Calendar Content */}
            <div className="lg:col-span-3">
                {viewMode === 'list' ? (
                    <ExpenseTable
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        filterMonth={filterMonth}
                        onFilterMonthChange={setFilterMonth}
                        filterPayer={filterPayer}
                        onFilterPayerChange={setFilterPayer}
                        filterAccount={filterAccount}
                        onFilterAccountChange={setFilterAccount}
                        filterStatus={filterStatus}
                        onFilterStatusChange={setFilterStatus}
                        existingPayers={existingPayers}
                        existingAccounts={existingAccounts}
                        groupedList={groupedList}
                        expandedExpenseGroups={expandedExpenseGroups}
                        onToggleGroup={toggleGroup}
                        onDelete={deleteOfficeExpense}
                        onStatusClick={handleStatusClick}
                        getExpenseStatus={getExpenseStatus}
                    />
                ) : (
                    <ExpenseCalendar
                        currentDate={currentDate}
                        onMonthChange={handleMonthChange}
                        onTodayClick={() => setCurrentDate(new Date())}
                        officeExpenses={officeExpenses}
                        onDayClick={handleDayClick}
                    />
                )}
            </div>

            {/* Modals */}
            <ExpenseAddModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddExpense={addOfficeExpense}
                balancesWithRemaining={balancesWithRemaining}
                existingPayers={existingPayers}
                existingAccounts={existingAccounts}
            />

            {selectedDayExpenses && (
                <ExpenseDayDetailsModal
                    expenses={selectedDayExpenses || []}
                    onClose={() => setSelectedDayExpenses(null)}
                    onStatusClick={handleStatusClick}
                    onDelete={(expenseId) => {
                        deleteOfficeExpense(expenseId);
                        setSelectedDayExpenses(prev => prev ? prev.filter(e => e.id !== expenseId) : null);
                    }}
                />
            )}

            <ExpensePaymentModal
                isOpen={paymentModalOpen}
                expense={expenseToPay}
                balancesWithRemaining={balancesWithRemaining}
                existingPayers={existingPayers}
                existingAccounts={existingAccounts}
                onClose={() => setPaymentModalOpen(false)}
                onConfirm={confirmPayment}
            />

            <ExpenseBalanceModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                balancesWithRemaining={balancesWithRemaining}
                officeExpenses={officeExpenses}
                onAddBalance={addOfficeBalance}
            />
        </div>
    );
};

export default OfficeExpenses;
