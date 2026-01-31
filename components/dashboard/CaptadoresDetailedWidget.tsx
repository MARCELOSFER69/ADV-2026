import React from 'react';
import { Users, ChevronLeft, Shield, Briefcase, Building2, ChevronRight } from 'lucide-react';
import { Client, Case, CaseStatus, CaseType } from '../../types';

interface CaptadoresDetailedWidgetProps {
    clients: Client[];
    cases: Case[];
    capWidgetFilial: string;
    setCapWidgetFilial: (branch: string) => void;
    selectedCaptadorForDetail: string | null;
    setSelectedCaptadorForDetail: (captador: string | null) => void;
    customTitle?: string;
}

const CaptadoresDetailedWidget: React.FC<CaptadoresDetailedWidgetProps> = ({
    clients,
    cases,
    capWidgetFilial,
    setCapWidgetFilial,
    selectedCaptadorForDetail,
    setSelectedCaptadorForDetail,
    customTitle
}) => {
    const filteredClientsByFilial = clients.filter(c => capWidgetFilial === 'Todas' || c.filial === capWidgetFilial);

    // Agrupamento
    const captadorGroups: Record<string, { count: number, id: string }> = {};
    filteredClientsByFilial.forEach(c => {
        if (c.captador) {
            if (!captadorGroups[c.captador]) captadorGroups[c.captador] = { count: 0, id: c.captador };
            captadorGroups[c.captador].count++;
        }
    });
    const captadoresList = Object.values(captadorGroups).sort((a, b) => b.count - a.count);

    // Detalhes do Captador Selecionado
    if (selectedCaptadorForDetail) {
        const clientsOfCaptador = filteredClientsByFilial.filter(c => c.captador === selectedCaptadorForDetail);
        const totalClients = clientsOfCaptador.length;
        const withPending = clientsOfCaptador.filter(c => c.pendencias && c.pendencias.length > 0).length;
        const regular = totalClients - withPending;

        // Contagem de Processos por Tipo
        let judicialCount = 0;
        let adminCount = 0;
        let insuranceCount = 0;

        clientsOfCaptador.forEach(client => {
            const clientCases = cases.filter(c => c.client_id === client.id && c.status !== CaseStatus.ARQUIVADO);
            clientCases.forEach(c => {
                if (c.tipo === CaseType.SEGURO_DEFESO) insuranceCount++;
                else if ([CaseType.TRABALHISTA, CaseType.CIVIL].includes(c.tipo as any)) judicialCount++;
                else adminCount++;
            });
        });

        return (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-700 pb-2">
                    <button onClick={() => setSelectedCaptadorForDetail(null)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><ChevronLeft size={18} /></button>
                    <h3 className="text-sm font-bold text-white truncate flex-1">{selectedCaptadorForDetail}</h3>
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{capWidgetFilial}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                        <p className="text-[10px] text-emerald-400 uppercase font-bold">Regular</p>
                        <p className="text-xl font-bold text-white">{regular}</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                        <p className="text-[10px] text-red-400 uppercase font-bold">Pendentes</p>
                        <p className="text-xl font-bold text-white">{withPending}</p>
                    </div>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Processos Ativos</h4>
                    <div className="flex justify-between items-center p-2 bg-zinc-800/50 rounded-lg">
                        <span className="text-xs text-zinc-300 flex items-center gap-2"><Shield size={14} className="text-cyan-400" /> Seguro Defeso</span>
                        <span className="font-bold text-white text-sm">{insuranceCount}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-zinc-800/50 rounded-lg">
                        <span className="text-xs text-zinc-300 flex items-center gap-2"><Briefcase size={14} className="text-purple-400" /> Administrativo</span>
                        <span className="font-bold text-white text-sm">{adminCount}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-zinc-800/50 rounded-lg">
                        <span className="text-xs text-zinc-300 flex items-center gap-2"><Building2 size={14} className="text-orange-400" /> Judicial</span>
                        <span className="font-bold text-white text-sm">{judicialCount}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2"><Users size={16} className="text-gold-500" /> {customTitle || 'Gestão de Captadores'}</h3>
            </div>

            {/* Filtro de Filiais (Tabs) */}
            <div className="flex gap-1 bg-black/40 p-1 rounded-lg mb-3 overflow-x-auto custom-scrollbar">
                {['Santa Inês', 'Aspema', 'Alto Alegre', 'São João do Carú', 'Todas'].map(branch => (
                    <button
                        key={branch}
                        onClick={() => setCapWidgetFilial(branch)}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold whitespace-nowrap transition-colors ${capWidgetFilial === branch ? 'bg-gold-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    >
                        {branch}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {captadoresList.length > 0 ? captadoresList.map((item, idx) => (
                    <div
                        key={item.id}
                        onClick={() => setSelectedCaptadorForDetail(item.id)}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-gold-500/30 hover:bg-zinc-800 cursor-pointer group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx < 3 ? 'bg-gold-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>{idx + 1}</span>
                            <span className="text-xs font-bold text-zinc-200 group-hover:text-white">{item.id}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{item.count}</span>
                            <ChevronRight size={14} className="text-zinc-600 group-hover:text-gold-500" />
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-8 text-zinc-500 text-xs">Nenhum captador nesta filial.</div>
                )}
            </div>
        </div>
    );
};

export default CaptadoresDetailedWidget;
