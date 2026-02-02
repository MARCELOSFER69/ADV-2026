import React from 'react';
import { motion } from 'framer-motion';
import { Eye, RefreshCw, Trash2, Check, ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Case, ColumnConfig, CaseType } from '../../types';
import { formatCurrency } from '../../services/formatters';
import { getDeadlineStatus, getCaseTypeColor } from '@/utils/caseUtils';
import PendencyIndicator from '../ui/PendencyIndicator';

interface CaseListProps {
    cases: Case[];
    columns: ColumnConfig[];
    selectedCaseIds: string[];
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    handleSort: (key: string) => void;
    handleToggleSelectCase: (id: string) => void;
    setSelectedCase: (c: Case | null) => void;
    setCaseToArchive: (c: Case) => void;
    setCaseToDelete: (c: Case) => void;
    handleRestoreClick: (c: Case) => void;
    viewMode: 'active' | 'archived';
    // clients: any[]; // REMOVED
    currentPage: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    totalCases: number;
    itemsPerPage: number;
    isFetching: boolean;
}

const CaseList: React.FC<CaseListProps> = ({
    cases,
    columns,
    selectedCaseIds,
    sortConfig,
    handleSort,
    handleToggleSelectCase,
    setSelectedCase,
    setCaseToArchive,
    setCaseToDelete,
    handleRestoreClick,
    viewMode,
    // clients, // REMOVED
    currentPage,
    setCurrentPage,
    totalCases,
    itemsPerPage,
    isFetching
}) => {

    const getClientName = (clientId: string, caseItem: Case) => {
        return caseItem.client_name || `Cliente ${clientId.substring(0, 4)}`;
    };

    const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

    return (
        <div className="flex flex-col h-full bg-[#0f1014] rounded-lg border border-white/5 overflow-hidden shadow-xl">
            <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#18181b] sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="py-4 px-6 w-12 text-center">
                                <div className="flex items-center justify-center">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedCaseIds.length > 0 && selectedCaseIds.length === cases.length
                                        ? 'bg-gold-500 border-gold-500'
                                        : 'border-zinc-600 hover:border-gold-500'
                                        }`}
                                        onClick={() => {
                                            if (selectedCaseIds.length === cases.length) {
                                                cases.forEach(c => handleToggleSelectCase(c.id)); // This might need a bulk toggle in parent, but simple toggle here works if parent handles logic, actually simpler: Pass a bulk select handler? Or iterate.
                                                // Ideally parent checks if all selected.
                                                // For now, let's assume parent handles bulk select or we iterate.
                                                // Actually, let's just toggle all here if we can or pass a "selectAll" prop.
                                                // Implementing naive select all for this component's page items.
                                                cases.map(c => c.id).forEach(id => {
                                                    if (selectedCaseIds.includes(id)) handleToggleSelectCase(id);
                                                });
                                            } else {
                                                cases.map(c => c.id).forEach(id => {
                                                    if (!selectedCaseIds.includes(id)) handleToggleSelectCase(id);
                                                });
                                            }
                                        }}
                                    >
                                        {(selectedCaseIds.length > 0 && cases.length > 0 && cases.every(c => selectedCaseIds.includes(c.id))) && <Check size={12} className="text-black stroke-[4]" />}
                                        {selectedCaseIds.length > 0 && !cases.every(c => selectedCaseIds.includes(c.id)) && <div className="w-2 h-0.5 bg-gold-500" />}
                                    </div>
                                </div>
                            </th>
                            {sortedColumns.filter(c => c.visible).map(col => (
                                <th key={col.id} className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider select-none">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-300" onClick={() => handleSort(col.id === 'numero' ? 'numero_processo' : (col.id === 'data_abertura' ? 'data_abertura' : col.id))}>
                                        {col.label}
                                        {sortConfig.key === (col.id === 'numero' ? 'numero_processo' : (col.id === 'data_abertura' ? 'data_abertura' : col.id)) ? (
                                            sortConfig.direction === 'asc' ? <ArrowDown size={12} className="text-gold-500" /> : <ArrowUp size={12} className="text-gold-500" />
                                        ) : <ArrowUpDown size={12} className="opacity-30" />}
                                    </div>
                                </th>
                            ))}
                            <th className="py-4 px-6 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {cases.map((caseItem, index) => {
                            const deadline = getDeadlineStatus(caseItem.data_fatal);
                            const clientName = getClientName(caseItem.client_id, caseItem);

                            return (
                                <motion.tr
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.03 }}
                                    key={caseItem.id}
                                    className={`group transition-colors cursor-pointer border-l-2 ${selectedCaseIds.includes(caseItem.id)
                                        ? 'bg-gold-500/10 border-gold-500 hover:bg-gold-500/15'
                                        : 'hover:bg-white/5 border-transparent'
                                        }`}
                                    onClick={() => setSelectedCase(caseItem)}
                                >
                                    <td className="py-4 px-6 align-middle" onClick={(e) => { e.stopPropagation(); handleToggleSelectCase(caseItem.id); }}>
                                        <div className="relative flex items-center justify-center w-5 h-5">
                                            {/* Row Dot */}
                                            <div className={`w-1.5 h-1.5 rounded-full bg-slate-700 transition-all duration-300 ${(selectedCaseIds.length > 0 || selectedCaseIds.includes(caseItem.id)) ? 'opacity-0 scale-0' : 'group-hover:opacity-0 group-hover:scale-0'
                                                }`} />

                                            {/* Row Checkbox */}
                                            <div className={`absolute inset-0 rounded border-2 flex items-center justify-center transition-all duration-300 ${selectedCaseIds.includes(caseItem.id)
                                                ? 'bg-gold-500 border-gold-500 text-black translate-y-0 opacity-100 scale-100'
                                                : selectedCaseIds.length > 0
                                                    ? 'border-slate-600 bg-white/5 opacity-100 scale-100'
                                                    : 'border-slate-700 bg-white/5 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'
                                                }`}>
                                                {selectedCaseIds.includes(caseItem.id) && <Check size={14} className="stroke-[4]" />}
                                            </div>
                                        </div>
                                    </td>
                                    {sortedColumns.filter(c => c.visible).map(col => (
                                        <td key={`${caseItem.id}-${col.id}`} className="py-4 px-6 align-middle">
                                            {col.id === 'titulo' && (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-white">{caseItem.titulo}</span>
                                                    {deadline && <span className={`text-[0.85em] px-1.5 py-0.5 rounded font-bold inline-block w-fit mt-1 bg-zinc-900/50 border border-white/10 ${deadline.color}`}>{deadline.label}</span>}
                                                </div>
                                            )}
                                            {col.id === 'numero' && <span className="opacity-50 font-mono text-[0.9em]">{caseItem.numero_processo}</span>}
                                            {col.id === 'cliente' && (
                                                <PendencyIndicator pendencies={[]} align="left">
                                                    <div className="flex items-center gap-3 cursor-help">
                                                        <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center font-bold text-[0.85em] shrink-0 shadow-sm bg-zinc-700 text-zinc-300`}>
                                                            {clientName ? clientName.substring(0, 1) : '?'}
                                                        </div>
                                                        <span className="text-zinc-300 group-hover:text-white transition-colors line-clamp-1">{clientName}</span>
                                                    </div>
                                                </PendencyIndicator>
                                            )}
                                            {col.id === 'status' && <span className="text-[0.85em] font-medium px-2 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded whitespace-nowrap">{caseItem.status}</span>}
                                            {col.id === 'tipo' && <span className={`text-[0.85em] px-2 py-1 rounded border font-medium whitespace-nowrap ${getCaseTypeColor(caseItem.tipo as CaseType)}`}>{caseItem.tipo}{caseItem.modalidade ? ` (${caseItem.modalidade})` : ''}</span>}
                                            {col.id === 'tribunal' && <span className="text-zinc-500">{caseItem.tribunal}</span>}
                                            {col.id === 'valor' && <span className="text-zinc-200 font-medium whitespace-nowrap">{formatCurrency(caseItem.valor_causa)}</span>}
                                            {col.id === 'data_abertura' && <span className="text-zinc-500 text-[0.9em] whitespace-nowrap">{(() => {
                                                try {
                                                    return caseItem.data_abertura ? new Date(caseItem.data_abertura).toLocaleDateString() : '-';
                                                } catch (e) { return '-'; }
                                            })()}</span>}
                                            {col.id === 'pagamento' && <span className={`text-[0.85em] font-bold px-2 py-1 rounded border whitespace-nowrap ${caseItem.status_pagamento === 'Pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{caseItem.status_pagamento}</span>}
                                        </td>
                                    ))}
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {viewMode === 'archived' && <button onClick={(e) => { e.stopPropagation(); handleRestoreClick(caseItem); }} className="text-zinc-400 hover:text-emerald-400 p-1.5 rounded transition-colors" title="Restaurar"><RefreshCw size={16} /></button>}
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedCase(caseItem); }} className="text-zinc-400 hover:text-white p-1.5 rounded transition-colors" title="Ver"><Eye size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); viewMode === 'active' ? setCaseToArchive(caseItem) : setCaseToDelete(caseItem); }} className="text-zinc-400 hover:text-red-400 p-1.5 rounded transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </motion.tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* BARRA DE PAGINAÇÃO */}
            <div className="flex items-center justify-between p-4 border-t border-zinc-800 bg-[#0f1014] mt-auto">
                <span className="text-sm text-zinc-500">
                    Página <span className="text-white font-bold">{currentPage}</span> de <span className="text-white font-bold">{Math.ceil(totalCases / itemsPerPage) || 1}</span>
                    <span className="mx-2 text-zinc-700">|</span>
                    Total: {totalCases}
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || isFetching}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <ChevronLeft size={16} /> Anterior
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCases / itemsPerPage), p + 1))}
                        disabled={currentPage >= Math.ceil(totalCases / itemsPerPage) || isFetching}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        Próximo <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CaseList;
