import React from 'react';
import { HandCoins, Infinity, ChevronLeft, CalendarRange, ChevronRight, Search, X, Filter, Download } from 'lucide-react';

export type PeriodMode = 'month' | 'year' | 'all';

interface FinancialHeaderProps {
    periodMode: PeriodMode;
    setPeriodMode: (mode: PeriodMode) => void;
    navigatePeriod: (direction: 'prev' | 'next') => void;
    getPeriodLabel: () => string;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    handleExportCSV: () => void;
}

const FinancialHeader: React.FC<FinancialHeaderProps> = ({
    periodMode,
    setPeriodMode,
    navigatePeriod,
    getPeriodLabel,
    searchTerm,
    setSearchTerm,
    showFilters,
    setShowFilters,
    handleExportCSV
}) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
                        <HandCoins size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
                            Gestão Financeira
                        </h1>
                        <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
                            Controle total de honorários, comissões e despesas administrativas.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-[#0f1014] p-3 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex bg-[#18181b] rounded-xl p-1.5 border border-white/5">
                    <button
                        onClick={() => setPeriodMode('month')}
                        className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${periodMode === 'month' ? 'bg-gold-600 text-black shadow-lg shadow-gold-600/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        Mês
                    </button>
                    <button
                        onClick={() => setPeriodMode('year')}
                        className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${periodMode === 'year' ? 'bg-gold-600 text-black shadow-lg shadow-gold-600/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        Ano
                    </button>
                    <button
                        onClick={() => setPeriodMode('all')}
                        className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${periodMode === 'all' ? 'bg-gold-600 text-black shadow-lg shadow-gold-600/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Infinity size={14} /> Tudo
                    </button>
                </div>

                {periodMode !== 'all' && (
                    <div className="flex items-center gap-4 bg-[#18181b] px-3 py-2 rounded-xl border border-white/5 shadow-inner">
                        <button
                            onClick={() => navigatePeriod('prev')}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all active:scale-95"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="text-sm font-black text-white min-w-[140px] text-center capitalize flex items-center justify-center gap-2 tracking-wide">
                            <CalendarRange size={16} className="text-gold-500" />
                            {getPeriodLabel()}
                        </div>
                        <button
                            onClick={() => navigatePeriod('next')}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all active:scale-95"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={16} />
                        <input
                            className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-11 pr-10 py-3 text-sm text-white outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 placeholder:text-slate-600 transition-all"
                            placeholder="Buscar lançamentos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                title="Limpar busca"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-3 rounded-xl border transition-all ${showFilters ? 'bg-gold-500/10 border-gold-500/50 text-gold-500' : 'bg-[#18181b] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Filter size={18} />
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="p-3 rounded-xl border border-white/10 bg-[#18181b] text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinancialHeader;
