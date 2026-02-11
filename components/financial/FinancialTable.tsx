import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ChevronRight, Eye, Trash2, Wallet, CreditCard, User, Building2, Building, DollarSign, X } from 'lucide-react';
import { FinancialRecord, FinancialType } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';

export type FinancialViewItem =
    | { type: 'group'; id: string; caseId?: string; clientId: string; title: string; clientName: string; totalEntradas: number; totalSaidas: number; saldo: number; children: any[]; dataReferencia: string; status: 'PAGO' | 'PARCIAL' | 'PENDENTE' | 'DESPESA'; valorColorClass: string; isGpsSummary?: boolean }
    | { type: 'single'; data: FinancialRecord };

interface FinancialTableProps {
    processedData: FinancialViewItem[];
    expandedGroups: Set<string>;
    toggleGroup: (id: string) => void;
    navigateToCase: (caseId: string) => void;
    deleteFinancialRecord: (id: string) => void;
}

const renderPaymentDetails = (record: FinancialRecord) => {
    if (record.is_office_expense) return <span className="text-zinc-500 text-xs italic">Agrupado</span>;

    const hasDetails = record.forma_pagamento || record.recebedor || record.conta || record.captador_nome;
    if (!hasDetails) return <span className="text-zinc-600 text-xs italic">-</span>;

    return (
        <div className="space-y-0.5">
            {record.forma_pagamento && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    {record.forma_pagamento === 'Especie' ? <Wallet size={12} className="text-emerald-500" /> : <CreditCard size={12} className="text-blue-400" />}
                    {record.forma_pagamento}
                </div>
            )}
            {(record.recebedor || record.captador_nome) && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <User size={12} /> {record.recebedor || record.captador_nome}
                </div>
            )}
            {record.conta && (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                    <Building2 size={10} /> {record.tipo_conta ? `${record.tipo_conta} - ` : ''}{record.conta}
                </div>
            )}
        </div>
    );
};

