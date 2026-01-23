import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Calculator, UploadCloud, AlertCircle, FileText, CheckCircle2, Loader2, Trash2, AlertTriangle, Calendar, DollarSign, Ban, Search } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useApp } from '../../context/AppContext';
import { Client } from '../../types';


// --- CORREÇÃO DO WORKER (IMPORTAÇÃO LOCAL) ---
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Handle potential default export structure from ESM CDN
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Configura o worker para usar o arquivo local
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface GpsGuide {
    id: string;
    page: number;
    cpf: string;
    name?: string;
    competenceRaw: string; // Ex: "Novembro/2024"
    competenceIso: string; // Ex: "2024-11"
    value: number;
    status: 'ok' | 'error_competence' | 'warning_duplicate';
}

const MONTH_MAP: Record<string, string> = {
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'marco': '03', 'abril': '04',
    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
    'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
};

const GpsCalculator: React.FC = () => {
    const { clients } = useApp();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rawGuides, setRawGuides] = useState<GpsGuide[]>([]);
    const [referenceMonth, setReferenceMonth] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- ARITMÉTICA E PROCESSAMENTO ---

    const processedGuides = useMemo(() => {
        if (!rawGuides.length) return [];

        // Contagem de CPFs para identificar duplicidade
        const cpfCounts: Record<string, number> = {};
        rawGuides.forEach(g => {
            if (g.cpf) cpfCounts[g.cpf] = (cpfCounts[g.cpf] || 0) + 1;
        });

        return rawGuides.map(guide => {
            let status: GpsGuide['status'] = 'ok';

            // 1. Validação de Competência (Prioridade Alta)
            if (referenceMonth && guide.competenceIso !== referenceMonth) {
                status = 'error_competence';
            }
            // 2. Validação de Duplicidade (Prioridade Média)
            else if (guide.cpf && cpfCounts[guide.cpf] > 1) {
                status = 'warning_duplicate';
            }

            // 3. Encontrar nome do cliente
            const cleanGuideCpf = guide.cpf.replace(/\D/g, '');
            const client = clients.find(c => c.cpf_cnpj?.replace(/\D/g, '') === cleanGuideCpf);

            return { ...guide, status, name: client?.nome_completo };
        });
    }, [rawGuides, referenceMonth, clients]);

    const filteredGuides = useMemo(() => {
        if (!searchQuery) return processedGuides;
        const lowerQuery = searchQuery.toLowerCase();
        return processedGuides.filter(g =>
            g.cpf.includes(searchQuery) ||
            (g.name && g.name.toLowerCase().includes(lowerQuery))
        );
    }, [processedGuides, searchQuery]);

    const stats = useMemo(() => {
        const totalValue = processedGuides
            .filter(g => g.status !== 'error_competence') // Soma apenas se a competência estiver correta (ou aviso)
            .reduce((acc, curr) => acc + curr.value, 0);

        const errorCount = processedGuides.filter(g => g.status === 'error_competence').length;
        const warningCount = processedGuides.filter(g => g.status === 'warning_duplicate').length;

        return { totalValue, errorCount, warningCount, count: processedGuides.length };
    }, [processedGuides]);

    // --- HANDLERS ---

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === 'application/pdf') processFile(droppedFile);
        else setError('Por favor, envie apenas arquivos PDF.');
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
    };

    const parseCompetenceToIso = (raw: string): string => {
        // Ex: "Novembro/2024" -> "2024-11"
        const parts = raw.split('/');
        if (parts.length !== 2) return '';
        const monthName = parts[0].toLowerCase().trim();
        const year = parts[1].trim();
        const monthNum = MONTH_MAP[monthName];
        if (!monthNum) return '';
        return `${year}-${monthNum}`;
    };

    const processFile = async (pdfFile: File) => {
        setFile(pdfFile);
        setIsLoading(true);
        setError(null);
        setRawGuides([]);

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            const extracted: GpsGuide[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                // 1. Garante que pegamos apenas as strings, limpando espaços vazios extras
                const items = textContent.items
                    .map((item: any) => item.str.trim())
                    .filter((str: string) => str.length > 0);

                console.log(`[Página ${i}] Itens extraídos:`, items); // Debug essencial

                let foundValue: number | null = null;
                let foundCompetence: string | null = null;
                let foundCpf: string | null = null;

                // 2. Varredura por Proximidade (Lookahead)
                for (let j = 0; j < items.length; j++) {
                    const currentItem = items[j];
                    // Olha os próximos 5 itens
                    const nextItems = items.slice(j + 1, j + 6);

                    // A. Busca CPF (pode estar em qualquer lugar)
                    if (!foundCpf) {
                        const cpfMatch = currentItem.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
                        if (cpfMatch) foundCpf = cpfMatch[0];
                    }

                    // B. Busca Valor
                    // Procura pela palavra chave "Valor Total" e checa os vizinhos
                    if (!foundValue && /Valor\s+Total/i.test(currentItem)) {
                        // Procura nos próximos itens algum que pareça dinheiro (XX,XX)
                        const moneyMatch = nextItems.find(item => /^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(item));
                        if (moneyMatch) {
                            foundValue = parseFloat(moneyMatch.replace(/\./g, '').replace(',', '.'));
                        }
                    }

                    // C. Busca Competência
                    // Procura pela palavra chave "Apuração" e checa os vizinhos
                    if (!foundCompetence && /Apura/i.test(currentItem)) {
                        // Procura nos próximos itens algo como "Novembro/2024"
                        const dateMatch = nextItems.find(item => /^[A-Za-zç]+\/\d{4}$/i.test(item));
                        if (dateMatch) foundCompetence = dateMatch;
                    }
                }

                // Se encontrou dados suficientes nesta página, adiciona
                if (foundValue !== null && foundCompetence !== null) {
                    extracted.push({
                        id: `guide-${i}`,
                        page: i,
                        cpf: foundCpf || 'CPF Não Identificado',
                        competenceRaw: foundCompetence,
                        competenceIso: parseCompetenceToIso(foundCompetence),
                        value: foundValue,
                        status: 'ok'
                    });
                } else {
                    console.warn(`[Page ${i}] Dados incompletos. Valor: ${foundValue}, Comp: ${foundCompetence}`);
                }
            }

            if (extracted.length === 0) {
                setError('Nenhuma guia válida encontrada. Verifique o console (F12) para ver os itens extraídos.');
            } else {
                setRawGuides(extracted);

                // Se o usuário ainda não escolheu o mês, sugerir o primeiro encontrado
                if (!referenceMonth && extracted.length > 0) {
                    setReferenceMonth(extracted[0].competenceIso);
                }
            }

        } catch (err: any) {
            console.error('Erro:', err);
            setError(err.name === 'PasswordException' ? 'Arquivo protegido por senha.' : 'Erro ao ler o arquivo PDF.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setFile(null);
        setRawGuides([]);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
                        <Calculator className="text-yellow-500" /> Calculadora de GPS v2
                    </h2>
                    <p className="text-zinc-400">Auditoria em lote de guias do eSocial (DAE).</p>
                </div>
                {processedGuides.length > 0 && (
                    <button onClick={handleClear} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 hover:bg-red-500/10 px-3 py-2 rounded transition-colors border border-transparent hover:border-red-500/20">
                        <Trash2 size={16} /> Limpar
                    </button>
                )}
            </header>

            {/* CONTROLE DE REFERÊNCIA */}
            <div className="bg-[#0f1014] border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-lg">
                <div className="flex items-center gap-3 flex-1 w-full">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 border border-yellow-500/20">
                        <Calendar size={20} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Mês de Referência (Competência)</label>
                        <input
                            type="month"
                            className="w-full bg-[#09090b] border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none focus:border-yellow-500 transition-colors [color-scheme:dark]"
                            value={referenceMonth}
                            onChange={(e) => setReferenceMonth(e.target.value)}
                        />
                    </div>
                </div>
                <div className="text-xs text-zinc-500 max-w-md hidden md:block border-l border-zinc-800 pl-4">
                    Selecione a competência correta para que o sistema identifique guias de períodos errados automaticamente.
                </div>
            </div>

            {/* ÁREA DE UPLOAD */}
            {!file || processedGuides.length === 0 ? (
                <div
                    className={`rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer group border-2 border-dashed ${isDragging ? 'border-yellow-500 bg-yellow-500/10' : 'bg-zinc-900/30 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileInput} />

                    {isLoading ? (
                        <div className="flex flex-col items-center animate-pulse">
                            <Loader2 size={48} className="text-yellow-500 animate-spin mb-4" />
                            <h3 className="text-lg font-bold text-white">Processando Guias...</h3>
                            <p className="text-zinc-500 text-sm">Lendo páginas e extraindo valores...</p>
                        </div>
                    ) : (
                        <>
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-zinc-800 ${isDragging ? 'bg-yellow-500/20' : 'bg-[#09090b]'}`}>
                                <UploadCloud size={40} className={`transition-colors ${isDragging ? 'text-yellow-500' : 'text-zinc-500 group-hover:text-yellow-500'}`} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Arraste o PDF das Guias aqui</h3>
                            <p className="text-zinc-500 mb-6 max-w-md text-sm">
                                Suporte para arquivos PDF contendo múltiplas páginas do eSocial (DAE).
                            </p>
                            <button className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-yellow-600/20">
                                Selecionar Arquivo
                            </button>
                        </>
                    )}

                    {error && (
                        <div className="mt-6 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-lg border border-red-500/20">
                            <AlertCircle size={16} /> <span>{error}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">

                    {/* KPIS DE RESUMO */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Total */}
                        <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <DollarSign size={60} className="text-emerald-500" />
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">Valor Total (Válidos)</p>
                            <h3 className="text-2xl font-bold text-emerald-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValue)}
                            </h3>
                            <p className="text-xs text-zinc-500 mt-2">Soma apenas das competências corretas</p>
                        </div>

                        {/* Quantidade */}
                        <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <FileText size={60} className="text-blue-500" />
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">Guias Identificadas</p>
                            <h3 className="text-2xl font-bold text-zinc-200">
                                {stats.count}
                            </h3>
                            <p className="text-xs text-zinc-500 mt-2">Páginas processadas com sucesso</p>
                        </div>

                        {/* Erros */}
                        <div className={`bg-zinc-900/60 backdrop-blur-md border rounded-xl p-5 shadow-lg relative overflow-hidden transition-colors ${stats.errorCount > 0 ? 'border-red-500/30' : 'border-white/5'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <AlertTriangle size={60} className={stats.errorCount > 0 ? 'text-red-500' : 'text-zinc-500'} />
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">Divergências</p>
                            <div className="flex items-end gap-2">
                                <h3 className={`text-2xl font-bold ${stats.errorCount > 0 ? 'text-red-400' : 'text-zinc-300'}`}>
                                    {stats.errorCount}
                                </h3>
                                <span className="text-sm pb-1 text-zinc-500">erros</span>
                                <span className="text-sm pb-1 text-zinc-600">/</span>
                                <h3 className={`text-2xl font-bold ${stats.warningCount > 0 ? 'text-yellow-500' : 'text-zinc-300'}`}>
                                    {stats.warningCount}
                                </h3>
                                <span className="text-sm pb-1 text-zinc-500">alertas</span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">Erros de Data / Duplicidades</p>
                        </div>
                    </div>

                    {/* TABELA DE RESULTADOS */}
                    <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                    <FileText size={16} className="text-yellow-500" /> Detalhamento das Guias
                                </h4>
                                <span className="text-xs text-zinc-500 hidden md:inline">| {file.name}</span>
                            </div>

                            <div className="relative w-full md:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar CPF ou Nome..."
                                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-yellow-500 focus:bg-zinc-900"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/5 border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase text-center w-20">Página</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase">CPF / Contribuinte</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase">Competência</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase">Valor</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredGuides.map((guide) => (
                                        <tr key={guide.id} className={`hover:bg-zinc-800/50 transition-colors ${guide.status === 'error_competence' ? 'bg-red-500/5' : ''}`}>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs font-mono text-zinc-500">{guide.page}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    {guide.name ? (
                                                        <>
                                                            <span className="font-bold text-white text-sm">{guide.name}</span>
                                                            <span className="font-mono text-zinc-500 text-xs">{guide.cpf}</span>
                                                        </>
                                                    ) : (
                                                        <span className="font-mono text-zinc-300 text-sm">{guide.cpf}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-sm font-medium ${guide.status === 'error_competence' ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                                                    {guide.competenceRaw}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-zinc-200">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(guide.value)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {guide.status === 'ok' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 size={12} /> OK
                                                    </span>
                                                )}
                                                {guide.status === 'error_competence' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                        <Ban size={12} /> Mês Incorreto
                                                    </span>
                                                )}
                                                {guide.status === 'warning_duplicate' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                        <AlertTriangle size={12} /> Duplicado
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GpsCalculator;
