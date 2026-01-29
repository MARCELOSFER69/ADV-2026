import React from 'react';
import { OfficeExpense } from '../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ExpenseCalendarProps {
    currentDate: Date;
    onMonthChange: (direction: 'prev' | 'next') => void;
    onTodayClick: () => void;
    officeExpenses: OfficeExpense[];
    onDayClick: (day: number) => void;
}

const ExpenseCalendar: React.FC<ExpenseCalendarProps> = ({
    currentDate,
    onMonthChange,
    onTodayClick,
    officeExpenses,
    onDayClick
}) => {
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
        <div className="bg-[#0f1014] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full animate-in fade-in duration-300">
            {/* Calendar Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#131418]">
                <h3 className="text-xl font-black text-white font-serif capitalize tracking-tight">
                    {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => onMonthChange('prev')}
                        className="p-2 hover:bg-white/5 rounded-lg text-gold-500/70 hover:text-gold-500 transition-all"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <button
                        onClick={onTodayClick}
                        className="px-4 py-1.5 text-xs font-black bg-gold-500/10 text-gold-500 rounded-lg border border-gold-500/20 hover:bg-gold-500/20 transition-all uppercase tracking-widest"
                    >
                        Hoje
                    </button>
                    <button
                        onClick={() => onMonthChange('next')}
                        className="p-2 hover:bg-white/5 rounded-lg text-gold-500/70 hover:text-gold-500 transition-all"
                    >
                        <ChevronRight size={22} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col">
                <div className="grid grid-cols-7 border-b border-slate-800 bg-navy-950/30">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="py-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-[#0b0c10]">
                    {blanks.map(x => <div key={`blank-${x}`} className="border-b border-r border-slate-800/50 bg-slate-900/10" />)}
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
                                onClick={() => onDayClick(day)}
                                className={`
                                    min-h-[100px] p-2 border-b border-r border-slate-800/80 cursor-pointer transition-all relative group flex flex-col justify-between
                                    ${isToday ? 'bg-gold-500/5' : 'hover:bg-white/[0.02]'}
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-slate-400 group-hover:text-white'}`}>
                                        {day}
                                    </span>
                                    <div className="flex flex-wrap gap-1 justify-end">
                                        {hasPending && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]" title="Pendente"></div>}
                                        {hasPaid && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" title="Pago"></div>}
                                    </div>
                                </div>

                                {dayExpenses.length > 0 && (
                                    <div className="mt-1">
                                        <div className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                                            {dayExpenses.length} despesa{dayExpenses.length > 1 ? 's' : ''}
                                        </div>
                                        <div className="text-[9px] font-medium text-gold-500/70 group-hover:text-gold-500 transition-colors">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(dayExpenses.reduce((acc, curr) => acc + curr.valor, 0))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ExpenseCalendar;
