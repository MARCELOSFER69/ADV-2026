import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Check, Download, Loader2, History, Trash2, Calendar, User as UserIcon, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Case, GeneratedReport } from '../../types';
import { fetchAllFilteredCasesData } from '../../services/casesService';
import { uploadReportToCloud, fetchUserReports, deleteReport as deleteReportService } from '../../services/reportsService';
import { formatDateDisplay } from '../../utils/dateUtils';
import { formatCPFOrCNPJ } from '../../services/formatters';
import { useApp } from '../../context/AppContext';

interface ExportCasesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: any;
    searchTerm: string;
    showToast: (type: 'success' | 'error', message: string) => void;
}

const REPORT_COLUMNS = [
    { id: 'client_name', label: 'Nome do Cliente', default: true },
    { id: 'client_cpf', label: 'CPF', default: true },
    { id: 'numero_processo', label: 'Número de Protocolo', default: true },
    { id: 'status', label: 'Situação Processual', default: true },
    { id: 'anotacoes', label: 'Observações/Anotações', default: true },
    { id: 'data_nascimento', label: 'Ano de Nascimento / Idade', default: true },
    { id: 'cidade', label: 'Cidade', default: true },
    { id: 'filial', label: 'Filial', default: true },
    { id: 'captador', label: 'Captador', default: true },
];

const calculateAge = (birthDate: string | undefined): string => {
    if (!birthDate) return 'N/A';
    try {
        const birth = new Date(birthDate);
        if (isNaN(birth.getTime())) return 'N/A';

        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        const formattedDate = formatDateDisplay(birthDate);
        return `${formattedDate} - ${age} anos`;
    } catch (e) {
        return 'N/A';
    }
};

