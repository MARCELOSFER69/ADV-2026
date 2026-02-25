import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, AlertCircle, Briefcase } from 'lucide-react';
import { Client, RetirementCandidate } from '../../types';
import PendencyIndicator from '../ui/PendencyIndicator';

export interface DetailedCalculation {
    type: 'Urbana' | 'Rural' | 'Híbrida';
    ageTarget: number;
    contributionTargetMonths: number;
    currentAge: number;
    currentContributionMonths: number;
    isAgeOk: boolean;
    isContributionOk: boolean;
}

// export interface RetirementCandidate { // REMOVED: using centralized interface from types
//     client: Client;
//     age: { years: number; months: number };
//     ruralRemaining: number;
//     urbanRemaining: number;
//     bestChance: string;
//     yearsRemaining: number;
// }

interface RetirementCardProps {
    candidate: RetirementCandidate;
    onClick: () => void;
    onUpdateClient: (client: Client) => void;
    onOpenCnisDetails: (client: Client, calculation: DetailedCalculation) => void;
    onAddCnis: (client: Client) => void;
    globalTrigger: number;
    activeHoverId: string | null;
    setActiveHoverId: (id: string | null) => void;
}

export const RetirementCard: React.FC<RetirementCardProps> = ({
    candidate,
    onClick,
    onUpdateClient,
    onOpenCnisDetails,
    onAddCnis,
    globalTrigger,
    activeHoverId,
    setActiveHoverId
}) => {
    const [localTrigger, setLocalTrigger] = useState(0);
    const isHovered = activeHoverId === candidate.client.id;

    React.useEffect(() => {
        if (!isHovered) {
            setLocalTrigger(globalTrigger);
        }
    }, [globalTrigger]);

    // Inicializa com o valor do banco SE existir, senão usa o bestChance
    const initialMode = (candidate.client.aposentadoria_modalidade || candidate.bestChance) as 'Rural' | 'Urbana';
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

    const getThematicColor = () => {
        if (isEligible) return '#10b981';
        if (displayRemaining <= 1) return '#84cc16'; // Lime
        if (displayRemaining <= 3) return '#eab308'; // Yellow/Gold
        if (displayRemaining <= 5) return '#f97316'; // Orange
        return '#64748b'; // Slate
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
        <motion.div
            initial={false}
            animate={{ scale: isEligible ? 1.02 : 1 }}
            className={`relative p-[1.5px] rounded-xl group/card transition-all ${isEligible ? 'shadow-[0_10px_30px_rgba(16,185,129,0.2)]' : ''}`}
            onMouseEnter={() => setActiveHoverId(candidate.client.id)}
            onMouseLeave={() => setActiveHoverId(null)}
        >
            {/* Tracing Border for Eligible - Slow and Elegant */}
            {isEligible && (
                <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_25%,#10b981_50%,transparent_75%)] animate-[spin_8s_linear_infinite] opacity-30 blur-[2px]" />
                </div>
            )}

            <div
                onClick={(e) => {
                    // Evita abrir o modal se clicar nos botões de toggle ou link de cnis
                    if ((e.target as HTMLElement).closest('.mode-toggle') || (e.target as HTMLElement).closest('.cnis-link')) return;
                    onClick();
                }}
                className={`
                    relative rounded-xl p-5 cursor-pointer transition-all group bg-[#0f1014] h-full
                    ${isEligible
                        ? 'border border-emerald-500/30'
                        : 'border border-zinc-800 hover:border-zinc-700 hover:shadow-lg'
                    }
                `}
            >
                {/* Progress Bar Background - Premium Animated Line */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-visible rounded-b-xl bg-zinc-800/30">
                    <svg key={localTrigger} className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                        <motion.line
                            x1="0"
                            y1="1.5"
                            x2="100%"
                            y2="1.5"
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, stroke: "rgba(113, 113, 122, 0.5)" }}
                            animate={{
                                pathLength: (isEligible ? 100 : Math.max(5, (100 - (displayRemaining * 20)))) / 100,
                                stroke: isHovered
                                    ? getThematicColor()
                                    : (isEligible
                                        ? ["rgba(113, 113, 122, 0.5)", "#10b981", "rgba(113, 113, 122, 0.5)", "#10b981", "rgba(113, 113, 122, 0.5)", "#10b981", "#10b981"]
                                        : "rgba(113, 113, 122, 0.5)")
                            }}
                            transition={{
                                pathLength: { duration: 2, ease: "easeInOut" },
                                stroke: isHovered
                                    ? { duration: 0.2 }
                                    : { duration: 3, delay: 2, times: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1] }
                            }}
                        />
                    </svg>
                </div>

                <div className="flex justify-between items-start mb-4">
                    <PendencyIndicator pendencies={candidate.client.pendencias} align="left">
                        <div className="flex items-center gap-4 cursor-help">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border-2 border-transparent shadow-sm relative transition-all duration-300 ${avatarClass} ${hasPendencias ? 'shadow-[0_0_15px_rgba(225,29,72,0.2)]' : ''}`}>
                                {candidate.client.nome_completo.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="font-bold text-zinc-100 text-base group-hover:text-white transition-colors line-clamp-1">
                                    {candidate.client.nome_completo}
                                </h4>
                                <p className="text-xs text-zinc-500 mt-0.5">{candidate.age.years} anos • {candidate.client.sexo}</p>
                            </div>
                        </div>
                    </PendencyIndicator>
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
        </motion.div>
    );
};
