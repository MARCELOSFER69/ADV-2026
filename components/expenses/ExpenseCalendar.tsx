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
        <div className="bg-navy-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full animate-in fade-in duration-300">
            {/* Calendar Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-navy-950/50">
                <h3 className="text-lg font-bold text-white font-serif capitalize">
                    {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => onMonthChange('prev')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={onTodayClick} className="px-3 py-1 text-xs font-bold bg-slate-800 text-slate-300 rounded hover:text-white transition-colors">
                        Hoje
                    </button>
                    <button onClick={() => onMonthChange('next')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <ChevronRight size={20} />
                    </button>
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
                                onClick={() => onDayClick(day)}
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
    );
};

export default ExpenseCalendar;