const ExportCasesModal: React.FC<ExportCasesModalProps> = ({ isOpen, onClose, currentFilters, searchTerm, showToast }) => {
    const { user } = useApp();
    const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
    const [selectedCols, setSelectedCols] = useState<string[]>(REPORT_COLUMNS.filter(c => c.default).map(c => c.id));
    const [isExporting, setIsExporting] = useState(false);
    const [reports, setReports] = useState<GeneratedReport[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);

    // Carregar histórico quando mudar para a aba de histórico
    React.useEffect(() => {
        if (activeTab === 'history' && user?.id) {
            loadReports();
        }
    }, [activeTab, user?.id]);

    const loadReports = async () => {
        if (!user?.id) return;
        setIsLoadingReports(true);
        try {
            const data = await fetchUserReports(user.id);
            setReports(data);
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            showToast('error', 'Erro ao carregar histórico de relatórios.');
        } finally {
            setIsLoadingReports(false);
        }
    };

    const handleDeleteReport = async (report: GeneratedReport) => {
        if (!window.confirm('Deseja realmente excluir este relatório da nuvem?')) return;
        try {
            await deleteReportService(report);
            setReports(prev => prev.filter(r => r.id !== report.id));
            showToast('success', 'Relatório excluído com sucesso.');
        } catch (error) {
            console.error('Erro ao excluir relatório:', error);
            showToast('error', 'Erro ao excluir relatório.');
        }
    };

    const handleToggleCol = (id: string) => {
        setSelectedCols(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const handleSelectAll = () => {
        if (selectedCols.length === REPORT_COLUMNS.length) {
            setSelectedCols([]);
        } else {
            setSelectedCols(REPORT_COLUMNS.map(c => c.id));
        }
    };

    const handleExport = async () => {
        if (selectedCols.length === 0) {
            showToast('error', 'Selecione pelo menos uma coluna.');
            return;
        }

        setIsExporting(true);
        try {
            const allCases = await fetchAllFilteredCasesData(searchTerm, currentFilters);

            if (allCases.length === 0) {
                showToast('error', 'Nenhum processo encontrado com os filtros atuais.');
                setIsExporting(false);
                return;
            }

            const exportData = allCases.map(c => {
                const row: any = {};
                selectedCols.forEach(colId => {
                    const colLabel = REPORT_COLUMNS.find(rc => rc.id === colId)?.label || colId;
                    let value: any = '';

                    switch (colId) {
                        case 'client_name': value = c.client_name || 'N/A'; break;
                        case 'client_cpf': value = c.client_cpf ? formatCPFOrCNPJ(c.client_cpf) : 'N/A'; break;
                        case 'numero_processo': value = c.numero_processo || 'N/A'; break;
                        case 'status': value = c.status || 'N/A'; break;
                        case 'anotacoes': value = c.anotacoes || ''; break;
                        case 'data_nascimento': value = calculateAge(c.client_birth_date); break;
                        case 'cidade': value = c.client_city || 'N/A'; break;
                        case 'filial': value = c.filial || 'N/A'; break;
                        case 'captador': value = c.captador || 'N/A'; break;
                        default: value = (c as any)[colId] || '';
                    }
                    row[colLabel] = value;
                });
                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);

            // Ajuste básico de largura de colunas
            const wscols = selectedCols.map(() => ({ wch: 20 }));
            worksheet['!cols'] = wscols;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Processos');

            // Gerar nome dinâmico para o arquivo
            const { category, tipo } = currentFilters;
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const dateStr = `${day}/${month}/${year}`;

            let contextLabel = '';
            if (category === 'Seguro Defeso') {
                contextLabel = 'Seguro Defeso';
            } else {
                const tipoLabel = (tipo && tipo !== 'all' && tipo !== 'Todos') ? tipo : 'Todos';
                const catLabel = category || 'Geral';
                contextLabel = `${tipoLabel} - ${catLabel}`;
            }

            const fileName = `Relatorio de processos (${contextLabel}) (${dateStr}).xlsx`;

            // 1. Download Local
            XLSX.writeFile(workbook, fileName);

            // 2. Upload para Nuvem (Automático)
            if (user?.id) {
                try {
                    // Converter para Blob para upload
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
            console.error('Erro ao exportar:', error);
            showToast('error', 'Erro ao gerar o relatório Excel.');
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#0f1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]"
            >
                {/* Header com Abas */}
                <div className="border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-transparent flex flex-col">
                    <div className="p-6 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/20 rounded-2xl text-emerald-500 border border-emerald-500/20">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white font-serif tracking-tight">Relatórios de Processos</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Gerencie e exporte dados em Excel.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex px-6">
                        <button
                            onClick={() => setActiveTab('generate')}
                            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'generate'
                                ? 'border-emerald-500 text-white'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <Download size={14} />
                            Gerar Novo
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'history'
                                ? 'border-emerald-500 text-white'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <History size={14} />
                            Histórico Nuvem
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar flex-1">
                    <AnimatePresence mode="wait">
                        {activeTab === 'generate' ? (
                            <motion.div
                                key="generate"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Colunas Disponíveis</span>
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                                    >
                                        {selectedCols.length === REPORT_COLUMNS.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    {REPORT_COLUMNS.map(col => (
                                        <button
                                            key={col.id}
                                            onClick={() => handleToggleCol(col.id)}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 ${selectedCols.includes(col.id)
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                                                }`}
                                        >
                                            <span className={`text-sm font-medium ${selectedCols.includes(col.id) ? 'text-white' : ''}`}>
                                                {col.label}
                                            </span>
                                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${selectedCols.includes(col.id)
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'bg-transparent border-white/10'
                                                }`}>
                                                {selectedCols.includes(col.id) && <Check size={12} strokeWidth={4} />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="history"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                {isLoadingReports ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                        <Loader2 size={32} className="animate-spin mb-4 text-emerald-500" />
                                        <p className="text-sm font-medium">Carregando histórico...</p>
                                    </div>
                                ) : reports.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                                        <History size={48} className="opacity-20 mb-4" />
                                        <p className="text-sm font-medium">Nenhum relatório salvo ainda.</p>
                                        <p className="text-xs mt-1">Os relatórios gerados por você aparecerão aqui.</p>
                                    </div>
                                ) : (
                                    reports.map(report => (
                                        <div key={report.id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] hover:border-white/10 transition-all">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FileText size={14} className="text-emerald-500" />
                                                    <h4 className="text-sm font-bold text-white break-all" title={report.name}>
                                                        {report.name}
                                                    </h4>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {new Date(report.created_at).toLocaleString('pt-BR')}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <UserIcon size={10} />
                                                        Você
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <a
                                                    href={report.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-xl transition-all"
                                                    title="Baixar Relatório"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteReport(report)}
                                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all"
                                                    title="Excluir da Nuvem"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer - Only show if in 'generate' tab */}
                {activeTab === 'generate' && (
                    <div className="p-6 border-t border-white/5 bg-white/5 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isExporting || selectedCols.length === 0}
                            className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Gerando...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    <span>Baixar Excel</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default ExportCasesModal;
