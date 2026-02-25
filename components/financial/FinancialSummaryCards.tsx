import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';

interface FinancialSummaryCardsProps {
    totals: {
        income: number;
        expense: number;
        balance: number;
    };
}

const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({ totals }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-[#090b0a] p-6 rounded-2xl border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.05)] relative overflow-hidden group hover:border-emerald-500/80 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-emerald-400/80 font-black uppercase tracking-[0.2em] mb-1">Receitas (Visíveis)</p>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                            + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.income)}
                        </h3>
                    </div>
                    <div className="p-3 bg-emerald-500/20 shadow-sm rounded-xl text-emerald-500 transition-all duration-300 group-hover:scale-105">
                        <ArrowUpCircle size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            <div className="bg-[#0b0909] p-6 rounded-2xl border-2 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.05)] relative overflow-hidden group hover:border-red-500/80 hover:shadow-[0_0_30px_rgba(239,68,68,0.1)] transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-red-400/80 font-black uppercase tracking-[0.2em] mb-1">Despesas + Comissões</p>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                            - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.expense)}
                        </h3>
                    </div>
                    <div className="p-3 bg-red-500/20 shadow-sm rounded-xl text-red-500 transition-all duration-300 group-hover:scale-105">
                        <ArrowDownCircle size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            <div className="bg-[#090a0b] p-6 rounded-2xl border-2 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.05)] relative overflow-hidden group hover:border-blue-500/80 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-blue-400/80 font-black uppercase tracking-[0.2em] mb-1">Saldo Líquido</p>
                        <h3 className={`text-3xl font-black tracking-tight ${totals.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.balance)}
                        </h3>
                    </div>
                    <div className="p-3 bg-blue-500/20 shadow-sm rounded-xl text-blue-500 transition-all duration-300 group-hover:scale-105">
                        <DollarSign size={28} strokeWidth={2.5} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialSummaryCards;
