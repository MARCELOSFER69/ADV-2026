import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
    Clock, Calendar, Save, Loader2, ChevronLeft, ChevronRight,
    User as UserIcon, AlertCircle, CheckCircle2, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { timesheetService } from '../services/timesheetService';
import { TimesheetEntry } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isFuture, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Timesheet: React.FC = () => {
    const { user, showToast } = useApp();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [entries, setEntries] = useState<TimesheetEntry[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'individual' | 'admin'>(user?.permissions?.role === 'admin' ? 'admin' : 'individual');

    const monthStr = format(currentDate, 'yyyy-MM');
    const monthLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR });

    useEffect(() => {
        loadData();
    }, [monthStr, viewMode]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (viewMode === 'admin') {
                const data = await timesheetService.fetchAllTimesheets(monthStr);
                setEntries(data);
            } else {
                const data = await timesheetService.fetchUserTimesheets(user.id, monthStr);
                setEntries(data);
            }
        } catch (error) {
            console.error("Erro ao carregar folha de ponto:", error);
            showToast('error', 'Erro ao carregar folha de ponto');
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        const prev = new Date(currentDate);
        prev.setMonth(prev.getMonth() - 1);
        setCurrentDate(prev);
    };

    const handleNextMonth = () => {
        const next = new Date(currentDate);
        next.setMonth(next.getMonth() + 1);
        setCurrentDate(next);
    };

    const handleSaveEntry = async (date: string, field: keyof TimesheetEntry, value: string) => {
        if (viewMode === 'individual' && isFuture(new Date(date + 'T12:00:00'))) return;

        // Se for usuário comum, ele não deve conseguir editar (RLS vai bloquear, mas UI também ajuda)
        // No entanto, o plano diz que usuários podem ADICIONAR, mas ADM altera.
        // Vamos permitir editar se for hoje ou passado e o registro for novo ou se estivermos em modo ADM.

        const existing = entries.find(e => e.date === date);
        const entryData: Partial<TimesheetEntry> = existing
            ? { ...existing, [field]: value || null }
            : { user_id: user?.id, date, [field]: value || null };

        try {
            await timesheetService.saveEntry(entryData);
            // Atualizar localmente
            if (existing) {
                setEntries(entries.map(e => e.date === date ? { ...e, [field]: value || null } : e));
            } else {
                // Recarregar para pegar o ID e outros campos
                loadData();
            }
        } catch (error: any) {
            console.error("Erro ao salvar ponto:", error);
            showToast('error', error.message || 'Erro ao salvar ponto');
        }
    };

    // Dias do mês para a visualização individual
    const daysInMonth = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const isAdmin = user?.permissions?.role === 'admin';

    return (
        <div className="flex flex-col h-full bg-navy-950 overflow-hidden">
            {/* Header */}
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 bg-navy-900/20">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
                        <Clock className="text-gold-500" size={28} />
                        Folha de Ponto
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {viewMode === 'admin' ? 'Controle geral de frequência da equipe' : 'Registro individual de horários'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <div className="flex bg-navy-900/50 p-1 rounded-lg border border-white/5">
                            <button
                                onClick={() => setViewMode('individual')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'individual' ? 'bg-gold-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                MEU PONTO
                            </button>
                            <button
                                onClick={() => setViewMode('admin')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'admin' ? 'bg-gold-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                GESTÃO EQUIPE
                            </button>
                        </div>
                    )}

                    <div className="flex items-center bg-navy-900/50 rounded-lg border border-white/5 overflow-hidden">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="px-4 py-2 min-w-[140px] text-center">
                            <span className="text-sm font-bold text-white uppercase tracking-wider">{monthLabel}</span>
                        </div>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 scroll-smooth">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-gold-500" size={48} />
                        <p className="text-slate-400 animate-pulse">Carregando registros...</p>
                    </div>
                ) : viewMode === 'individual' ? (
                    <div className="max-w-5xl mx-auto space-y-4">
                        {/* Info Card */}
                        <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 flex gap-4 items-start">
                            <Info className="text-blue-400 shrink-0 mt-0.5" size={20} />
                            <div className="text-sm text-blue-100/80">
                                <p className="font-bold text-blue-300 mb-1">Regras de Registro</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Registros só podem ser feitos para o dia atual ou dias passados.</li>
                                    <li>Somente o administrador pode alterar horários após o registro.</li>
                                    <li>Seus horários são salvos automaticamente ao preencher os campos.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-navy-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-navy-900/80 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-4 py-4">Entrada Manhã</th>
                                        <th className="px-4 py-4">Saída Almoço</th>
                                        <th className="px-4 py-4">Retorno Almoço</th>
                                        <th className="px-4 py-4">Saída Final</th>
                                        <th className="px-6 py-4">Observações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {daysInMonth.map((day) => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const entry = entries.find(e => e.date === dateStr);
                                        const isFutureDay = isFuture(day) && !isToday(day);
                                        const isTodayDay = isToday(day);
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                                        return (
                                            <tr
                                                key={dateStr}
                                                className={`group transition-colors ${isTodayDay ? 'bg-gold-500/5' : isWeekend ? 'bg-navy-950/30' : 'hover:bg-white/2'}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-bold ${isTodayDay ? 'text-gold-500' : 'text-slate-200'}`}>
                                                            {format(day, 'dd/MM', { locale: ptBR })}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            {format(day, 'EEEE', { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                </td>
                                                {['entry_1', 'exit_1', 'entry_2', 'exit_2'].map((field) => (
                                                    <td key={field} className="px-4 py-4">
                                                        <input
                                                            type="time"
                                                            value={entry ? (entry as any)[field] || '' : ''}
                                                            onChange={(e) => handleSaveEntry(dateStr, field as any, e.target.value)}
                                                            disabled={!!(isFutureDay || (!isAdmin && entry && (entry as any)[field]))}
                                                            className={`w-full bg-navy-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-gold-500/50 outline-none transition-all ${isFutureDay ? 'opacity-30 cursor-not-allowed' : 'hover:border-white/20'}`}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        placeholder="..."
                                                        value={entry?.notes || ''}
                                                        onChange={(e) => handleSaveEntry(dateStr, 'notes', e.target.value)}
                                                        disabled={!!(isFutureDay || (!isAdmin && entry?.notes))}
                                                        className={`w-full bg-transparent border-b border-transparent hover:border-white/10 focus:border-gold-500/50 px-2 py-1 text-sm text-slate-400 placeholder:text-slate-700 outline-none transition-all ${isFutureDay ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Admin View (Gestão Equipe) */
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {/* Resumo cards could go here */}
                        </div>

                        <div className="bg-navy-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-navy-900/80 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                                            <th className="px-6 py-4">Colaborador</th>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-4 py-4">Entrada 1</th>
                                            <th className="px-4 py-4">Saída 1</th>
                                            <th className="px-4 py-4">Entrada 2</th>
                                            <th className="px-4 py-4">Saída 2</th>
                                            <th className="px-6 py-4">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-300">
                                        {entries.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                                                    Nenhum registro encontrado para este mês.
                                                </td>
                                            </tr>
                                        ) : (
                                            entries.map((entry) => (
                                                <tr key={entry.id} className="hover:bg-white/2 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-navy-800 border border-white/10 flex items-center justify-center text-gold-500 font-bold text-xs">
                                                                {entry.user_name?.[0]}
                                                            </div>
                                                            <span className="text-sm font-bold text-white">{entry.user_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">{format(new Date(entry.date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                                                            <span className="text-[10px] text-slate-500">{format(new Date(entry.date + 'T12:00:00'), 'EEEE', { locale: ptBR })}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 font-mono text-sm">{entry.entry_1 || '--:--'}</td>
                                                    <td className="px-4 py-4 font-mono text-sm">{entry.exit_1 || '--:--'}</td>
                                                    <td className="px-4 py-4 font-mono text-sm">{entry.entry_2 || '--:--'}</td>
                                                    <td className="px-4 py-4 font-mono text-sm">{entry.exit_2 || '--:--'}</td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => {
                                                                // Em uma versão futura poderíamos abrir um modal de edição completo
                                                                showToast('success', 'Edição direta via Admin disponível apenas na view individual (selecione o colaborador no filtro - WIP)');
                                                            }}
                                                            className="text-gold-500/50 hover:text-gold-500 text-[10px] font-bold uppercase tracking-wider transition-colors"
                                                        >
                                                            EDITAR
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="p-4 border-t border-white/5 bg-navy-900/40 text-center">
                <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5 font-medium uppercase tracking-widest">
                    <Clock size={12} className="text-gold-500/50" />
                    Sistema de Ponto • Escritório Noleto & Macedo © 2026
                </p>
            </div>
        </div>
    );
};

export default Timesheet;
