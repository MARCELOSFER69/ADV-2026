import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeadlinesListProps {
    title: string;
    deadlines: any[];
    onDeadlineClick: (caseId: string) => void;
}

const DeadlinesList: React.FC<DeadlinesListProps> = ({ title, deadlines, onDeadlineClick }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500" />{title}
                </h3>
            </div>
            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[300px] pr-1">
                {deadlines.length > 0 ? deadlines.map(c => {
                    const daysLeft = Math.ceil((new Date(c.data_fatal!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isLate = daysLeft < 0;
                    const isToday = daysLeft === 0;
                    const statusColor = isLate ? 'text-red-500 bg-red-500/10 border-red-500/20' : isToday ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' : 'text-zinc-300 bg-black/20 border-white/5';
                    return (
                        <div key={c.id} onClick={() => onDeadlineClick(c.id)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:bg-white/5 transition-colors ${statusColor}`}>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold truncate">{c.titulo}</h4>
                                <p className="text-[10px] opacity-70 truncate">{c.numero_processo}</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                                <span className="text-xs font-bold block">{isLate ? `${Math.abs(daysLeft)}d atrasado` : isToday ? 'Vence Hoje' : `${daysLeft}d restantes`}</span>
                                <span className="text-[9px] opacity-60">{new Date(c.data_fatal!).toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                    );
                }) : <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-xl"><p className="text-xs">Nenhum prazo fatal próximo.</p></div>}
            </div>
        </div>
    );
};

export default React.memo(DeadlinesList);
