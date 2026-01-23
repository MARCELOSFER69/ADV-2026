
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CaseType, CaseStatus, Client, Case } from '../types';
import { Hourglass, ChevronRight, User, Eye, Briefcase, Phone, MessageCircle, AlertCircle, X, MapPin, Calculator, Check, Clock, AlertTriangle, FileText } from 'lucide-react';
import CaseDetailsModal from '../components/modals/CaseDetailsModal';

interface RetirementCandidate {
    client: Client;
    age: { years: number; months: number };
    ruralRemaining: number;
    urbanRemaining: number;
    bestChance: 'Rural' | 'Urbana';
    yearsRemaining: number;
}


interface DetailedCalculation {
    type: 'Urbana' | 'Rural' | 'Híbrida';
    ageTarget: number;
    contributionTargetMonths: number;
    currentAge: number;
    currentContributionMonths: number;
    isAgeOk: boolean;
    isContributionOk: boolean;
}

const RetirementCard: React.FC<{
    candidate: RetirementCandidate;
    onClick: () => void;
    onUpdateClient: (client: Client) => void;
    onOpenCnisDetails: (client: Client, calculation: DetailedCalculation) => void;
    onAddCnis: (client: Client) => void;
}> = ({ candidate, onClick, onUpdateClient, onOpenCnisDetails, onAddCnis }) => {
    // Inicializa com o valor do banco SE existir, senão usa o bestChance
    const initialMode = candidate.client.aposentadoria_modalidade || candidate.bestChance;
    const [mode, setMode] = useState<'Rural' | 'Urbana'>(initialMode);

    const handleModeChange = (newMode: 'Rural' | 'Urbana') => {
        setMode(newMode);
        // Persistir no banco de dados "para todos"
        onUpdateClient({
            ...candidate.client,
            aposentadoria_modalidade: newMode
        });
    };

    const cnisData = candidate.client.cnis_data;
    const totalMonths = useMemo(() => {
        if (!cnisData?.totalTime) return 0;
        return (cnisData.totalTime.years * 12) + cnisData.totalTime.months + (cnisData.totalTime.days >= 15 ? 1 : 0);
    }, [cnisData]);

    const targetAge = mode === 'Rural'
        ? (candidate.client.sexo === 'Masculino' ? 60 : 55)
        : (candidate.client.sexo === 'Masculino' ? 65 : 62);

    const contributionTarget = mode === 'Urbana' ? 180 : 0; // 15 anos em meses

    const isAgeEligible = (candidate.age.years + candidate.age.months / 12) >= targetAge;
    const isContributionEligible = mode === 'Rural' || totalMonths >= contributionTarget;

    // Se for Urbana e não tiver tempo suficiente, verificar se seria elegível hibrido (mesma idade mas tempo >= 180)
    const isHybridCandidate = mode === 'Urbana' && !isContributionEligible && totalMonths > 0;

    // Recalcular baseados no modo selecionado
    const displayRemaining = mode === 'Rural' ? candidate.ruralRemaining : candidate.urbanRemaining;
    const isEligible = isAgeEligible && isContributionEligible;

    const hasPendencias = candidate.client.pendencias && candidate.client.pendencias.length > 0;

    const avatarClass = isEligible
        ? 'bg-emerald-500 text-black font-bold'
        : (hasPendencias ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-700 text-zinc-300');

    const formatTimeRemaining = (val: number) => {
        if (val <= 0) return "Já atingiu idade";
        const years = Math.floor(val);
        const months = Math.floor((val - years) * 12);
        if (years === 0) return `${months} meses`;
        return `${years} anos e ${months} meses`;
    };

    const getProgressBarColor = (years: number) => {
        if (isEligible) return 'bg-emerald-500 shadow-[0_0_10px_#10b981]';
        if (years <= 1) return 'bg-gold-500';
        if (years <= 3) return 'bg-orange-500';
        return 'bg-blue-500';
    };

    const calculation: DetailedCalculation = {
        type: mode,
        ageTarget: targetAge,
        contributionTargetMonths: contributionTarget,
        currentAge: candidate.age.years + (candidate.age.months / 12),
        currentContributionMonths: totalMonths,
        isAgeOk: isAgeEligible,
        isContributionOk: isContributionEligible
    };

    return (
        <div
            onClick={(e) => {
                // Evita abrir o modal se clicar nos botões de toggle ou link de cnis
                if ((e.target as HTMLElement).closest('.mode-toggle') || (e.target as HTMLElement).closest('.cnis-link')) return;
                onClick();
            }}
            className={`
            relative rounded-xl p-5 cursor-pointer transition-all group overflow-hidden bg-[#0f1014]
            ${isEligible
                    ? 'border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'border border-zinc-800 hover:border-zinc-700 hover:shadow-lg'
                }
        `}
        >
            {/* Progress Bar Background */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-zinc-800">
                <div
                    className={`h-full transition-all duration-1000 ${getProgressBarColor(displayRemaining)}`}
                    style={{ width: `${Math.max(5, isEligible ? 100 : (100 - (displayRemaining * 20)))}%` }}
                ></div>
            </div>

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 border-transparent shadow-sm ${avatarClass}`}>
                        {candidate.client.nome_completo.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="font-bold text-zinc-100 text-base group-hover:text-white transition-colors line-clamp-1">
                            {candidate.client.nome_completo}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">{candidate.age.years} anos • {candidate.client.sexo}</p>
                    </div>
                </div>
                {isEligible && (
                    <span className="text-[10px] font-bold bg-emerald-500 text-black px-2 py-1 rounded shadow-[0_0_10px_rgba(16,185,129,0.6)]">
                        ELEGÍVEL
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 mb-3 mode-toggle bg-black/40 p-1 rounded-lg border border-white/5 w-fit">
                <button
                    onClick={(e) => { e.stopPropagation(); handleModeChange('Rural'); }}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${mode === 'Rural' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    RURAL
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleModeChange('Urbana'); }}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${mode === 'Urbana' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    URBANA
                </button>
            </div>

            <div className="bg-[#09090b] rounded-lg p-3 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Modalidade {mode}</span>
                    <span className={`text-sm font-bold ${isEligible ? 'text-emerald-400' : 'text-zinc-200'}`}>
                        {formatTimeRemaining(displayRemaining)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-[10px] text-zinc-600">
                        Meta: {targetAge} anos {mode === 'Urbana' ? '+ 180 contrib.' : ''}
                    </p>
                    {mode === 'Urbana' && (
                        <div className="text-[10px] font-mono cnis-link">
                            {cnisData ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onOpenCnisDetails(candidate.client, calculation); }}
                                    className={`flex items-center gap-1 hover:underline ${isContributionEligible ? 'text-emerald-500' : 'text-yellow-500'}`}
                                >
                                    <Calculator size={10} /> {totalMonths} meses
                                </button>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAddCnis(candidate.client); }}
                                    className="text-red-500 hover:underline flex items-center gap-1"
                                >
                                    <AlertCircle size={10} /> S/ CNIS
                                </button>
                            )}
                        </div>
                    )}
                </div>
                {isHybridCandidate && (
                    <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-1 animate-pulse">
                        <span className="text-[9px] font-bold text-yellow-500 uppercase">Sugestão: Híbrida?</span>
                        <Briefcase size={8} className="text-yellow-500" />
                    </div>
                )}
            </div>
        </div>
    );
};

const Retirements: React.FC = () => {
    const { clients, cases, showToast, setCurrentView, setClientToView, updateClient } = useApp();
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<RetirementCandidate | null>(null);
    const [calculationDetail, setCalculationDetail] = useState<{ client: Client, calc: DetailedCalculation } | null>(null);

    // 1. Filtrar Processos de Aposentadoria em Andamento
    const activeRetirements = cases.filter(c =>
        c.tipo === CaseType.APOSENTADORIA &&
        c.status !== CaseStatus.ARQUIVADO
    );

    // 2. Calcular Candidatos (Futuras Aposentadorias)
    const candidates: RetirementCandidate[] = useMemo(() => {
        const clientsWithActiveRetirements = new Set(
            cases
                .filter(c => c.tipo === CaseType.APOSENTADORIA && c.status !== CaseStatus.ARQUIVADO)
                .map(c => c.client_id)
        );

        return clients
            .filter(client => !clientsWithActiveRetirements.has(client.id))
            .map(client => {
                if (!client.data_nascimento || !client.sexo) return null;

                const birth = new Date(client.data_nascimento);
                const today = new Date();
                let years = today.getFullYear() - birth.getFullYear();
                let months = today.getMonth() - birth.getMonth();
                if (months < 0) {
                    years--;
                    months += 12;
                }

                const isMale = client.sexo === 'Masculino';
                const ruralTarget = isMale ? 60 : 55;
                const urbanTarget = isMale ? 65 : 62;

                const ruralRemaining = Math.max(0, ruralTarget - years - (months / 12));
                const urbanRemaining = Math.max(0, urbanTarget - years - (months / 12));

                const bestChance = ruralRemaining <= urbanRemaining ? 'Rural' : 'Urbana';
                const yearsRemaining = bestChance === 'Rural' ? ruralRemaining : urbanRemaining;

                return {
                    client,
                    age: { years, months },
                    ruralRemaining,
                    urbanRemaining,
                    bestChance,
                    yearsRemaining
                };
            })
            .filter((c): c is RetirementCandidate => c !== null)
            .filter(c => c.yearsRemaining <= 5)
            .sort((a, b) => a.yearsRemaining - b.yearsRemaining);
    }, [clients, cases]);

    const handleWhatsAppClick = (phone: string | undefined) => {
        if (!phone) return;
        const cleanNumber = phone.replace(/\D/g, '');
        const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
        window.open(`https://wa.me/${fullNumber}`, '_blank');
    };

    const handleViewFullProfile = (clientId: string, tab?: 'info' | 'docs' | 'credentials' | 'history' | 'cnis') => {
        setClientToView(clientId, tab);
        setCurrentView('clients');
    };

    const formatTimeRemaining = (val: number) => {
        if (val <= 0) return "Já atingiu idade";
        const years = Math.floor(val);
        const months = Math.floor((val - years) * 12);
        if (years === 0) return `${months} meses`;
        return `${years} anos e ${months} meses`;
    };

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
                    <Hourglass className="text-gold-500" /> Gestão de Aposentadorias
                </h2>
                <p className="text-zinc-400">Acompanhamento de processos e prospecção de futuros aposentados.</p>
            </div>

            {/* SEÇÃO 1: FUTURAS APOSENTADORIAS (FUNIL) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertCircle size={20} className="text-blue-400" />
                        Próximas Aposentadorias (Projeção)
                    </h3>
                    <span className="text-xs bg-zinc-900 text-zinc-400 px-3 py-1 rounded-full border border-zinc-800">
                        Faltando até 5 anos
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {candidates.length > 0 ? candidates.map((candidate) => (
                        <RetirementCard
                            key={candidate.client.id}
                            candidate={candidate}
                            onClick={() => setSelectedCandidate(candidate)}
                            onUpdateClient={updateClient}
                            onOpenCnisDetails={(client, calc) => setCalculationDetail({ client, calc })}
                            onAddCnis={(client) => handleViewFullProfile(client.id, 'cnis')}
                        />
                    )) : (
                        <div className="col-span-full py-16 text-center text-zinc-500 bg-[#0f1014] border border-dashed border-zinc-800 rounded-xl">
                            <p>Nenhum cliente próximo da aposentadoria (5 anos) sem processo ativo encontrado.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full h-px bg-zinc-800 my-8"></div>


            {/* SEÇÃO 2: PROCESSOS EM ANDAMENTO */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Briefcase size={20} className="text-gold-500" />
                    Processos em Andamento
                </h3>

                <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                    {activeRetirements.length > 0 ? (
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Título / Número</th>
                                    <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activeRetirements.map(caseItem => {
                                    const client = clients.find(c => c.id === caseItem.client_id);
                                    const hasPendencias = client?.pendencias && client.pendencias.length > 0;
                                    const avatarClass = hasPendencias ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-700 text-zinc-300';

                                    return (
                                        <tr key={caseItem.id} className="hover:bg-zinc-800/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-transparent shadow-sm ${avatarClass}`}>
                                                        {client?.nome_completo.substring(0, 1)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{client?.nome_completo}</p>
                                                        <p className="text-xs text-zinc-500">{client?.cpf_cnpj}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-zinc-300">{caseItem.titulo}</p>
                                                <p className="text-xs text-zinc-500 font-mono">{caseItem.numero_processo}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase border ${caseItem.status === CaseStatus.ANALISE ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    caseItem.status === CaseStatus.CONCLUIDO_CONCEDIDO ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        caseItem.status === CaseStatus.CONCLUIDO_INDEFERIDO ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                            'bg-gold-500/10 text-gold-500 border-gold-500/20'
                                                    }`}>
                                                    {caseItem.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setSelectedCase(caseItem)}
                                                    className="text-yellow-500 hover:text-white p-2 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                                    title="Ver Detalhes"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-12 text-center text-zinc-500">
                            Nenhum processo de aposentadoria em andamento no momento.
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DETALHES CANDIDATO */}
            {selectedCandidate && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl font-bold shadow-inner ${selectedCandidate.yearsRemaining <= 0
                                    ? 'bg-emerald-500 text-black border-emerald-400'
                                    : (selectedCandidate.client.pendencias && selectedCandidate.client.pendencias.length > 0 ? 'bg-red-600 text-white animate-pulse border-transparent' : 'bg-zinc-700 text-zinc-300 border-zinc-600')
                                    }`}>
                                    {selectedCandidate.client.nome_completo.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{selectedCandidate.client.nome_completo}</h3>
                                    <p className="text-sm text-zinc-400">{selectedCandidate.client.cpf_cnpj}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCandidate(null)} className="text-zinc-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="p-4 bg-[#09090b] rounded-lg border border-zinc-800">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-zinc-400">Idade Atual</span>
                                    <span className="text-sm font-bold text-white">{selectedCandidate.age.years} anos</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-zinc-400">Modalidade</span>
                                    <span className="text-sm font-bold text-gold-500">{selectedCandidate.bestChance}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-zinc-400">Falta</span>
                                    <span className="text-sm font-bold text-emerald-400">{formatTimeRemaining(selectedCandidate.yearsRemaining)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-zinc-300 text-sm pl-2">
                                <MapPin size={16} className="text-zinc-500" />
                                {selectedCandidate.client.endereco || 'Endereço não informado'}
                            </div>
                            <div className="flex items-center gap-3 text-zinc-300 text-sm pl-2">
                                <Phone size={16} className="text-zinc-500" />
                                {selectedCandidate.client.telefone || 'Sem telefone'}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {selectedCandidate.client.telefone && (
                                <button
                                    onClick={() => handleWhatsAppClick(selectedCandidate.client.telefone)}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                                >
                                    <MessageCircle size={18} /> Contatar
                                </button>
                            )}
                            <button
                                onClick={() => handleViewFullProfile(selectedCandidate.client.id, 'cnis')}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg font-medium border border-zinc-700 transition-colors"
                            >
                                Ver Cadastro
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALHES DE CÁLCULO / CNIS */}
            {calculationDetail && (
                <div
                    onClick={() => setCalculationDetail(null)}
                    className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#09090b] border border-zinc-800 rounded-2xl max-w-lg w-full my-auto shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]"
                    >
                        <div className="p-4 sm:p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 flex-shrink-0">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Calculator className="text-orange-500" /> Detalhamento do Cálculo
                            </h3>
                            <button onClick={() => setCalculationDetail(null)} className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"><X size={20} /></button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-300 flex-shrink-0">
                                    {(calculationDetail.client.nome_completo || '??').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-white line-clamp-1">{calculationDetail.client.nome_completo}</p>
                                    <p className="text-xs text-zinc-500">Aposentadoria {calculationDetail.calc.type}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={`p-4 rounded-xl border ${calculationDetail.calc.isAgeOk ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Critério: Idade</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-2xl font-bold text-white">{Math.floor(calculationDetail.calc.currentAge || 0)}a</span>
                                        <span className={`text-xs font-bold ${calculationDetail.calc.isAgeOk ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                            Meta: {calculationDetail.calc.ageTarget}a
                                        </span>
                                    </div>
                                    <div className="mt-2 text-[10px] font-medium">
                                        {calculationDetail.calc.isAgeOk ? (
                                            <span className="text-emerald-500 flex items-center gap-1"><Check size={10} /> Requisito atingido</span>
                                        ) : (
                                            <span className="text-zinc-500 flex items-center gap-1"><Clock size={10} /> Falta {Math.max(0, calculationDetail.calc.ageTarget - Math.floor(calculationDetail.calc.currentAge || 0))} anos</span>
                                        )}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl border ${calculationDetail.calc.isContributionOk ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Critério: Contribuição</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-2xl font-bold text-white">{calculationDetail.calc.currentContributionMonths || 0}m</span>
                                        <span className={`text-xs font-bold ${calculationDetail.calc.isContributionOk ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                            Meta: {calculationDetail.calc.contributionTargetMonths}m
                                        </span>
                                    </div>
                                    <div className="mt-2 text-[10px] font-medium">
                                        {calculationDetail.calc.isContributionOk ? (
                                            <span className="text-emerald-500 flex items-center gap-1"><Check size={10} /> Requisito atingido</span>
                                        ) : (
                                            <span className="text-yellow-500 flex items-center gap-1"><AlertTriangle size={10} /> Falta {calculationDetail.calc.contributionTargetMonths - (calculationDetail.calc.currentContributionMonths || 0)} meses</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                                    <FileText size={12} /> Vínculos Extraídos do CNIS
                                </h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                    {calculationDetail.client.cnis_data?.bonds?.length ? calculationDetail.client.cnis_data.bonds.map(bond => (
                                        <div key={bond.id} className="text-[10px] flex justify-between items-center py-2.5 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 px-2 rounded -mx-2 transition-colors">
                                            <span className="text-zinc-300 font-medium truncate flex-1 pr-4" title={bond.company}>{bond.company}</span>
                                            <span className="text-zinc-500 font-mono flex-shrink-0">{bond.durationString}</span>
                                        </div>
                                    )) : (
                                        <p className="text-[10px] text-zinc-600 text-center py-4">Nenhum vínculo detalhado encontrado.</p>
                                    )}
                                </div>
                            </div>

                            {!calculationDetail.calc.isContributionOk && (calculationDetail.calc.currentContributionMonths || 0) > 0 && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                                    <p className="text-xs text-yellow-500 leading-relaxed font-medium">
                                        <strong>Análise Técnica:</strong> O cliente não possui tempo suficiente para Aposentadoria Urbana. Recomenda-se verificar a possibilidade de <strong>Aposentadoria Híbrida</strong> se houver tempo rural comprovável.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
                            <button onClick={() => { handleViewFullProfile(calculationDetail.client.id, 'cnis'); setCalculationDetail(null); }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors w-full sm:w-auto">Ver CNIS Completo</button>
                            <button onClick={() => setCalculationDetail(null)} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors w-full sm:w-auto">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALHES PROCESSO */}
            {selectedCase && (
                <CaseDetailsModal
                    caseItem={selectedCase}
                    onClose={() => setSelectedCase(null)}
                    onSelectCase={setSelectedCase}
                    onViewClient={(clientId) => {
                        setClientToView(clientId);
                        setCurrentView('clients');
                        setSelectedCase(null);
                    }}
                />
            )}
        </div>
    );
};

export default Retirements;

