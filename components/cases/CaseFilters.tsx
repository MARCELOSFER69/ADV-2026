import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SortAsc, ChevronDown, Filter, Settings, LayoutGrid, LayoutList, ArrowDown, ArrowUp, User, AlertTriangle, Clock, ChevronLeft, ChevronRight, Hourglass, FileText } from 'lucide-react';
import { Branch, ColumnConfig, Case, CaseType, CaseStatus, ProjectFilters } from '../../types';
import SizeScaler from '../ui/SizeScaler';

interface CaseFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    handleSort: (key: string) => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    layoutMode: 'kanban' | 'list';
    saveLayoutMode: (mode: 'kanban' | 'list') => void;
    showColumnConfig: boolean;
    setShowColumnConfig: (show: boolean) => void;
    columns: ColumnConfig[];
    toggleColumn: (id: string) => void;
    moveColumn: (idx: number, direction: 'up' | 'down') => void;
    handleResetColumns: () => void;
    mergedPreferences: any;
    saveUserPreferences: (prefs: any) => void;
    filters: any;
    setFilters: (filters: any) => void;
    situationFilters: string[];
    setSituationFilters: (filters: string[]) => void;
    clearFilters: () => void;
    quickFilter: 'all' | 'mine' | 'deadlines' | 'stale' | 'projections';
    setQuickFilter: (filter: 'all' | 'mine' | 'deadlines' | 'stale' | 'projections') => void;
    projectionFilters?: ProjectFilters;
    setProjectionFilters?: (filters: ProjectFilters) => void;
}