const FinancialTable: React.FC<FinancialTableProps> = ({
    processedData,
    expandedGroups,
    toggleGroup,
    navigateToCase,
    deleteFinancialRecord
}) => {
    const [selectedGpsDay, setSelectedGpsDay] = React.useState<{ date: string; records: FinancialRecord[] } | null>(null);

    return (
        <div className="bg-[#0f1014] rounded-xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#131418] border-b border-white/5 shadow-md">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Descrição / Cliente</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tipo / Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes Pagamento</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Líquido</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {processedData.map((item, index) => {
                            if (item.type === 'group') {
                                const isExpanded = expandedGroups.has(item.id);
                                return (
                                    <React.Fragment key={item.id}>
                                        <motion.tr
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.03 }}
                                            className={`group cursor-pointer transition-colors ${isExpanded ? 'bg-zinc-800/50' : 'hover:bg-zinc-900'}`} onClick={() => toggleGroup(item.id)}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-md transition-colors border ${isExpanded ? 'bg-transparent border-gold-500 text-gold-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-transparent border-zinc-700 text-zinc-500 group-hover:text-zinc-300 group-hover:border-zinc-500'}`}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>
                                                    <div><span className="font-bold text-zinc-200 block group-hover:text-gold-500 transition-colors text-sm">{item.title}</span><span className="text-[10px] text-zinc-500 flex items-center gap-1"><Calendar size={10} /> Ref: {formatDateDisplay(item.dataReferencia)}</span></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-zinc-800 border-zinc-700 text-zinc-400`}>{item.status}</span></td>
                                            <td className="px-6 py-4 text-xs text-zinc-500">{item.children.length} itens</td>
                                            <td className="px-6 py-4 text-right"><span className={`text-sm font-bold ${item.valorColorClass}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.saldo)}</span></td>
                                            <td className="px-6 py-4 text-right">
                                                {item.caseId && <button onClick={(e) => { e.stopPropagation(); navigateToCase(item.caseId!); }} className="p-2 text-zinc-500 hover:text-gold-500 hover:bg-gold-500/10 rounded-lg transition-colors"><Eye size={18} /></button>}
                                            </td>
                                        </motion.tr>
                                        {isExpanded && (
                                            <tr className="bg-black/40 shadow-inner">
                                                <td colSpan={5} className="p-0">
                                                    <div className="border-l-2 border-gold-500/30 ml-8 my-2">
                                                        <table className="w-full">
                                                            <tbody>
                                                                {item.children.map(child => (
                                                                    <tr
                                                                        key={child.id}
                                                                        className={`border-b border-zinc-800/50 last:border-0 hover:bg-white/5 transition-colors ${child.isGpsDaySummary ? 'cursor-pointer' : ''}`}
                                                                        onClick={(e) => {
                                                                            if (child.isGpsDaySummary) {
                                                                                e.stopPropagation();
                                                                                setSelectedGpsDay({ date: child.data_vencimento, records: child.records });
                                                                            }
                                                                        }}
                                                                    >
                                                                        <td className="py-2 px-4 text-xs text-zinc-400 w-32 font-mono">{formatDateDisplay(child.data_vencimento)}</td>
                                                                        <td className="py-2 px-4 text-xs text-zinc-300">
                                                                            {child.tipo === FinancialType.COMISSAO && <span className="mr-2 text-[9px] font-bold bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded uppercase">COMISSÃO</span>}
                                                                            {child.isGpsDaySummary && <span className="mr-2 text-[9px] font-bold bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded uppercase">RESUMO GPS</span>}
                                                                            {child.titulo}
                                                                        </td>
                                                                        <td className="py-2 px-4">
                                                                            {child.isGpsDaySummary ? <span className="text-[10px] text-zinc-500 italic">Clique para ver clientes</span> : renderPaymentDetails(child)}
                                                                        </td>
                                                                        <td className={`py-2 px-4 text-xs font-bold text-right w-32 ${child.tipo === FinancialType.RECEITA ? 'text-emerald-500' : 'text-red-500'}`}>{child.tipo === FinancialType.RECEITA ? '+' : '-'} {child.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                                        <td className="py-2 px-4 w-16 text-right">
                                                                            {!child.isGpsDaySummary && <button onClick={() => deleteFinancialRecord(child.id)} className="text-zinc-600 hover:text-red-500 p-1 rounded"><Trash2 size={12} /></button>}
                                                                            {child.isGpsDaySummary && <ChevronRight size={14} className="text-zinc-700 ml-auto" />}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            } else {
                                const record = item.data;
                                return (
                                    <motion.tr
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.03 }}
                                        key={record.id} className="group hover:bg-zinc-900 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-md bg-transparent border border-white/10 text-zinc-500`}>{record.is_office_expense ? <Building size={16} /> : <DollarSign size={16} />}</div>
                                                <div>
                                                    <span className="font-medium text-zinc-300 block group-hover:text-white transition-colors text-sm">{record.titulo}</span>
                                                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5"><Calendar size={10} /> {formatDateDisplay(record.data_vencimento)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center"><span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">Avulso</span></td>
                                        <td className="px-6 py-4">
                                            {renderPaymentDetails(record)}
                                        </td>

                                        <td className="px-6 py-4 text-right"><span className={`text-sm font-bold ${record.tipo === FinancialType.RECEITA ? 'text-emerald-400' : 'text-red-400'}`}>{record.tipo === FinancialType.RECEITA ? '+' : '-'} {record.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => deleteFinancialRecord(record.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                        </td>
                                    </motion.tr>
                                );
                            }
                        })}
                        {processedData.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-zinc-500 italic">Nenhuma movimentação encontrada neste período.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* GPS Detail Modal */}
            <AnimatePresence>
                {selectedGpsDay && (
                    <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
                            onClick={() => setSelectedGpsDay(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#0f1014] w-full max-w-2xl rounded-3xl border border-white/10 shadow-3xl relative z-10 overflow-hidden pointer-events-auto"
                        >
                            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gold-500/10 rounded-2xl text-gold-500">
                                            <Calendar size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white font-serif">GPS Pagas em {formatDateDisplay(selectedGpsDay.date)}</h3>
                                            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">
                                                Detalhamento por Cliente
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedGpsDay(null)}
                                        className="p-2 text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                                <div className="space-y-3">
                                    {selectedGpsDay.records.map((record) => (
                                        <div key={record.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-gold-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400 group-hover:text-gold-500 transition-colors">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-gold-500 transition-colors text-sm">
                                                        {record.clients?.nome_completo || 'Cliente Não Identificado'}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500 mt-0.5 italic">
                                                        {record.titulo}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-mono font-bold text-emerald-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.valor)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-end">
                                <button
                                    onClick={() => setSelectedGpsDay(null)}
                                    className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all text-sm border border-white/5"
                                >
                                    Fechar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FinancialTable;
