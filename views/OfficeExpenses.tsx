import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { OfficeExpense, OfficeBalance } from '../types';
import {
    Plus, Trash2, Calendar, DollarSign, Building, Filter, TrendingDown,
    LayoutList, CalendarDays, ChevronLeft, ChevronRight, CheckCircle2,
    Circle, X, Search, User, CreditCard, Wallet, FileText, PiggyBank, Receipt, ChevronDown,
    AlertTriangle, Clock
} from 'lucide-react';
import { formatCurrencyInput, parseCurrencyToNumber } from '../services/formatters';
import { formatDateDisplay } from '../utils/dateUtils';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

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
    const [confirmPaymentData, setConfirmPaymentData] = useState({
        payer: '',
        accountType: 'PJ' as 'PF' | 'PJ',
        account: ''
    });
    // Novos estados para pagamento com saldo no modal
    const [useBalancePayment, setUseBalancePayment] = useState(false);
    const [selectedBalancePaymentId, setSelectedBalancePaymentId] = useState('');

    // Controles de "Adicionar Novo" vs "Selecionar" (Modal de Pagamento)
    const [isAddingPayerPayment, setIsAddingPayerPayment] = useState(false);
    const [isAddingAccountPayment, setIsAddingAccountPayment] = useState(false);

    // --- State do Modal de Saldo ---
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    useLockBodyScroll(isBalanceModalOpen);

    const [expandedBalanceId, setExpandedBalanceId] = useState<string | null>(null); // Novo: Expandir saldo
    const [expandedExpenseGroups, setExpandedExpenseGroups] = useState<Set<string>>(new Set()); // Novo: Grupos expandidos (Lista Principal)

    const toggleGroup = (id: string) => {
        const newSet = new Set(expandedExpenseGroups);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedExpenseGroups(newSet);
    };

    const [newBalanceAmount, setNewBalanceAmount] = useState('');
    const [newBalanceDate, setNewBalanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [newBalanceDesc, setNewBalanceDesc] = useState('');
    // Novos campos para aporte detalhado
    const [newBalanceMethod, setNewBalanceMethod] = useState<'Pix' | 'Especie'>('Pix');
    const [newBalancePayer, setNewBalancePayer] = useState('');
    const [newBalanceAccountType, setNewBalanceAccountType] = useState<'PF' | 'PJ'>('PJ');
    const [newBalanceAccount, setNewBalanceAccount] = useState('');


    // --- Listas Dinâmicas (Baseado no histórico) ---
    const existingPayers = useMemo(() => Array.from(new Set(officeExpenses.map(e => e.pagador).filter(Boolean))), [officeExpenses]);
    const existingAccounts = useMemo(() => Array.from(new Set(officeExpenses.map(e => e.conta).filter(Boolean))), [officeExpenses]);

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

    const handleBalanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBalanceAmount || !newBalanceDate) return;

        const newBalance: OfficeBalance = {
            id: crypto.randomUUID(),
            valor_inicial: parseCurrencyToNumber(newBalanceAmount),
            data_entrada: newBalanceDate,
            descricao: newBalanceDesc,
            // Novos Campos
            forma_pagamento: newBalanceMethod,
            pagador: newBalancePayer,
            tipo_conta: newBalanceMethod === 'Pix' ? newBalanceAccountType : undefined,
            conta: newBalanceMethod === 'Pix' ? newBalanceAccount : undefined,
            created_at: new Date().toISOString()
        };

        if (addOfficeBalance) {
            await addOfficeBalance(newBalance);
            // Reset fields
            setNewBalanceAmount('');
            setNewBalanceDate(new Date().toISOString().split('T')[0]);
            setNewBalanceDesc('');
            setNewBalancePayer('');
            setNewBalanceAccount('');
            setNewBalanceMethod('Pix');
        }
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
            setConfirmPaymentData({
                payer: '', // Começa vazio para obrigar seleção ou usar padrão
                accountType: 'PJ',
                account: ''
            });
            // Reseta os toggles e estados de saldo
            setIsAddingPayerPayment(false);
            setIsAddingAccountPayment(false);
            setUseBalancePayment(false);
            setSelectedBalancePaymentId('');
            setPaymentModalOpen(true);
        }
    };

    const confirmPayment = async () => {
        if (!expenseToPay || !updateOfficeExpense) return;

        const updatedExpense: OfficeExpense = {
            ...expenseToPay,
            status: 'Pago',
            pagador: useBalancePayment ? 'Escritório' : confirmPaymentData.payer,
            tipo_conta: useBalancePayment ? undefined : confirmPaymentData.accountType,
            conta: useBalancePayment ? undefined : confirmPaymentData.account,
            paid_with_balance_id: useBalancePayment ? selectedBalancePaymentId : undefined // Save Balance ID
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

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const monthDays = Array.from({ length: days }, (_, i) => i + 1);

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
                        <div className="bg-navy-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full animate-in fade-in duration-300">
                            {/* Toolbar de Filtros */}
                            <div className="p-4 border-b border-slate-800 bg-navy-950/50 space-y-3">
                                {/* Linha 1: Mes e Busca */}
                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="flex items-center gap-2 bg-navy-800 border border-slate-700 rounded-lg px-3 py-1.5 flex-1 relative">
                                        <Search size={16} className="text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar despesa ou obs..."
                                            className="bg-transparent border-none text-sm text-white outline-none w-full pr-8 placeholder:text-slate-600"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
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
                                            className="bg-navy-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-gold-500 [color-scheme:dark]"
                                            value={filterMonth}
                                            onChange={(e) => setFilterMonth(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Linha 2: Filtros Select */}
                                <div className="grid grid-cols-3 gap-2">
                                    <select
                                        className="bg-navy-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                                        value={filterPayer}
                                        onChange={(e) => setFilterPayer(e.target.value)}
                                    >
                                        <option value="all">Todos Pagadores</option>
                                        {existingPayers.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <select
                                        className="bg-navy-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                                        value={filterAccount}
                                        onChange={(e) => setFilterAccount(e.target.value)}
                                    >
                                        <option value="all">Todas Contas</option>
                                        {existingAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                    <select
                                        className="bg-navy-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                    >
                                        <option value="all">Todos Status</option>
                                        <option value="Pago">Pagos</option>
                                        <option value="Pendente">Pendentes</option>
                                    </select>
                                </div>
                            </div>

                            {/* Tabela */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Detalhes</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Pagamento</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {groupedList.length > 0 ? (
                                            groupedList.map((item) => {
                                                // --- RENDERIZAÇÃO DE GRUPO ---
                                                if ('type' in item && item.type === 'group') {
                                                    const isExpanded = expandedExpenseGroups.has(item.balanceId);
                                                    return (
                                                        <React.Fragment key={`group-${item.balanceId}`}>
                                                            {/* Linha do Grupo */}
                                                            <tr
                                                                onClick={() => toggleGroup(item.balanceId)}
                                                                className={`cursor-pointer transition-colors border-l-2 ${isExpanded ? 'bg-navy-800 border-l-gold-500' : 'hover:bg-white/5 border-l-transparent'}`}
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
                                                                    {/* Ações globais do grupo se necessário */}
                                                                </td>
                                                            </tr>

                                                            {/* Itens do Grupo (Expandido) */}
                                                            {isExpanded && item.expenses.map(expense => (
                                                                <tr key={expense.id} className="bg-navy-950/50 hover:bg-navy-950 transition-colors animate-in fade-in slide-in-from-top-1">
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
                                                                        {/* Detalhes específicos se houver */}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-xs font-medium text-right text-red-400/80">
                                                                        - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.valor)}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-center">
                                                                        {/* Status já implícito */}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-center">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); deleteOfficeExpense(expense.id); }} // Stop propagation to avoid toggling group
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
                                                    <tr key={expense.id} className="group hover:bg-white/5 transition-colors">
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
                                                                onClick={() => handleStatusClick(expense)}
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all
                                                                        ${status === 'pago'
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                                                        : status === 'vencido'
                                                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                                                            : status === 'hoje'
                                                                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                                                                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                                                                    }
                                                                    `}
                                                            >
                                                                {status === 'pago' && <CheckCircle2 size={12} />}
                                                                {status === 'vencido' && <AlertTriangle size={12} />}
                                                                {status === 'hoje' && <Clock size={12} />}
                                                                {status === 'pendente' && <Circle size={12} />}

                                                                {status === 'pago' ? 'Pago' : status === 'vencido' ? 'Vencido' : status === 'hoje' ? 'Hoje' : 'Pendente'}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={() => deleteOfficeExpense(expense.id)}
                                                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
                    ) : (
                        // --- MODO CALENDÁRIO ---
                        <div className="bg-navy-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full animate-in fade-in duration-300">
                            {/* Calendar Header */}
                            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-navy-950/50">
                                <h3 className="text-lg font-bold text-white font-serif capitalize">
                                    {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={() => handleMonthChange('prev')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold bg-slate-800 text-slate-300 rounded hover:text-white transition-colors">Hoje</button>
                                    <button onClick={() => handleMonthChange('next')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="p-4 flex-1">
                                <div className="grid grid-cols-7 border-b border-slate-800 pb-2 mb-2">
                                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                        <div key={d} className="text-center text-xs font-bold text-slate-500 uppercase">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {blanks.map(x => <div key={`blank-${x}`} className="" />)}
                                    {monthDays.map(day => {
                                        const year = currentDate.getFullYear();
                                        const month = currentDate.getMonth();
                                        const monthStr = String(month + 1).padStart(2, '0');
                                        const dayStr = String(day).padStart(2, '0');
                                        const dateStr = `${year}-${monthStr}-${dayStr}`;
                                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                                        const dayExpenses = officeExpenses.filter(e => e.data_despesa === dateStr);
                                        const hasPending = dayExpenses.some(e => e.status === 'Pendente');
                                        const hasPaid = dayExpenses.some(e => e.status !== 'Pendente');

                                        return (
                                            <div
                                                key={day}
                                                onClick={() => handleDayClick(day)}
                                                className={`
                                                min-h-[80px] p-2 rounded-xl border cursor-pointer transition-all relative group flex flex-col justify-between
                                                ${isToday ? 'bg-slate-800/50 border-slate-600' : 'bg-[#0f1014] border-slate-800 hover:border-slate-600'}
                                            `}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-gold-500 text-black' : 'text-slate-400'}`}>
                                                        {day}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1 justify-end">
                                                    {hasPending && <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_5px_#eab308]" title="Pendente"></div>}
                                                    {hasPaid && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]" title="Pago"></div>}
                                                </div>
                                                {dayExpenses.length > 0 && (
                                                    <div className="mt-1 text-[9px] font-medium text-slate-500 text-right">
                                                        {dayExpenses.length} item(s)
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div >

            {/* --- MODAL DETALHES DO DIA (CALENDARIO) --- */}
            {
                selectedDayExpenses && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                        <div className="bg-navy-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-navy-950 rounded-t-xl">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Calendar size={18} className="text-gold-500" />
                                    {selectedDayExpenses.length > 0 ? new Date(selectedDayExpenses[0].data_despesa).toLocaleDateString('pt-BR', { dateStyle: 'long' }) : 'Detalhes do Dia'}
                                </h3>
                                <button onClick={() => setSelectedDayExpenses(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="p-4 overflow-y-auto custom-scrollbar space-y-3 flex-1">
                                {selectedDayExpenses.length > 0 ? (
                                    selectedDayExpenses.map(expense => (
                                        <div key={expense.id} className="p-3 bg-navy-950 border border-slate-800 rounded-lg flex flex-col gap-2">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-medium text-white text-sm">{expense.titulo}</h4>
                                                <span className="font-bold text-red-400 text-sm">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.valor)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <button
                                                    onClick={() => handleStatusClick(expense)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${expense.status === 'Pendente'
                                                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                        }`}
                                                >
                                                    {expense.status === 'Pendente' ? <Circle size={12} /> : <CheckCircle2 size={12} />}
                                                    {expense.status || 'Pago'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        deleteOfficeExpense(expense.id);
                                                        setSelectedDayExpenses(prev => prev ? prev.filter(e => e.id !== expense.id) : null);
                                                    }}
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

                            <div className="p-4 border-t border-slate-800 bg-navy-950 rounded-b-xl flex justify-end">
                                <button onClick={() => setSelectedDayExpenses(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">Fechar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- MODAL CONFIRMAÇÃO PAGAMENTO (PENDENTE -> PAGO) --- */}
            {
                paymentModalOpen && (
                    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                        <div className="bg-navy-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
                            <div className="p-5 border-b border-slate-800">
                                <h3 className="text-lg font-bold text-white">Confirmar Pagamento</h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    Informe os dados para dar baixa em: <span className="text-white">{expenseToPay?.titulo}</span>
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
                                        onChange={(e) => {
                                            setUseBalancePayment(e.target.checked);
                                            if (e.target.checked) {
                                                setConfirmPaymentData({ ...confirmPaymentData, payer: 'Escritório' });
                                            } else {
                                                setConfirmPaymentData({ ...confirmPaymentData, payer: '' });
                                                setSelectedBalancePaymentId('');
                                            }
                                        }}
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
                                                    {existingPayers.map(p => <option key={p} value={p}>{p}</option>)}
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
                                                    onChange={(e) => setConfirmPaymentData({ ...confirmPaymentData, accountType: e.target.value as any })}
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
                                                        {existingAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-800 bg-navy-950 rounded-b-xl flex gap-3">
                                <button
                                    onClick={() => setPaymentModalOpen(false)}
                                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmPayment}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-emerald-600/20"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* --- MODAL GERENCIAR SALDO --- */}
            {isBalanceModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-navy-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-navy-950 rounded-t-xl">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <PiggyBank size={24} className="text-emerald-500" /> Gerenciar Saldo
                            </h3>
                            <button onClick={() => setIsBalanceModalOpen(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                            {/* Novo Aporte */}
                            <section>
                                <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                                    <Plus size={16} /> Adicionar Novo Saldo
                                </h4>
                                <form onSubmit={handleBalanceSubmit} className="bg-navy-950 p-4 rounded-xl border border-slate-800 space-y-4">
                                    {/* Linha 1: Valor, Data, Descrição */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor</label>
                                            <div className="relative">
                                                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <input
                                                    className="w-full bg-navy-900 border border-slate-700 rounded-lg pl-8 pr-2 py-2 text-white text-sm outline-none focus:border-emerald-500"
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
                                                className="w-full bg-navy-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm outline-none focus:border-emerald-500 [color-scheme:dark]"
                                                value={newBalanceDate}
                                                onChange={(e) => setNewBalanceDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ref / Descrição</label>
                                            <input
                                                className="w-full bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
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
                                            <div className="flex bg-navy-900 p-1 rounded-lg border border-slate-700">
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
                                                    className="w-full bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
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
                                                            className="w-full bg-navy-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm outline-none focus:border-emerald-500"
                                                            value={newBalanceAccountType}
                                                            onChange={(e) => setNewBalanceAccountType(e.target.value as any)}
                                                        >
                                                            <option value="PJ">PJ</option>
                                                            <option value="PF">PF</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conta</label>
                                                        <input
                                                            className="w-full bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
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
                                                className={`bg-navy-950 border rounded-xl overflow-hidden transition-all cursor-pointer ${expandedBalanceId === bal.id ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-slate-800 hover:border-slate-600'}`}
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
                                                    <div className="border-t border-slate-800 bg-black/20 p-4 animate-in slide-in-from-top-2">
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

                                                                        {/* Botão Remover Link (Opcional - por enquanto visual apenas) */}
                                                                        {/* <button className="ml-3 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <Trash2 size={14} />
                                                                            </button> */}
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
            )}
        </div >
    );
};

export default OfficeExpenses;
