import React from 'react';
import { Shield } from 'lucide-react';
import { formatDateDisplay } from '../../utils/dateUtils';

interface InsuranceListProps {
    title: string;
    data: any[];
    onCollection: (e: React.MouseEvent, record: any) => void;
}

const InsuranceList: React.FC<InsuranceListProps> = ({ title, data, onCollection }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                    <Shield size={16} className="text-blue-400" /> {title}
                </h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">{data.length}</span>
            </div>
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {data.length > 0 ? data.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 rounded-lg bg-black/20 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer" onClick={(e) => onCollection(e, item)}>
                        <div>
                            <p className="text-xs font-bold text-zinc-200">{item.titulo.replace(' - Seguro Defeso', '')}</p>
                            <p className="text-[10px] text-zinc-500">{formatDateDisplay(item.data_vencimento)}</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}</span>
                    </div>
                )) : <div className="text-center py-8 text-zinc-500 text-xs italic">Nenhum vencimento próximo.</div>}
            </div>
        </div>
    );
};

export default React.memo(InsuranceList);
