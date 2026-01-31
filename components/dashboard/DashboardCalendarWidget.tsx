import React from 'react';
import { ChevronLeft, ChevronRight, Bell, Check, Trash2, Plus } from 'lucide-react';
import { Reminder } from '../../types';

interface DashboardCalendarWidgetProps {
    reminders: Reminder[];
    reminderDate: Date;
    setReminderDate: (date: Date) => void;
    newReminderTitle: string;
    setNewReminderTitle: (title: string) => void;
    handleAddReminder: () => void;
    toggleReminder: (id: string) => void;
    deleteReminder: (id: string) => void;
}

const DashboardCalendarWidget: React.FC<DashboardCalendarWidgetProps> = ({
    reminders,
    reminderDate,
    setReminderDate,
    newReminderTitle,
    setNewReminderTitle,
    handleAddReminder,
    toggleReminder,
    deleteReminder
}) => {
    const daysInMonth = new Date(reminderDate.getFullYear(), reminderDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), 1).getDay();
    const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: startDay }, (_, i) => i);
    const selectedDateStr = reminderDate.toISOString().split('T')[0];
    const remindersForDay = reminders.filter(r => r.date === selectedDateStr);

    return (
        <div className="flex gap-4 h-full">
            {/* Mini Calendar */}
            <div className="w-1/2 flex flex-col border-r border-white/5 pr-4">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-zinc-400 capitalize">{reminderDate.toLocaleString('pt-BR', { month: 'long' })}</h4>
                    <div className="flex gap-1">
                        <button onClick={() => setReminderDate(new Date(reminderDate.getFullYear(), reminderDate.getMonth() - 1, 1))} className="p-1 hover:text-white text-zinc-500"><ChevronLeft size={14} /></button>
                        <button onClick={() => setReminderDate(new Date(reminderDate.getFullYear(), reminderDate.getMonth() + 1, 1))} className="p-1 hover:text-white text-zinc-500"><ChevronRight size={14} /></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-[9px] text-center text-zinc-500 mb-1">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-1 flex-1 content-start">
                    {blanks.map(b => <div key={`b-${b}`} />)}
                    {daysArr.map(day => {
                        const dStr = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), day).toISOString().split('T')[0];
                        const isSel = dStr === selectedDateStr;
                        const hasRem = reminders.some(r => r.date === dStr && !r.completed);
                        return (
                            <div key={day} onClick={() => setReminderDate(new Date(reminderDate.getFullYear(), reminderDate.getMonth(), day))}
                                className={`h-6 flex items-center justify-center rounded cursor-pointer relative text-xs transition-all ${isSel ? 'bg-gold-500 text-black font-bold' : 'text-zinc-400 hover:bg-white/5'}`}>
                                {day}
                                {hasRem && !isSel && <div className="absolute bottom-0.5 w-1 h-1 bg-gold-500 rounded-full" />}
                            </div>
                        )
                    })}
                </div>
            </div>
            {/* Tasks List */}
            <div className="flex-1 flex flex-col">
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2"><Bell size={12} className="text-gold-500" /> {reminderDate.getDate()} de {reminderDate.toLocaleString('pt-BR', { month: 'short' })}</h4>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {remindersForDay.map(rem => (
                        <div key={rem.id} className="flex items-center gap-2 p-2 rounded bg-white/5 group">
                            <button onClick={() => toggleReminder(rem.id)} className={`w-4 h-4 rounded border flex items-center justify-center ${rem.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>{rem.completed && <Check size={10} className="text-black" />}</button>
                            <span className={`text-xs flex-1 ${rem.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{rem.title}</span>
                            <button onClick={() => deleteReminder(rem.id)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                    ))}
                    {remindersForDay.length === 0 && <p className="text-[10px] text-zinc-600 text-center py-4">Nada agendado.</p>}
                </div>
                <div className="mt-2 flex gap-2">
                    <input className="flex-1 bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-gold-500" placeholder="Novo lembrete..." value={newReminderTitle} onChange={e => setNewReminderTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddReminder()} />
                    <button onClick={handleAddReminder} className="bg-gold-600 text-white p-1 rounded hover:bg-gold-500"><Plus size={14} /></button>
                </div>
            </div>
        </div>
    );
};

export default DashboardCalendarWidget;
