import React from 'react';
import { Calculator, X, Check, Clock, AlertTriangle, FileText } from 'lucide-react';
import { Client } from '../../types';
import { DetailedCalculation } from './RetirementCard';

interface RetirementCalculationDetailsProps {
    client: Client;
    calc: DetailedCalculation;
    onClose: () => void;
    onViewFullProfile: (clientId: string, tab: 'cnis') => void;
}

export const RetirementCalculationDetails: React.FC<RetirementCalculationDetailsProps> = ({
    client,
    calc,
    onClose,
    onViewFullProfile
}) => {
    return (
        <div
            onClick={onClose}
            className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#09090b] border border-zinc-800 rounded-2xl max-w-lg w-full my-auto shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            >
                <div className="p-4 sm:p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 flex-shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calculator className="text-orange-500" /> Detalhamento do Cálculo
                    </h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"><X size={20} /></button>
                </div>
                <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-300 flex-shrink-0">
                            {(client.nome_completo || '??').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-white line-clamp-1">{client.nome_completo}</p>
                            <p className="text-xs text-zinc-500">Aposentadoria {calc.type}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border ${calc.isAgeOk ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Critério: Idade</p>
                            <div className="flex justify-between items-end">
                                <span className="text-2xl font-bold text-white">{Math.floor(calc.currentAge || 0)}a</span>
                                <span className={`text-xs font-bold ${calc.isAgeOk ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                    Meta: {calc.ageTarget}a
                                </span>
                            </div>
                            <div className="mt-2 text-[10px] font-medium">
                                {calc.isAgeOk ? (
                                    <span className="text-emerald-500 flex items-center gap-1"><Check size={10} /> Requisito atingido</span>
                                ) : (
                                    <span className="text-zinc-500 flex items-center gap-1"><Clock size={10} /> Falta {Math.max(0, calc.ageTarget - Math.floor(calc.currentAge || 0))} anos</span>
                                )}
                            </div>
                        </div>

                        <div className={`p-4 rounded-xl border ${calc.isContributionOk ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Critério: Contribuição</p>
                            <div className="flex justify-between items-end">
                                <span className="text-2xl font-bold text-white">{calc.currentContributionMonths || 0}m</span>
                                <span className={`text-xs font-bold ${calc.isContributionOk ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                    Meta: {calc.contributionTargetMonths}m
                                </span>
                            </div>
                            <div className="mt-2 text-[10px] font-medium">
                                {calc.isContributionOk ? (
                                    <span className="text-emerald-500 flex items-center gap-1"><Check size={10} /> Requisito atingido</span>
                                ) : (
                                    <span className="text-yellow-500 flex items-center gap-1"><AlertTriangle size={10} /> Falta {calc.contributionTargetMonths - (calc.currentContributionMonths || 0)} meses</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                            <FileText size={12} /> Vínculos Extraídos do CNIS
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                            {client.cnis_data?.bonds?.length ? client.cnis_data.bonds.map((bond, idx) => (
                                <div key={bond.id || idx} className="text-[10px] flex justify-between items-center py-2.5 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 px-2 rounded -mx-2 transition-colors">
                                    <span className="text-zinc-300 font-medium truncate flex-1 pr-4" title={bond.company}>{bond.company}</span>
                                    <span className="text-zinc-500 font-mono flex-shrink-0">{bond.durationString}</span>
                                </div>
                            )) : (
                                <p className="text-[10px] text-zinc-600 text-center py-4">Nenhum vínculo detalhado encontrado.</p>
                            )}
                        </div>
                    </div>

                    {!calc.isContributionOk && (calc.currentContributionMonths || 0) > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                            <p className="text-xs text-yellow-500 leading-relaxed font-medium">
                                <strong>Análise Técnica:</strong> O cliente não possui tempo suficiente para Aposentadoria Urbana. Recomenda-se verificar a possibilidade de <strong>Aposentadoria Híbrida</strong> se houver tempo rural comprovável.
                            </p>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
                    <button onClick={() => { onViewFullProfile(client.id, 'cnis'); onClose(); }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors w-full sm:w-auto">Ver CNIS Completo</button>
                    <button onClick={onClose} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors w-full sm:w-auto">Fechar</button>
                </div>
            </div>
        </div>
    );
};
