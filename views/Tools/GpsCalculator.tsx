import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Calculator, UploadCloud, AlertCircle, FileText, CheckCircle2, Loader2, Trash2, AlertTriangle, Calendar, DollarSign, Ban, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import jsQR from 'jsqr';
import { Client, Case } from '../../types';
import { updateCaseGpsStatus } from '../../services/casesService';
import { supabase } from '../../services/supabaseClient';


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
    status: 'ok' | 'error_competence' | 'warning_duplicate' | 'already_paid' | 'already_pulled';
    qrData?: string;
    paidLocally?: boolean;
    dbRecord?: any; // Record found in database
}

const MONTH_MAP: Record<string, string> = {
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'marco': '03', 'abril': '04',
    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
    'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12',
    '01': '01', '02': '02', '03': '03', '04': '04', '05': '05', '06': '06',
    '07': '07', '08': '08', '09': '09', '10': '10', '11': '11', '12': '12'
};

const normalizeCpf = (val: string) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '');
    // Se for CPF (11 ou menos), pad com zeros até 11. Se for CNPJ (14), deixa como está.
    if (digits.length <= 11) return digits.padStart(11, '0');
    return digits;
};

const normalizeComp = (val: string) => {
    if (!val) return '';
    const parts = val.split('/');
    if (parts.length !== 2) return val.toLowerCase().trim();
    let month = parts[0].trim().toLowerCase();
    let year = parts[1].trim();

    const monthNum = MONTH_MAP[month] || month.padStart(2, '0');
    const fullYear = year.length === 2 ? '20' + year : year;

    return `${monthNum}/${fullYear}`;
};

import { useAllClients } from '../../hooks/useClients';
import { useApp } from '../../context/AppContext';
// ... imports

