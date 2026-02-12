import React from 'react';
import { motion } from 'framer-motion';
import { HandCoins, CheckSquare, Square, FileText, FileCheck, Trash2, CheckCircle, Clock, FilePlus, Paperclip, ExternalLink } from 'lucide-react';
import { FinancialRecord, CommissionReceipt, FinancialType } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';

interface CommissionsTabProps {
    totalCommissions: number;
    subTab: 'list' | 'receipts';
    setSubTab: (tab: 'list' | 'receipts') => void;
    selectedCommissionIds: Set<string>;
    commissionsData: FinancialRecord[];
    allFinancial: FinancialRecord[];
    commissionReceipts: CommissionReceipt[];
    handleSelectCommission: (record: FinancialRecord) => void;
    deleteFinancialRecord: (id: string) => void;
    handleOpenReceipt: (receipt: CommissionReceipt) => void;
    confirmReceiptSignature: (id: string) => void;
    deleteCommissionReceipt: (id: string) => void;
    setReceiptModalOpen: (open: boolean) => void;
    setActiveUploadId: (id: string) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
}

const getImplicitCaptador = (record?: FinancialRecord) => {
    if (!record) return 'Desconhecido';
    if (record.captador_nome) return record.captador_nome;
    if (record.titulo && record.titulo.includes(' - ')) return record.titulo.split(' - ')[1];
    return 'Não identificado';
};

