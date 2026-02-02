import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../services/supabaseClient';
import { uploadFileToR2 } from '../../services/storageService';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
import { FieldMark, Client } from '../../types';
import { useAllClients } from '../../hooks/useClients';
import { replaceVariables } from '../../utils/documentUtils';

// Sub-components
import DocumentHeader from '../../components/document/DocumentHeader';
import DocumentSidebarLeft from '../../components/document/DocumentSidebarLeft';
import DocumentProperties from '../../components/document/DocumentProperties';
import DocumentToolbar from '../../components/document/DocumentToolbar';
import DocumentCanvas from '../../components/document/DocumentCanvas';

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

// Helper para converter Base64 em Arquivo (mantido aqui pois é infra)
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
    const { showToast } = useApp();
    const { data: clients = [] } = useAllClients();

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

    // PDF Canvas Renderer
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

    // Drag Logic
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
        setFields(prev => prev.map(f => f.id === draggedFieldId ? { ...f, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : f));
    };

    const handleMouseUp = () => { setDraggedFieldId(null); };

    const handleAddFieldButton = () => {
        const newField: FieldMark = {
            id: crypto.randomUUID(), type: 'text', template: nextFieldTemplate, x: 50, y: 50,
            page: currentPage, fontSize: 14, isBold: false, dateFormat: 'default', textAlign: 'left',
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

    const handleSave = async () => {
        if (!templateTitle) { showToast('error', 'Defina um título.'); return; }
        if (baseType === 'pdf' && !pdfDoc && !pdfUrl) return;
        if (baseType === 'html' && !htmlContent) return;
        setIsSaving(true);
        try {
            let finalUrl = pdfUrl;
            if (baseType === 'pdf' && pdfFile) {
                const { url } = await uploadFileToR2(pdfFile, 'templates');
                finalUrl = url;
            }
            const processedFields = await Promise.all(fields.map(async (field) => {
                if (field.type === 'image' && field.src && field.src.startsWith('data:')) {
                    const imageFile = base64ToFile(field.src, `img_${field.id}.png`);
                    const { url } = await uploadFileToR2(imageFile, 'templates/images');
                    return { ...field, src: url };
                }
                return field;
            }));
            const payload = { titulo: templateTitle, arquivo_url: finalUrl, html_content: htmlContent, base_type: baseType, campos_config: processedFields };
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
            showToast('success', 'Modelo salvo!');
        } catch (error: any) {
            showToast('error', `Erro ao salvar: ${error.message}`);
        } finally { setIsSaving(false); }
    };

    const selectedField = useMemo(() => fields.find(f => f.id === selectedFieldId), [fields, selectedFieldId]);

    return (
        <div className="flex flex-col h-full space-y-4 pb-4 animate-in fade-in duration-500">
            <DocumentHeader
                baseType={baseType}
                isPreviewMode={isPreviewMode}
                previewClientId={previewClientId}
                setPreviewClientId={setPreviewClientId}
                clients={clients}
                pdfDoc={pdfDoc}
                htmlContent={htmlContent}
                isCodeMode={isCodeMode}
                setIsCodeMode={setIsCodeMode}
                setIsPreviewMode={setIsPreviewMode}
                handleSave={handleSave}
                isSaving={isSaving}
            />

            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                <DocumentSidebarLeft
                    handleReset={handleReset}
                    handlePdfUpload={handlePdfUpload}
                    handleHtmlUpload={handleHtmlUpload}
                    fileInputRef={fileInputRef}
                    htmlInputRef={htmlInputRef}
                    savedTemplates={savedTemplates}
                    handleSelectTemplate={handleSelectTemplate}
                    templateId={templateId}
                    handleDeleteTemplate={handleDeleteTemplate}
                />

                <div className="flex-1 flex flex-col gap-4">
                    <DocumentToolbar
                        pdfDoc={pdfDoc}
                        htmlContent={htmlContent}
                        isPreviewMode={isPreviewMode}
                        isCodeMode={isCodeMode}
                        nextFieldTemplate={nextFieldTemplate}
                        setNextFieldTemplate={setNextFieldTemplate}
                        handleAddFieldButton={handleAddFieldButton}
                        handleImageUpload={handleImageUpload}
                        imageInputRef={imageInputRef}
                        VARIABLES={VARIABLES}
                    />

                    <DocumentCanvas
                        pdfDoc={pdfDoc}
                        htmlContent={htmlContent}
                        isCodeMode={isCodeMode}
                        baseType={baseType}
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        numPages={numPages}
                        containerRef={containerRef}
                        canvasRef={canvasRef}
                        handleMouseMove={handleMouseMove}
                        handleMouseUp={handleMouseUp}
                        isPreviewMode={isPreviewMode}
                        previewClient={previewClient}
                        fields={fields}
                        selectedFieldId={selectedFieldId}
                        handleMouseDown={handleMouseDown}
                        removeField={removeField}
                        setSelectedFieldId={setSelectedFieldId}
                        setHtmlContent={setHtmlContent}
                    />
                </div>

                <DocumentProperties
                    isCodeMode={isCodeMode}
                    templateTitle={templateTitle}
                    setTemplateTitle={setTemplateTitle}
                    selectedField={selectedField}
                    updateField={updateField}
                    VARIABLES={VARIABLES}
                    removeField={removeField}
                />
            </div>
        </div>
    );
};

export default DocumentBuilder;
