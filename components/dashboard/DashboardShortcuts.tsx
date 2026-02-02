import React from 'react';
import { Plus, DollarSign, Users, FileText } from 'lucide-react';

interface DashboardShortcutsProps {
    onNewCase: () => void;
    onFinancial: () => void;
    onNewClient: () => void;
    onCommissions: () => void;
}

const DashboardShortcuts: React.FC<DashboardShortcutsProps> = ({
    onNewCase,
    onFinancial,
    onNewClient,
    onCommissions
}) => {
    return (
        <div className="grid grid-cols-2 gap-3 h-full">
            <button onClick={onNewCase} className="bg-zinc-800/50 hover:bg-zinc-700/50 hover:border-yellow-500/50 text-white p-3 rounded-xl border border-white/5 transition-all flex items-center gap-3 shadow-lg group">
                <div className="p-2 rounded-lg bg-zinc-900 group-hover:bg-yellow-500/20 transition-colors"><Plus size={18} className="text-yellow-500" /></div>
                <div className="text-left"><span className="block text-sm font-bold">Novo Processo</span><span className="text-[10px] text-zinc-500">Cadastrar ação</span></div>
            </button>
            <button onClick={onFinancial} className="bg-zinc-800/50 hover:bg-zinc-700/50 hover:border-emerald-500/50 text-white p-3 rounded-xl border border-white/5 transition-all flex items-center gap-3 shadow-lg group">
                <div className="p-2 rounded-lg bg-zinc-900 group-hover:bg-emerald-500/20 transition-colors"><DollarSign size={18} className="text-emerald-500" /></div>
                <div className="text-left"><span className="block text-sm font-bold">Lançar Valor</span><span className="text-[10px] text-zinc-500">Receita/Despesa</span></div>
            </button>
            <button onClick={onNewClient} className="bg-zinc-800/50 hover:bg-zinc-700/50 hover:border-blue-500/50 text-white p-3 rounded-xl border border-white/5 transition-all flex items-center gap-3 shadow-lg group">
                <div className="p-2 rounded-lg bg-zinc-900 group-hover:bg-blue-500/20 transition-colors"><Users size={18} className="text-blue-500" /></div>
                <div className="text-left"><span className="block text-sm font-bold">Novo Cliente</span><span className="text-[10px] text-zinc-500">Cadastro rápido</span></div>
            </button>
            <button onClick={onCommissions} className="bg-zinc-800/50 hover:bg-zinc-700/50 hover:border-purple-500/50 text-white p-3 rounded-xl border border-white/5 transition-all flex items-center gap-3 shadow-lg group">
                <div className="p-2 rounded-lg bg-zinc-900 group-hover:bg-purple-500/20 transition-colors"><FileText size={18} className="text-purple-500" /></div>
                <div className="text-left"><span className="block text-sm font-bold">Comissões</span><span className="text-[10px] text-zinc-500">Gerar recibos</span></div>
            </button>
        </div>
    );
};

export default React.memo(DashboardShortcuts);
