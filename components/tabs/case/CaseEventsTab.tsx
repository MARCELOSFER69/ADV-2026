import React, { useState } from 'react';
import { Event, EventType } from '../../../types';
import { Calendar, Trash2, Plus, Clock, MapPin, User, Check, Edit2 } from 'lucide-react';
import { formatDateDisplay } from '../../../utils/dateUtils';
import CustomSelect from '../../ui/CustomSelect';

interface CaseEventsTabProps {
    events: Event[];
    onAddEvent: (eventData: Partial<Event>, isCustomType: boolean, customType: string) => Promise<void>;
    onUpdateEvent: (event: Event, isCustomType: boolean, customType: string) => Promise<void>;
    onDeleteEvent: (id: string) => Promise<void>;
}

const CaseEventsTab: React.FC<CaseEventsTabProps> = ({ events, onAddEvent, onUpdateEvent, onDeleteEvent }) => {
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [newEvent, setNewEvent] = useState<Partial<Event>>({ data_hora: new Date().toISOString().substring(0, 16), tipo: EventType.PERICIA });
    const [isCustomEventType, setIsCustomEventType] = useState(false);
    const [customEventType, setCustomEventType] = useState('');

    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [isCustomEditEventType, setIsCustomEditEventType] = useState(false);

    const handleAdd = async () => {
        await onAddEvent(newEvent, isCustomEventType, customEventType);
        setIsAddingEvent(false);
        setNewEvent({ tipo: EventType.PERICIA, data_hora: new Date().toISOString().slice(0, 16) });
        setIsCustomEventType(false);
        setCustomEventType('');
    };

    const handleUpdate = async () => {
        if (!editingEvent) return;
        await onUpdateEvent(editingEvent, isCustomEditEventType, customEventType);
        setEditingEvent(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calendar size={20} className="text-gold-500" />
                    Próximos Eventos
                </h3>
                <button
                    onClick={() => setIsAddingEvent(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gold-500/10 text-gold-500 rounded-lg hover:bg-gold-500/20 transition-colors text-xs font-bold uppercase tracking-wider"
                >
                    <Plus size={14} />
                    Adicionar Evento
                </button>
            </div>

            {/* ADD EVENT FORM */}
            {isAddingEvent && (
                <div className="bg-[#131418] p-4 rounded-xl border border-dashed border-gold-500/30 mb-6 relative">
                    <button onClick={() => setIsAddingEvent(false)} className="absolute top-2 right-2 text-zinc-600 hover:text-white"><Trash2 size={14} /></button>
                    <h4 className="text-sm font-bold text-white mb-3">Novo Evento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Título</label>
                            <input
                                className="w-full bg-[#18181b] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                value={newEvent.titulo || ''}
                                onChange={e => setNewEvent({ ...newEvent, titulo: e.target.value })}
                                placeholder="Ex: Perícia Médica"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Data e Hora</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-[#18181b] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                value={newEvent.data_hora}
                                onChange={e => setNewEvent({ ...newEvent, data_hora: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Tipo</label>
                            <CustomSelect
                                label="Tipo de Evento"
                                options={[
                                    ...Object.values(EventType).map(t => ({ label: t, value: t })),
                                    { label: 'Outros', value: 'Outros' }
                                ]}
                                value={isCustomEventType ? 'Outros' : newEvent.tipo || ''}
                                onChange={(val) => {
                                    if (val === 'Outros') {
                                        setIsCustomEventType(true);
                                    } else {
                                        setIsCustomEventType(false);
                                        setNewEvent({ ...newEvent, tipo: val as EventType });
                                    }
                                }}
                            />
                            {isCustomEventType && (
                                <input
                                    className="w-full mt-2 bg-[#18181b] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                    placeholder="Digite o tipo..."
                                    value={customEventType}
                                    onChange={e => setCustomEventType(e.target.value)}
                                />
                            )}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Local / Detalhes</label>
                            <input
                                className="w-full bg-[#18181b] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                value={newEvent.cidade || ''}
                                onChange={e => setNewEvent({ ...newEvent, cidade: e.target.value })}
                                placeholder="Ex: INSS Agência Centro"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleAdd} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg text-xs">
                            Salvar Evento
                        </button>
                    </div>
                </div>
            )}

            {/* EVENT LIST */}
            <div className="space-y-3">
                {events.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600 italic text-sm">Nenhum evento agendado.</div>
                ) : events.map(event => (
                    <div key={event.id} className="group flex items-start gap-4 p-4 bg-[#18181b] rounded-xl border border-white/5 hover:border-gold-500/20 transition-all relative">
                        {editingEvent?.id === event.id ? (
                            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-sm"
                                    value={editingEvent.titulo}
                                    onChange={e => setEditingEvent({ ...editingEvent, titulo: e.target.value })}
                                />
                                <input
                                    type="datetime-local"
                                    className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-sm"
                                    value={editingEvent.data_hora}
                                    onChange={e => setEditingEvent({ ...editingEvent, data_hora: e.target.value })}
                                />
                                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                    <button onClick={() => setEditingEvent(null)} className="text-xs text-zinc-500">Cancelar</button>
                                    <button onClick={handleUpdate} className="text-xs text-gold-500 font-bold">Salvar</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-lg bg-[#131418] border border-white/10 flex flex-col items-center justify-center shrink-0">
                                    <span className="text-xs text-zinc-500 uppercase">{new Date(event.data_hora).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                    <span className="text-lg font-bold text-white">{new Date(event.data_hora).getDate()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="text-white font-medium truncate pr-8">{event.titulo}</h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${event.tipo === EventType.AUDIENCIA ? 'bg-red-500/10 text-red-500' :
                                                    event.tipo === EventType.PERICIA ? 'bg-blue-500/10 text-blue-500' :
                                                        'bg-zinc-800 text-zinc-400'
                                                    }`}>
                                                    {event.tipo}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-zinc-500">
                                                    <Clock size={12} />
                                                    {new Date(event.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                                            <button
                                                onClick={() => {
                                                    setEditingEvent({ ...event, data_hora: new Date(event.data_hora).toISOString().substring(0, 16) });
                                                    setIsCustomEditEventType(false);
                                                }}
                                                className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded transition-colors"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteEvent(event.id)}
                                                className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {event.cidade && (
                                        <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                                            <MapPin size={12} />
                                            <span className="truncate">{event.cidade}</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CaseEventsTab;
