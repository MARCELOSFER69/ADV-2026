import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Check, Clock, FileText, Scale, Search,
    Calendar, AlertCircle, Gavel, Stethoscope
} from 'lucide-react';
import { CaseStatus, CaseType, EventType, Event } from '../../types';

interface ProcessStepperProps {
    currentStatus: string;
    caseType?: string;
    events?: Event[];
}

interface Stage {
    id: string;
    label: string;
    icon: any;
    statuses: string[];
}

const ProcessStepper: React.FC<ProcessStepperProps> = ({ currentStatus, caseType, events = [] }) => {
    // Definir estágios baseados no tipo de processo
    const stages: Stage[] = useMemo(() => {
        const isJudicial = caseType && [CaseType.TRABALHISTA, CaseType.CIVIL].includes(caseType as CaseType);

        const baseStages = [
            { id: 'protocol', label: 'Protocolo', icon: FileText, statuses: [CaseStatus.PROTOCOLAR] },
            { id: 'analysis', label: 'Em Andamento', icon: Search, statuses: [CaseStatus.ANALISE, CaseStatus.EXIGENCIA, CaseStatus.AGUARDANDO_AUDIENCIA] },
        ];

        if (isJudicial) {
            baseStages.push({ id: 'judicial', label: 'Judicial', icon: Gavel, statuses: [CaseStatus.AGUARDANDO_AUDIENCIA, CaseStatus.EM_RECURSO] });
        } else {
            baseStages.push({ id: 'resource', label: 'Recurso', icon: Clock, statuses: [CaseStatus.EM_RECURSO] });
        }

        baseStages.push({ id: 'finish', label: 'Conclusão', icon: Check, statuses: [CaseStatus.CONCLUIDO_CONCEDIDO, CaseStatus.CONCLUIDO_INDEFERIDO, CaseStatus.ARQUIVADO] });

        return baseStages;
    }, [caseType]);

    // Encontrar o índice atual
    const currentStageIndex = stages.findIndex(stage => stage.statuses.includes(currentStatus as CaseStatus));
    const effectiveIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

    // Filtrar eventos importantes para mostrar como "marcos"
    const milestones = useMemo(() => {
        return events
            .filter(e => [EventType.PERICIA, EventType.AUDIENCIA].includes(e.tipo as EventType))
            .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
    }, [events]);

    return (
        <div className="w-full py-8 px-4">
            <div className="relative flex justify-between items-center">
                {/* Background Line */}
                <div className="absolute top-[20px] left-0 w-full h-[3px] bg-slate-800 rounded-full z-0" />

                {/* Progress Line */}
                <motion.div
                    className="absolute top-[20px] left-0 h-[3px] bg-gradient-to-r from-gold-600 to-gold-400 rounded-full z-0"
                    initial={{ width: 0 }}
                    animate={{ width: `${(effectiveIndex / (stages.length - 1)) * 100}%` }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                />

                {/* Stages */}
                {stages.map((stage, index) => {
                    const isCompleted = index < effectiveIndex;
                    const isCurrent = index === effectiveIndex;
                    const Icon = stage.icon;

                    return (
                        <div key={stage.id} className="relative z-10 flex flex-col items-center group">
                            <motion.div
                                initial={false}
                                animate={{
                                    backgroundColor: isCompleted ? "#ca8a04" : (isCurrent ? "#1e293b" : "#0f172a"),
                                    borderColor: (isCompleted || isCurrent) ? "#ca8a04" : "#334155",
                                    scale: isCurrent ? 1.2 : 1
                                }}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-xl ${isCurrent ? 'ring-4 ring-gold-500/20' : ''
                                    }`}
                            >
                                {isCompleted ? (
                                    <Check size={18} className="text-black" />
                                ) : (
                                    <Icon size={18} className={isCurrent ? "text-gold-500" : "text-slate-500"} />
                                )}

                                {/* Glow for current stage */}
                                {isCurrent && (
                                    <div className="absolute inset-0 rounded-full bg-gold-500/20 animate-ping pointer-events-none" />
                                )}
                            </motion.div>

                            <div className="mt-4 flex flex-col items-center">
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isCurrent ? 'text-gold-500' : isCompleted ? 'text-slate-300' : 'text-slate-600'
                                    }`}>
                                    {stage.label}
                                </span>
                                {isCurrent && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-[9px] text-gold-500/60 font-medium mt-0.5"
                                    >
                                        Estágio Atual
                                    </motion.span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Milestones (Events) - Shown as mini indicators below the line */}
            {milestones.length > 0 && (
                <div className="mt-12 pt-6 border-t border-slate-800/50">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Calendar size={14} className="text-gold-500/50" /> Marcos do Processo
                    </h4>
                    <div className="flex flex-wrap gap-4">
                        {milestones.map((milestone, idx) => {
                            const isPericia = milestone.tipo === EventType.PERICIA;
                            const MIcon = isPericia ? Stethoscope : Gavel;
                            const dateStr = new Date(milestone.data_hora).toLocaleDateString('pt-BR');

                            return (
                                <motion.div
                                    key={milestone.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex items-center gap-3 bg-navy-950/50 border border-slate-800 rounded-lg p-2.5 group hover:border-gold-500/40 transition-colors"
                                >
                                    <div className={`p-1.5 rounded-md ${isPericia ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                        <MIcon size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-slate-200">{milestone.titulo}</span>
                                        <span className="text-[9px] text-slate-500 font-medium">{dateStr} • {milestone.cidade}</span>
                                    </div>
                                    <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProcessStepper;
