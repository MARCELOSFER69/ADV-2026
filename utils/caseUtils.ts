import { CaseStatus, CaseType } from '../types';

export const getCaseTypeColor = (type: CaseType) => {
    switch (type) {
        case CaseType.SEGURO_DEFESO: return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
        case CaseType.SALARIO_MATERNIDADE: return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
        case CaseType.APOSENTADORIA: return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
        case CaseType.BPC_LOAS: return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
        case CaseType.AUXILIO_DOENCA: return 'text-red-400 bg-red-400/10 border-red-400/20';
        default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
    }
};

export const getStatusHeaderColor = (status: CaseStatus) => {
    return 'bg-zinc-500';
};

export const getDeadlineStatus = (dateFatal?: string) => {
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
