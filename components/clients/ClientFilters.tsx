import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SortAsc, ChevronDown, ChevronUp, Filter, Settings, LayoutGrid, LayoutList, ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Branch, ColumnConfig, Client } from '../../types';
import SizeScaler from '../ui/SizeScaler';

interface ClientFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    sortConfig: { key: keyof Client | 'status'; direction: 'asc' | 'desc' };
    handleSort: (key: keyof Client | 'status') => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    viewMode: 'list' | 'grid';
    saveViewMode: (mode: 'list' | 'grid') => void;
    showColumnConfig: boolean;
    setShowColumnConfig: (show: boolean) => void;
    columns: ColumnConfig[];
    toggleColumn: (id: string) => void;
    moveColumn: (idx: number, direction: 'up' | 'down') => void;
    handleResetColumns: () => void;
    mergedPreferences: any;
    saveUserPreferences: (prefs: any) => void;
    activeFilters: any;
    setActiveFilters: (filters: any) => void;
    clearFilters: () => void;
}

const ClientFilters: React.FC<ClientFiltersProps> = ({
    searchTerm,
    setSearchTerm,
    searchInputRef,
    sortConfig,
    handleSort,
    showFilters,
    setShowFilters,
    viewMode,
    saveViewMode,
    showColumnConfig,
    setShowColumnConfig,
    columns,
    toggleColumn,
    moveColumn,
    handleResetColumns,
    mergedPreferences,
    saveUserPreferences,
    activeFilters,
    setActiveFilters,
    clearFilters
}) => {
    const [showSort, setShowSort] = useState(false);

    return (
        <div className="mb-6 space-y-4">
            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl p-4 shadow-2xl relative z-20">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar por nome, CPF, cidade ou telefone..."
                            className="w-full bg-navy-950/50 text-white pl-10 pr-10 py-2.5 border border-white/10 rounded-lg focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 outline-none transition-all placeholder:text-slate-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                title="Limpar busca"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
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
                                    {sortConfig.key === 'nome_completo' ? 'Nome' : sortConfig.key === 'filial' ? 'Filial' : sortConfig.key === 'captador' ? 'Captador' : 'Ordenar'}
                                </span>
                                <ChevronDown size={14} className={`transition-transform duration-200 ${showSort ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

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

                        <div className="bg-navy-950/50 border border-white/10 rounded-lg flex p-0.5 items-center">
                            {viewMode === 'grid' ? (
                                <SizeScaler
                                    value={mergedPreferences.clientsCardScale || 1}
                                    onChange={(val) => saveUserPreferences({ clientsCardScale: val })}
                                    min={0.5} max={1.5} step={0.05}
                                />
                            ) : (
                                <SizeScaler
                                    value={mergedPreferences.clientsFontSize || 14}
                                    onChange={(val) => saveUserPreferences({ clientsFontSize: val })}
                                    min={10} max={20} step={1}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Seção de Ordenação Expansível */}
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
                                    onClick={() => handleSort('nome_completo')}
                                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${sortConfig.key === 'nome_completo' ? 'bg-gold-600 text-white shadow-lg shadow-gold-600/20' : 'bg-navy-900 border border-white/10 text-slate-400 hover:border-white/20'}`}
                                >
                                    Nome {sortConfig.key === 'nome_completo' && (sortConfig.direction === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}
                                </button>
                                <button
                                    onClick={() => handleSort('filial')}
                                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${sortConfig.key === 'filial' ? 'bg-gold-600 text-white shadow-lg shadow-gold-600/20' : 'bg-navy-900 border border-white/10 text-slate-400 hover:border-white/20'}`}
                                >
                                    Filial {sortConfig.key === 'filial' && (sortConfig.direction === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}
                                </button>
                                <button
                                    onClick={() => handleSort('captador')}
                                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${sortConfig.key === 'captador' ? 'bg-gold-600 text-white shadow-lg shadow-gold-600/20' : 'bg-navy-900 border border-white/10 text-slate-400 hover:border-white/20'}`}
                                >
                                    Captador {sortConfig.key === 'captador' && (sortConfig.direction === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Seção de Colunas Expansível */}
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
                                        value={activeFilters.filial}
                                        onChange={(e) => setActiveFilters({ ...activeFilters, filial: e.target.value })}
                                    >
                                        <option value="all">Todas</option>
                                        {Object.values(Branch).map(branch => <option key={branch} value={branch}>{branch}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Status (Processos)</label>
                                    <select
                                        className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500"
                                        value={activeFilters.status}
                                        onChange={(e) => setActiveFilters({ ...activeFilters, status: e.target.value })}
                                    >
                                        <option value="all">Todos</option>
                                        <option value="active">Ativo</option>
                                        <option value="concedido">Concedido</option>
                                        <option value="indeferido">Indeferido</option>
                                        <option value="inactive">Inativo</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Pendências</label>
                                    <select
                                        className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500"
                                        value={activeFilters.pendencia}
                                        onChange={(e) => setActiveFilters({ ...activeFilters, pendencia: e.target.value })}
                                    >
                                        <option value="all">Todas</option>
                                        <option value="com_pendencia">Com Pendências</option>
                                        <option value="sem_pendencia">Regular</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Situação GPS</label>
                                    <select
                                        className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500"
                                        value={activeFilters.gps}
                                        onChange={(e) => setActiveFilters({ ...activeFilters, gps: e.target.value })}
                                    >
                                        <option value="all">Todas</option>
                                        <option value="pendente">Pendente (Sem Guia)</option>
                                        <option value="puxada">Puxada (A Pagar)</option>
                                        <option value="regular">Regular (Pago)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Sexo</label>
                                    <select
                                        className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500"
                                        value={activeFilters.sexo}
                                        onChange={(e) => setActiveFilters({ ...activeFilters, sexo: e.target.value })}
                                    >
                                        <option value="all">Todos</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Feminino">Feminino</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Captador</label>
                                    <input
                                        className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none focus:border-gold-500"
                                        placeholder="Nome"
                                        value={activeFilters.captador}
                                        onChange={(e) => setActiveFilters({ ...activeFilters, captador: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Data Cadastro</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none [color-scheme:dark]"
                                            value={activeFilters.dateStart}
                                            onChange={(e) => setActiveFilters({ ...activeFilters, dateStart: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="w-full bg-navy-900 text-white px-3 py-2 border border-white/10 rounded-lg text-sm outline-none [color-scheme:dark]"
                                            value={activeFilters.dateEnd}
                                            onChange={(e) => setActiveFilters({ ...activeFilters, dateEnd: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-end md:col-span-4">
                                    <button
                                        onClick={clearFilters}
                                        className="w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-600"
                                    >
                                        Limpar Filtros
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ClientFilters;
