import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadCloud, Save, Plus, Trash2, ArrowLeft, ArrowRight, FileText, MousePointer2, Bold, Layout, Eye, EyeOff, X, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Code, Maximize, Loader2, FileCode, User, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../services/supabaseClient';
import { uploadFileToR2 } from '../../services/storageService';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
import { FieldMark, Client } from '../../types';

// Configuração Global do Worker
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const VARIABLES = [
    { label: 'Nome Completo', key: '{nome_completo}' },
    { label: 'CPF', key: '{cpf_cnpj}' },
    { label: 'RG', key: '{rg}' },
    { label: 'Órgão Emissor', key: '{orgao_emissor}' },
    { label: 'Nacionalidade', key: '{nacionalidade}' },
    { label: 'Estado Civil', key: '{estado_civil}' },
    { label: 'Profissão', key: '{profissao}' },
    { label: 'Rua', key: '{endereco}' },
    { label: 'Número', key: '{numero_casa}' },
    { label: 'Bairro', key: '{bairro}' },
    { label: 'Cidade', key: '{cidade}' },
    { label: 'UF', key: '{uf}' },
    { label: 'CEP', key: '{cep}' },
    { label: 'Data Hoje', key: '{data_atual}' },
];

// Helper: Substituição de Variáveis
const replaceVariables = (text: string, client?: Client) => {
    if (!text) return '';
    let data: any = {
        nome_completo: 'JOÃO DA SILVA EXEMPLO',
        cpf_cnpj: '000.000.000-00',
        rg: '0000000',
        orgao_emissor: 'SSP/UF',
        nacionalidade: 'BRASILEIRO',
        estado_civil: 'SOLTEIRO',
        profissao: 'AUTÔNOMO',
        endereco: 'RUA DAS FLORES',
        numero_casa: '123',
        bairro: 'CENTRO',
        cidade: 'CIDADE EXEMPLO',
        uf: 'UF',
        cep: '00000-000',
        data_atual: new Date().toLocaleDateString('pt-BR')
    };

    if (client) {
        const today = new Date().toLocaleDateString('pt-BR');
        data = { ...client, data_atual: today };
    }

    return text.replace(/\{([a-zA-Z0-9_]+)\}|\[([a-zA-Z0-9_]+)\]/gi, (match, key1, key2) => {
        const key = (key1 || key2).toLowerCase();
        let val = data[key];
        if (!val) {
            if (key === 'nome' || key === 'nome_cliente') val = data['nome_completo'];
            if (key === 'cpf') val = data['cpf_cnpj'];
            if (key === 'estado') val = data['uf'];
            if (key === 'municipio') val = data['cidade'];
        }
        return val ? String(val).toUpperCase() : match;
    });
};

