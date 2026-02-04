import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, ChevronRight, Eye, Trash2, Wallet, CreditCard, User, Building2, Building, DollarSign } from 'lucide-react';
import { FinancialRecord, FinancialType } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';

export type FinancialViewItem =
    | { type: 'group'; id: string; caseId?: string; clientId: string; title: string; clientName: string; totalEntradas: number; totalSaidas: number; saldo: number; children: FinancialRecord[]; dataReferencia: string; status: 'PAGO' | 'PARCIAL' | 'PENDENTE' | 'DESPESA'; valorColorClass: string }
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
                                                                    <tr key={child.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-white/5 transition-colors">
                                                                        <td className="py-2 px-4 text-xs text-zinc-400 w-32 font-mono">{formatDateDisplay(child.data_vencimento)}</td>
                                                                        <td className="py-2 px-4 text-xs text-zinc-300">
                                                                            {child.tipo === FinancialType.COMISSAO && <span className="mr-2 text-[9px] font-bold bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded uppercase">COMISSÃO</span>}
                                                                            {child.titulo}
                                                                        </td>
                                                                        <td className="py-2 px-4">
                                                                            {renderPaymentDetails(child)}
                                                                        </td>
                                                                        <td className={`py-2 px-4 text-xs font-bold text-right w-32 ${child.tipo === FinancialType.RECEITA ? 'text-emerald-500' : 'text-red-500'}`}>{child.tipo === FinancialType.RECEITA ? '+' : '-'} {child.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                                        <td className="py-2 px-4 w-16 text-right"><button onClick={() => deleteFinancialRecord(child.id)} className="text-zinc-600 hover:text-red-500 p-1 rounded"><Trash2 size={12} /></button></td>
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
        </div>
    );
};

export default FinancialTable;
