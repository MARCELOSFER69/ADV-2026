import { Client, FieldMark } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const formatDate = (dateValue: string | Date | undefined, format: string) => {
    if (!dateValue) return '';
    let d = new Date();
    
    if (typeof dateValue === 'string' && dateValue.includes('-')) {
        const parts = dateValue.split('-');
        const datePart = parts[2].includes('T') ? parts[2].split('T')[0] : parts[2];
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(datePart));
    } else if (dateValue instanceof Date) {
        d = dateValue;
    }

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    if (format === 'long') return `${day} de ${monthNames[d.getMonth()]} de ${year}`;
    if (format === 'month_name') return monthNames[d.getMonth()];
    if (format === 'month_name_upper') return monthNames[d.getMonth()].toUpperCase();
    if (format === 'year') return String(year);
    if (format === 'day') return String(day).padStart(2, '0');
    
    return `${day}/${month}/${year}`;
};

const processTemplateString = (text: string, client: Client, dateFormat: string = 'default'): string => {
    if (!text) return '';
    let processed = text;
    const c = client as any;
    const today = new Date().toISOString().split('T')[0];
    const map: Record<string, string> = {
        'data_atual': formatDate(today, dateFormat),
        'cidade_escritorio': 'Santa Inês', 
        ...c 
    };

    // --- ATUALIZAÇÃO GENIAL: SUPORTE A { } E [ ] ---
    // A Regex agora busca: \{var\} OU \[var\]
    // O 'gi' no final torna case-insensitive (tanto faz Maiúscula ou minúscula)
    processed = processed.replace(/\{([a-zA-Z0-9_]+)\}|\[([a-zA-Z0-9_]+)\]/gi, (match, key1, key2) => {
        // key1 é o conteúdo de {}, key2 é o conteúdo de []
        // Pegamos o que não for undefined e forçamos minúsculo para bater com o banco de dados
        const rawKey = (key1 || key2).toLowerCase(); 
        
        let value = map[rawKey];
        
        // Fallback: Se não achou direto, tenta mapear chaves comuns que podem vir erradas
        if (!value) {
            if (rawKey === 'nome' || rawKey === 'nome_cliente') value = map['nome_completo'];
            if (rawKey === 'cpf') value = map['cpf_cnpj'];
            if (rawKey === 'estado') value = map['uf'];
            if (rawKey === 'municipio') value = map['cidade'];
        }

        if (rawKey.includes('data') || rawKey.includes('nascimento')) {
            return formatDate(value, dateFormat);
        }
        
        // Se encontrou valor, retorna em MAIÚSCULO. Se não, mantém a tag original para o usuário ver que falhou.
        return value ? String(value).toUpperCase() : match;
    });

    return processed;
};

// Gera o HTML para um campo individual (Texto ou Imagem)
const generateFieldHtml = (field: FieldMark, client: Client) => {
    let transform = 'translate(0, -50%)';
    if (field.textAlign === 'center') transform = 'translate(-50%, -50%)';
    if (field.textAlign === 'right') transform = 'translate(-100%, -50%)';

    const commonStyle = `
        position: absolute; 
        left: ${field.x}%; 
        top: ${field.y}%; 
        transform: ${transform};
        z-index: 10;
    `;

    if (field.type === 'image') {
        return `
            <img 
                src="${field.src}" 
                style="${commonStyle} width: ${field.width}%; height: ${field.height}%; object-fit: contain;"
            />
        `;
    }

    // Lógica de Texto (Campos Flutuantes)
    const textContent = processTemplateString(field.template, client, field.dateFormat);
    const fontWeight = field.isBold ? 'bold' : 'normal';
    const fontSize = `${field.fontSize}px`;
    
    const autoFitClass = field.autoFit ? 'dynamic-fit' : '';
    const widthStyle = field.autoFit && field.width ? `width: ${field.width}%;` : 'white-space: nowrap;';

    return `
        <div 
            class="${autoFitClass}"
            data-fontsize="${field.fontSize}"
            style="
                ${commonStyle}
                ${widthStyle}
                font-size: ${fontSize};
                font-family: 'Arial', sans-serif;
                font-weight: ${fontWeight};
                text-align: ${field.textAlign || 'left'};
                color: black;
                line-height: 1;
            ">
            ${textContent}
        </div>
    `;
};

export const printCustomTemplate = async (template: any, client: Client) => {
  try {
    let pagesHtml = [];

    // --- MODO HTML (Importado) ---
    if (template.base_type === 'html') {
        // 1. Processa o HTML Base (substitui variáveis no texto corrido {var} ou [var])
        const rawHtml = processTemplateString(template.html_content || '', client);
        
        // 2. Gera os campos sobrepostos (caso o usuário tenha adicionado extras no editor)
        const fieldsHtml = (template.campos_config || []).map((f: any) => generateFieldHtml(f, client)).join('');

        pagesHtml.push(`
            <div class="page-container html-mode">
                <div class="html-content">${rawHtml}</div>
                ${fieldsHtml}
            </div>
        `);
    } 
    // --- MODO PDF (Canvas) ---
    else {
        const loadingTask = pdfjs.getDocument(template.arquivo_url);
        const pdf = await loadingTask.promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) await page.render({ canvasContext: context, viewport }).promise;
            const imgData = canvas.toDataURL('image/jpeg', 0.85); 

            const fieldsOnPage = (template.campos_config || []).filter((f: any) => f.page === pageNum);
            const fieldsHtml = fieldsOnPage.map((f: any) => generateFieldHtml(f, client)).join('');

            pagesHtml.push(`
                <div class="page-container pdf-mode">
                    <img src="${imgData}" class="pdf-bg" />
                    ${fieldsHtml}
                </div>
            `);
        }
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=900');
    if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${template.titulo}</title>
              <style>
                @page { margin: 0; size: A4; }
                body { margin: 0; padding: 0; background: #f0f0f0; display: flex; flex-direction: column; align-items: center; }
                
                .page-container {
                    position: relative;
                    width: 210mm; 
                    height: 297mm; 
                    background: white;
                    margin: 20px 0;
                    box-shadow: 0 0 10px rgba(0,0,0,0.2);
                    overflow: hidden;
                }
                
                .html-mode { padding: 0; }
                .html-content { width: 100%; height: 100%; }
                .pdf-bg { width: 100%; height: 100%; }

                @media print {
                    body { background: white; display: block; }
                    .page-container { margin: 0; box-shadow: none; page-break-after: always; width: 100%; height: 100%; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
              </style>
            </head>
            <body>
                ${pagesHtml.join('')}
                
                <script>
                    function fitText() {
                        const elements = document.querySelectorAll('.dynamic-fit');
                        elements.forEach(el => {
                            let size = parseFloat(el.getAttribute('data-fontsize'));
                            while (el.scrollWidth > el.clientWidth && size > 6) {
                                size -= 0.5;
                                el.style.fontSize = size + 'px';
                            }
                        });
                        setTimeout(() => { window.print(); }, 500);
                    }
                    window.onload = fitText;
                </script>
            </body>
          </html>
        `);
        printWindow.document.close();
    }
  } catch (error) {
    console.error(error);
    alert("Erro ao gerar o documento.");
  }
};
