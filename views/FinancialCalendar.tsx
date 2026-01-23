
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

interface CalendarInstallment extends CaseInstallment {
  cases: {
    id: string;
    titulo: string;
    clients: {
      id: string;
      nome_completo: string;
      telefone: string;
      cidade: string;
      bairro: string;
      filial: string;
      captador: string;
      foto?: string;
      pendencias?: string[];
    }
  }
}

const FinancialCalendar: React.FC = () => {
  const { toggleInstallmentPaid, showToast, captadores } = useApp();
  
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Data State
  const [rawInstallments, setRawInstallments] = useState<CalendarInstallment[]>([]);
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
      
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();

      try {
          // Complex Join Query
          const { data, error } = await supabase
              .from('case_installments')
              .select('*, cases!inner(*, clients!inner(*))')
              .gte('data_vencimento', startDate)
              .lte('data_vencimento', endDate);

          if (error) throw error;
          
          if (data) {
              setRawInstallments(data as unknown as CalendarInstallment[]);
          }
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

  // --- DERIVED DATA ---

  // 1. Unique Lists for Filters
  const uniqueCities = useMemo(() => {
      const cities = new Set(rawInstallments.map(i => i.cases?.clients?.cidade).filter(Boolean));
      return Array.from(cities).sort();
  }, [rawInstallments]);

  // 2. Filtered Data
  const filteredInstallments = useMemo(() => {
      return rawInstallments.filter(item => {
          const client = item.cases?.clients;
          
          if (filters.branch !== 'all' && client?.filial !== filters.branch) return false;
          if (filters.captador !== 'all' && client?.captador !== filters.captador) return false;
          if (filters.city !== 'all' && client?.cidade !== filters.city) return false;
          
          if (filters.status === 'paid' && !item.pago) return false;
          if (filters.status === 'pending' && item.pago) return false;

          return true;
      });
  }, [rawInstallments, filters]);

  // 3. Selected Day Data
  const selectedDayInstallments = useMemo(() => {
      const target = selectedDate.toISOString().split('T')[0];
      return filteredInstallments.filter(i => i.data_vencimento === target);
  }, [filteredInstallments, selectedDate]);

  // 4. KPIs
  const kpis = useMemo(() => {
      const totalPending = filteredInstallments.filter(i => !i.pago).reduce((acc, curr) => acc + curr.valor, 0);
      const totalPaid = filteredInstallments.filter(i => i.pago).reduce((acc, curr) => acc + curr.valor, 0);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const nextPayment = filteredInstallments
          .filter(i => !i.pago && i.data_vencimento >= todayStr)
          .sort((a,b) => a.data_vencimento.localeCompare(b.data_vencimento))[0];

      return { totalPending, totalPaid, nextDate: nextPayment?.data_vencimento };
  }, [filteredInstallments]);

  // --- ACTIONS ---

  const handleMonthChange = (direction: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
      else newDate.setMonth(newDate.getMonth() + 1);
      setCurrentDate(newDate);
  };

  const handleTogglePaid = async (inst: CalendarInstallment) => {
      await toggleInstallmentPaid(inst, inst.cases.clients.nome_completo);
      // Refresh local data to reflect change immediately (optimistic UI is handled in context but we need re-fetch to sync complex object or manually update local state)
      // For simplicity, manually update local state
      setRawInstallments(prev => prev.map(p => p.id === inst.id ? { ...p, pago: !p.pago } : p));
  };

  const handleWhatsApp = (inst: CalendarInstallment) => {
      const client = inst.cases.clients;
      if (!client.telefone) {
          showToast('error', 'Cliente sem telefone.');
          return;
      }
      const phone = client.telefone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
      
      const msg = `Olá ${client.nome_completo.split(' ')[0]}, tudo bem? 
Lembrando que a parcela ${inst.parcela_numero} do seu processo (${inst.cases.titulo}) venceu dia ${new Date(inst.data_vencimento).toLocaleDateString('pt-BR')}.
Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.valor)}.
Podemos confirmar o pagamento?`;

      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- CALENDAR RENDER HELPERS ---
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
    <div className="h-full flex flex-col space-y-6 pb-4">
        
        {/* HEADER & KPIS */}
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
                        <CalendarCheck className="text-gold-500" /> Agenda de Recebimentos
                    </h2>
                    <p className="text-zinc-400">Controle de parcelas do Seguro Defeso e honorários.</p>
                </div>
                
                {/* FILTERS TOGGLE */}
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all ${showFilters ? 'bg-navy-900 border-gold-500 text-gold-500' : 'bg-navy-950 border-zinc-800 text-zinc-400 hover:text-white'}`}
                >
                    <Filter size={16} /> Filtros Avançados
                </button>
            </div>

            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-navy-900/50 p-4 rounded-xl border border-zinc-800 animate-in slide-in-from-top-2">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Filial</label>
                        <select className="w-full bg-navy-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none" value={filters.branch} onChange={e => setFilters({...filters, branch: e.target.value})}>
                            <option value="all">Todas</option>
                            {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Captador</label>
                        <select className="w-full bg-navy-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none" value={filters.captador} onChange={e => setFilters({...filters, captador: e.target.value})}>
                            <option value="all">Todos</option>
                            {captadores.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cidade</label>
                        <select className="w-full bg-navy-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none" value={filters.city} onChange={e => setFilters({...filters, city: e.target.value})}>
                            <option value="all">Todas</option>
                            {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                        <select className="w-full bg-navy-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                            <option value="all">Todos</option>
                            <option value="pending">Pendentes (A Receber)</option>
                            <option value="paid">Pagos (Baixados)</option>
                        </select>
                    </div>
                </div>
            )}

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0f1014] p-5 rounded-xl border border-zinc-800 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase">A Receber (Mês)</p>
                        <h3 className="text-2xl font-bold text-white mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.totalPending)}
                        </h3>
                    </div>
                    <div className="p-3 bg-zinc-800 rounded-full text-zinc-400"><Banknote size={24}/></div>
                </div>
                <div className="bg-[#0f1014] p-5 rounded-xl border border-zinc-800 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase">Já Recebido</p>
                        <h3 className="text-2xl font-bold text-emerald-500 mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.totalPaid)}
                        </h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500"><CheckCircle size={24}/></div>
                </div>
                <div className="bg-[#0f1014] p-5 rounded-xl border border-zinc-800 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase">Próximo Vencimento</p>
                        <h3 className="text-lg font-bold text-yellow-500 mt-1">
                            {kpis.nextDate ? new Date(kpis.nextDate).toLocaleDateString('pt-BR') : 'Tudo em dia'}
                        </h3>
                    </div>
                    <div className="p-3 bg-yellow-500/10 rounded-full text-yellow-500"><CalendarCheck size={24}/></div>
                </div>
            </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            
            {/* CALENDAR GRID */}
            <div className="flex-1 bg-[#0f1014] border border-zinc-800 rounded-xl flex flex-col shadow-lg overflow-hidden">
                {/* Calendar Header */}
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-navy-950/50">
                    <h3 className="text-lg font-bold text-white font-serif capitalize">
                        {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={() => handleMonthChange('prev')} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold bg-zinc-800 text-zinc-300 rounded hover:text-white transition-colors">Hoje</button>
                        <button onClick={() => handleMonthChange('next')} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><ChevronRight size={20}/></button>
                    </div>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/30">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="py-2 text-center text-xs font-bold text-zinc-500 uppercase">{d}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-[#0f1014]">
                    {loading ? (
                        <div className="col-span-7 flex items-center justify-center h-64">
                            <Loader2 size={40} className="text-gold-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {blanks.map(x => <div key={`blank-${x}`} className="border-b border-r border-zinc-800/50 bg-zinc-950/30" />)}
                            {monthDays.map(day => {
                                const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
                                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                                const isSelected = selectedDate.toISOString().split('T')[0] === dateStr;
                                
                                const dayInstallments = filteredInstallments.filter(i => i.data_vencimento === dateStr);
                                const hasPending = dayInstallments.some(i => !i.pago);
                                const totalDay = dayInstallments.reduce((acc, curr) => acc + curr.valor, 0);

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
                                            {dayInstallments.length > 0 && (
                                                <span className={`w-2 h-2 rounded-full ${hasPending ? 'bg-yellow-500' : 'bg-emerald-500 shadow-[0_0_5px_#10b981]'}`} />
                                            )}
                                        </div>

                                        {dayInstallments.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                <div className="text-[10px] text-zinc-500 font-medium bg-zinc-900/80 rounded px-1.5 py-0.5 border border-zinc-800 w-fit">
                                                    {dayInstallments.length} cliente{dayInstallments.length > 1 ? 's' : ''}
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
            <div className="w-full lg:w-96 bg-[#0f1014] border border-zinc-800 rounded-xl flex flex-col shadow-2xl h-[600px] lg:h-auto">
                <div className="p-4 border-b border-zinc-800 bg-navy-950/50">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <span className="text-gold-500 text-lg">{selectedDate.getDate()}</span>
                        <span className="capitalize">{selectedDate.toLocaleString('pt-BR', { month: 'long' })}</span>
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                        {selectedDayInstallments.length} pagamentos listados
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {selectedDayInstallments.length > 0 ? selectedDayInstallments.map(inst => (
                        <div key={inst.id} className={`p-4 rounded-xl border transition-all ${inst.pago ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${inst.pago ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                                        {inst.cases.clients.nome_completo.substring(0, 1)}
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-bold ${inst.pago ? 'text-emerald-400' : 'text-white'}`}>
                                            {inst.cases.clients.nome_completo}
                                        </h4>
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                            <Building size={10} /> {inst.cases.clients.filial || 'Matriz'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.valor)}
                                    </p>
                                    <p className="text-[10px] text-zinc-500">Parc. {inst.parcela_numero}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3 pl-11">
                                {inst.cases.clients.cidade && <span className="flex items-center gap-1"><MapPin size={10} /> {inst.cases.clients.cidade}</span>}
                                {inst.cases.clients.captador && <span className="flex items-center gap-1"><User size={10} /> {inst.cases.clients.captador}</span>}
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleTogglePaid(inst)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${inst.pago ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500'}`}
                                >
                                    {inst.pago ? <><DollarSign size={14}/> Estornar</> : <><CheckCircle size={14}/> Receber</>}
                                </button>
                                {inst.cases.clients.telefone && (
                                    <button 
                                        onClick={() => handleWhatsApp(inst)}
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