const GpsCalculator: React.FC = () => {
    const { setCurrentView, setClientToView } = useApp();
    const { data: clients = [] } = useAllClients();
    // const { clients } = useApp(); // Removed
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rawGuides, setRawGuides] = useState<GpsGuide[]>([]);
    const [referenceMonth, setReferenceMonth] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selectedGuide, setSelectedGuide] = useState<(GpsGuide & { client_id?: string; case_id?: string; qrData?: string }) | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [guidesDatabaseStatus, setGuidesDatabaseStatus] = useState<Record<string, Case[]>>({});
    const [matchedClientsMap, setMatchedClientsMap] = useState<Record<string, { id: string; name: string }>>({});
    const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null);
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
            // 2. Validação de Duplicidade no PDF (Prioridade Média)
            else if (guide.cpf && cpfCounts[guide.cpf] > 1) {
                status = 'warning_duplicate';
            }

            // 3. Encontrar nome do cliente e caso vinculado (Usando o mapa direto do banco)
            const cleanGuideCpf = normalizeCpf(guide.cpf);
            const clientMatch = matchedClientsMap[cleanGuideCpf];

            // 4. Verificação no Banco de Dados (Robustez Aumentada)
            const matchedCases = clientMatch ? guidesDatabaseStatus[clientMatch.id] || [] : [];
            let dbRecord = null;
            const normalizedGuideComp = normalizeComp(guide.competenceRaw);

            for (const mCase of matchedCases) {
                if (mCase.gps_lista) {
                    const found = mCase.gps_lista.find(g => normalizeComp(g.competencia) === normalizedGuideComp);
                    if (found) {
                        dbRecord = found;
                        if (found.status === 'Paga') {
                            status = 'already_paid';
                            break;
                        } else if (found.status === 'Puxada') {
                            status = 'already_pulled';
                        }
                    }
                }
            }

            return {
                ...guide,
                status,
                name: clientMatch?.name,
                client_id: clientMatch?.id,
                dbRecord
            };
        });
    }, [rawGuides, referenceMonth, clients, guidesDatabaseStatus, matchedClientsMap]);

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
        setProcessingProgress(null);

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            setProcessingProgress({ current: 0, total: pdf.numPages });
            const extracted: GpsGuide[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                setProcessingProgress({ current: i, total: pdf.numPages });
                const page = await pdf.getPage(i);

                // --- DETECÇÃO INTELIGENTE DE QR CODE (jsQR) ---
                const viewport = page.getViewport({ scale: 2.5 }); // Otimizado de 4.0 para 2.5 para performance em arquivos grandes
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context!, viewport }).promise;

                const imageData = context!.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                let qrData = '';

                if (code) {
                    console.log(`[Página ${i}] QR Code detectado!`, code.location);

                    // Crop preciso com base na localização detectada
                    const { topLeftCorner, bottomRightCorner, bottomLeftCorner, topRightCorner } = code.location;
                    const padding = 15; // Mais justo
                    const topPadding = 65; // Ajustado para remover o traço pontilhado e manter o texto

                    const minX = Math.max(0, Math.min(topLeftCorner.x, bottomLeftCorner.x) - padding);
                    const minY = Math.max(0, Math.min(topLeftCorner.y, topRightCorner.y) - topPadding);
                    const maxX = Math.max(bottomRightCorner.x, topRightCorner.x) + padding;
                    const maxY = Math.max(bottomRightCorner.y, bottomLeftCorner.y) + 15; // Menos espaço em baixo

                    const width = Math.min(canvas.width - minX, maxX - minX);
                    const height = Math.min(canvas.height - minY, maxY - minY);

                    const qrCanvas = document.createElement('canvas');
                    qrCanvas.width = width;
                    qrCanvas.height = height;
                    const qrCtx = qrCanvas.getContext('2d');
                    qrCtx?.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
                    qrData = qrCanvas.toDataURL('image/png');
                } else {
                    console.warn(`[Página ${i}] QR Code não detectado via jsQR. Tentando fallback...`);
                    // Fallback: Tentando capturar a área inferior direita (geralmente onde fica no DAE/eSocial)
                    const qrCanvas = document.createElement('canvas');
                    const qrCtx = qrCanvas.getContext('2d');
                    qrCanvas.width = 400;
                    qrCanvas.height = 400;
                    // Ajuste de coordenadas: Final da página, lado direito
                    qrCtx?.drawImage(canvas, viewport.width - 450, viewport.height - 500, 400, 400, 0, 0, 400, 400);
                    qrData = qrCanvas.toDataURL('image/png');
                }

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
                        status: 'ok',
                        qrData // Salva a imagem do QR code vinculada à página
                    });
                } else {
                    console.warn(`[Page ${i}] Dados incompletos. Valor: ${foundValue}, Comp: ${foundCompetence}`);
                }
            }

            if (extracted.length === 0) {
                setError('Nenhuma guia válida encontrada. Verifique o console (F12) para ver os itens extraídos.');
            } else {
                setRawGuides(extracted);

                // --- BUSCA DIRETA E ROBUSTA DE CLIENTES POR CPF ---
                const rawCpfs = [...new Set(extracted.map(g => g.cpf))];
                const normalizedCpfs = rawCpfs.map(normalizeCpf);

                // Busca por CPF exato ou normalizado (com/sem pontuação/zeros)
                const { data: dbClients } = await supabase
                    .from('clients')
                    .select('id, nome_completo, cpf_cnpj')
                    .or(`cpf_cnpj.in.(${rawCpfs.map(c => `"${c}"`).join(',')}),cpf_cnpj.in.(${normalizedCpfs.map(c => `"${c}"`).join(',')})`);

                const clientMap: Record<string, { id: string; name: string }> = {};
                const clientIds: string[] = [];

                if (dbClients) {
                    dbClients.forEach(c => {
                        const normC = normalizeCpf(c.cpf_cnpj || '');
                        clientMap[normC] = { id: c.id, name: c.nome_completo };
                        clientIds.push(c.id);
                    });
                    setMatchedClientsMap(clientMap);
                }

                // --- BUSCAR STATUS NO BANCO DE DADOS (CASOS) ---
                if (clientIds.length > 0) {
                    const { data: casesWithGps } = await supabase
                        .from('cases')
                        .select('id, client_id, gps_lista, titulo')
                        .in('client_id', clientIds);

                    if (casesWithGps) {
                        const statusMap: Record<string, Case[]> = {};
                        casesWithGps.forEach(c => {
                            if (!statusMap[c.client_id]) statusMap[c.client_id] = [];
                            statusMap[c.client_id].push(c as unknown as Case);
                        });
                        setGuidesDatabaseStatus(statusMap);
                    }
                }

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

    const handlePayClick = async (guide: any) => {
        if (!guide.client_id) return;

        setIsUpdatingStatus(true);
        try {
            // Tenta encontrar casos vinculados ao cliente
            const { data: casesData } = await supabase
                .from('cases')
                .select('id, titulo')
                .eq('client_id', guide.client_id);

            if (casesData && casesData.length > 0) {
                // Se houver casos, preferimos o que já tem GPS ou o mais recente (maior ID de uuid não garante ordem, mas aqui pegamos qualquer um)
                // Prioridade para Seguro Defeso se houver no título
                const seguroDefeso = casesData.find(c => c.titulo?.toLowerCase().includes('seguro defeso'));
                setSelectedGuide({ ...guide, case_id: seguroDefeso?.id || casesData[0].id });
            } else {
                // Se não encontrar caso, permite ver o QR mas avisa no modal
                setSelectedGuide({ ...guide });
            }
        } catch (err) {
            console.error(err);
            setSelectedGuide({ ...guide });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const markAsPaid = async () => {
        if (!selectedGuide || !selectedGuide.case_id) return;

        setIsUpdatingStatus(true);
        try {
            // Competência vinda do PDF é "Janeiro/2026", precisamos bater com o banco
            await updateCaseGpsStatus(
                selectedGuide.case_id,
                selectedGuide.competenceRaw,
                'Paga',
                undefined,
                selectedGuide.value
            );

            // Sucesso! Remove ou atualiza localmente? 
            // Vamos apenas avisar e fechar
            setRawGuides(prev => prev.map(g => g.id === selectedGuide.id ? { ...g, paidLocally: true } : g));
            setSelectedGuide(null);
        } catch (err) {
            alert('Erro ao atualizar status no banco de dados.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleClear = () => {
        setFile(null);
        setRawGuides([]);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar space-y-6 animate-in fade-in duration-500 pb-20 pr-2">
            {/* Standard Premium Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
                            Calculadora de GPS v2
                        </h1>
                        <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
                            Auditoria em lote de guias do eSocial (DAE).
                        </p>
                    </div>
                </div>

                {processedGuides.length > 0 && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleClear}
                        className="h-10 px-6 bg-[#131418] border border-white/10 hover:border-red-500/50 text-red-500 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg"
                    >
                        <Trash2 size={16} />
                        <span>Limpar Auditoria</span>
                    </motion.button>
                )}
            </div>

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
                        <div className="flex flex-col items-center">
                            <Loader2 size={48} className="text-yellow-500 animate-spin mb-4" />
                            <h3 className="text-lg font-bold text-white">Processando Guias...</h3>
                            {processingProgress && (
                                <div className="mt-2 flex flex-col items-center">
                                    <p className="text-zinc-500 text-sm">Página {processingProgress.current} de {processingProgress.total}</p>
                                    <div className="w-48 h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-500 transition-all duration-300"
                                            style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            <p className="text-zinc-400 text-xs mt-4">Analisando páginas e extraindo dados...</p>
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
                                                        <button
                                                            onClick={() => {
                                                                if (guide.client_id) {
                                                                    setClientToView(guide.client_id, 'info');
                                                                    setCurrentView('clients');
                                                                }
                                                            }}
                                                            className="flex flex-col text-left group/name"
                                                            title="Ver dados do cliente"
                                                        >
                                                            <span className="font-bold text-white text-sm group-hover/name:text-gold-500 transition-colors">
                                                                {guide.name}
                                                            </span>
                                                            <span className="font-mono text-zinc-500 text-xs">
                                                                {guide.cpf}
                                                            </span>
                                                        </button>
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
                                                {guide.status === 'ok' && !guide.paidLocally && (
                                                    <button
                                                        onClick={() => handlePayClick(guide)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-gold-500/10 text-gold-500 border border-gold-500/20 hover:bg-gold-500/20 transition-colors"
                                                    >
                                                        < DollarSign size={12} /> PAGAR
                                                    </button>
                                                )}
                                                {guide.paidLocally && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 size={12} /> PAGO
                                                    </span>
                                                )}
                                                {guide.status === 'already_paid' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                                        <CheckCircle2 size={12} /> JÁ PAGA NO SISTEMA
                                                    </span>
                                                )}
                                                {guide.status === 'already_pulled' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        <FileText size={12} /> JÁ PUXADA
                                                    </span>
                                                )}
                                                {guide.status === 'error_competence' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                        <Ban size={12} /> Mês Incorreto
                                                    </span>
                                                )}
                                                {guide.status === 'warning_duplicate' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                        <AlertTriangle size={12} /> Duplicado no PDF
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
            {/* Modal de Pagamento Pix */}
            <AnimatePresence>
                {selectedGuide && (
                    <div className="fixed inset-0 z-[40000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => !isUpdatingStatus && setSelectedGuide(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#0f1014] w-full max-w-lg rounded-3xl border border-white/10 shadow-3xl relative z-10 overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gold-500/10 rounded-xl text-gold-500">
                                        < DollarSign size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white font-serif">Pagar com PIX</h3>
                                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">Escaneie para concluir</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedGuide(null)}
                                    disabled={isUpdatingStatus}
                                    className="p-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-30"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 pb-8 pt-4 flex flex-col items-center">
                                {/* Exibição do QR Code Extraído */}
                                <div className="relative group">
                                    <div className="absolute -inset-4 bg-gold-500/5 rounded-[2rem] blur-2xl group-hover:bg-gold-500/10 transition-all duration-500" />
                                    <div className="relative bg-white p-2 rounded-[2rem] shadow-2xl transition-transform hover:scale-[1.01] overflow-hidden">
                                        {selectedGuide.qrData ? (
                                            <img
                                                src={selectedGuide.qrData}
                                                alt="QR Code Pix"
                                                className="w-full max-w-[380px] aspect-square object-contain brightness-95 contrast-125"
                                            />
                                        ) : (
                                            <div className="w-64 h-64 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                                                <Ban size={48} className="mb-4 opacity-20" />
                                                <p className="text-[10px] font-bold uppercase tracking-tighter">QR Code não localizado</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-10 w-full space-y-4">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Contribuinte</span>
                                            <span className="text-[10px] text-zinc-500 font-mono">{selectedGuide.cpf}</span>
                                        </div>
                                        <div className="text-sm font-bold text-white">{selectedGuide.name || 'Cliente Não Identificado'}</div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Competência</span>
                                            <span className="text-sm font-bold text-zinc-200">{selectedGuide.competenceRaw}</span>
                                        </div>
                                        <div className="flex-1 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                            <span className="text-[10px] text-emerald-500/50 uppercase font-black tracking-widest block mb-1">Valor Total</span>
                                            <span className="text-sm font-bold text-emerald-400">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedGuide.value)}
                                            </span>
                                        </div>
                                    </div>

                                    {selectedGuide.case_id ? (
                                        <button
                                            onClick={markAsPaid}
                                            disabled={isUpdatingStatus}
                                            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-600/20"
                                        >
                                            {isUpdatingStatus ? (
                                                <Loader2 size={20} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={20} />
                                                    <span>Marcar como Pago</span>
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10 flex items-start gap-3">
                                            <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] font-bold text-yellow-500 uppercase tracking-wide">Atenção</p>
                                                <p className="text-[10px] text-zinc-400 leading-relaxed mt-0.5 text-balance">
                                                    Não encontramos uma lista de GPS vinculada a este cliente. Você pode pagar o Pix, mas a baixa automática não será possível.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GpsCalculator;
