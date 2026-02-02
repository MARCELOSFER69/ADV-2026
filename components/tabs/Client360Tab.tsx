import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
// import { useAllCases } from '../../hooks/useCases'; // REMOVED
import { Client, Case } from '../../types';
import ProcessTimeline from '../ProcessTimeline';
import { Briefcase, DollarSign, CheckCircle2, AlertTriangle, ChevronRight, LayoutDashboard, Send, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Client360TabProps {
    client: Client;
    onSelectCase?: (caseItem: Case) => void;
    cases?: Case[]; // Added prop
}

const Client360Tab: React.FC<Client360TabProps> = ({ client, onSelectCase, cases = [] }) => {
    const { getUnifiedClientHistory, showToast } = useApp();
    // REMOVED: const { data: cases = [] } = useAllCases();
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- DEFENSIVE PROGRAMMING ---
    // If cases are passed, they are typically already filtered for this client,
    // but we can double check or rely on the prop.
    // If the prop `cases` comes from `ClientDetailsModal`, it is `clientCases` (already filtered).
    const clientCases = cases.length > 0 ? cases : (client.cases || []);

    // KPIs específicos do cliente
    const stats = {
        totalCases: clientCases.length,
        activeCases: clientCases.filter(c => c.status !== 'Arquivado' && !c.status.includes('Concluído')).length,
        potentialFees: clientCases.reduce((acc, c) => acc + (c.valor_causa ? c.valor_causa * 0.3 : 0), 0),
        pendingDocs: client.pendencias?.length || 0
    };

    useEffect(() => {
        const loadUnifiedHistory = async () => {
            setIsLoading(true);
            try {
                const data = await getUnifiedClientHistory(client.id);
                // Mapear campos da RPC para o formato esperado pelo ProcessTimeline
                const mappedHistory = data.map((item: any) => ({
                    id: item.id,
                    action: item.action,
                    old_value: item.old_value,
                    new_value: item.new_value,
                    details: item.details || `Atualização no processo ${item.case_title}`,
                    timestamp: item.created_at,
                    is_bot_update: item.is_bot_update,
                    whatsapp_status: item.whatsapp_status
                }));
                setHistory(mappedHistory);
            } catch (err) {
                console.error('Erro ao carregar visão 360:', err);
                showToast('error', 'Erro ao carregar linha do tempo.');
            } finally {
                setIsLoading(false);
            }
        };
        loadUnifiedHistory();
    }, [client.id, getUnifiedClientHistory]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card
                    title="Processos"
                    value={stats.totalCases}
                    subtitle={`${stats.activeCases} ativos`}
                    icon={Briefcase}
                    color="text-blue-400"
                />
                <Card
                    title="Honorários Est."
                    value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.potentialFees)}
                    subtitle="Estimativa 30%"
                    icon={DollarSign}
                    color="text-emerald-400"
                />
                <Card
                    title="Pendências"
                    value={stats.pendingDocs}
                    subtitle={stats.pendingDocs > 0 ? "Requer atenção" : "Tudo em dia"}
                    icon={stats.pendingDocs > 0 ? AlertTriangle : CheckCircle2}
                    color={stats.pendingDocs > 0 ? "text-red-400" : "text-emerald-500"}
                />
                <Card
                    title="Notificações"
                    value={history.filter(h => h.whatsapp_status === 'enviado').length}
                    subtitle="WhatsApp Enviados"
                    icon={Send}
                    color="text-emerald-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Case List & Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2 font-serif">
                            <LayoutDashboard size={16} className="text-gold-500" />
                            Carteira do Cliente
                        </h4>
                        <div className="space-y-3">
                            {clientCases.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => onSelectCase?.(c)}
                                    className="p-4 bg-white/5 border border-white/5 rounded-xl hover:border-gold-500/30 cursor-pointer group transition-all"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h5 className="font-bold text-white group-hover:text-gold-500 transition-colors truncate max-w-[150px]">
                                            {c.titulo}
                                        </h5>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 uppercase font-black">
                                            {c.tipo}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 font-mono mb-2">
                                        {c.numero_processo || 'Processo não protocolado'}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.status.includes('Concedido') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-400'
                                            }`}>
                                            {c.status}
                                        </span>
                                        <ChevronRight size={14} className="text-zinc-600 group-hover:text-white" />
                                    </div>
                                </div>
                            ))}
                            {clientCases.length === 0 && (
                                <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-zinc-500">
                                    Nenhum processo vinculado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Unified Timeline */}
                <div className="lg:col-span-2">
                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2 font-serif">
                        <Clock size={16} className="text-gold-500" />
                        Timeline 360 do Cliente
                    </h4>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
                        </div>
                    ) : (
                        <div className="bg-black/20 border border-white/5 rounded-2xl p-6 overflow-y-auto max-h-[600px] custom-scrollbar">
                            <ProcessTimeline history={history} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Card = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <div className="bg-[#18181b] border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform ${color}`}>
            <Icon size={40} />
        </div>
        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">
            {title}
        </span>
        <div className={`text-xl font-black ${color} tracking-tight`}>
            {value}
        </div>
        <span className="text-[10px] text-zinc-600 font-medium">
            {subtitle}
        </span>
    </div>
);

export default Client360Tab;
