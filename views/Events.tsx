import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useAllCases } from '../hooks/useCases';
import { EventType } from '../types';
import {
    Calendar, MapPin, Search, Plus, User, FileText,
    Clock, ChevronRight, AlertCircle, Phone, Edit2, Trash2,
    Check, X as CloseIcon, Gavel, Users, Bell, MessageSquare
} from 'lucide-react';
import NewEventModal from '../components/modals/NewEventModal';
import { formatDateDisplay } from '../utils/dateUtils';
import PendencyIndicator from '../components/ui/PendencyIndicator';
import { useAllClients } from '../hooks/useClients';

const Events: React.FC = () => {
    const { events, setClientToView, setCaseToView, setCurrentView, updateEvent, deleteEvent, showToast, globalBranchFilter } = useApp();
    const cases: any[] = [];
    const clients: any[] = [];
    // Optimized: Removed heavy pre-fetching.
    const [searchTerm, setSearchTerm] = useState('');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [filterMode, setFilterMode] = useState<'upcoming' | 'past' | 'all'>('upcoming');

    // Edit States
    const [editingEvent, setEditingEvent] = useState<any | null>(null);

    const filteredEvents = useMemo(() => {
        // Exclude Perícias
        let filtered = (events || []).filter(e => e.tipo !== EventType.PERICIA);

        // Filter by Branch
        if (globalBranchFilter && globalBranchFilter !== 'all') {
            filtered = filtered.filter(e => {
                const caseObj = cases.find(c => c.id === e.case_id);
                const client = caseObj ? (clients || []).find(cl => cl.id === caseObj.client_id) : null;
                return client?.filial === globalBranchFilter;
            });
        }

        // Filter by Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(e => {
                const client = cases.find(c => c.id === e.case_id)
                    ? (clients || []).find(cl => cl.id === cases.find(c => c.id === e.case_id)?.client_id)
                    : null;

                return (
                    e.titulo.toLowerCase().includes(lower) ||
                    e.tipo?.toLowerCase().includes(lower) ||
                    e.cidade?.toLowerCase().includes(lower) ||
                    client?.nome_completo.toLowerCase().includes(lower) ||
                    client?.cpf_cnpj?.includes(lower)
                );
            });
        }

        // Filter by Date Mode
        const now = new Date();
        if (filterMode === 'upcoming') {
            filtered = filtered.filter(e => new Date(e.data_hora) >= now);
        } else if (filterMode === 'past') {
            filtered = filtered.filter(e => new Date(e.data_hora) < now);
        }

        // Sort by Date (Ascending for upcoming, Descending for others)
        return filtered.sort((a, b) => {
            const dateA = new Date(a.data_hora).getTime();
            const dateB = new Date(b.data_hora).getTime();
            return filterMode === 'upcoming' ? dateA - dateB : dateB - dateA;
        });
    }, [events, searchTerm, filterMode, cases, clients, globalBranchFilter]);

    const handleEditEvent = (event: any) => {
        setEditingEvent({ ...event, data_hora: new Date(event.data_hora).toISOString().substring(0, 16) });
    };

    const handleUpdateEventLocal = async () => {
        if (!editingEvent) return;
        await updateEvent({
            ...editingEvent,
            data_hora: new Date(editingEvent.data_hora).toISOString()
        });
        setEditingEvent(null);
    };

    const handleDeleteEvent = async (id: string) => {
        try {
            await deleteEvent(id);
        } catch (error) {
            console.error('Erro ao excluir:', error);
        }
    };

    const getClient = (caseId: string) => {
        const c = cases.find(x => x.id === caseId);
        if (!c) return null;
        return (clients || []).find(cl => cl.id === c.client_id);
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case EventType.AUDIENCIA: return <Gavel size={16} />;
            case EventType.REUNIAO: return <Users size={16} />;
            case EventType.PRAZO_FATAL: return <AlertCircle size={16} className="text-red-500" />;
            case EventType.ADMINISTRATIVO: return <FileText size={16} />;
            default: return <Bell size={16} />;
        }
    };

    return (
        <div className="h-full flex flex-col p-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/5 transition-transform hover:scale-105">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
                            Agenda de Eventos
                        </h1>
                        <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
                            Controle audiências, reuniões e prazos importantes.
                        </p>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsNewModalOpen(true)}
                    className="group h-10 bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 w-10 hover:w-auto overflow-hidden hover:pr-5 transition-all duration-300"
                >
                    <Plus size={18} className="shrink-0" />
                    <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Novo Evento</span>
                </motion.button>
            </div>

            {/* Toolbar */}
            <div className="bg-[#0f1014] border border-zinc-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                        className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-200 outline-none focus:border-blue-500 transition-colors"
                        placeholder="Buscar por cliente, tipo ou local..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex bg-[#09090b] p-1 rounded-lg border border-zinc-800">
                    {(['upcoming', 'past', 'all'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setFilterMode(mode)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterMode === mode ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {mode === 'upcoming' ? 'Próximos' : mode === 'past' ? 'Passados' : 'Todos'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-20 custom-scrollbar">
                {filteredEvents.length > 0 ? filteredEvents.map(event => {
                    const client = getClient(event.case_id);
                    const eventDate = new Date(event.data_hora);
                    const isToday = new Date().toDateString() === eventDate.toDateString();

                    return (
                        <div key={event.id} className="bg-[#0f1014] border border-zinc-800/50 hover:border-blue-500/30 rounded-xl p-5 flex flex-col md:flex-row items-center gap-6 group transition-all hover:bg-zinc-900/30 relative overflow-hidden">
                            {isToday && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}

                            {/* Date Block */}
                            <div className="flex flex-col items-center justify-center min-w-[80px] text-center">
                                <span className="text-xs font-bold text-zinc-500 uppercase">{eventDate.toLocaleString('pt-BR', { month: 'short' })}</span>
                                <span className={`text-2xl font-bold ${isToday ? 'text-blue-500' : 'text-white'}`}>{eventDate.getDate()}</span>
                                <span className="text-xs text-zinc-600">{eventDate.toLocaleString('pt-BR', { weekday: 'short' })}</span>
                            </div>

                            <div className="w-px h-12 bg-zinc-800 hidden md:block" />

                            {/* Info Area */}
                            <div className="flex-1 w-full">
                                {editingEvent?.id === event.id ? (
                                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-blue-500/30 space-y-4 animate-in fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Título / Tipo</label>
                                                <input
                                                    className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
                                                    value={editingEvent.titulo}
                                                    onChange={e => setEditingEvent({ ...editingEvent, titulo: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Data e Hora</label>
                                                <input
                                                    type="datetime-local"
                                                    className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none [color-scheme:dark]"
                                                    value={editingEvent.data_hora}
                                                    onChange={e => setEditingEvent({ ...editingEvent, data_hora: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Cidade / Local</label>
                                                <input
                                                    className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
                                                    value={editingEvent.cidade || ''}
                                                    onChange={e => setEditingEvent({ ...editingEvent, cidade: e.target.value })}
                                                    placeholder="Ex: Tribunal de Justiça"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
                                            <button
                                                onClick={() => setEditingEvent(null)}
                                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleUpdateEventLocal}
                                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Salvar Alterações
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                        {/* Client Info */}
                                        <div className="flex items-center gap-3 group/client">
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 group-hover/client:border-blue-500/50 group-hover/client:text-blue-500 transition-all">
                                                {(client?.nome_completo || '??').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <PendencyIndicator pendencies={client?.pendencias} align="left">
                                                    <div className="cursor-help">
                                                        <h3
                                                            className="text-sm font-bold text-zinc-200 group-hover/client:text-white transition-colors cursor-pointer truncate"
                                                            onClick={() => {
                                                                setClientToView(client?.id || null);
                                                                setCurrentView('clients');
                                                            }}
                                                        >
                                                            {client?.nome_completo || 'Cliente não encontrado'}
                                                        </h3>
                                                        <p className="text-[10px] text-zinc-500 font-mono truncate">{client?.cpf_cnpj || 'Sem documento'}</p>
                                                    </div>
                                                </PendencyIndicator>
                                            </div>
                                        </div>

                                        {/* Event Info */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 px-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] uppercase font-black flex items-center gap-1.5 whitespace-nowrap">
                                                    {getEventIcon(event.tipo)}
                                                    {event.tipo}
                                                </div>
                                                <span className="text-sm font-bold text-zinc-300 truncate">{event.titulo}</span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                                    <MapPin size={12} />
                                                    {event.cidade || 'Local não informado'}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                                    <Clock size={12} />
                                                    {eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-2">
                                            {client?.telefone && (
                                                <a
                                                    href={`https://wa.me/55${client.telefone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                    title="Falar no WhatsApp"
                                                >
                                                    <Phone size={18} />
                                                </a>
                                            )}
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditEvent(event); }}
                                                className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors relative z-50"
                                                title="Editar Evento"
                                                type="button"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleDeleteEvent(event.id);
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer relative z-50 border border-red-500/20"
                                                title="Excluir Evento"
                                                type="button"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <button
                                                onClick={(ev) => {
                                                    ev.preventDefault();
                                                    ev.stopPropagation();
                                                    setCaseToView(event.case_id);
                                                    setCurrentView('cases');
                                                }}
                                                className="ml-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors whitespace-nowrap relative z-50"
                                            >
                                                Ver Processo
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 text-zinc-600">
                            <Calendar size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-400">Nenhum evento encontrado</h3>
                        <p className="text-zinc-500 mt-2 max-w-sm">
                            {filterMode === 'upcoming'
                                ? 'Não há eventos agendados para o futuro. Que tal agendar um novo?'
                                : 'Não encontramos registros com os filtros atuais.'}
                        </p>
                        <button onClick={() => setIsNewModalOpen(true)} className="mt-6 text-blue-500 hover:text-blue-400 text-sm font-medium">
                            + Agendar agora
                        </button>
                    </div>
                )}
            </div>

            <NewEventModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
        </div>
    );
};

export default Events;