const CommissionsTab: React.FC<CommissionsTabProps> = ({
    totalCommissions,
    subTab,
    setSubTab,
    selectedCommissionIds,
    commissionsData,
    allFinancial,
    commissionReceipts,
    handleSelectCommission,
    deleteFinancialRecord,
    handleOpenReceipt,
    confirmReceiptSignature,
    deleteCommissionReceipt,
    setReceiptModalOpen,
    setActiveUploadId,
    fileInputRef
}) => {
    return (
        <>
            <div className="mb-6 flex gap-4">
                <div className="bg-[#0a090b] p-6 rounded-2xl border-2 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.05)] relative overflow-hidden group max-w-sm flex-1 hover:border-purple-500/80 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-purple-400/80 font-black uppercase tracking-[0.2em] mb-1">Total Comissões Pagas</p>
                            <h3 className="text-3xl font-black text-white tracking-tight">
                                - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCommissions)}
                            </h3>
                        </div>
                        <div className="p-3 bg-transparent rounded-xl text-purple-500 border-2 border-purple-500/80 transition-all duration-300 group-hover:scale-105">
                            <HandCoins size={28} strokeWidth={2} />
                        </div>
                    </div>
                </div>
                <div className="bg-[#0f1014] p-5 rounded-xl border border-white/10 flex-1 flex flex-col justify-center">
                    <div className="flex gap-2 bg-[#18181b] p-1.5 rounded-xl w-fit border border-white/5">
                        <button onClick={() => setSubTab('list')} className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${subTab === 'list' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-400 hover:text-white'}`}>Lista de Comissões</button>
                        <button onClick={() => setSubTab('receipts')} className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${subTab === 'receipts' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-400 hover:text-white'}`}>Recibos Gerados</button>
                    </div>
                </div>
            </div>

            {subTab === 'list' ? (
                <div className="bg-[#0f1014] rounded-xl border border-zinc-800 overflow-hidden flex flex-col shadow-2xl relative">
                    {selectedCommissionIds.size > 0 && (
                        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-4 fade-in">
                            <button onClick={() => setReceiptModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] flex items-center gap-3 font-bold text-sm transform transition-all hover:scale-105 active:scale-95 border-2 border-purple-400/50">
                                <FileText size={22} /> Gerar Recibo ({selectedCommissionIds.size})
                            </button>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#131418] border-b border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr><th className="px-6 py-4 w-12 text-center"><CheckSquare size={16} /></th><th className="px-6 py-4">Captador</th><th className="px-6 py-4">Cliente / Processo</th><th className="px-6 py-4">Data Pagamento</th><th className="px-6 py-4 text-right">Valor</th><th className="px-6 py-4 text-center">Status Recibo</th><th className="px-6 py-4 text-right">Ação</th></tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {commissionsData.map((comm, index) => {
                                    const relatedCase = comm.cases;
                                    const relatedClient = comm.clients;
                                    let displayCaptador = getImplicitCaptador(comm);
                                    const isSelected = selectedCommissionIds.has(comm.id);
                                    const hasReceipt = !!comm.receipt_id;
                                    const receiptInfo = hasReceipt ? commissionReceipts.find(r => r.id === comm.receipt_id) : null;
                                    return (
                                        <motion.tr
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.03 }}
                                            key={comm.id} className={`transition-colors ${isSelected ? 'bg-purple-500/10' : 'hover:bg-zinc-900'}`}>
                                            <td className="px-6 py-4 text-center">{!hasReceipt ? (<button onClick={() => handleSelectCommission(comm)} className={`text-zinc-500 hover:text-purple-400 transition-colors ${isSelected ? 'text-purple-500' : ''}`}>{isSelected ? <CheckSquare size={18} /> : <Square size={18} />}</button>) : (<div className="w-4 h-4 mx-auto" />)}</td>
                                            <td className="px-6 py-4"><div className="font-bold text-purple-400">{displayCaptador}</div></td>
                                            <td className="px-6 py-4"><div className="text-sm text-zinc-300 font-bold">{relatedClient?.nome_completo || 'N/A'}</div><div className="text-xs text-zinc-500">{relatedCase?.titulo || 'Avulso'}</div></td>
                                            <td className="px-6 py-4 text-sm text-zinc-400 font-mono">{formatDateDisplay(comm.data_vencimento)}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-right text-red-400">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comm.valor)}</td>
                                            <td className="px-6 py-4 text-center">{hasReceipt ? ((receiptInfo?.status_assinatura === 'assinado' || receiptInfo?.status === 'signed') ? (<span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full"><FileCheck size={12} /> Assinado</span>) : (<span className="inline-flex items-center gap-1 text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full"><FileText size={12} /> Gerado</span>)) : (<span className="text-zinc-600 text-xs">-</span>)}</td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => deleteFinancialRecord(comm.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button></td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {commissionReceipts.length > 0 ? commissionReceipts.map(receipt => {
                        const countItems = allFinancial.filter(f => f.receipt_id === receipt.id).length;
                        const isSigned = receipt.status_assinatura === 'assinado' || receipt.status === 'signed';
                        let borderClass = isSigned ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]';
                        let badge = isSigned ? <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 font-bold"><CheckCircle size={10} /> Assinado</span> : <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1 font-bold"><Clock size={10} /> Pendente</span>;

                        return (
                            <div key={receipt.id} className={`bg-[#0f1014] border ${borderClass} rounded-xl p-5 hover:border-opacity-50 transition-all group relative flex flex-col`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col"><h4 className="font-bold text-white text-lg line-clamp-1" title={receipt.captador_nome}>{receipt.captador_nome}</h4><p className="text-xs text-zinc-500 font-mono mt-0.5">Gerado: {new Date(receipt.data_geracao).toLocaleDateString('pt-BR')}</p></div>
                                    <div className="flex items-start gap-2">
                                        {badge}
                                        <button onClick={(e) => { e.stopPropagation(); deleteCommissionReceipt(receipt.id); }} className="p-1 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="mb-4 flex-1"><div className="flex justify-between items-end"><span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Total</span><p className="text-xl font-bold text-purple-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.valor_total)}</p></div><div className="w-full h-px bg-zinc-800 my-2"></div><p className="text-xs text-zinc-400 flex items-center gap-1"><FileText size={12} /> Referente a <strong>{countItems}</strong> comissões</p></div>
                                <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
                                    {!isSigned ? (
                                        <button
                                            onClick={() => confirmReceiptSignature(receipt.id)}
                                            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-600/20"
                                        >
                                            Confirmar Assinatura
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            {receipt.arquivo_url ? (
                                                <a
                                                    href={receipt.arquivo_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <ExternalLink size={14} /> Ver Comprovante
                                                </a>
                                            ) : (
                                                <button
                                                    onClick={() => { setActiveUploadId(receipt.id); fileInputRef.current?.click(); }}
                                                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all animate-pulse"
                                                >
                                                    <Paperclip size={14} /> Anexar Arquivo
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-full py-16 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20"><div className="bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><FilePlus size={32} className="text-zinc-600" /></div><p className="text-sm font-medium text-zinc-400">Nenhum recibo gerado ainda.</p></div>
                    )}
                </div>
            )}
        </>
    );
};

export default CommissionsTab;
