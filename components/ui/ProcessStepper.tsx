import React from 'react';
import { Check, Clock, AlertCircle, FileText, Scale, Search } from 'lucide-react';
import { CaseStatus } from '../../types';

interface ProcessStepperProps {
    currentStatus: string;
}

const STAGES = [
    { id: 'start', label: 'Início', icon: FileText, statuses: [CaseStatus.PROTOCOLAR] },
    { id: 'analysis', label: 'Análise', icon: Search, statuses: [CaseStatus.ANALISE, CaseStatus.EXIGENCIA] },
    { id: 'action', label: 'Execução', icon: Scale, statuses: [CaseStatus.AGUARDANDO_AUDIENCIA] },
    { id: 'appeal', label: 'Recurso', icon: Clock, statuses: [CaseStatus.EM_RECURSO] },
    { id: 'finish', label: 'Conclusão', icon: Check, statuses: [CaseStatus.CONCLUIDO_CONCEDIDO, CaseStatus.CONCLUIDO_INDEFERIDO, CaseStatus.ARQUIVADO] },
];

const ProcessStepper: React.FC<ProcessStepperProps> = ({ currentStatus }) => {
    const currentStageIndex = STAGES.findIndex(stage => stage.statuses.includes(currentStatus as CaseStatus));

    return (
        <div className="w-full py-6">
            <div className="relative flex justify-between">
                {/* Connector Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[var(--border-main)] -translate-y-1/2 z-0" />
                <div
                    className="absolute top-1/2 left-0 h-0.5 bg-gold-500 -translate-y-1/2 z-0 transition-all duration-500"
                    style={{ width: `${Math.max(0, currentStageIndex / (STAGES.length - 1)) * 100}%` }}
                />

                {/* Steps */}
                {STAGES.map((stage, index) => {
                    const isCompleted = index < currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    const Icon = stage.icon;

                    return (
                        <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-gold-500 border-gold-500 text-black shadow-lg shadow-gold-500/20' :
                                    isCurrent ? 'bg-[var(--bg-surface)] border-gold-500 text-gold-500 shadow-lg shadow-gold-500/40 animate-pulse' :
                                        'bg-[var(--bg-surface)] border-[var(--border-main)] text-[var(--text-muted)]'
                                    }`}
                            >
                                {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isCurrent ? 'text-gold-500' : isCompleted ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'
                                }`}>
                                {stage.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProcessStepper;
