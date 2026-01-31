import React, { memo, useState, useEffect } from 'react';
import { Case, CaseStatus, CaseType } from '../types';
import { Archive, Scale, Shield, Users, Briefcase, Building2, AlertTriangle, Eye } from 'lucide-react';
import { formatDateDisplay } from '../utils/dateUtils';
import { Client } from '../types';
import PendencyIndicator from './ui/PendencyIndicator';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';

interface CaseKanbanCardProps {
    caseItem: Case;
    client?: Client;
    onClick: (caseItem: Case) => void;
    onArchiveClick: (caseItem: Case) => void;
}

const getStatusProgress = (status: CaseStatus): number => {
    switch (status) {
        case CaseStatus.PROTOCOLAR: return 0.05; // Pequeno começo
        case CaseStatus.ANALISE: return 0.25;
        case CaseStatus.EXIGENCIA: return 0.45;
        case CaseStatus.AGUARDANDO_AUDIENCIA: return 0.65;
        case CaseStatus.EM_RECURSO: return 0.85;
        case CaseStatus.CONCLUIDO_CONCEDIDO:
        case CaseStatus.CONCLUIDO_INDEFERIDO: return 1.0;
        default: return 0;
    }
};

const CaseTypeBadge = memo(({ type }: { type: CaseType }) => {
    return (
        <span className="text-[11px] font-black px-2.5 py-1 rounded-md border text-zinc-400 border-zinc-800 bg-zinc-800/40 tracking-tight">
            {type}
        </span>
    );
});

const getDeadlineStatus = (dateFatal?: string) => {
    if (!dateFatal) return null;
    try {
        const fatalDate = new Date(dateFatal);
        if (isNaN(fatalDate.getTime())) return null;

        const days = Math.ceil((fatalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        if (isNaN(days)) return null;

        if (days < 0) return { color: 'text-red-500', label: `${Math.abs(days)}d atrasado`, days };
        if (days === 0) return { color: 'text-red-500 animate-pulse', label: 'Vence Hoje', days };
        if (days <= 3) return { color: 'text-red-400', label: `${days}d restante`, days };
        if (days <= 7) return { color: 'text-yellow-500', label: `${days}d restante`, days };
        return { color: 'text-emerald-500', label: fatalDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), days };
    } catch (e) {
        return null;
    }
};

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const CaseKanbanCard: React.FC<CaseKanbanCardProps> = ({ caseItem, client, onClick, onArchiveClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: caseItem.id,
        data: {
            caseItem
        }
    });

    const [animTrigger, setAnimTrigger] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimTrigger(prev => prev + 1);
        }, 60000); // 60 segundos
        return () => clearInterval(interval);
    }, []);

    const progress = getStatusProgress(caseItem.status as CaseStatus);
    const isCompleted = progress === 1;
    const isConceded = caseItem.status === CaseStatus.CONCLUIDO_CONCEDIDO;

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : (isCompleted ? 20 : 1),
    };

    const deadline = getDeadlineStatus(caseItem.data_fatal);
    const hasPendencias = client?.pendencias && client.pendencias.length > 0;

    const avatarClass = hasPendencias
        ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.2)]'
        : 'bg-zinc-300 text-zinc-900';

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(caseItem)}
            whileHover={{ scale: 1.05, zIndex: 40, borderColor: 'rgba(113, 113, 122, 0.5)' }}
            className={`kanban-card group relative flex flex-col bg-[#0f1014] border border-zinc-800/50 hover:border-zinc-700 rounded-xl p-4 transition-all duration-300 shadow-sm hover:shadow-2xl cursor-grab active:cursor-grabbing`}
        >
            {/* Animated Progress Border */}
            {progress > 0 && (
                <svg key={animTrigger} className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <motion.rect
                        x="1.5"
                        y="1.5"
                        width="calc(100% - 3px)"
                        height="calc(100% - 3px)"
                        rx="12"
                        fill="none"
                        stroke="rgba(113, 113, 122, 0.5)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, stroke: "rgba(113, 113, 122, 0.5)" }}
                        animate={{
                            pathLength: progress,
                            stroke: isCompleted
                                ? (isConceded
                                    ? ["rgba(113, 113, 122, 0.5)", "#10b981", "rgba(113, 113, 122, 0.5)", "#10b981", "rgba(113, 113, 122, 0.5)", "#10b981", "rgba(113, 113, 122, 0.5)"]
                                    : ["rgba(113, 113, 122, 0.5)", "#ef4444", "rgba(113, 113, 122, 0.5)", "#ef4444", "rgba(113, 113, 122, 0.5)", "#ef4444", "rgba(113, 113, 122, 0.5)"]
                                )
                                : "rgba(113, 113, 122, 0.5)"
                        }}
                        transition={{
                            pathLength: { duration: 2, ease: "easeInOut" },
                            stroke: { duration: 3, delay: 2, times: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1] }
                        }}
                    />
                </svg>
            )}

            <div className="flex justify-between items-center mb-3 relative z-10">
                <CaseTypeBadge type={caseItem.tipo as CaseType} />
                <span className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider">
                    {caseItem.tribunal || 'ADMINISTRATIVO'}
                </span>
            </div>

            <PendencyIndicator pendencies={client?.pendencias} align="left" className="w-full relative z-10">
                <div className="flex items-center gap-3 mb-1 mt-1 cursor-help">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm relative transition-all duration-300 ${avatarClass}`}>
                        {client?.nome_completo?.substring(0, 1) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                            {client?.nome_completo || 'Cliente Desconhecido'}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono">
                            {caseItem.numero_processo || 'S/N'}
                        </p>
                    </div>
                </div>
            </PendencyIndicator>

            <hr className="border-zinc-800 mb-3 relative z-10" />

            <div className="flex justify-between items-center mt-auto relative z-10">
                <div>
                    {caseItem.status_pagamento === 'Pago' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">
                            PAGO
                        </span>
                    ) : (
                        <span className="text-xs font-bold text-emerald-400">
                            {caseItem.valor_causa > 0 ? formatCurrency(caseItem.valor_causa) : 'R$ -'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                    {deadline ? (
                        <span className={`${deadline.color} font-medium`}>{deadline.label}</span>
                    ) : (
                        <span>{formatDateDisplay(caseItem.data_abertura)}</span>
                    )}
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex gap-2 opacity-100 relative z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); onClick(caseItem); }}
                    className="flex-1 bg-zinc-800 pb-2 border border-white/5 text-zinc-400 hover:text-gold-500 hover:bg-gold-500/10 hover:border-gold-500/30 text-[10px] font-black py-2 rounded-lg transition-all duration-300 uppercase tracking-widest flex items-center justify-center gap-2 group/btn"
                >
                    <Eye size={14} className="group-hover/btn:scale-110 transition-transform" />
                    <span>Detalhes</span>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onArchiveClick(caseItem); }}
                    className="p-2 text-zinc-700 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
                    title="Arquivar"
                >
                    <Archive size={16} />
                </button>
            </div>
        </motion.div>
    );
};

export default memo(CaseKanbanCard);
