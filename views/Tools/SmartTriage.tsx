
import React from 'react';
import { ClipboardCheck, ListFilter, AlertTriangle } from 'lucide-react';

const SmartTriage: React.FC = () => {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar space-y-6 animate-in fade-in duration-500 pr-2">
            <header>
                <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
                    <ClipboardCheck className="text-gold-500" /> Triagem Inteligente
                </h2>
                <p className="text-slate-400">Questionário dinâmico para qualificação de leads e clientes novos.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <ListFilter size={20} className="text-blue-400" /> Selecione a Área
                    </h3>
                    <div className="space-y-3">
                        {['Previdenciário (Benefícios)', 'Trabalhista', 'Cível / Consumidor', 'BPC / LOAS'].map((area) => (
                            <button key={area} className="w-full text-left p-4 bg-navy-800 border border-slate-700 rounded-lg hover:border-gold-500 hover:bg-navy-800/80 transition-all text-slate-300 hover:text-white">
                                {area}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center opacity-50">
                    <ClipboardCheck size={48} className="text-slate-600 mb-4" />
                    <p className="text-slate-400">Selecione uma área para iniciar a triagem guiada.</p>
                </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="text-blue-400 shrink-0 mt-0.5" size={20} />
                <div>
                    <h4 className="text-blue-400 font-bold text-sm">Em Construção</h4>
                    <p className="text-blue-300/80 text-xs mt-1">O módulo de triagem conectará automaticamente as respostas com a criação de novos clientes e processos no sistema.</p>
                </div>
            </div>
        </div>
    );
};

export default SmartTriage;
