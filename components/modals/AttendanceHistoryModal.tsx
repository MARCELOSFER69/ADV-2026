import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, User, MessageCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { ClientHistory } from '../../types';

interface AttendanceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    clientName: string;
}

const AttendanceHistoryModal: React.FC<AttendanceHistoryModalProps> = ({ isOpen, onClose, clientId, clientName }) => {
    const [history, setHistory] = useState<ClientHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && clientId) {
            const fetchHistory = async () => {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('client_history')
                    .select('*')
                    .eq('client_id', clientId)
                    .ilike('action', 'WhatsApp%')
                    .order('timestamp', { ascending: false });

                if (data) setHistory(data);
                setIsLoading(false);
            };
            fetchHistory();
        }
    }, [isOpen, clientId]);

    if (!isOpen) return null;

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#09090b] border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock className="text-gold-500" size={20} /> Histórico de Atendimento
                        </h2>
                        <p className="text-zinc-500 text-sm mt-1">{clientName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-zinc-950/20">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                            <p className="text-zinc-500 text-sm">Carregando histórico...</p>
                        </div>
                    ) : history.length > 0 ? (
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-zinc-800">
                            {history.map((entry, idx) => (
                                <div key={entry.id} className="relative flex items-start gap-6 group">
                                    {/* Icon Circle */}
                                    <div className={`mt-1 z-10 w-10 h-10 rounded-full border-4 border-[#09090b] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${entry.action.includes('Assumido')
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-emerald-500 text-white'
                                        }`}>
                                        {entry.action.includes('Assumido') ? <Clock size={16} /> : <CheckCircle2 size={16} />}
                                    </div>

                                    {/* Content Card */}
                                    <div className="flex-1 bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${entry.action.includes('Assumido')
                                                    ? 'bg-blue-500/10 text-blue-400'
                                                    : 'bg-emerald-500/10 text-emerald-400'
                                                }`}>
                                                {entry.action.replace('WhatsApp: ', '')}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 font-mono">
                                                {formatDate(entry.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-zinc-300 text-sm leading-relaxed mb-3">
                                            {entry.details}
                                        </p>
                                        <div className="flex items-center gap-2 text-zinc-500 border-t border-zinc-800/50 pt-2">
                                            <User size={12} />
                                            <span className="text-[10px] font-medium">{entry.user_name}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                                <MessageCircle size={32} className="text-zinc-700" />
                            </div>
                            <h3 className="text-white font-bold mb-1">Sem registros de WhatsApp</h3>
                            <p className="text-zinc-500 text-xs max-w-[200px]">
                                Este cliente ainda não possui históricos de atendimento via WhatsApp.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceHistoryModal;
