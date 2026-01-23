import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CaseType, EventType, Event } from '../../types';
import { X, Save, AlertTriangle, Calendar, MapPin, User, Search, Trash2 } from 'lucide-react';

interface NewPericiaModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NewPericiaModal: React.FC<NewPericiaModalProps> = ({ isOpen, onClose }) => {
    const { clients, cases, events, addEvent, deleteEvent, showToast } = useApp();

    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [date, setDate] = useState('');
    const [city, setCity] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Conflict State
    const [conflictEvent, setConflictEvent] = useState<Event | null>(null);
    const [isConfirmingConflict, setIsConfirmingConflict] = useState(false);

    // Filter Clients: Only those with Administrative or Judicial cases (Not Seguro Defeso)
    const eligibleClients = useMemo(() => {
        // Get IDs of clients with valid cases
        const validClientIds = new Set(
            cases
                .filter(c => c.tipo !== CaseType.SEGURO_DEFESO)
                .map(c => c.client_id)
        );

        return clients
            .filter(c => validClientIds.has(c.id))
            .filter(c => c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm))
            .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
    }, [clients, cases, searchTerm]);

    const handleSave = async () => {
        if (!selectedClientId) { showToast('error', 'Selecione um cliente.'); return; }
        if (!date) { showToast('error', 'Selecione a data.'); return; }
        if (!city) { showToast('error', 'Informe a cidade.'); return; }

        // Check for conflicts
        const existingEvent = events.find(e => 
            e.case_id && // event must be linked to a case? Wait, need to check if pericia is case-bound. Yes, usually.
            cases.find(c => c.id === e.case_id)?.client_id === selectedClientId &&
            e.tipo === EventType.PERICIA &&
            new Date(e.data_hora) > new Date() // Only future events? User said "ja tem uma agendada".
        );

        // Does the user want one event per client or per case? "para um cliente que ja tem uma agendada".
        // Implies client-level check. 
        // But events are linked to cases. So I need to find a case to attach this event to.
        // If the client has multiple eligible cases, which one do we attach to?
        // This is a missing detail. I will assume we let the user select the case OR pick the most recent eligible case.
        // For now, let's assume we pick the most recent eligible case automatically OR ask.
        // Given the UI described ("escolher o cliente"), it doesn't mention choosing the case.
        // I will default to the most recent Active eligible case.
        
        const clientCases = cases.filter(c => c.client_id === selectedClientId && c.tipo !== CaseType.SEGURO_DEFESO);
        // Sort by recency
        const targetCase = clientCases.sort((a, b) => new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime())[0];

        if (!targetCase) {
             showToast('error', 'Este cliente não possui processos elegíveis.');
             return;
        }

        if (existingEvent && !isConfirmingConflict) {
            setConflictEvent(existingEvent);
            setIsConfirmingConflict(true);
            return;
        }

        await createEvent(targetCase.id);
    };

    const createEvent = async (caseId: string) => {
        try {
            await addEvent({
                id: crypto.randomUUID(),
                case_id: caseId,
                titulo: 'Perícia Médica',
                data_hora: new Date(date).toISOString(),
                tipo: EventType.PERICIA,
                cidade: city
            });
            showToast('success', 'Perícia agendada com sucesso!');
            handleClose();
        } catch (error) {
            showToast('error', 'Erro ao agendar perícia.');
        }
    };

    const handleConflictAction = async (action: 'replace' | 'continue' | 'cancel') => {
        if (action === 'cancel') {
            setIsConfirmingConflict(false);
            setConflictEvent(null);
            return;
        }

        const clientCases = cases.filter(c => c.client_id === selectedClientId && c.tipo !== CaseType.SEGURO_DEFESO);
        const targetCase = clientCases[0]; // Logic repeated, maybe extract?

        if (action === 'replace' && conflictEvent) {
            await deleteEvent(conflictEvent.id);
            await createEvent(targetCase.id);
        } else if (action === 'continue') {
            await createEvent(targetCase.id);
        }
    };

    const handleClose = () => {
        setSelectedClientId('');
        setDate('');
        setCity('');
        setSearchTerm('');
        setIsConfirmingConflict(false);
        setConflictEvent(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                    <h3 className="text-xl font-bold text-white font-serif flex items-center gap-2">
                        <Calendar className="text-gold-500" /> Nova Perícia
                    </h3>
                    <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {isConfirmingConflict && conflictEvent ? (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 text-orange-500 mb-2 font-bold">
                            <AlertTriangle /> Atenção: Perícia já agendada!
                        </div>
                        <p className="text-zinc-300 text-sm mb-4">
                            Este cliente já possui uma perícia agendada para <strong>{new Date(conflictEvent.data_hora).toLocaleDateString()}</strong> em <strong>{conflictEvent.cidade || 'Local não informado'}</strong>.
                        </p>
                        <div className="space-y-2">
                            <button 
                                onClick={() => handleConflictAction('replace')}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 p-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                            >
                                <Trash2 size={16} /> Substituir (Apagar Anterior)
                            </button>
                            <button 
                                onClick={() => handleConflictAction('continue')}
                                className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 p-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                            >
                                <Save size={16} /> Adicionar Nova (Manter Ambas)
                            </button>
                            <button 
                                onClick={() => handleConflictAction('cancel')}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-3 rounded-lg transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Client Search */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Cliente (Adm/Judicial)</label>
                            
                            {!selectedClientId ? (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                        <input
                                            className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                            placeholder="Buscar cliente..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-zinc-800 rounded-lg bg-[#0f1014]">
                                        {eligibleClients.length > 0 ? eligibleClients.map(client => (
                                            <button
                                                key={client.id}
                                                onClick={() => setSelectedClientId(client.id)}
                                                className="w-full text-left px-4 py-2 hover:bg-zinc-800 transition-colors flex items-center justify-between group"
                                            >
                                                <span className="text-sm text-zinc-300 group-hover:text-white">{client.nome_completo}</span>
                                                <span className="text-xs text-zinc-600 font-mono">{client.cpf_cnpj}</span>
                                            </button>
                                        )) : (
                                            <div className="p-4 text-center text-zinc-500 text-xs">Nenhum cliente elegível encontrado.</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gold-600/20 text-gold-500 flex items-center justify-center font-bold">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">
                                                {clients.find(c => c.id === selectedClientId)?.nome_completo}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedClientId('')} className="text-zinc-500 hover:text-red-400">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Date & Time */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Data e Hora</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        {/* City */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Cidade / Local</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input
                                    className="w-full bg-[#0f1014] border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-gold-500 outline-none"
                                    placeholder="Ex: São Luís - MA"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button onClick={handleClose} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                            <button 
                                onClick={handleSave}
                                disabled={!selectedClientId || !date || !city}
                                className="px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Agendar Perícia
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewPericiaModal;
