import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CaseType, EventType, Event } from '../../types';
import { X, Save, AlertTriangle, Calendar, MapPin, User, Search, Trash2, Gavel, Users, Bell, FileText } from 'lucide-react';

import { useAllCases } from '../../hooks/useCases';
import { useAllClients } from '../../hooks/useClients';

interface NewEventModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NewEventModal: React.FC<NewEventModalProps> = ({ isOpen, onClose }) => {
    const { events, addEvent, showToast } = useApp();
    const { data: cases = [] } = useAllCases();
    const { data: clients = [] } = useAllClients();

    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [date, setDate] = useState('');
    const [city, setCity] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [eventType, setEventType] = useState<string>(EventType.AUDIENCIA);
    const [title, setTitle] = useState('');

    // Filter Clients
    const eligibleClients = useMemo(() => {
        return (clients || [])
            .filter(c => c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm))
            .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
    }, [clients, searchTerm]);

    // Filter Cases for selected client
    const clientCases = useMemo(() => {
        if (!selectedClientId) return [];
        return (cases || []).filter(c => c.client_id === selectedClientId);
    }, [cases, selectedClientId]);

    const handleSave = async () => {
        if (!selectedClientId) { showToast('error', 'Selecione um cliente.'); return; }
        if (!selectedCaseId) { showToast('error', 'Selecione um processo.'); return; }
        if (!date) { showToast('error', 'Selecione a data.'); return; }
        if (!city) { showToast('error', 'Informe o local.'); return; }
        if (!title) { showToast('error', 'Informe um título ou descrição.'); return; }

        try {
            await addEvent({
                id: crypto.randomUUID(),
                case_id: selectedCaseId,
                titulo: title,
                data_hora: new Date(date).toISOString(),
                tipo: eventType,
                cidade: city
            });
            showToast('success', 'Evento agendado com sucesso!');
            handleClose();
        } catch (error) {
            showToast('error', 'Erro ao agendar evento.');
        }
    };

    const handleClose = () => {
        setSelectedClientId('');
        setSelectedCaseId('');
        setDate('');
        setCity('');
        setSearchTerm('');
        setTitle('');
        setEventType(EventType.AUDIENCIA);
        onClose();
    };

    const eventOptions = [
        { id: EventType.AUDIENCIA, label: 'Audiência', icon: Gavel },
        { id: EventType.REUNIAO, label: 'Reunião', icon: Users },
        { id: EventType.PRAZO_FATAL, label: 'Prazo Fatal', icon: AlertTriangle },
        { id: EventType.ADMINISTRATIVO, label: 'Protocolo INSS', icon: FileText },
        { id: 'Outros', label: 'Outros', icon: Bell },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                    <h3 className="text-xl font-bold text-white font-serif flex items-center gap-2">
                        <Calendar className="text-blue-500" /> Agendar Novo Evento
                    </h3>
                    <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Event Type Grid */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Tipo de Evento</label>
                        <div className="grid grid-cols-2 gap-2">
                            {eventOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        setEventType(opt.id);
                                        if (!title || eventOptions.some(o => o.label === title)) {
                                            setTitle(opt.label);
                                        }
                                    }}
                                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-xs font-medium ${eventType === opt.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                                >
                                    <opt.icon size={16} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Título / Descrição</label>
                        <input
                            className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                            placeholder="Ex: Audiência de Instrução"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Client Search */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Cliente</label>

                        {!selectedClientId ? (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                    <input
                                        className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                        placeholder="Buscar cliente..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-[#0f1014]">
                                    {eligibleClients.length > 0 ? eligibleClients.map(client => (
                                        <button
                                            key={client.id}
                                            onClick={() => {
                                                setSelectedClientId(client.id);
                                                // Auto-select case if only one
                                                const cases = (client as any).cases || []; // Need to check if available
                                                const cLcases = (cases || []).filter((c: any) => c.client_id === client.id);
                                                // Wait, hooks useAllCases and useAllClients might not have joins.
                                                // I'll rely on clientCases useMemo.
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-zinc-800 transition-colors flex items-center justify-between group"
                                        >
                                            <span className="text-sm text-zinc-300 group-hover:text-white">{client.nome_completo}</span>
                                            <span className="text-xs text-zinc-600 font-mono">{client.cpf_cnpj}</span>
                                        </button>
                                    )) : (
                                        <div className="p-4 text-center text-zinc-500 text-xs">Nenhum cliente encontrado.</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center font-bold">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            {clients.find(c => c.id === selectedClientId)?.nome_completo}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedClientId(''); setSelectedCaseId(''); }} className="text-zinc-500 hover:text-red-400">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Case Selection */}
                    {selectedClientId && (
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Processo Relacionado</label>
                            <select
                                className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                value={selectedCaseId}
                                onChange={(e) => setSelectedCaseId(e.target.value)}
                            >
                                <option value="">Selecione o processo...</option>
                                {clientCases.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.titulo} - {c.numero_processo || 'Sem número'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {/* Date & Time */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Data e Hora</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none [color-scheme:dark]"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        {/* City */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Local / Cidade</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input
                                    className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                    placeholder="Ex: São Luís - MA"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-end gap-3 border-t border-zinc-800 mt-6">
                    <button onClick={handleClose} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedClientId || !selectedCaseId || !date || !city || !title}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save size={18} /> Agendar Evento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewEventModal;
