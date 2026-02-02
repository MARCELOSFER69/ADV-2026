import React, { useState, useRef, useMemo } from 'react';
import { FileScan, UploadCloud, AlertCircle, FileText, CheckCircle2, Loader2, Trash2, Calendar, Clock, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';

// --- CORREÇÃO DO WORKER (IMPORTAÇÃO LOCAL) ---
// Isso resolve o problema de não ler o PDF por bloqueio de CDN ou versão
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Configura o worker para usar o arquivo local do projeto
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Duration {
  years: number;
  months: number;
  days: number;
}

interface EmploymentBond {
  id: string;
  company: string;
  startDate: string;
  endDate: string; // Pode ser "Ativo" ou data
  duration: Duration;
  durationString: string;
  isActive: boolean;
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

const CnisReader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bonds, setBonds] = useState<EmploymentBond[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ARITMÉTICA DE DATAS ---

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  };

  const calculateDateDiff = (startStr: string, endStr?: string): Duration => {
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

  const formatDuration = (d: Duration): string => {
    const parts = [];
    if (d.years > 0) parts.push(`${d.years} ${d.years === 1 ? 'ano' : 'anos'}`);
    if (d.months > 0) parts.push(`${d.months} ${d.months === 1 ? 'mês' : 'meses'}`);
    if (d.days > 0) parts.push(`${d.days} ${d.days === 1 ? 'dia' : 'dias'}`);

    if (parts.length === 0) return "0 dias";
    return parts.join(', ');
  };

  const sumDurations = (bondList: EmploymentBond[]): Duration => {
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

  // --- PROCESSAMENTO INTELIGENTE (REVERSE LOOKUP) ---

  const isDate = (str: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(str);

  const isDocNumber = (str: string) => {
    const clean = str.replace(/\D/g, '');
    return (clean.length === 11 || clean.length === 14) && (str.includes('.') || str.includes('/') || str.includes('-'));
  };

  const isCurrency = (str: string) => /^\d{1,3}(\.\d{3})*,\d{2}$/.test(str);

  const shouldIgnore = (str: string) => {
    const upper = str.toUpperCase().trim();
    if (upper.length < 2) return true;
    if (IGNORED_TERMS.some(term => upper.includes(term))) return true;
    if (isDate(str)) return true;
    if (isDocNumber(str)) return true;
    if (isCurrency(str)) return true;
    if (/^\d+$/.test(cleanStr(str))) return true;
    return false;
  };

  const cleanStr = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');

  const extractBondsFromItems = (items: string[]) => {
    const extractedBonds: EmploymentBond[] = [];
    let idCounter = 0;

    for (let i = 0; i < items.length; i++) {
      const currentItem = items[i];

      if (isDate(currentItem)) {
        const startDate = currentItem;

        let isHeaderData = false;
        if (i > 0) {
          if (isDate(items[i - 1])) continue;

          for (let k = 1; k <= 3; k++) {
            if (i - k >= 0) {
              const prev = items[i - k].toUpperCase();
              if (prev.includes('NASCIMENTO') ||
                prev.includes('DN') ||
                prev.includes('NAT') ||
                prev.includes('NIT') ||
                prev.includes('CPF')) {
                isHeaderData = true;
                break;
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
          if (upperName.includes('NOME:') ||
            upperName.includes('FILIADO') ||
            upperName.includes('SEGURADO') ||
            upperName.includes('IDENTIFICAÇÃO') ||
            upperName.startsWith('NIT') ||
            upperName.startsWith('CPF')) {
            continue;
          }

          const duration = calculateDateDiff(startDate, endDate);

          if (companyName.length > 2) {
            extractedBonds.push({
              id: `bond-${idCounter++}`,
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
      setError('Nenhum vínculo encontrado. O arquivo pode não ser um CNIS padrão ou estar em formato imagem.');
    } else {
      setBonds(extractedBonds);
    }
  };

  const processFile = async (pdfFile: File) => {
    setFile(pdfFile);
    setIsLoading(true);
    setError(null);
    setBonds([]);

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const allItems: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        const pageItems = textContent.items
          .map((item: any) => item.str.trim())
          .filter((s: string) => s.length > 0);

        allItems.push(...pageItems);
      }

      extractBondsFromItems(allItems);

    } catch (err: any) {
      console.error('Erro:', err);
      setError(err.name === 'PasswordException' ? 'Arquivo protegido por senha.' : 'Erro ao ler o arquivo PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setBonds([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-6 animate-in fade-in duration-500 pb-20 pr-2">
      {/* Standard Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
            <FileScan size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
              Leitor de CNIS
            </h1>
            <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
              Extração inteligente de vínculos e cálculo de tempo de contribuição.
            </p>
          </div>
        </div>

        {bonds.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClear}
            className="h-10 px-6 bg-[#131418] border border-white/10 hover:border-red-500/50 text-red-500 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg"
          >
            <Trash2 size={16} />
            <span>Limpar Extração</span>
          </motion.button>
        )}
      </div>

      {/* ÁREA DE UPLOAD */}
      {!file || bonds.length === 0 ? (
        <div
          className={`bg-[#0f1014] border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${isDragging ? 'border-gold-500 bg-zinc-900' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileInput} />

          {isLoading ? (
            <div className="flex flex-col items-center animate-pulse">
              <Loader2 size={48} className="text-gold-500 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-white">Processando CNIS...</h3>
              <p className="text-zinc-500 text-sm">Aplicando reconhecimento de padrões...</p>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 bg-[#09090b] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-zinc-800">
                <UploadCloud size={40} className="text-zinc-500 group-hover:text-gold-500 transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Arraste o PDF do CNIS aqui</h3>
              <p className="text-zinc-500 mb-6 max-w-md text-sm">
                O sistema identifica automaticamente datas de entrada e saída para calcular o tempo de contribuição.
              </p>
              <button className="bg-gold-600 hover:bg-gold-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-gold-600/20">
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

          {/* CARD DE RESUMO DO TEMPO TOTAL */}
          <div className="bg-[#0f1014] border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Clock size={100} className="text-white" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                  <Calculator size={32} className="text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Tempo Total Encontrado</h3>
                  <p className="text-zinc-500 text-sm">Soma de todos os períodos listados abaixo</p>
                </div>
              </div>
              <div className="bg-black/20 px-6 py-3 rounded-lg border border-white/5 backdrop-blur-sm">
                <span className="text-3xl font-bold text-white">
                  {totalTime.years} <span className="text-sm font-normal text-zinc-500">anos</span>
                </span>
                <span className="mx-2 text-zinc-700">|</span>
                <span className="text-2xl font-bold text-white">
                  {totalTime.months} <span className="text-sm font-normal text-zinc-500">meses</span>
                </span>
                <span className="mx-2 text-zinc-700">|</span>
                <span className="text-xl font-bold text-white">
                  {totalTime.days} <span className="text-sm font-normal text-zinc-500">dias</span>
                </span>
              </div>
            </div>
          </div>

          {/* TABELA DE VÍNCULOS */}
          <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <FileText size={24} className="text-emerald-500" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{file.name}</h4>
                <p className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12} /> {bonds.length} vínculos identificados</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Empresa / Empregador</th>
                    <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Período</th>
                    <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Tempo Calculado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bonds.map((bond) => (
                    <tr key={bond.id} className="hover:bg-zinc-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-200 text-sm">{bond.company || 'EMPRESA DESCONHECIDA'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-700 w-fit">
                          <Calendar size={14} className="text-zinc-500" />
                          <span>{bond.startDate}</span>
                          <span className="text-zinc-600">➜</span>
                          <span className={bond.isActive ? 'text-emerald-400 font-bold' : ''}>{bond.endDate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${bond.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                          <Clock size={12} /> {bond.durationString}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/5 px-4 py-3 rounded-lg border border-yellow-500/20">
            <AlertCircle size={16} />
            <span>
              <strong>Aviso Legal:</strong> Este cálculo é uma estimativa baseada nas datas extraídas. O INSS pode considerar outros fatores (carência, qualidade de segurado).
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CnisReader;
