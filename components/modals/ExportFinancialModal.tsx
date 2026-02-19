import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, Loader2, Table, BarChart3, Calendar, History, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FinancialRecord, GeneratedReport } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useApp } from '../../context/AppContext';
import { uploadReportToCloud, fetchUserReports, deleteReport as deleteReportService } from '../../services/reportsService';
import ConfirmModal from '../ui/ConfirmModal';

interface ExportFinancialModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: FinancialRecord[];
    periodLabel: string;
    showToast: (type: 'success' | 'error', message: string) => void;
}

const ExportFinancialModal: React.FC<ExportFinancialModalProps> = ({
    isOpen,
    onClose,
    data,
    periodLabel,
    showToast
}) => {
    const { user } = useApp();
    const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
    const [isExporting, setIsExporting] = useState(false);
    const [reports, setReports] = useState<GeneratedReport[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<GeneratedReport | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    React.useEffect(() => {
        if (activeTab === 'history' && user?.id) {
            loadReports();
        }
    }, [activeTab, user?.id]);

    const loadReports = async () => {
        if (!user?.id) return;
        setIsLoadingReports(true);
        try {
            const allReports = await fetchUserReports(user.id);
            setReports(allReports.filter(r => r.name.startsWith('Relatorio Financeiro')));
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            showToast('error', 'Erro ao carregar histórico.');
        } finally {
            setIsLoadingReports(false);
        }
    };

    const handleExport = async (mode: 'data' | 'numbers') => {
        setIsExporting(true);
        try {
            const workbook = XLSX.utils.book_new();
            const fileName = `Relatorio Financeiro - ${mode === 'data' ? 'Dados' : 'Numeros'} (${periodLabel.replace(/\//g, '-')}).xlsx`;

            if (mode === 'data') {
                const exportData = data.map(record => ({
                    'Título': record.titulo || 'N/A',
                    'Cliente': record.clients?.nome_completo || record.cases?.clients?.nome_completo || 'N/A',
                    'Tipo': record.tipo || 'N/A',
                    'Movimentação': record.tipo_movimentacao || 'N/A',
                    'Valor': Number(record.valor) || 0,
                    'Vencimento': record.data_vencimento ? formatDateDisplay(record.data_vencimento) : 'N/A',
                    'Pagamento': record.data_pagamento ? formatDateDisplay(record.data_pagamento) : 'N/A',
                    'Status': record.status_pagamento ? 'Pago' : 'Pendente',
                    'Forma': record.forma_pagamento || 'N/A',
                    'Recebedor': record.recebedor || 'N/A',
                    'Conta': record.conta || 'N/A',
                    'Filial': record.filial || record.clients?.filial || record.cases?.clients?.filial || 'N/A',
                    'Observação': record.observacao || ''
                }));

                const worksheet = XLSX.utils.json_to_sheet(exportData);
                worksheet['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos Detalhados');
            } else {
                // Modo Números (Resumo)
                const income = data.filter(r => r.tipo === 'Receita' && r.status_pagamento).reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
                const expense = data.filter(r => r.tipo === 'Despesa' && r.status_pagamento).reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
                const commissions = data.filter(r => (r.tipo?.toString().toLowerCase().includes('comis') || r.tipo_movimentacao?.toString().toLowerCase().includes('comis')) && r.status_pagamento).reduce((sum, r) => sum + (Number(r.valor) || 0), 0);

                const categories: Record<string, number> = {};
                data.filter(r => r.status_pagamento).forEach(r => {
                    const cat = r.tipo_movimentacao || r.tipo || 'Outros';
                    categories[cat] = (categories[cat] || 0) + (Number(r.valor) || 0);
                });

                const summaryData = [
                    ['RESUMO FINANCEIRO', periodLabel],
                    [''],
                    ['CATEGORIA', 'VALOR TOTAL'],
                    ['Entradas (Receitas)', income],
                    ['Saídas (Despesas)', expense],
                    ['Comissões Pagas', commissions],
                    [''],
                    ['SALDO LÍQUIDO', income - expense - commissions],
                    [''],
                    ['DETALHAMENTO POR MOVIMENTAÇÃO'],
                    ...Object.entries(categories).map(([cat, val]) => [cat, val])
                ];

                const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
                worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo Financeiro');
            }

            // Download Local
            XLSX.writeFile(workbook, fileName);

            // Upload para Nuvem
            if (user?.id) {
                try {
                    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    await uploadReportToCloud(blob, fileName, user.id);
                } catch (cloudError) {
                    console.error('Erro ao salvar na nuvem:', cloudError);
                }
            }

            showToast('success', 'Relatório gerado com sucesso!');
            onClose();
        } catch (error) {
            console.error('Erro exportando financeiro:', error);
            showToast('error', 'Erro ao gerar o relatório.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDeleteClick = (report: GeneratedReport) => {
        setReportToDelete(report);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteReport = async () => {
        if (!reportToDelete) return;
        try {
            await deleteReportService(reportToDelete);
            setReports(prev => prev.filter(r => r.id !== reportToDelete.id));
            showToast('success', 'Relatório excluído.');
        } catch (error) {
            showToast('error', 'Erro ao excluir.');
        } finally {
            setIsDeleteModalOpen(false);
            setReportToDelete(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteReport}
                title="Excluir Relatório"
                message={`Deseja realmente excluir o relatório "${reportToDelete?.name}"?`}
                confirmLabel="Excluir"
                variant="danger"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-xl bg-[#0f1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[400px]"
            >
                {/* Header */}
                <div className="border-b border-white/5 bg-gradient-to-r from-gold-500/10 to-transparent flex flex-col">
                    <div className="p-6 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gold-500/20 rounded-2xl text-gold-500 border border-gold-500/20">
                                <Table size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white font-serif tracking-tight">Relatórios Financeiros</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Exportação para Excel • {periodLabel}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex px-6">
                        <button
                            onClick={() => setActiveTab('generate')}
                            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'generate' ? 'border-gold-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Download size={14} /> Gerar Novo
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'history' ? 'border-gold-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <History size={14} /> Histórico
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === 'generate' ? (
                            <motion.div key="gen" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                                <p className="text-sm text-slate-400 mb-6 font-medium">Escolha o formato do relatório para o período selecionado:</p>

                                <button
                                    onClick={() => handleExport('data')}
                                    disabled={isExporting}
                                    className="w-full flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/[0.08] hover:border-gold-500/30 transition-all group"
                                >
                                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                                        <Table size={24} />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-base font-bold text-white group-hover:text-gold-400 transition-colors">Modo Dados (Detalhamento)</h4>
                                        <p className="text-xs text-slate-500 mt-1">Exportação completa com todos os lançamentos individuais, clientes, datas e observações.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleExport('numbers')}
                                    disabled={isExporting}
                                    className="w-full flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/[0.08] hover:border-emerald-500/30 transition-all group"
                                >
                                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                                        <BarChart3 size={24} />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">Modo Números (Resumo)</h4>
                                        <p className="text-xs text-slate-500 mt-1">Consolidado com totais por categoria, receitas, despesas e saldo líquido final.</p>
                                    </div>
                                </button>

                                {isExporting && (
                                    <div className="flex items-center justify-center gap-3 py-4 text-gold-500">
                                        <Loader2 size={20} className="animate-spin" />
                                        <span className="text-sm font-bold uppercase tracking-widest">Processando Excel...</span>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div key="hist" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                                {isLoadingReports ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                        <Loader2 size={32} className="animate-spin mb-4 text-gold-500" />
                                        <p className="text-sm font-medium">Carregando histórico...</p>
                                    </div>
                                ) : reports.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                                        <History size={48} className="opacity-20 mb-4" />
                                        <p className="text-sm font-medium">Nenhum relatório financeiro salvo.</p>
                                    </div>
                                ) : (
                                    reports.map(report => (
                                        <div key={report.id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FileText size={14} className="text-gold-500" />
                                                    <h4 className="text-sm font-bold text-white truncate">{report.name}</h4>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                                    <div className="flex items-center gap-1"><Calendar size={10} /> {new Date(report.created_at).toLocaleString('pt-BR')}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <a href={report.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-gold-500/10 text-gold-500 hover:bg-gold-500/20 rounded-xl transition-all"><Download size={16} /></a>
                                                <button onClick={() => handleDeleteClick(report)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default ExportFinancialModal;
