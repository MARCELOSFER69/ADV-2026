import React, { useState, useRef, useMemo, useEffect } from 'react';
import { FileScan, UploadCloud, AlertCircle, FileText, CheckCircle2, Loader2, Trash2, Calendar, Clock, Calculator, Save, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
import { Client, CnisData, CnisBond, CnisDuration } from '../../types';
import { useApp } from '../../context/AppContext';

// Configura Worker
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ClientCnisTabProps {
    client: Client;
    onUpdate: (updatedClient: Client) => Promise<void>;
}

const IGNORED_TERMS = [
    'EMPREGADO', 'TRABALHADOR', 'AVULSO', 'CONTRIBUINTE', 'INDIVIDUAL',
    'FACULTATIVO', 'DOMÉSTICO', 'SEGURADO', 'ESPECIAL', 'AGENTE', 'PÚBLICO',
    'REMUNERAÇÃO', 'VÍNCULOS', 'PERÍODOS', 'DADOS', 'CADASTRAIS',
    'RELAÇÕES', 'PREVIDENCIÁRIAS', 'NIT', 'PÁGINA', 'SEQ', 'CNIS',
    'DATA', 'INÍCIO', 'FIM', 'TIPO', 'FILIAÇÃO', 'VÍNCULO',
    'REMUNERAÇÕES', 'INDICADORES', 'COMPETÊNCIA', 'SALÁRIO',
    'BENEFÍCIO', 'ESPÉCIE', 'RECOLHIMENTOS', 'VALOR', 'TOTAL',
    'NASCIMENTO', 'DN', 'NAT', 'IDENTIFICAÇÃO', 'NOME'
];

const ClientCnisTab: React.FC<ClientCnisTabProps> = ({ client, onUpdate }) => {
    const { showToast } = useApp();
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado Local dos Dados
    const [bonds, setBonds] = useState<CnisBond[]>(client.cnis_data?.bonds || []);
    const [lastUpdate, setLastUpdate] = useState<string | null>(client.cnis_data?.lastUpdate || null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Sincronizar quando o cliente mudar (ex: ao salvar ou trocar de cliente)
    useEffect(() => {
        setBonds(client.cnis_data?.bonds || []);
        setLastUpdate(client.cnis_data?.lastUpdate || null);
        setHasUnsavedChanges(false);
    }, [client.id, client.cnis_data]);

    // --- ARITMÉTICA DE DATAS ---
    const parseDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return isNaN(date.getTime()) ? null : date;
    };

    const calculateDateDiff = (startStr: string, endStr?: string): CnisDuration => {
        const startDate = parseDate(startStr);
        const endDate = endStr ? parseDate(endStr) : new Date();

        if (!startDate || !endDate) return { years: 0, months: 0, days: 0 };

        let years = endDate.getFullYear() - startDate.getFullYear();
        let months = endDate.getMonth() - startDate.getMonth();
        let days = endDate.getDate() - startDate.getDate();

        if (days < 0) {
            months--;
            const lastMonthDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
            days += lastMonthDate.getDate();
        }

        if (months < 0) {
            years--;
            months += 12;
        }

        if (years < 0) return { years: 0, months: 0, days: 0 };
        return { years, months, days };
    };

    const formatDuration = (d: CnisDuration): string => {
        const parts = [];
        if (d.years > 0) parts.push(`${d.years} ${d.years === 1 ? 'ano' : 'anos'}`);
        if (d.months > 0) parts.push(`${d.months} ${d.months === 1 ? 'mês' : 'meses'}`);
        if (d.days > 0) parts.push(`${d.days} ${d.days === 1 ? 'dia' : 'dias'}`);
        if (parts.length === 0) return "0 dias";
        return parts.join(', ');
    };

    const sumDurations = (bondList: CnisBond[]): CnisDuration => {
        let totalDays = 0;
        let totalMonths = 0;
        let totalYears = 0;

        bondList.forEach(b => {
            totalDays += b.duration.days;
            totalMonths += b.duration.months;
            totalYears += b.duration.years;
        });

        const extraMonths = Math.floor(totalDays / 30);
        totalDays = totalDays % 30;
        totalMonths += extraMonths;
        const extraYears = Math.floor(totalMonths / 12);
        totalMonths = totalMonths % 12;
        totalYears += extraYears;

        return { years: totalYears, months: totalMonths, days: totalDays };
    };

    const totalTime = useMemo(() => sumDurations(bonds), [bonds]);

    // --- PROCESSAMENTO ---
    const isDate = (str: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(str);
    const isDocNumber = (str: string) => { const clean = str.replace(/\D/g, ''); return (clean.length === 11 || clean.length === 14) && (str.includes('.') || str.includes('/') || str.includes('-')); };
    const isCurrency = (str: string) => /^\d{1,3}(\.\d{3})*,\d{2}$/.test(str);
    const shouldIgnore = (str: string) => {
        const upper = str.toUpperCase().trim();
        if (upper.length < 2) return true;
        if (IGNORED_TERMS.some(term => upper.includes(term))) return true;
        if (isDate(str)) return true;
        if (isDocNumber(str)) return true;
        if (isCurrency(str)) return true;
        return false;
    };

    const extractBondsFromItems = (items: string[]) => {
        const extractedBonds: CnisBond[] = [];
        let idCounter = 0;

        for (let i = 0; i < items.length; i++) {
            const currentItem = items[i];

            if (isDate(currentItem)) {
                const startDate = currentItem;

                // Heuristic: Check previous items to skip Header dates (Birth, etc)
                let isHeaderData = false;
                if (i > 0) {
                    if (isDate(items[i - 1])) continue;
                    for (let k = 1; k <= 3; k++) {
                        if (i - k >= 0) {
                            const prev = items[i - k].toUpperCase();
                            if (prev.includes('NASCIMENTO') || prev.includes('DN') || prev.includes('NAT') || prev.includes('NIT') || prev.includes('CPF')) {
                                isHeaderData = true; break;
                            }
                        }
                    }
                }
                if (isHeaderData) continue;

                let endDate = undefined;
                let lookaheadIndex = i + 1;
                if (lookaheadIndex < items.length && isDate(items[lookaheadIndex])) {
                    endDate = items[lookaheadIndex];
                } else if (lookaheadIndex + 1 < items.length && isDate(items[lookaheadIndex + 1])) {
                    endDate = items[lookaheadIndex + 1];
                }

                let companyName = "VÍNCULO SEM NOME";
                let foundName = false;
                for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
                    const candidate = items[j];
                    if (!shouldIgnore(candidate)) {
                        companyName = candidate;
                        if (j > 0) {
                            const prevCandidate = items[j - 1];
                            if (!shouldIgnore(prevCandidate) && !prevCandidate.includes(':')) {
                                companyName = `${prevCandidate} ${companyName}`;
                            }
                        }
                        foundName = true;
                        break;
                    }
                    if (isDate(candidate)) break;
                }

                if (foundName) {
                    const upperName = companyName.toUpperCase();
                    if (upperName.includes('NOME:') || upperName.includes('FILIADO') || upperName.includes('SEGURADO') || upperName.startsWith('NIT') || upperName.startsWith('CPF')) {
                        continue;
                    }

                    const duration = calculateDateDiff(startDate, endDate);
                    if (companyName.length > 2) {
                        extractedBonds.push({
                            id: `bond-${idCounter++}-${Date.now()}`,
                            company: companyName,
                            startDate,
                            endDate: endDate || 'Ativo',
                            isActive: !endDate,
                            duration: duration,
                            durationString: formatDuration(duration)
                        });
                    }
                }
            }
        }

        if (extractedBonds.length === 0) {
            setError('Nenhum vínculo encontrado. Verifique se o PDF é um Extrato CNIS válido.');
        } else {
            setBonds(extractedBonds);
            setHasUnsavedChanges(true);
            setLastUpdate(new Date().toISOString());
            showToast('success', `${extractedBonds.length} vínculos encontrados!`);
        }
    };

    const processFile = async (pdfFile: File) => {
        setIsLoading(true);
        setError(null);
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const allItems: string[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageItems = textContent.items.map((item: any) => item.str.trim()).filter((s: string) => s.length > 0);
                allItems.push(...pageItems);
            }
            extractBondsFromItems(allItems);
        } catch (err: any) {
            console.error('Erro PDF:', err);
            setError('Erro ao ler PDF. Tente outro arquivo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        const cnisData: CnisData = {
            bonds,
            totalTime,
            lastUpdate: lastUpdate || new Date().toISOString(),
            benefits: [], // TODO: Future implementation
            fileName: 'Importado via PDF'
        };

        const updatedClient = { ...client, cnis_data: cnisData };
        await onUpdate(updatedClient);
        setHasUnsavedChanges(false);
        showToast('success', 'Dados do CNIS salvos no cliente!');
    };

    const handleClear = () => {
        if (confirm('Tem certeza que deseja apagar os vínculos da tela? (As alterações só serão definitivas após clicar em Salvar)')) {
            setBonds([]);
            setLastUpdate(null);
            setHasUnsavedChanges(true);
        }
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f?.type === 'application/pdf') processFile(f);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header / Actions */}
            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                        <FileText size={16} className="text-orange-500" />
                        Dados do CNIS
                    </h3>
                    <p className="text-xs text-zinc-500">
                        {lastUpdate ? `Atualizado em: ${new Date(lastUpdate).toLocaleDateString()} às ${new Date(lastUpdate).toLocaleTimeString()}` : 'Nenhum dado importado.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {bonds.length > 0 && (
                        <button onClick={handleClear} className="text-xs text-zinc-400 hover:text-red-400 px-3 py-2 rounded hover:bg-zinc-800 transition-colors">
                            Limpar
                        </button>
                    )}
                    {hasUnsavedChanges && (
                        <button onClick={handleSave} className="flex items-center gap-2 text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20 transition-all">
                            <Save size={14} /> Salvar Alterações
                        </button>
                    )}
                </div>
            </div>

            {/* Upload Area (only if empty) */}
            {bonds.length === 0 && (
                <div
                    className={`bg-[#0f1014] border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${isDragging ? 'border-orange-500 bg-zinc-900' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />

                    {isLoading ? (
                        <div className="flex flex-col items-center animate-pulse">
                            <Loader2 size={32} className="text-orange-500 animate-spin mb-2" />
                            <p className="text-zinc-500 text-xs">Lendo PDF...</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-zinc-800">
                                <UploadCloud size={20} className="text-zinc-500 group-hover:text-orange-500 transition-colors" />
                            </div>
                            <h3 className="text-sm font-bold text-white mb-1">Upload do CNIS (PDF)</h3>
                            <p className="text-zinc-500 max-w-xs text-xs">Arraste o arquivo ou clique para selecionar. Extração automática de vínculos.</p>
                        </>
                    )}
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                </div>
            )}

            {/* Data Display */}
            {bonds.length > 0 && (
                <div className="space-y-4">
                    {/* Summary Card */}
                    <div className="bg-[#0f1014] border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none"><Calculator size={80} /></div>
                        <div className="z-10">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Tempo Total Contribuição</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white">{totalTime.years}a</span>
                                <span className="text-xl text-zinc-400">{totalTime.months}m</span>
                                <span className="text-sm text-zinc-600">{totalTime.days}d</span>
                            </div>
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} className="z-10 text-xs text-orange-400 hover:text-orange-300 underline cursor-pointer">
                            Importar Novo PDF
                            <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                        </button>
                    </div>

                    {/* Table */}
                    <div className="border border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-900/50 text-zinc-500 font-medium border-b border-zinc-800">
                                <tr>
                                    <th className="px-4 py-3">Empresa</th>
                                    <th className="px-4 py-3">Período</th>
                                    <th className="px-4 py-3 text-right">Tempo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800 bg-[#0f1014]">
                                {bonds.map(bond => (
                                    <tr key={bond.id} className="hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-zinc-300">{bond.company}</td>
                                        <td className="px-4 py-3 text-zinc-400">
                                            {bond.startDate} <span className="text-zinc-600 px-1">➜</span> <span className={bond.isActive ? 'text-emerald-500 font-bold' : ''}>{bond.endDate}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-zinc-500 font-mono">
                                            {bond.durationString}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientCnisTab;
