import React from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Client } from '../../types';

interface PendenciasOverviewWidgetProps {
    clients: Client[];
    penWidgetFilial: string;
    setPenWidgetFilial: (branch: string) => void;
    selectedPendenciaType: string | null;
    setSelectedPendenciaType: (type: string | null) => void;
    pendingOptionsList: string[];
    setClientToView: (clientId: string) => void;
    setCurrentView: (view: string) => void;
    customTitle?: string;
}

const PendenciasOverviewWidget: React.FC<PendenciasOverviewWidgetProps> = ({
    clients,
    penWidgetFilial,
    setPenWidgetFilial,
    selectedPendenciaType,
    setSelectedPendenciaType,
    pendingOptionsList,
    setClientToView,
    setCurrentView,
    customTitle
}) => {
    const clientsForPendency = clients.filter(c => penWidgetFilial === 'Todos' || c.filial === penWidgetFilial);

    // Detalhe da Pendência (Lista de Clientes)
    if (selectedPendenciaType) {
        const affectedClients = clientsForPendency.filter(c =>
            selectedPendenciaType === 'Outros'
                ? (c.pendencias && c.pendencias.some(p => !pendingOptionsList.slice(0, 5).includes(p)))
                : c.pendencias?.includes(selectedPendenciaType)
        );

        return (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-700 pb-2">
                    <button onClick={() => setSelectedPendenciaType(null)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronLeft size={18} /></button>
                    <h3 className="text-sm font-bold text-white truncate flex-1">{selectedPendenciaType}</h3>
                    <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">{affectedClients.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {affectedClients.map(client => (
                        <div
                            key={client.id}
                            onClick={() => {
                                setClientToView(client.id);
                                setCurrentView('clients');
                            }}
                            className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-500/30 hover:bg-zinc-800 cursor-pointer group transition-all"
                        >
                            <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white mb-1">{client.nome_completo}</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-zinc-500">{client.filial || 'Matriz'}</span>
                                <ChevronRight size={14} className="text-zinc-600 group-hover:text-red-400" />
                            </div>
                        </div>
                    ))}
                    {affectedClients.length === 0 && <p className="text-xs text-zinc-500 text-center py-4">Nenhum cliente com esta pendência.</p>}
                </div>
            </div>
        );
    }

    // Visão Geral das Pendências
    const pendencyCounts = pendingOptionsList.map(opt => {
        const count = clientsForPendency.filter(c => {
            if (opt === 'Outros') return c.pendencias && c.pendencias.some(p => !pendingOptionsList.slice(0, 5).includes(p));
            return c.pendencias?.includes(opt);
        }).length;
        return { label: opt, count };
    }).sort((a, b) => b.count - a.count);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> {customTitle || 'Painel de Pendências'}</h3>
            </div>

            {/* Filtro de Filiais */}
            <div className="flex gap-1 bg-black/40 p-1 rounded-lg mb-3 overflow-x-auto custom-scrollbar">
                {['Todos', 'Santa Inês', 'Aspema', 'Alto Alegre', 'São João do Carú'].map(branch => (
                    <button
                        key={branch}
                        onClick={() => setPenWidgetFilial(branch)}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold whitespace-nowrap transition-colors ${penWidgetFilial === branch ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    >
                        {branch}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {pendencyCounts.map((item) => (
                    <div
                        key={item.label}
                        onClick={() => setSelectedPendenciaType(item.label)}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-500/30 hover:bg-zinc-800 cursor-pointer group transition-all"
                    >
                        <span className="text-xs font-medium text-zinc-300 group-hover:text-white">{item.label}</span>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.count > 0 ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-600'}`}>{item.count}</span>
                            <ChevronRight size={14} className="text-zinc-600 group-hover:text-red-500" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PendenciasOverviewWidget;
