import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { OfficeExpense, OfficeBalance } from '../types';
import {
    Plus, Calendar, DollarSign, Building, TrendingDown,
    LayoutList, CalendarDays, Wallet, PiggyBank
} from 'lucide-react';
import { formatCurrencyInput, parseCurrencyToNumber } from '../services/formatters';
import { formatDateDisplay } from '../utils/dateUtils';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import ExpenseDayDetailsModal from '../components/modals/ExpenseDayDetailsModal';
import ExpensePaymentModal from '../components/modals/ExpensePaymentModal';
import ExpenseBalanceModal from '../components/modals/ExpenseBalanceModal';
import ExpenseTable from '../components/expenses/ExpenseTable';
import ExpenseCalendar from '../components/expenses/ExpenseCalendar';

const OfficeExpenses: React.FC = () => {
    const { officeExpenses, officeBalances, addOfficeExpense, deleteOfficeExpense, updateOfficeExpense, toggleOfficeExpenseStatus, addOfficeBalance } = useApp();

    // View Mode
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');


    // --- State do Formulário (Nova Despesa) ---
    const [title, setTitle] = useState('');
    const [amountStr, setAmountStr] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<'Pago' | 'Pendente'>('Pago');
    const [observation, setObservation] = useState('');

    // State dos novos campos (Pagamento - Criação)
    const [payer, setPayer] = useState('');
    const [accountType, setAccountType] = useState<'PF' | 'PJ'>('PJ');
    const [account, setAccount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(''); // Novo: Pix, Boleto...
    const [receiver, setReceiver] = useState(''); // Novo: Quem recebe (ex: Receita Federal)
    const [useBalance, setUseBalance] = useState(false); // Novo: Checkbox Pagar com Saldo
    const [selectedBalanceId, setSelectedBalanceId] = useState(''); // Novo: ID do saldo selecionado

    // Controles de "Adicionar Novo" vs "Selecionar" (Criação)
    const [isAddingPayer, setIsAddingPayer] = useState(false);
    const [isAddingAccount, setIsAddingAccount] = useState(false);

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
    useLockBodyScroll(isBalanceModalOpen);

    const [expandedExpenseGroups, setExpandedExpenseGroups] = useState<Set<string>>(new Set()); // Novo: Grupos expandidos (Lista Principal)

    const toggleGroup = (id: string) => {
        const newSet = new Set(expandedExpenseGroups);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedExpenseGroups(newSet);
    };


    // --- Listas Dinâmicas (Baseado no histórico) ---
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

    // --- Agrupamento para Lista Principal ---
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

    // Totais
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

    // --- Helper Status Pagamento ---
    const getExpenseStatus = (expense: OfficeExpense) => {
        if (expense.status === 'Pago') return 'pago';

        const today = new Date().toISOString().split('T')[0];
        if (expense.data_despesa < today) return 'vencido';
        if (expense.data_despesa === today) return 'hoje';
        return 'pendente';
    };

    // --- Cálculos de Saldo ---
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

    // --- Handlers ---

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
        setPaymentMethod(''); // Reset
        setReceiver('');      // Reset
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
            forma_pagamento: status === 'Pago' ? paymentMethod : undefined, // Save
            recebedor: status === 'Pago' ? receiver : undefined,          // Save
            paid_with_balance_id: (status === 'Pago' && useBalance && selectedBalanceId) ? selectedBalanceId : undefined, // FIX: Check for empty string
            created_at: new Date().toISOString()
        };

        await addOfficeExpense(newExpense);
        resetForm();
    };

    // Lógica de Pagamento (Pendente -> Pago)
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

    // Calendar Logic
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
        <div className="space-y-6 pb-20 animate-in fade-in duration-500 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
                        <Building className="text-gold-500" /> Despesas de Escritório
                    </h2>
                    <p className="text-zinc-400">Gerenciamento de custos fixos e contas a pagar.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-navy-900 border border-slate-700 rounded-lg p-1 flex">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <LayoutList size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <CalendarDays size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-900/20 border border-red-500/20 px-6 py-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-red-500/20 rounded-full text-red-400">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-red-300 font-bold uppercase tracking-wider">Total Pago ({viewMode === 'list' ? new Date(filterMonth + '-02').toLocaleString('pt-BR', { month: 'short' }) : currentDate.toLocaleString('pt-BR', { month: 'short' })})</p>
                        <p className="text-2xl font-bold text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewMode === 'list' ? totalMonth : officeExpenses.filter(e => e.status !== 'Pendente' && e.data_despesa.startsWith(currentDate.toISOString().slice(0, 7))).reduce((acc, curr) => acc + curr.valor, 0))}
                        </p>
                    </div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-500/20 px-6 py-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-400">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-yellow-300 font-bold uppercase tracking-wider">A Pagar (Pendente)</p>
                        <p className="text-2xl font-bold text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewMode === 'list' ? totalPending : officeExpenses.filter(e => e.status === 'Pendente' && e.data_despesa.startsWith(currentDate.toISOString().slice(0, 7))).reduce((acc, curr) => acc + curr.valor, 0))}
                        </p>
                    </div>
                </div>
                {/* KPI SALDO */}
                <div onClick={() => setIsBalanceModalOpen(true)} className="group cursor-pointer bg-emerald-900/20 border border-emerald-500/20 px-6 py-4 rounded-xl flex items-center gap-4 hover:bg-emerald-900/30 transition-all">
                    <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400 group-hover:scale-110 transition-transform">
                        <PiggyBank size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Saldo Disponível</p>
                        <p className="text-2xl font-bold text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBalanceAvailable)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* --- FORMULÁRIO DE LANÇAMENTO --- */}
                <div className="lg:col-span-1">
                    <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 shadow-lg sticky top-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Plus size={18} className="text-blue-400" /> Novo Gasto
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Descrição */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                <input
                                    className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-gold-500 placeholder:text-slate-600"
                                    placeholder="Ex: Conta de Luz, Café..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Valor e Data */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            className="w-full bg-navy-950 border border-slate-700 rounded-lg pl-10 pr-2 py-2 text-white outline-none focus:border-gold-500 placeholder:text-slate-600"
                                            placeholder="0,00"
                                            value={amountStr}
                                            onChange={handleAmountChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                                    <input
                                        type="date"
                                        className="w-full bg-navy-950 border border-slate-700 rounded-lg px-2 py-2 text-white outline-none focus:border-gold-500 [color-scheme:dark]"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                <select
                                    className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-gold-500"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                >
                                    <option value="Pago">Pago</option>
                                    <option value="Pendente">Pendente</option>
                                </select>
                            </div>

                            {/* Observação */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observação</label>
                                <textarea
                                    className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-gold-500 placeholder:text-slate-600 resize-none h-20"
                                    placeholder="Detalhes adicionais..."
                                    value={observation}
                                    onChange={(e) => setObservation(e.target.value)}
                                />
                            </div>

                            {/* Seção Condicional: Pagamento */}
                            {status === 'Pago' && (
                                <div className="pt-2 border-t border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <p className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-1">
                                        <Wallet size={12} /> Dados do Pagamento
                                    </p>

                                    {/* Checkbox Pagar com Saldo */}
                                    <div className="flex items-center gap-2 mb-2 p-2 bg-navy-800 rounded-lg border border-slate-700">
                                        <input
                                            type="checkbox"
                                            id="use_balance"
                                            className="w-4 h-4 rounded border-slate-600 bg-navy-900 text-gold-500 focus:ring-offset-navy-900"
                                            checked={useBalance}
                                            onChange={(e) => {
                                                setUseBalance(e.target.checked);
                                                if (e.target.checked) {
                                                    setPayer('Escritório');
                                                } else {
                                                    setPayer('');
                                                    setSelectedBalanceId('');
                                                }
                                            }}
                                        />
                                        <label htmlFor="use_balance" className="text-sm text-slate-300 font-medium select-none cursor-pointer flex items-center gap-2">
                                            <PiggyBank size={14} className="text-gold-500" />
                                            Usar Saldo de Escritório?
                                        </label>
                                    </div>

                                    {useBalance ? (
                                        // --- MODO: USAR SALDO ---
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qual Saldo Utilizar?</label>
                                            <select
                                                className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-gold-500 text-sm"
                                                value={selectedBalanceId}
                                                onChange={(e) => setSelectedBalanceId(e.target.value)}
                                                required={useBalance}
                                            >
                                                <option value="">Selecione...</option>
                                                {balancesWithRemaining.filter(b => b.remaining > 0).map(b => (
                                                    <option key={b.id} value={b.id}>
                                                        {formatDateDisplay(b.data_entrada)} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.remaining)}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] text-slate-500 mt-1 italic">
                                                * O valor será debitado do saldo selecionado.
                                            </p>
                                        </div>
                                    ) : (
                                        // --- MODO: PAGAMENTO MANUAL (Oculto se usar saldo) ---
                                        <>
                                            {/* Pagador */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase">Pagador</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsAddingPayer(!isAddingPayer); setPayer(''); }}
                                                        className="text-[10px] text-blue-400 hover:text-blue-300"
                                                    >
                                                        {isAddingPayer ? 'Selecionar Existente' : '+ Novo'}
                                                    </button>
                                                </div>
                                                {isAddingPayer ? (
                                                    <input
                                                        className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
                                                        placeholder="Nome do pagador..."
                                                        value={payer}
                                                        onChange={(e) => setPayer(e.target.value)}
                                                    />
                                                ) : (
                                                    <select
                                                        className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
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
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                                    <select
                                                        className="w-full bg-navy-950 border border-slate-700 rounded-lg px-2 py-2 text-white outline-none focus:border-emerald-500 text-sm"
                                                        value={accountType}
                                                        onChange={(e) => setAccountType(e.target.value as any)}
                                                    >
                                                        <option value="PJ">PJ</option>
                                                        <option value="PF">PF</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase">Conta</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setIsAddingAccount(!isAddingAccount); setAccount(''); }}
                                                            className="text-[10px] text-blue-400 hover:text-blue-300"
                                                        >
                                                            {isAddingAccount ? 'Selecionar' : '+ Nova'}
                                                        </button>
                                                    </div>
                                                    {isAddingAccount ? (
                                                        <input
                                                            className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
                                                            placeholder="Ex: Nubank..."
                                                            value={account}
                                                            onChange={(e) => setAccount(e.target.value)}
                                                        />
                                                    ) : (
                                                        <select
                                                            className="w-full bg-navy-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
                                                            value={account}
                                                            onChange={(e) => setAccount(e.target.value)}
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {existingAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                                                        </select>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Forma Pagto</label>
                                                    <select
                                                        className="w-full bg-navy-950 border border-slate-700 rounded-lg px-2 py-2 text-white outline-none focus:border-gold-500 text-sm"
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
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Recebedor</label>
                                                    <input
                                                        className="w-full bg-navy-950 border border-slate-700 rounded-lg px-2 py-2 text-white outline-none focus:border-gold-500 text-sm"
                                                        placeholder="Ex: Receita Federal"
                                                        value={receiver}
                                                        onChange={(e) => setReceiver(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-gold-600 hover:bg-gold-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-gold-600/20 transition-all transform active:scale-95 mt-2"
                            >
                                Salvar Despesa
                            </button>
                        </form>
                    </div>
                </div>

                {/* --- ÁREA DE CONTEÚDO (LISTA OU CALENDÁRIO) --- */}
                <div className="lg:col-span-2">

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
            </div >

            {/* --- MODAL DETALHES DO DIA (CALENDARIO) --- */}
            {selectedDayExpenses && (
                <ExpenseDayDetailsModal
                    expenses={selectedDayExpenses}
                    onClose={() => setSelectedDayExpenses(null)}
                    onStatusClick={handleStatusClick}
                    onDelete={(expenseId) => {
                        deleteOfficeExpense(expenseId);
                        setSelectedDayExpenses(prev => prev ? prev.filter(e => e.id !== expenseId) : null);
                    }}
                />
            )}

            {/* --- MODAL CONFIRMAÇÃO PAGAMENTO (PENDENTE -> PAGO) --- */}
            <ExpensePaymentModal
                isOpen={paymentModalOpen}
                expense={expenseToPay}
                balancesWithRemaining={balancesWithRemaining}
                existingPayers={existingPayers}
                existingAccounts={existingAccounts}
                onClose={() => setPaymentModalOpen(false)}
                onConfirm={confirmPayment}
            />


            {/* --- MODAL GERENCIAR SALDO --- */}
            <ExpenseBalanceModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                balancesWithRemaining={balancesWithRemaining}
                officeExpenses={officeExpenses}
                onAddBalance={addOfficeBalance}
            />
        </div >
    );
};

export default OfficeExpenses;
