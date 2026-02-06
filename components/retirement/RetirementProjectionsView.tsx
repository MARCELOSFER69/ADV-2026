import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { ProjectFilters, Branch, RetirementCandidate, Client } from '../../types';
import { Search, Clock, X, AlertCircle } from 'lucide-react';
import { useRetirementProjections } from '../../hooks/useRetirementProjections';
import { RetirementCard, DetailedCalculation } from './RetirementCard';
import { RetirementCandidateModal } from './RetirementCandidateModal';
import { RetirementCalculationDetails } from './RetirementCalculationDetails';

interface RetirementProjectionsViewProps {
    filters: ProjectFilters;
    layoutMode: 'kanban' | 'list';
}

export const RetirementProjectionsView: React.FC<RetirementProjectionsViewProps> = ({ filters, layoutMode }) => {
    const { setClientToView, setCurrentView, updateClient } = useApp();

    const { candidates } = useRetirementProjections(filters);

    const [selectedCandidate, setSelectedCandidate] = useState<RetirementCandidate | null>(null);
    const [calculationDetail, setCalculationDetail] = useState<{ client: Client, calc: DetailedCalculation } | null>(null);
    const [activeHoverId, setActiveHoverId] = useState<string | null>(null);

    const periodOptions = [
        { label: '1 mês', value: 1 }, { label: '2 meses', value: 2 }, { label: '3 meses', value: 3 },
        { label: '4 meses', value: 4 }, { label: '6 meses', value: 6 }, { label: '8 meses', value: 8 },
        { label: '10 meses', value: 10 }, { label: '1 ano', value: 12 }, { label: '2 anos', value: 24 },
        { label: '3 anos', value: 36 }, { label: '5 anos', value: 60 }, { label: '10 anos', value: 120 },
    ];

    const handleViewFullProfile = (clientId: string, tab?: string) => {
        setClientToView(clientId, tab as any);
        setCurrentView('clients');
    };

    const handleWhatsAppClick = (phone: string | undefined) => {
        if (!phone) return;
        const cleanNumber = phone.replace(/\D/g, '');
        const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
        window.open(`https://wa.me/${fullNumber}`, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Removed internal filter bar - now in CaseFilters */}

            {/* RESULTS CONTENT */}
            {layoutMode === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {candidates.length > 0 ? candidates.map((candidate) => (
                        <RetirementCard
                            key={candidate.client.id}
                            candidate={candidate}
                            onClick={() => setSelectedCandidate(candidate)}
                            onUpdateClient={updateClient}
                            onOpenCnisDetails={(client, calc) => setCalculationDetail({ client, calc })}
                            onAddCnis={(client) => handleViewFullProfile(client.id, 'cnis')}
                            globalTrigger={0}
                            activeHoverId={activeHoverId}
                            setActiveHoverId={setActiveHoverId}
                        />
                    )) : (
                        <div className="col-span-full py-16 text-center text-zinc-500 bg-[#0f1014]/50 border border-dashed border-zinc-800 rounded-xl">
                            <p>Nenhum cliente próximo da aposentadoria encontrado.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-[#0f1014]/40 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                <th className="px-4 py-3">Cliente</th>
                                <th className="px-4 py-3">Idade</th>
                                <th className="px-4 py-3">Modalidade</th>
                                <th className="px-4 py-3">Tempo Restante</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {candidates.length > 0 ? candidates.map((candidate) => {
                                const mode = (candidate.client.aposentadoria_modalidade || candidate.bestChance) as 'Rural' | 'Urbana';
                                const targetAge = mode === 'Rural'
                                    ? (candidate.client.sexo === 'Masculino' ? 60 : 55)
                                    : (candidate.client.sexo === 'Masculino' ? 65 : 62);
                                const currentAge = candidate.age.years + (candidate.age.months / 12);
                                const isAgeEligible = currentAge >= targetAge;
                                const totalMonths = candidate.client.cnis_data?.totalTime ? (candidate.client.cnis_data.totalTime.years * 12) + candidate.client.cnis_data.totalTime.months : 0;
                                const isContributionEligible = mode === 'Rural' || totalMonths >= 180;
                                const isEligible = isAgeEligible && isContributionEligible;
                                const displayRemaining = mode === 'Rural' ? candidate.ruralRemaining : candidate.urbanRemaining;

                                const formatVal = (val: number) => {
                                    if (val <= 0) return "Elegível";
                                    const y = Math.floor(val);
                                    const m = Math.floor((val - y) * 12);
                                    return y > 0 ? `${y}a ${m}m` : `${m}m`;
                                };

                                return (
                                    <tr
                                        key={candidate.client.id}
                                        onClick={() => setSelectedCandidate(candidate)}
                                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${isEligible ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                                    {candidate.client.nome_completo.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-sm text-zinc-200 font-medium group-hover:text-white">{candidate.client.nome_completo}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-400">{candidate.age.years} anos</td>
                                        <td className="px-4 py-3">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">{mode}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-sm font-bold ${isEligible ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                                {formatVal(displayRemaining)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {isEligible ? (
                                                <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ELEGÍVEL</span>
                                            ) : (
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase">Em progresso</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); }}
                                            >
                                                <Search size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-zinc-500">
                                        Nenhum cliente próximo da aposentadoria encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODALS */}
            {selectedCandidate && createPortal(
                <RetirementCandidateModal
                    selectedCandidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                    onWhatsAppClick={handleWhatsAppClick}
                    onViewFullProfile={(clientId, tab) => handleViewFullProfile(clientId, tab)}
                />,
                document.body
            )}

            {calculationDetail && createPortal(
                <RetirementCalculationDetails
                    client={calculationDetail.client}
                    calc={calculationDetail.calc}
                    onClose={() => setCalculationDetail(null)}
                    onViewFullProfile={(clientId, tab) => handleViewFullProfile(clientId, tab as any)}
                />,
                document.body
            )}
        </div>
    );
};
