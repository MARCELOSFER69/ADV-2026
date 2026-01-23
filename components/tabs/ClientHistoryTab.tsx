import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Client, ClientHistory } from '../../types';
import { Clock, User, Calendar, Info } from 'lucide-react';
import { formatDateDisplay } from '../../utils/dateUtils';

interface ClientHistoryTabProps {
    client: Client;
}

const ClientHistoryTab: React.FC<ClientHistoryTabProps> = ({ client }) => {
    const { getClientHistory, isLoading } = useApp();
    const [history, setHistory] = useState<ClientHistory[]>([]);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        const loadHistory = async () => {
            setFetching(true);
            try {
                const data = await getClientHistory(client.id);
                setHistory(data);
            } catch (err) {
                console.error('Erro ao carregar histórico:', err);
            } finally {
                setFetching(false);
            }
        };
        loadHistory();
    }, [client.id, getClientHistory]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-navy-900/50 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 text-slate-400 mb-2 text-xs uppercase tracking-wider font-semibold">
                        <User size={14} className="text-gold-500" />
                        Registrado Por
                    </div>
                    <div className="text-white font-medium">
                        {client.registered_by || 'Sistema'}
                    </div>
                </div>

                <div className="bg-navy-900/50 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 text-slate-400 mb-2 text-xs uppercase tracking-wider font-semibold">
                        <Clock size={14} className="text-gold-500" />
                        Última Atualização Por
                    </div>
                    <div className="text-white font-medium">
                        {client.updated_by || 'N/A'}
                    </div>
                </div>
            </div>

            <div className="relative">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-gold-500" />
                    Log de Atividades
                </h3>

                {fetching ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="bg-navy-900/30 border border-white/5 rounded-xl p-8 text-center">
                        <Info size={32} className="mx-auto text-slate-600 mb-2" />
                        <p className="text-slate-500 text-sm">Nenhum histórico encontrado para este cliente.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((item, index) => (
                            <div key={item.id} className="relative pl-8 pb-4 last:pb-0">
                                {/* Linha do Timeline */}
                                {index !== history.length - 1 && (
                                    <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-slate-800"></div>
                                )}
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-navy-900 border border-gold-500/50 flex items-center justify-center z-10 shadow-lg">
                                    <div className="w-2 h-2 rounded-full bg-gold-500"></div>
                                </div>

                                <div className="bg-navy-900/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-gold-500 font-bold text-sm">{item.action}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">{formatDateDisplay(item.timestamp)}</span>
                                    </div>
                                    <div className="text-slate-300 text-sm mb-2">
                                        {item.details.includes(' | ') ? (
                                            <ul className="list-disc list-inside space-y-1">
                                                {item.details.split(' | ').map((change, i) => (
                                                    <li key={i}>{change}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p>{item.details}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-tighter">
                                        <User size={10} />
                                        <span>{item.user_name}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientHistoryTab;
