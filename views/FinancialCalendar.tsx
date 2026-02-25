
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabaseClient';
import { CaseInstallment, Branch } from '../types';
import {
    ChevronLeft,
    ChevronRight,
    CalendarCheck,
    Banknote,
    Filter,
    MapPin,
    User,
    Building,
    MessageCircle,
    CheckCircle,
    Circle,
    AlertCircle,
    Loader2,
    DollarSign
} from 'lucide-react';
import { formatCurrencyInput, parseCurrencyToNumber } from '../services/formatters';
import BranchSelector from '../components/Layout/BranchSelector';

interface UnifiedReceipt {
    id: string;
    source: 'installment' | 'financial';
    data_vencimento: string;
    valor: number;
    pago: boolean;
    data_pagamento?: string;
    parcela_numero?: number;
    titulo?: string;
    case_id: string;
    case_type: string;
    client_name: string;
    client_id: string;
    filial: string;
    captador: string;
    cidade: string;
    telefone: string;
    foto?: string;
}

const FinancialCalendar: React.FC = () => {
    const { toggleInstallmentPaid, showToast, captadores, globalBranchFilter, addFinancialRecord, setClientToView, setCurrentView } = useApp();

    // Date State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Data State
    const [unifiedReceipts, setUnifiedReceipts] = useState<UnifiedReceipt[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters State
    const [filters, setFilters] = useState({
        branch: 'all',
        captador: 'all',
        city: 'all',
        status: 'all' // all, paid, pending
    });
    const [showFilters, setShowFilters] = useState(false);

    // --- DATA FETCHING ---
    const fetchMonthData = async () => {
        setLoading(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Use string dates for Supabase to avoid timezone shifts
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

        try {
            // 1. Fetch Installments (Seguro Defeso)
            const { data: instData, error: instError } = await supabase
                .from('case_installments')
                .select('*, cases(tipo, clients(*))') // Remove !inner to get all even if clients missing
                .eq('destino', 'Escritório')
                .gte('data_vencimento', startDate)
                .lte('data_vencimento', endDate);

            // 2. Fetch Financial Records (Honorários/Receitas)
            const { data: finData, error: finError } = await supabase
                .from('financial_records')
                .select('*, clients(nome_completo, id, filial, captador, cidade, telefone, foto), cases(tipo, clients(*))')
                .eq('tipo', 'Receita')
                .gte('data_vencimento', `${startDate}T00:00:00`)
                .lte('data_vencimento', `${endDate}T23:59:59`);

            if (instError) throw instError;
            if (finError) throw finError;

            // 3. Normalize and Merge with Deduplication
            const normalizedInst: UnifiedReceipt[] = (instData || []).map(i => {
                const client = i.cases?.clients;
                return {
                    id: i.id,
                    source: 'installment',
                    data_vencimento: i.data_vencimento,
                    valor: i.valor,
                    pago: i.pago,
                    data_pagamento: i.data_pagamento,
                    parcela_numero: i.parcela_numero,
                    case_id: i.case_id,
                    case_type: i.cases?.tipo || '',
                    client_name: client?.nome_completo || 'Cliente s/ Cadastro',
                    client_id: client?.id || '',
                    filial: client?.filial || '',
                    captador: client?.captador || '',
                    cidade: client?.cidade || '',
                    telefone: client?.telefone || '',
                    foto: client?.foto
                };
            });

            // Criar conjunto de chaves para deduplicação (Caso + Valor + Data)
            const installmentKeys = new Set(normalizedInst.map(i => `${i.case_id}-${i.valor}-${i.data_vencimento}`));

            const normalizedFin: UnifiedReceipt[] = (finData || [])
                .filter(f => {
                    // Deduplicação: Se for um honorário automático que já existe como parcela, ignora
                    const dateStr = f.data_vencimento.split('T')[0];
                    const key = `${f.case_id}-${f.valor}-${dateStr}`;
                    return !installmentKeys.has(key);
                })
                .map(f => {
                    const client = f.clients || f.cases?.clients;
                    return {
                        id: f.id,
                        source: 'financial',
                        data_vencimento: f.data_vencimento.split('T')[0],
                        valor: f.valor,
                        pago: f.status_pagamento,
                        data_pagamento: f.data_pagamento,
                        titulo: f.titulo,
                        case_id: f.case_id,
                        case_type: f.cases?.tipo || 'Avulso',
                        client_name: client?.nome_completo || 'Cliente s/ Cadastro',
                        client_id: client?.id || f.client_id || '',
                        filial: f.filial || client?.filial || '',
                        captador: client?.captador || '',
                        cidade: client?.cidade || '',
                        telefone: client?.telefone || '',
                        foto: client?.foto
                    };
                });

            setUnifiedReceipts([...normalizedInst, ...normalizedFin]);
        } catch (err: any) {
            console.error("Erro ao buscar agenda:", err);
            showToast('error', 'Falha ao carregar pagamentos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonthData();
    }, [currentDate.getMonth(), currentDate.getFullYear()]);

    useEffect(() => {
        setFilters(prev => ({ ...prev, branch: globalBranchFilter }));
    }, [globalBranchFilter]);

    // --- DERIVED DATA ---

    // 1. Unique Lists for Filters
    const uniqueCities = useMemo(() => {
        const cities = new Set(unifiedReceipts.map(i => i.cidade).filter(Boolean));
        return Array.from(cities).sort();
    }, [unifiedReceipts]);

    // 2. Filtered Data
    const filteredReceipts = useMemo(() => {
        return unifiedReceipts.filter(item => {
            if (filters.branch !== 'all' && item.filial !== filters.branch) return false;
            if (filters.captador !== 'all' && item.captador !== filters.captador) return false;
            if (filters.city !== 'all' && item.cidade !== filters.city) return false;

            if (filters.status === 'paid' && !item.pago) return false;
            if (filters.status === 'pending' && item.pago) return false;

            return true;
        });
    }, [unifiedReceipts, filters]);

    // 3. Selected Day Data
    const selectedDayReceipts = useMemo(() => {
        const target = selectedDate.toISOString().split('T')[0];
        return filteredReceipts.filter(i => i.data_vencimento === target);
    }, [filteredReceipts, selectedDate]);

    // 4. KPIs
    const kpis = useMemo(() => {
        const totalPending = filteredReceipts.filter(i => !i.pago).reduce((acc, curr) => acc + curr.valor, 0);
        const totalPaid = filteredReceipts.filter(i => i.pago).reduce((acc, curr) => acc + curr.valor, 0);

        const todayStr = new Date().toISOString().split('T')[0];
        const nextPayment = filteredReceipts
            .filter(i => !i.pago && i.data_vencimento >= todayStr)
            .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))[0];

        return { totalPending, totalPaid, nextDate: nextPayment?.data_vencimento };
    }, [filteredReceipts]);

    // --- ACTIONS ---

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
        else newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const handleTogglePaid = async (receipt: UnifiedReceipt) => {
        if (receipt.source === 'installment') {
            await toggleInstallmentPaid({ id: receipt.id, pago: receipt.pago, valor: receipt.valor, case_id: receipt.case_id, data_pagamento: receipt.data_pagamento } as any, receipt.client_name);
        } else {
            // For financial records, we use addFinancialRecord as an upsert/update
            await addFinancialRecord({
                id: receipt.id,
                status_pagamento: !receipt.pago,
                case_id: receipt.case_id,
                client_id: receipt.client_id,
                data_pagamento: !receipt.pago ? new Date().toISOString() : null
            } as any);
        }

        // Refresh local data
        setUnifiedReceipts(prev => prev.map(p => p.id === receipt.id ? {
            ...p,
            pago: !p.pago,
            data_pagamento: !p.pago ? new Date().toISOString().split('T')[0] : undefined
        } : p));
    };

    const handleWhatsApp = (receipt: UnifiedReceipt) => {
        if (!receipt.telefone) {
            showToast('error', 'Cliente sem telefone.');
            return;
        }
        const phone = receipt.telefone.replace(/\D/g, '');
        const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;

        const desc = receipt.source === 'installment' ? `a parcela ${receipt.parcela_numero}` : receipt.titulo;
        const msg = `Olá ${receipt.client_name.split(' ')[0]}, tudo bem? 
Lembrando que ${desc} vence hoje (${new Date(receipt.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}).
Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.valor)}.
Podemos confirmar o recebimento?`;

        window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    // --- CALENDAR RENDER HELPERS ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days: daysInMonth, firstDay };
    };

    const { days: daysCount, firstDay: firstDayIdx } = getDaysInMonth(currentDate);
    const blanksArr = Array.from({ length: firstDayIdx }, (_, i) => i);
    const monthDaysArr = Array.from({ length: daysCount }, (_, i) => i + 1);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar space-y-6 pb-4 pr-2">

            {/* HEADER & KPIS */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
                            <CalendarCheck size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
                                Agenda de Recebimentos
                            </h1>
                            <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
                                Controle de parcelas do Seguro Defeso e honorários.
                            </p>
                        </div>
                    </div>

                    {/* FILTERS TOGGLE */}
                    <div className="flex items-center gap-3">
                        <BranchSelector />
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${showFilters ? 'bg-gold-500/10 border-gold-500 text-gold-500' : 'bg-[#18181b] border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
                        >
                            <Filter size={16} /> Filtros Avançados
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#0f1014] p-4 rounded-xl border border-white/10 animate-in slide-in-from-top-2 shadow-xl">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Captador</label>
                            <select className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold-500/50 transition-all cursor-pointer" value={filters.captador} onChange={e => setFilters({ ...filters, captador: e.target.value })}>
                                <option value="all">Todos</option>
                                {captadores.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cidade</label>
                            <select className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold-500/50 transition-all cursor-pointer" value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })}>
                                <option value="all">Todas</option>
                                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                            <select className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold-500/50 transition-all cursor-pointer" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                                <option value="all">Todos</option>
                                <option value="pending">Pendentes (A Receber)</option>
                                <option value="paid">Pagos (Baixados)</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#0b0c10] p-6 rounded-2xl border-2 border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.02)] flex items-center justify-between relative overflow-hidden group hover:border-white/80 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">A Receber (Mês)</p>
                            <h3 className="text-3xl font-black text-white tracking-tight mt-1">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.totalPending)}
                            </h3>
                        </div>
                        <div className="p-3 bg-white/10 shadow-sm rounded-2xl text-white transition-all duration-300 group-hover:scale-105 relative z-10">
                            <Banknote size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="bg-[#090b0a] p-6 rounded-2xl border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.05)] flex items-center justify-between relative overflow-hidden group hover:border-emerald-500/80 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest mb-1">Já Recebido</p>
                            <h3 className="text-3xl font-black text-white tracking-tight mt-1">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.totalPaid)}
                            </h3>
                        </div>
                        <div className="p-3 bg-emerald-500/20 shadow-sm rounded-2xl text-emerald-500 transition-all duration-300 group-hover:scale-105 relative z-10">
                            <CheckCircle size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="bg-[#0b0b09] p-6 rounded-2xl border-2 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.05)] flex items-center justify-between relative overflow-hidden group hover:border-amber-500/80 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest mb-1">Próximo Vencimento</p>
                            <h3 className="text-xl font-black text-white tracking-tight mt-1">
                                {kpis.nextDate ? new Date(kpis.nextDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Tudo em dia'}
                            </h3>
                        </div>
                        <div className="p-3 bg-amber-500/20 shadow-sm rounded-2xl text-amber-500 transition-all duration-300 group-hover:scale-105 relative z-10">
                            <CalendarCheck size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">

                {/* CALENDAR GRID */}
                <div className="flex-1 bg-[#18181b] border border-zinc-800 rounded-xl flex flex-col shadow-lg overflow-hidden">
                    {/* Calendar Header */}
                    <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#18181b]">
                        <h3 className="text-xl font-bold text-white font-serif capitalize flex items-center gap-2">
                            <span className="text-gold-500 text-2xl">•</span> {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => handleMonthChange('prev')} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors active:scale-95"><ChevronLeft size={24} /></button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 text-xs font-black bg-[#18181b] border border-white/10 text-slate-300 rounded-lg hover:text-white hover:border-gold-500 transition-all uppercase tracking-wider">Hoje</button>
                            <button onClick={() => handleMonthChange('next')} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors active:scale-95"><ChevronRight size={24} /></button>
                        </div>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/30">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                            <div key={d} className="py-2 text-center text-xs font-bold text-zinc-500 uppercase">{d}</div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="flex-1 grid grid-cols-7 auto-rows-[140px] bg-[#0f1014] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="col-span-7 flex items-center justify-center h-64">
                                <Loader2 size={40} className="text-gold-500 animate-spin" />
                            </div>
                        ) : (
                            <>
                                {blanksArr.map(x => <div key={`blank-${x}`} className="border-b border-r border-zinc-800/50 bg-zinc-950/30" />)}
                                {monthDaysArr.map(day => {
                                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                                    const isSelected = selectedDate.toISOString().split('T')[0] === dateStr;

                                    const dayReceipts = filteredReceipts.filter(i => i.data_vencimento === dateStr);
                                    const hasPending = dayReceipts.some(i => !i.pago);
                                    const totalDay = dayReceipts.reduce((acc, curr) => acc + curr.valor, 0);

                                    return (
                                        <div
                                            key={day}
                                            onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                                            className={`
                                            min-h-[100px] p-2 border-b border-r border-zinc-800 cursor-pointer transition-all relative group
                                            ${isSelected ? 'bg-white/5 shadow-inner ring-1 ring-inset ring-gold-500/50' : 'hover:bg-zinc-900'}
                                            ${isToday ? 'bg-zinc-800/30' : ''}
                                        `}
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-gold-500 text-black' : 'text-zinc-400'}`}>
                                                    {day}
                                                </span>
                                                {dayReceipts.length > 0 && (
                                                    <span className={`w-2 h-2 rounded-full ${hasPending ? 'bg-yellow-500' : 'bg-emerald-500 shadow-[0_0_5px_#10b981]'}`} />
                                                )}
                                            </div>

                                            {dayReceipts.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    <div className="text-[10px] text-zinc-500 font-medium bg-zinc-900/80 rounded px-1.5 py-0.5 border border-zinc-800 w-fit">
                                                        {dayReceipts.length} item{dayReceipts.length > 1 ? 's' : ''}
                                                    </div>
                                                    <div className={`text-xs font-bold ${hasPending ? 'text-zinc-200' : 'text-emerald-500'}`}>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalDay)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>

                {/* SIDE PANEL DETAILS */}
                <div className="w-full lg:w-96 bg-[#0f1014] border border-zinc-800 rounded-xl flex flex-col shadow-2xl h-[600px] lg:h-[755px]">
                    <div className="p-4 border-b border-zinc-800 bg-[#131418]">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <span className="text-gold-500 text-lg">{selectedDate.getDate()}</span>
                            <span className="capitalize">{selectedDate.toLocaleString('pt-BR', { month: 'long' })}</span>
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">
                            {selectedDayReceipts.length} pagamentos listados
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                        {selectedDayReceipts.length > 0 ? selectedDayReceipts.map(receipt => (
                            <div key={receipt.id} className={`p-4 rounded-xl border transition-all ${receipt.pago ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${receipt.pago ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                                            {receipt.client_name.substring(0, 1)}
                                        </div>
                                        <div>
                                            <h4
                                                onClick={() => {
                                                    setClientToView(receipt.client_id);
                                                    setCurrentView('clients');
                                                }}
                                                className={`text-sm font-bold cursor-pointer hover:underline transition-all ${receipt.pago ? 'text-emerald-400' : 'text-white'}`}
                                            >
                                                {receipt.client_name}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                                    <Building size={10} /> {receipt.filial || 'Matriz'}
                                                </div>
                                                <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                                                <div className="px-1.5 py-0.5 bg-gold-500/10 border border-gold-500/20 rounded text-[9px] font-black text-gold-500 uppercase tracking-tighter">
                                                    {receipt.case_type}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.valor)}
                                        </p>
                                        <p className="text-[10px] text-zinc-500">{receipt.source === 'installment' ? `Parc. ${receipt.parcela_numero}` : 'Honorário'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3 pl-11">
                                    {receipt.cidade && <span className="flex items-center gap-1"><MapPin size={10} /> {receipt.cidade}</span>}
                                    {receipt.captador && <span className="flex items-center gap-1"><User size={10} /> {receipt.captador}</span>}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleTogglePaid(receipt)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${receipt.pago ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500'}`}
                                    >
                                        {receipt.pago ? <><DollarSign size={14} /> Estornar</> : <><CheckCircle size={14} /> Receber</>}
                                    </button>
                                    {receipt.telefone && (
                                        <button
                                            onClick={() => handleWhatsApp(receipt)}
                                            className="px-3 py-2 rounded-lg bg-zinc-800 text-emerald-500 hover:bg-emerald-500/10 border border-zinc-700 transition-colors"
                                            title="Cobrar no WhatsApp"
                                        >
                                            <MessageCircle size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-zinc-500">
                                <CalendarCheck size={40} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Nenhum vencimento para este dia.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FinancialCalendar;