const CaseFilters: React.FC<CaseFiltersProps> = ({
    searchTerm,
    setSearchTerm,
    searchInputRef,
    sortConfig,
    handleSort,
    showFilters,
    setShowFilters,
    layoutMode,
    saveLayoutMode,
    showColumnConfig,
    setShowColumnConfig,
    columns,
    toggleColumn,
    moveColumn,
    handleResetColumns,
    mergedPreferences,
    saveUserPreferences,
    filters,
    setFilters,
    situationFilters,
    setSituationFilters,
    clearFilters,
    quickFilter,
    setQuickFilter,
    projectionFilters,
    setProjectionFilters
}) => {
    const [showSort, setShowSort] = useState(false);

    return (
        <div className="mb-6 space-y-4">
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl p-4 shadow-2xl relative z-20">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={quickFilter === 'projections' ? "Buscar por nome ou CPF..." : "Buscar por número, cliente ou tribunal..."}
                            className="w-full bg-navy-950/50 text-white pl-10 pr-10 py-2.5 border border-white/10 rounded-lg focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 outline-none transition-all placeholder:text-slate-600"
                            value={quickFilter === 'projections' ? (projectionFilters?.searchTerm || '') : searchTerm}
                            onChange={(e) => {
                                if (quickFilter === 'projections' && setProjectionFilters && projectionFilters) {
                                    setProjectionFilters({ ...projectionFilters, searchTerm: e.target.value });
                                } else {
                                    setSearchTerm(e.target.value);
                                }
                            }}
                        />
                        {((quickFilter === 'projections' ? projectionFilters?.searchTerm : searchTerm)) && (
                            <button
                                onClick={() => {
                                    if (quickFilter === 'projections' && setProjectionFilters && projectionFilters) {
                                        setProjectionFilters({ ...projectionFilters, searchTerm: '' });
                                    } else {
                                        setSearchTerm('');
                                    }
                                    searchInputRef.current?.focus();
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                title="Limpar busca"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                        {quickFilter === 'projections' && projectionFilters && setProjectionFilters ? (
                            <div className="flex items-center gap-2 shrink-0">
                                <select
                                    value={projectionFilters.gender}
                                    onChange={(e) => setProjectionFilters({ ...projectionFilters, gender: e.target.value as any })}
                                    className="bg-navy-900 border border-white/20 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-gold-500 cursor-pointer hover:bg-navy-800 transition-colors [color-scheme:dark]"
                                >
                                    <option value="Todos" className="bg-navy-900">Todos Gêneros</option>
                                    <option value="Masculino" className="bg-navy-900">Masculino</option>
                                    <option value="Feminino" className="bg-navy-900">Feminino</option>
                                </select>

                                <select
                                    value={projectionFilters.modality}
                                    onChange={(e) => setProjectionFilters({ ...projectionFilters, modality: e.target.value as any })}
                                    className="bg-navy-900 border border-white/20 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-gold-500 cursor-pointer hover:bg-navy-800 transition-colors [color-scheme:dark]"
                                >
                                    <option value="Todas" className="bg-navy-900">Todas Modalidades</option>
                                    <option value="Urbana" className="bg-navy-900">Urbana</option>
                                    <option value="Rural" className="bg-navy-900">Rural</option>
                                    <option value="Híbrida" className="bg-navy-900">Híbrida</option>
                                </select>

                                <select
                                    value={projectionFilters.status}
                                    onChange={(e) => setProjectionFilters({ ...projectionFilters, status: e.target.value as any })}
                                    className="bg-navy-900 border border-white/20 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-gold-500 cursor-pointer hover:bg-navy-800 transition-colors [color-scheme:dark]"
                                >
                                    <option value="Todos" className="bg-navy-900">Todos Status</option>
                                    <option value="Elegíveis" className="bg-navy-900">Elegíveis</option>
                                    <option value="Pendentes" className="bg-navy-900">Com Pendências</option>
                                </select>

                                <div className="flex items-center gap-2 bg-navy-900 border border-white/20 rounded-lg px-3 py-2 hover:bg-navy-800 transition-colors">
                                    <Clock size={14} className="text-gold-500" />
                                    <select
                                        value={projectionFilters.period}
                                        onChange={(e) => setProjectionFilters({ ...projectionFilters, period: Number(e.target.value) })}
                                        className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer [color-scheme:dark]"
                                    >
                                        <option value={1} className="bg-navy-900">1 mês</option>
                                        <option value={3} className="bg-navy-900">3 meses</option>
                                        <option value={6} className="bg-navy-900">6 meses</option>
                                        <option value={12} className="bg-navy-900">1 ano</option>
                                        <option value={24} className="bg-navy-900">2 anos</option>
                                        <option value={60} className="bg-navy-900">5 anos</option>
                                        <option value={120} className="bg-navy-900">10 anos</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Ordenação */}
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setShowSort(!showSort);
                                            setShowFilters(false);
                                            setShowColumnConfig(false);
                                        }}
                                        className={`px-3 py-2.5 rounded-lg border flex items-center gap-2 transition-all text-sm font-medium whitespace-nowrap ${showSort ? 'bg-navy-950 border-gold-500 text-gold-500' : 'bg-navy-950/50 border-white/10 text-slate-400 hover:text-white'}`}
                                    >
                                        <SortAsc size={18} />
                                        <span className="hidden sm:inline">
                                            {sortConfig.key === 'data_abertura' ? 'Data' : sortConfig.key === 'numero_processo' ? 'Número' : sortConfig.key === 'valor_causa' ? 'Valor' : 'Ordenar'}
                                        </span>
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${showSort ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                {/* Filtros Avançados */}
                                <button
                                    onClick={() => {
                                        setShowFilters(!showFilters);
                                        setShowSort(false);
                                        setShowColumnConfig(false);
                                    }}
                                    className={`px-3 py-2.5 rounded-lg border flex items-center gap-2 transition-all text-sm font-medium whitespace-nowrap ${showFilters ? 'bg-navy-950 border-gold-500 text-gold-500' : 'bg-navy-950/50 border-white/10 text-slate-400 hover:text-white'}`}
                                >
                                    <Filter size={18} /> Filtros
                                </button>

                                {/* Configurar Colunas (Só em Lista) */}
                                {layoutMode === 'list' && (
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setShowColumnConfig(!showColumnConfig);
                                                setShowSort(false);
                                                setShowFilters(false);
                                            }}
                                            className={`px-3 py-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${showColumnConfig ? 'bg-navy-950 border-gold-500 text-gold-500' : 'bg-navy-950/50 border-white/10 text-slate-400 hover:text-white'}`}
                                        >
                                            <Settings size={18} /> <span className="hidden sm:inline">Colunas</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Seletor de visualização e escala */}
                        <div className="bg-navy-950/50 border border-white/10 rounded-lg flex p-0.5 items-center shrink-0">
                            {layoutMode === 'kanban' ? (
                                <SizeScaler
                                    value={mergedPreferences.kanbanCardScale || 1}
                                    onChange={(val) => saveUserPreferences({ kanbanCardScale: val })}
                                    min={0.5} max={1.5} step={0.05}
                                />
                            ) : (
                                <SizeScaler
                                    value={mergedPreferences.casesFontSize || 14}
                                    onChange={(val) => saveUserPreferences({ casesFontSize: val })}
                                    min={10} max={20} step={1}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Ordenação Expansível */}
                <AnimatePresence>
                    {showSort && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                            className="overflow-hidden pt-4 border-t border-white/5 mt-4"
                        >
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleSort('data_abertura')}
                                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${sortConfig.key === 'data_abertura' ? 'bg-gold-600 text-white shadow-lg shadow-gold-600/20' : 'bg-navy-900 border border-white/10 text-slate-400 hover:border-white/20'}`}
                                >
                                    Data de Abertura {sortConfig.key === 'data_abertura' && (sortConfig.direction === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}
                                </button>
                                <button
                                    onClick={() => handleSort('numero_processo')}
                                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${sortConfig.key === 'numero_processo' ? 'bg-gold-600 text-white shadow-lg shadow-gold-600/20' : 'bg-navy-900 border border-white/10 text-slate-400 hover:border-white/20'}`}
                                >
                                    Número do Processo {sortConfig.key === 'numero_processo' && (sortConfig.direction === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}
                                </button>
                                <button
                                    onClick={() => handleSort('valor_causa')}
                                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${sortConfig.key === 'valor_causa' ? 'bg-gold-600 text-white shadow-lg shadow-gold-600/20' : 'bg-navy-900 border border-white/10 text-slate-400 hover:border-white/20'}`}
                                >
                                    Valor da Causa {sortConfig.key === 'valor_causa' && (sortConfig.direction === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Colunas Expansível */}
                <AnimatePresence>
                    {showColumnConfig && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                            className="overflow-hidden pt-4 border-t border-white/5 mt-4"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visibilidade das Colunas</h4>
                                <button onClick={handleResetColumns} className="text-xs text-red-400 hover:text-red-300 transition-colors">Restaurar Padrão</button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {columns.map((col, idx) => (
                                    <div key={col.id} className="flex items-center justify-between p-2 bg-navy-900 border border-white/5 rounded-lg group hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <input
                                                type="checkbox"
                                                checked={col.visible}
                                                onChange={() => toggleColumn(col.id)}
                                                className="w-4 h-4 rounded bg-navy-800 border-white/10 text-gold-500 focus:ring-gold-500/20 cursor-pointer"
                                            />
                                            <span className="text-xs text-slate-300 truncate">{col.label}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} className="p-1 hover:text-white text-slate-600 disabled:opacity-0 transition-all"><ChevronLeft size={14} /></button>
                                            <button onClick={() => moveColumn(idx, 'down')} disabled={idx === columns.length - 1} className="p-1 hover:text-white text-slate-600 disabled:opacity-0 transition-all"><ChevronRight size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Filtros Avançados Expansível */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                            className="overflow-hidden border-t border-white/5 mt-4"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Filial</label>
                                    <select
                                        className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500"
                                        value={filters.filial || 'all'}
                                        onChange={(e) => setFilters({ ...filters, filial: e.target.value })}
                                    >
                                        <option value="all">Todas</option>
                                        {Object.values(Branch).map(branch => <option key={branch} value={branch}>{branch}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Ação</label>
                                    <select
                                        className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500"
                                        value={filters.tipo}
                                        onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                                    >
                                        <option value="all">Todas</option>
                                        {Object.values(CaseType).map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                                    <select
                                        className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500"
                                        value={filters.status}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    >
                                        <option value="all">Todos</option>
                                        {Object.values(CaseStatus).filter(s => s !== CaseStatus.ARQUIVADO).map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>

                                {filters.tipo === 'Aposentadoria' && (
                                    <div className="md:col-span-4 border-t border-white/5 pt-4 mt-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-2">Situação (A Protocolar)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Já elegível', 'Menos de 1 ano', 'Menos de 2 anos', 'Menos de 3 anos', 'Menos de 4 anos', 'Menos de 5 anos'].map((option) => (
                                                <button
                                                    key={option}
                                                    onClick={() => {
                                                        if (situationFilters.includes(option)) {
                                                            setSituationFilters(situationFilters.filter(f => f !== option));
                                                        } else {
                                                            setSituationFilters([...situationFilters, option]);
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${situationFilters.includes(option)
                                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                                                            : 'bg-navy-900 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                                                        }`}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Valor da Causa</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500"
                                            placeholder="Min"
                                            value={filters.minVal}
                                            onChange={(e) => setFilters({ ...filters, minVal: e.target.value })}
                                        />
                                        <input
                                            type="number"
                                            className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500"
                                            placeholder="Max"
                                            value={filters.maxVal}
                                            onChange={(e) => setFilters({ ...filters, maxVal: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Data de Abertura</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none [color-scheme:dark]"
                                            value={filters.dateStart}
                                            onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none [color-scheme:dark]"
                                            value={filters.dateEnd}
                                            onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-end md:col-span-2">
                                    <button
                                        onClick={() => {
                                            clearFilters();
                                            setSituationFilters([]);
                                        }}
                                        className="w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-600"
                                    >
                                        Limpar Filtros
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Quick Filter Pills */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 mt-4">
                    <button
                        onClick={() => setQuickFilter('all')}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${quickFilter === 'all' ? 'bg-zinc-200 text-black' : 'bg-navy-950/50 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setQuickFilter('mine')}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${quickFilter === 'mine' ? 'bg-gold-500/20 text-gold-500 border border-gold-500/30' : 'bg-navy-950/50 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'}`}
                    >
                        <User size={12} /> Meus Casos
                    </button>
                    <button
                        onClick={() => setQuickFilter('deadlines')}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${quickFilter === 'deadlines' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-navy-950/50 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'}`}
                    >
                        <AlertTriangle size={12} /> Prazos Próximos
                    </button>
                    <button
                        onClick={() => setQuickFilter('stale')}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${quickFilter === 'stale' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-navy-950/50 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Clock size={12} /> Parados +30d
                    </button>
                    {filters.tipo === 'Aposentadoria' && (
                        <button
                            onClick={() => setQuickFilter('projections')}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${quickFilter === 'projections' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-navy-950/50 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'}`}
                        >
                            <Hourglass size={12} /> Próximas Aposentadorias (projeções)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CaseFilters;