// Helper: Formatar Data para Preview
const applyDateFormat = (text: string, format?: string) => {
    if (!format || format === 'default') return text;

    // Verifica se o texto parece uma data (DD/MM/AAAA)
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = text.match(dateRegex);

    if (!match) return text; // Não é data, retorna texto normal

    const [_, day, month, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    switch (format) {
        case 'day': return day;
        case 'month_name': return months[date.getMonth()];
        case 'month_name_upper': return months[date.getMonth()].toUpperCase();
        case 'year': return year;
        case 'long': return `${day} de ${months[date.getMonth()]} de ${year}`;
        default: return text;
    }
};

// Helper para converter Base64 em Arquivo
const base64ToFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

const DocumentBuilder: React.FC = () => {
    const { showToast, clients } = useApp();

    // Base State
    const [baseType, setBaseType] = useState<'pdf' | 'html'>('pdf');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [htmlContent, setHtmlContent] = useState<string>('');

    // Template State
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [templateTitle, setTemplateTitle] = useState('');

    // PDF State
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);

    // Editor State
    const [fields, setFields] = useState<FieldMark[]>([]);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isCodeMode, setIsCodeMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [nextFieldTemplate, setNextFieldTemplate] = useState(VARIABLES[0].key);
    const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
    const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);

    // Preview State
    const [previewClientId, setPreviewClientId] = useState<string>('');

    const previewClient = useMemo(() => {
        return clients.find(c => c.id === previewClientId);
    }, [clients, previewClientId]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const htmlInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadTemplatesList(); }, []);

    // Atalho Delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFieldId && !isPreviewMode && !isCodeMode) {
                const activeTag = document.activeElement?.tagName.toLowerCase();
                if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
                e.preventDefault();
                removeField(selectedFieldId);
                showToast('success', 'Item removido.');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedFieldId, isPreviewMode, isCodeMode]);

    const loadTemplatesList = async () => {
        setIsLoadingList(true);
        const { data, error } = await supabase.from('document_templates').select('*');
        if (error) console.error("Erro ao carregar lista:", error);
        if (data) setSavedTemplates(data);
        setIsLoadingList(false);
    };

    // --- PDF HANDLING ---
    const loadPdf = async (input: string | ArrayBuffer) => {
        try {
            let loadingTask;
            if (typeof input === 'string') {
                loadingTask = pdfjs.getDocument(input);
                setPdfUrl(input);
            } else {
                const data = new Uint8Array(input);
                loadingTask = pdfjs.getDocument({ data });
            }
            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            setCurrentPage(1);
            setBaseType('pdf');
            setIsCodeMode(false);
            showToast('success', 'PDF carregado com sucesso.');
        } catch (error) {
            console.error(error);
            showToast('error', 'Erro ao ler o PDF. Tente outro arquivo.');
        }
    };

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleReset();
            setTemplateTitle(file.name.replace('.pdf', ''));
            setPdfFile(file);
            const buffer = await file.arrayBuffer();
            loadPdf(buffer);
        }
    };

    // --- HTML HANDLING ---
    const handleHtmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleReset();
            setTemplateTitle(file.name.replace('.html', ''));
            const text = await file.text();
            setHtmlContent(text);
            setBaseType('html');

            const regex = /\{([a-zA-Z0-9_]+)\}|\[([a-zA-Z0-9_]+)\]/g;
            const matches = [...text.matchAll(regex)];
            const detectedFields = matches.map(m => m[1] || m[2]);

            if (detectedFields.length > 0) {
                showToast('success', `${detectedFields.length} variáveis detectadas.`);
            }
        }
    };

    // --- IMAGE HANDLING ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const src = e.target?.result as string;
                const newField: FieldMark = {
                    id: crypto.randomUUID(),
                    type: 'image',
                    template: 'Imagem',
                    src: src,
                    x: 50, y: 50,
                    width: 20, height: 10,
                    page: currentPage,
                    fontSize: 0, isBold: false
                };
                setFields(prev => [...prev, newField]);
                setSelectedFieldId(newField.id);
            };
            reader.readAsDataURL(file);
        }
    };

    // --- SELECTION & NAVIGATION ---
    const handleSelectTemplate = (template: any) => {
        setTemplateId(template.id);
        setTemplateTitle(template.titulo);
        setFields(template.campos_config || []);

        if (template.base_type === 'html') {
            setBaseType('html');
            setHtmlContent(template.html_content || '');
            setPdfDoc(null);
        } else {
            setBaseType('pdf');
            setHtmlContent('');
            if (template.arquivo_url) loadPdf(template.arquivo_url);
        }
    };

    const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

        const { error } = await supabase.from('document_templates').delete().eq('id', id);

        if (error) {
            console.error("Erro ao deletar:", error);
            showToast('error', 'Erro ao excluir: ' + error.message);
        } else {
            setSavedTemplates(prev => prev.filter(t => t.id !== id));
            if (templateId === id) handleReset();
            showToast('success', 'Modelo excluído.');
        }
    };

    const handleReset = () => {
        setPdfFile(null); setPdfUrl(null); setPdfDoc(null); setTemplateId(null);
        setHtmlContent(''); setBaseType('pdf');
        setTemplateTitle(''); setFields([]); setSelectedFieldId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (htmlInputRef.current) htmlInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
        setIsCodeMode(false);
        setPreviewClientId('');
    };

    // --- RENDERER ---
    useEffect(() => {
        const renderPage = async () => {
            if (baseType !== 'pdf' || !pdfDoc || !canvasRef.current) return;
            const page = await pdfDoc.getPage(currentPage);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            if (context) await page.render({ canvasContext: context, viewport }).promise;
        };
        renderPage();
    }, [pdfDoc, currentPage, baseType]);

    // --- DRAG & DROP LOGIC ---
    const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
        e.stopPropagation();
        if (isPreviewMode || isCodeMode) return;
        (document.activeElement as HTMLElement)?.blur();
        setDraggedFieldId(fieldId);
        setSelectedFieldId(fieldId);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggedFieldId || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setFields(prev => prev.map(f => {
            if (f.id === draggedFieldId) {
                return { ...f, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
            }
            return f;
        }));
    };

    const handleMouseUp = () => { setDraggedFieldId(null); };

    const handleAddFieldButton = () => {
        const newField: FieldMark = {
            id: crypto.randomUUID(),
            type: 'text',
            template: nextFieldTemplate,
            x: 50, y: 50,
            page: currentPage,
            fontSize: 14, isBold: false, dateFormat: 'default', textAlign: 'left',
            width: 0, autoFit: false
        };
        setFields(prev => [...prev, newField]);
        setSelectedFieldId(newField.id);
    };

    const updateField = (id: string, changes: Partial<FieldMark>) => {
        setFields(prev => prev.map(f => f.id === id ? { ...f, ...changes } : f));
    };

    const removeField = (id: string) => {
        setFields(prev => prev.filter(f => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    // --- SALVAR ---
    const handleSave = async () => {
        if (!templateTitle) { showToast('error', 'Defina um título.'); return; }
        if (baseType === 'pdf' && !pdfDoc && !pdfUrl) return;
        if (baseType === 'html' && !htmlContent) return;

        setIsSaving(true);
        try {
            let finalUrl = pdfUrl;
            if (baseType === 'pdf' && pdfFile) {
                try {
                    const { url } = await uploadFileToR2(pdfFile, 'templates');
                    finalUrl = url;
                } catch (uErr) {
                    console.error("Erro R2 PDF:", uErr);
                    throw new Error("Falha ao subir PDF.");
                }
            }

            const processedFields = await Promise.all(fields.map(async (field) => {
                if (field.type === 'image' && field.src && field.src.startsWith('data:')) {
                    try {
                        const imageFile = base64ToFile(field.src, `img_${field.id}.png`);
                        const { url } = await uploadFileToR2(imageFile, 'templates/images');
                        return { ...field, src: url };
                    } catch (imgErr) {
                        return field;
                    }
                }
                return field;
            }));

            setFields(processedFields);

            const payload = {
                titulo: templateTitle,
                arquivo_url: finalUrl,
                html_content: htmlContent,
                base_type: baseType,
                campos_config: processedFields
            };

            let error = null;
            if (templateId) {
                const res = await supabase.from('document_templates').update(payload).eq('id', templateId);
                error = res.error;
            } else {
                const res = await supabase.from('document_templates').insert([payload]).select().single();
                error = res.error;
                if (res.data) setTemplateId(res.data.id);
            }

            if (error) throw error;
            loadTemplatesList();
            showToast('success', 'Modelo salvo com sucesso!');
        } catch (error: any) {
            console.error("Erro Save:", error);
            showToast('error', `Erro ao salvar: ${error.message || 'Falha desconhecida'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- COMPONENT: AUTO-FIT TEXT ---
    const AutoFitText = ({ text, width, style, autoFit }: { text: string, width: number, style: any, autoFit?: boolean }) => {
        const textRef = useRef<HTMLSpanElement>(null);
        const [scale, setScale] = useState(1);

        useEffect(() => {
            if (!autoFit || !width || !textRef.current || !containerRef.current) {
                setScale(1);
                return;
            }
            const containerWidth = containerRef.current.offsetWidth;
            const availablePx = (width / 100) * containerWidth;
            const contentPx = textRef.current.scrollWidth;
            if (contentPx > availablePx && availablePx > 0) {
                setScale(availablePx / contentPx);
            } else {
                setScale(1);
            }
        }, [text, width, autoFit, style.fontSize, style.fontWeight]);

        return (
            <span
                ref={textRef}
                style={{
                    ...style,
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    transform: `scale(${scale})`,
                    transformOrigin: style.textAlign === 'right' ? 'right center' : style.textAlign === 'center' ? 'center center' : 'left center',
                    width: autoFit ? '100%' : 'auto'
                }}
            >
                {text}
            </span>
        );
    };

    const renderField = (field: FieldMark) => {
        if (field.page !== currentPage && baseType === 'pdf') return null;

        const isSelected = selectedFieldId === field.id;
        let displayText = field.template;

        // --- PREVIEW LOGIC WITH DATE FORMATTING ---
        if (isPreviewMode && field.type === 'text') {
            const client = previewClient;
            displayText = replaceVariables(field.template, client);
            // Se o resultado for uma data, aplica formatação
            displayText = applyDateFormat(displayText, field.dateFormat);
        }

        let transform = 'translate(0, -50%)';
        if (field.textAlign === 'center') transform = 'translate(-50%, -50%)';
        if (field.textAlign === 'right') transform = 'translate(-100%, -50%)';

        const commonStyle: React.CSSProperties = {
            left: `${field.x}%`,
            top: `${field.y}%`,
            transform: transform,
            position: 'absolute',
            zIndex: isSelected ? 20 : 10,
            cursor: isPreviewMode ? 'default' : (isSelected ? 'move' : 'pointer'),
        };

        if (field.type === 'image') {
            return (
                <div
                    key={field.id}
                    onMouseDown={(e) => handleMouseDown(e, field.id)}
                    style={{
                        ...commonStyle,
                        width: `${field.width}%`,
                        height: `${field.height}%`,
                    }}
                    className={`field-mark group ${isSelected && !isPreviewMode ? 'ring-2 ring-blue-500' : ''}`}
                >
                    <img src={field.src} alt="Field" className="w-full h-full object-contain pointer-events-none" />
                    {isSelected && !isPreviewMode && (
                        <button onMouseDown={(e) => { e.stopPropagation(); removeField(field.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center z-50"><X size={10} /></button>
                    )}
                </div>
            );
        }

        return (
            <div
                key={field.id}
                onMouseDown={(e) => handleMouseDown(e, field.id)}
                className={`field-mark absolute select-none ${isPreviewMode ? '' : (isSelected ? 'border border-blue-500 bg-blue-500/10' : 'border border-dashed border-transparent hover:border-zinc-400 bg-yellow-500/20')
                    }`}
                style={{
                    ...commonStyle,
                    width: field.autoFit && field.width ? `${field.width}%` : 'auto',
                    fontSize: `${field.fontSize}px`,
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: field.isBold ? 'bold' : 'normal',
                    textAlign: field.textAlign,
                    color: 'black',
                    whiteSpace: 'nowrap',
                }}
            >
                <AutoFitText text={displayText} width={field.width || 0} autoFit={field.autoFit} style={{ color: 'inherit' }} />
                {isSelected && !isPreviewMode && field.autoFit && (
                    <div className="absolute inset-0 border border-dotted border-red-400 pointer-events-none opacity-50" title="Área Limite" />
                )}
            </div>
        );
    };

    const selectedField = fields.find(f => f.id === selectedFieldId);

    return (
        <div className="flex flex-col h-full space-y-4 pb-4 animate-in fade-in duration-500">
            {/* Standard Premium Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
                        {baseType === 'pdf' ? <FileText size={24} /> : <FileCode size={24} />}
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
                            Criador de Modelos
                        </h1>
                        <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
                            Crie e edite modelos inteligentes {baseType === 'html' ? 'em HTML' : 'baseados em PDF'}.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isPreviewMode && (
                        <div className="flex items-center gap-2 bg-[#131418] border border-white/10 px-3 py-2 rounded-xl">
                            <User size={16} className="text-gold-500" />
                            <select
                                className="bg-transparent text-xs text-white outline-none w-40 font-medium"
                                value={previewClientId}
                                onChange={(e) => setPreviewClientId(e.target.value)}
                            >
                                <option value="">Exemplo Genérico</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.nome_completo}</option>)}
                            </select>
                        </div>
                    )}

                    {(pdfDoc || htmlContent) && (
                        <>
                            {baseType === 'html' && !isPreviewMode && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsCodeMode(!isCodeMode)}
                                    className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all shadow-lg ${isCodeMode ? 'bg-[#131418] border-purple-500 text-purple-400' : 'bg-[#131418] border-white/10 text-slate-400 hover:text-white'}`}
                                >
                                    <Layout size={16} /> {isCodeMode ? 'Visual' : 'Código'}
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsPreviewMode(!isPreviewMode)}
                                className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all shadow-lg ${isPreviewMode ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-[#131418] border-white/10 text-slate-400 hover:text-white'}`}
                            >
                                {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />} <span>Preview</span>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSave}
                                disabled={isSaving}
                                className="h-10 px-6 bg-gold-600 hover:bg-gold-700 text-black rounded-xl font-bold text-xs transition-all shadow-lg shadow-gold-600/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                <span>Salvar Modelo</span>
                            </motion.button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

                {/* LEFT SIDEBAR */}
                <div className="w-64 bg-[#0f1014] border border-zinc-800 rounded-xl p-4 flex flex-col shadow-xl">
                    <button onClick={handleReset} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg mb-2 text-xs font-bold">Novo / Limpar</button>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 py-3 rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors text-center">
                            <UploadCloud size={20} className="text-gold-500" />
                            <span className="text-[10px] font-bold">Importar PDF</span>
                            <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} ref={fileInputRef} />
                        </label>
                        <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 py-3 rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors text-center">
                            <Code size={20} className="text-blue-500" />
                            <span className="text-[10px] font-bold">Importar HTML</span>
                            <input type="file" accept=".html,.htm" className="hidden" onChange={handleHtmlUpload} ref={htmlInputRef} />
                        </label>
                    </div>

                    <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Modelos Salvos</h4>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        {savedTemplates.map(t => (
                            <div key={t.id} onClick={() => handleSelectTemplate(t)} className={`p-3 rounded-lg cursor-pointer border flex justify-between items-center group ${templateId === t.id ? 'bg-zinc-800 border-gold-500 text-white' : 'bg-zinc-900 border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {t.base_type === 'html' ? <Code size={12} className="text-blue-500 shrink-0" /> : <FileText size={12} className="text-red-500 shrink-0" />}
                                    <span className="text-sm truncate font-medium">{t.titulo}</span>
                                </div>
                                <button onClick={(e) => handleDeleteTemplate(t.id, e)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 p-1 transition-opacity"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MAIN CANVAS AREA */}
                <div className="flex-1 flex flex-col gap-4">
                    {(pdfDoc || htmlContent) && !isPreviewMode && !isCodeMode && (
                        <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl flex items-center gap-4 shadow-lg">
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-xs font-bold text-gold-500 uppercase ml-2">Texto:</span>
                                <select className="bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-gold-500 flex-1" value={nextFieldTemplate} onChange={(e) => setNextFieldTemplate(e.target.value)}>
                                    {VARIABLES.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                                </select>
                                <button onClick={handleAddFieldButton} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg border border-zinc-600 flex items-center gap-2 text-sm"><Plus size={16} /> Add Texto</button>
                            </div>
                            <div className="w-px h-6 bg-zinc-700 mx-1"></div>
                            <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg border border-zinc-600 cursor-pointer flex items-center gap-2 text-sm">
                                <ImageIcon size={16} className="text-emerald-500" /> Add Imagem
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} ref={imageInputRef} />
                            </label>
                        </div>
                    )}

                    <div
                        className={`flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-auto relative flex flex-col items-center ${isCodeMode ? 'p-0' : 'p-8'} custom-scrollbar select-none`}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {(pdfDoc || htmlContent) ? (
                            <>
                                {isCodeMode ? (
                                    <div className="w-full h-full min-h-[600px] flex flex-col">
                                        <textarea
                                            className="w-full h-full bg-[#1e1e1e] text-zinc-300 font-mono text-sm p-6 outline-none resize-none focus:border-blue-500 shadow-inner leading-relaxed"
                                            value={htmlContent}
                                            onChange={(e) => setHtmlContent(e.target.value)}
                                            spellCheck={false}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {baseType === 'pdf' && (
                                            <div className="sticky top-0 z-50 bg-zinc-800/90 backdrop-blur px-4 py-2 rounded-full shadow-lg flex gap-4 items-center mb-4 border border-zinc-700">
                                                <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="text-white disabled:opacity-30"><ArrowLeft size={18} /></button>
                                                <span className="text-sm font-mono text-white">Página {currentPage} de {numPages}</span>
                                                <button disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)} className="text-white disabled:opacity-30"><ArrowRight size={18} /></button>
                                            </div>
                                        )}

                                        <div ref={containerRef} className="relative shadow-2xl border border-white/10 bg-white mx-auto" style={{ lineHeight: 0, width: baseType === 'html' ? '210mm' : 'auto', minHeight: baseType === 'html' ? '297mm' : 'auto', overflow: 'hidden' }} onClick={() => setSelectedFieldId(null)}>
                                            {baseType === 'pdf' ? (
                                                <canvas ref={canvasRef} className="block max-w-full h-auto" />
                                            ) : (
                                                <div
                                                    className="w-full h-full text-black font-serif leading-relaxed text-justify bg-white"
                                                    dangerouslySetInnerHTML={{
                                                        // Preview Mode: Replace variables in HTML body dynamically
                                                        __html: isPreviewMode ? replaceVariables(htmlContent, previewClient) : htmlContent
                                                    }}
                                                    style={{ pointerEvents: 'none' }}
                                                />
                                            )}
                                            {fields.map(renderField)}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                                <FileText size={64} className="opacity-20 mb-4" />
                                <p className="mb-4">Selecione um modelo à esquerda ou importe um arquivo.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDEBAR */}
                {!isCodeMode && (
                    <div className="w-72 bg-[#0f1014] border border-zinc-800 rounded-xl p-4 flex flex-col shadow-xl">
                        <div className="mb-4">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Título do Modelo</label>
                            <input className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white mt-1 outline-none focus:border-gold-500" value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} />
                        </div>

                        {selectedField ? (
                            <div className="space-y-4 animate-in slide-in-from-right-2">
                                <h4 className="text-sm font-bold text-gold-500 flex items-center gap-2"><Layout size={14} /> Propriedades</h4>

                                {selectedField.type === 'text' ? (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 block mb-1">Conteúdo</label>
                                            <input className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm font-mono outline-none focus:border-gold-500" value={selectedField.template} onChange={e => updateField(selectedField.id, { template: e.target.value })} />
                                            <div className="flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto">
                                                {VARIABLES.map(v => (
                                                    <button key={v.key} onClick={() => updateField(selectedField.id, { template: selectedField.template + ' ' + v.key })} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-2 py-1 rounded m-0.5" title={v.label}>{v.key}</button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-xs font-bold text-zinc-400 block mb-1">Fonte (px)</label><input type="number" className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white outline-none" value={selectedField.fontSize} onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })} /></div>
                                            <div className="flex items-end"><button onClick={() => updateField(selectedField.id, { isBold: !selectedField.isBold })} className={`w-full py-2 rounded border flex items-center justify-center gap-2 ${selectedField.isBold ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-700'}`}><Bold size={14} /> Negrito</button></div>
                                        </div>

                                        {/* DATA FORMAT SELECTION (NOVO) */}
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 block mb-1 flex items-center gap-1"><Calendar size={12} /> Formato Data</label>
                                            <select
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm outline-none"
                                                value={selectedField.dateFormat || 'default'}
                                                onChange={e => updateField(selectedField.id, { dateFormat: e.target.value })}
                                            >
                                                <option value="default">Padrão (DD/MM/AAAA)</option>
                                                <option value="long">Extenso (Dia de Mês de Ano)</option>
                                                <option value="day">Dia (DD)</option>
                                                <option value="month_name">Mês (Nome)</option>
                                                <option value="month_name_upper">MÊS (MAIÚSCULO)</option>
                                                <option value="year">Ano (AAAA)</option>
                                            </select>
                                        </div>

                                        <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-bold text-zinc-400 flex items-center gap-1"><Maximize size={12} /> Auto-Ajuste</label>
                                                <input type="checkbox" checked={selectedField.autoFit} onChange={e => updateField(selectedField.id, { autoFit: e.target.checked })} className="accent-gold-500" />
                                            </div>
                                            {selectedField.autoFit && (
                                                <div>
                                                    <label className="text-[10px] text-zinc-500 block mb-1">Largura Máxima (%)</label>
                                                    <input type="range" min="5" max="100" value={selectedField.width || 20} onChange={e => updateField(selectedField.id, { width: Number(e.target.value) })} className="w-full accent-gold-500 h-2 bg-zinc-800 rounded-lg appearance-none" />
                                                    <div className="text-right text-[10px] text-zinc-400">{selectedField.width}%</div>
                                                </div>
                                            )}
                                        </div>

                                        <div><label className="text-xs font-bold text-zinc-400 block mb-1">Alinhamento</label><div className="flex bg-zinc-900 rounded p-1 border border-zinc-700"><button onClick={() => updateField(selectedField.id, { textAlign: 'left' })} className={`flex-1 flex justify-center py-1 rounded ${selectedField.textAlign === 'left' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><AlignLeft size={14} /></button><button onClick={() => updateField(selectedField.id, { textAlign: 'center' })} className={`flex-1 flex justify-center py-1 rounded ${selectedField.textAlign === 'center' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><AlignCenter size={14} /></button><button onClick={() => updateField(selectedField.id, { textAlign: 'right' })} className={`flex-1 flex justify-center py-1 rounded ${selectedField.textAlign === 'right' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><AlignRight size={14} /></button></div></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center py-4 bg-zinc-900 rounded border border-zinc-800">
                                            <ImageIcon size={48} className="mx-auto text-zinc-600 mb-2" />
                                            <span className="text-xs text-zinc-400">Elemento de Imagem</span>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 block mb-1">Largura (%)</label>
                                            <input type="range" min="1" max="100" value={selectedField.width || 20} onChange={e => updateField(selectedField.id, { width: Number(e.target.value) })} className="w-full accent-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-400 block mb-1">Altura (%)</label>
                                            <input type="range" min="1" max="100" value={selectedField.height || 10} onChange={e => updateField(selectedField.id, { height: Number(e.target.value) })} className="w-full accent-blue-500" />
                                        </div>
                                    </>
                                )}

                                <button onClick={() => removeField(selectedField.id)} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 mt-4"><Trash2 size={14} /> Remover</button>
                            </div>
                        ) : (
                            <div className="text-center text-zinc-600 mt-10"><MousePointer2 size={32} className="mx-auto mb-2 opacity-30" /><p className="text-xs">Selecione um campo para editar ou arraste para mover.</p></div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentBuilder;
