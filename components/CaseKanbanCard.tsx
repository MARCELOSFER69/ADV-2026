import React, { memo } from 'react';
import { Case, CaseStatus, CaseType } from '../types';
import { Archive, Scale, Shield, Users, Briefcase, Building2, AlertTriangle } from 'lucide-react';
import { formatDateDisplay } from '../utils/dateUtils';
import { Client } from '../types';

interface CaseKanbanCardProps {
    caseItem: Case;
    client?: Client;
    onClick: (caseItem: Case) => void;
    onArchiveClick: (caseItem: Case) => void;
}

const getCaseTypeColor = (type: CaseType) => {
    switch (type) {
        case CaseType.SEGURO_DEFESO: return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
        case CaseType.SALARIO_MATERNIDADE: return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
        case CaseType.APOSENTADORIA: return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
        case CaseType.BPC_LOAS: return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
        case CaseType.AUXILIO_DOENCA: return 'text-red-400 bg-red-400/10 border-red-400/20';
        default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
    }
};

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
    const deadline = getDeadlineStatus(caseItem.data_fatal);
    const hasPendencias = client?.pendencias && client.pendencias.length > 0;

    let borderClass = 'border-l-4 border-l-transparent';
    if (deadline) {
        if (deadline.days < 0) borderClass = 'border-l-4 border-l-red-600';
        else if (deadline.days <= 3) borderClass = 'border-l-4 border-l-red-500';
        else if (deadline.days <= 7) borderClass = 'border-l-4 border-l-yellow-500';
    }

    const avatarClass = hasPendencias
        ? 'bg-red-600 text-white animate-pulse'
        : 'bg-zinc-300 text-zinc-900';

    return (
        <div
            onClick={() => onClick(caseItem)}
            className={`kanban-card group relative flex flex-col bg-[#0f1014] border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer overflow-hidden ${borderClass}`}
        >
            <div className="flex justify-between items-center mb-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded truncate max-w-[140px] ${getCaseTypeColor(caseItem.tipo)}`}>
                    {caseItem.tipo}{caseItem.modalidade ? ` (${caseItem.modalidade})` : ''}
                </span>
                <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                    {caseItem.tribunal || 'ADMINISTRATIVO'}
                </span>
            </div>

            <div className="flex items-center gap-3 mb-4 mt-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${avatarClass}`}>
                    {client?.nome_completo?.substring(0, 1) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                        {client?.nome_completo || 'Cliente Desconhecido'}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono">
                        {caseItem.numero_processo || 'S/N'}
                    </p>
                </div>
            </div>

            <hr className="border-zinc-800 mb-3" />

            <div className="flex justify-between items-center mt-auto">
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

            <div className="mt-4 pt-3 border-t border-zinc-800 flex gap-3 opacity-100">
                <button className="flex-1 bg-transparent border border-zinc-800 text-amber-500 hover:bg-zinc-800 text-xs font-bold py-2 rounded transition-colors uppercase tracking-wide">
                    Ver Detalhes
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onArchiveClick(caseItem); }}
                    className="p-2 text-zinc-600 hover:text-zinc-300 rounded transition-colors"
                    title="Arquivar"
                >
                    <Archive size={16} />
                </button>
            </div>
        </div>
    );
};

export default memo(CaseKanbanCard);
