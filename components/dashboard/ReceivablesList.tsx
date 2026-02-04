import React from 'react';
import { DollarSign, MessageCircle } from 'lucide-react';

interface ReceivablesListProps {
    title: string;
    data: any[];
    onCollection: (e: React.MouseEvent, record: any) => void;
}

const ReceivablesList: React.FC<ReceivablesListProps> = ({ title, data, onCollection }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-500" />{title}
                </h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20">
                    {data.length} pendentes
                </span>
            </div>
            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[300px] pr-1">
                {data.length > 0 ? data.map(item => {
                    const isLate = new Date(item.data_vencimento) < new Date();
                    return (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-emerald-500/30 transition-all group">
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-zinc-200 truncate group-hover:text-white">{item.titulo}</h4>
                                <p className={`text-[10px] mt-0.5 ${isLate ? 'text-red-400' : 'text-zinc-500'}`}>
                                    {new Date(item.data_vencimento).toLocaleDateString('pt-BR')} • {isLate ? 'Atrasado' : 'No prazo'}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-emerald-500">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                                </span>
                                <button onClick={(e) => onCollection(e, item)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors" title="Cobrar via WhatsApp">
                                    <MessageCircle size={16} />
                                </button>
                            </div>
                        </div>
                    );
                }) : <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-xl"><p className="text-xs">Nenhum recebível pendente.</p></div>}
            </div>
        </div>
    );
};

export default React.memo(ReceivablesList);
