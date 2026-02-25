import React, { useState } from 'react';
import { Calendar, List, ChevronLeft, ChevronRight } from 'lucide-react';

interface AgendaWidgetProps {
    title: string;
    events: any[];
}

const AgendaWidget: React.FC<AgendaWidgetProps> = ({ title, events }) => {
    const [viewMode, setViewMode] = useState<'agenda' | 'calendar'>('agenda');
    const [currentCalDate, setCurrentCalDate] = useState(new Date());

    const renderCalendar = () => {
        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        // Preencher espaços vazios
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-8 md:h-12 border border-white/5 bg-white/[0.01]"></div>);

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            days.push(
                <div key={day} className={`h-8 md:h-12 border border-white/5 relative group p-1 ${isToday ? 'bg-yellow-500/10' : 'hover:bg-white/5'}`}>
                    <span className={`text-[10px] font-bold ${isToday ? 'text-yellow-500' : 'text-zinc-500'}`}>{day}</span>
                    {dayEvents.length > 0 && (
                        <div className="absolute bottom-1 right-1 flex -space-x-1">
                            {dayEvents.slice(0, 3).map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-500 border border-zinc-900"></div>
                            ))}
                        </div>
                    )}
                    {dayEvents.length > 0 && (
                        <div className="absolute hidden group-hover:block z-50 bg-zinc-900 border border-white/10 p-2 rounded shadow-2xl min-w-[150px] top-full left-0">
                            {dayEvents.map((e, i) => <p key={i} className="text-[10px] text-zinc-300 mb-1 last:mb-0">• {e.title}</p>)}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{currentCalDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h4>
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentCalDate(new Date(year, month - 1))} className="p-1 hover:bg-white/5 rounded text-zinc-400"><ChevronLeft size={14} /></button>
                        <button onClick={() => setCurrentCalDate(new Date(year, month + 1))} className="p-1 hover:bg-white/5 rounded text-zinc-400"><ChevronRight size={14} /></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center mb-1">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <span key={d} className="text-[8px] font-bold text-zinc-600">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 flex-1 border border-white/5 rounded overflow-hidden">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                    <Calendar size={16} className="text-yellow-500" />{title}
                </h3>
                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                    <button onClick={() => setViewMode('agenda')} className={`p-1.5 rounded transition-all ${viewMode === 'agenda' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><List size={14} /></button>
                    <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded transition-all ${viewMode === 'calendar' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><Calendar size={14} /></button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                {viewMode === 'agenda' ? (
                    <div className="space-y-3 overflow-y-auto custom-scrollbar h-full pr-1">
                        {events.length > 0 ? events.map((event, idx) => {
                            const dateObj = new Date(event.date);
                            const isValid = !isNaN(dateObj.getTime());

                            if (!isValid) return null;

                            return (
                                <div key={idx} className="flex gap-4 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                                    <div className="flex flex-col items-center justify-center min-w-[40px] border-r border-white/5 pr-3">
                                        <span className="text-xs font-bold text-yellow-500 uppercase">{dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                        <span className="text-lg font-bold text-white">{dateObj.getDate()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-zinc-200 group-hover:text-yellow-500 transition-colors uppercase">{event.title}</p>
                                        <div className="flex justify-between mt-1 items-center">
                                            <span className="text-[10px] text-zinc-500 italic">{event.type}</span>
                                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono border border-white/5">{event.time}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : <div className="text-center py-8 text-zinc-500 text-xs">Nada programado para hoje.</div>}
                    </div>
                ) : renderCalendar()}
            </div>
        </div>
    );
};

export default React.memo(AgendaWidget);
