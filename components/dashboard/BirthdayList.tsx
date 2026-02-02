import React from 'react';
import { Cake, MessageCircle } from 'lucide-react';

interface BirthdayListProps {
    title: string;
    data: any[];
    onCollection: (e: React.MouseEvent, type: 'whatsapp', payload: any) => void;
}

const BirthdayList: React.FC<BirthdayListProps> = ({ title, data, onCollection }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                    <Cake size={16} className="text-pink-400" />{title}
                </h3>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Hoje</span>
            </div>
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {data.length > 0 ? data.map(client => (
                    <div key={client.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-pink-500/30 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 text-[10px] font-bold">
                                {client.nome.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-200 truncate">{client.nome}</p>
                                <p className="text-[10px] text-zinc-500">{client.whatsapp}</p>
                            </div>
                        </div>
                        <button onClick={(e) => onCollection(e, 'whatsapp', { text: `Parabéns, ${client.nome}!`, phone: client.whatsapp })} className="p-1.5 text-pink-400 hover:bg-pink-500/10 rounded transition-colors">
                            <MessageCircle size={16} />
                        </button>
                    </div>
                )) : <div className="text-center py-8 text-zinc-500 text-xs italic">Nenhum aniversariante hoje.</div>}
            </div>
        </div>
    );
};

export default React.memo(BirthdayList);
