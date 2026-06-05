/**
 * Utilitário para geração de Recibos de Pagamento de Parcelas
 * Gera HTML formatado para impressão com dados do cliente, valor por extenso,
 * campo de assinatura e informações do processo.
 */

// --- Valor por Extenso (pt-BR) ---

const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function porExtensoInteiro(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    if (n < 10) return unidades[n];
    if (n < 20) return especiais[n - 10];
    if (n < 100) {
        const d = Math.floor(n / 10);
        const u = n % 10;
        return u === 0 ? dezenas[d] : `${dezenas[d]} e ${unidades[u]}`;
    }
    if (n < 1000) {
        const c = Math.floor(n / 100);
        const resto = n % 100;
        if (resto === 0) return n === 100 ? 'cem' : centenas[c];
        return `${centenas[c]} e ${porExtensoInteiro(resto)}`;
    }
    if (n < 1000000) {
        const mil = Math.floor(n / 1000);
        const resto = n % 1000;
        const milStr = mil === 1 ? 'mil' : `${porExtensoInteiro(mil)} mil`;
        if (resto === 0) return milStr;
        return `${milStr}${resto < 100 ? ' e ' : ' e '}${porExtensoInteiro(resto)}`;
    }
    const milhao = Math.floor(n / 1000000);
    const resto = n % 1000000;
    const milhaoStr = milhao === 1 ? 'um milhão' : `${porExtensoInteiro(milhao)} milhões`;
    if (resto === 0) return milhaoStr;
    return `${milhaoStr}${resto < 1000 ? ' e ' : ' e '}${porExtensoInteiro(resto)}`;
}

export function valorPorExtenso(valor: number): string {
    if (valor === 0) return 'zero reais';

    const inteiro = Math.floor(Math.abs(valor));
    const centavos = Math.round((Math.abs(valor) - inteiro) * 100);

    let result = '';
    if (inteiro > 0) {
        result = `${porExtensoInteiro(inteiro)} ${inteiro === 1 ? 'real' : 'reais'}`;
    }
    if (centavos > 0) {
        const centStr = `${porExtensoInteiro(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
        result = inteiro > 0 ? `${result} e ${centStr}` : centStr;
    }
    return result;
}

// --- Geração do Recibo ---

export interface ReceiptData {
    clientName: string;
    clientCpf: string;
    clientAddress?: string;
    parcelaNumero: number;
    totalParcelas: number;
    valorParcela: number;
    valorTotal: number;
    processoTitulo: string;
    processoNumero?: string;
    dataGeracao: string;
}

function formatCurrencyBR(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateFull(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function generateReceiptHTML(data: ReceiptData): string {
    const valorExtenso = valorPorExtenso(data.valorParcela);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recibo de Pagamento - Parcela ${data.parcelaNumero}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', 'Segoe UI', sans-serif;
            color: #1a1a1a;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
        }

        .receipt-container {
            border: 2px solid #333;
            border-radius: 8px;
            padding: 40px;
            position: relative;
        }

        .receipt-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .receipt-header h1 {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 6px;
        }

        .receipt-header .subtitle {
            font-size: 12px;
            color: #666;
            letter-spacing: 1px;
        }

        .receipt-number {
            position: absolute;
            top: 15px;
            right: 20px;
            font-size: 11px;
            color: #999;
            font-weight: 600;
        }

        .receipt-date {
            text-align: right;
            font-size: 13px;
            color: #444;
            margin-bottom: 25px;
            font-weight: 500;
        }

        .receipt-body {
            line-height: 1.8;
            font-size: 14px;
        }

        .receipt-body p {
            margin-bottom: 12px;
        }

        .highlight {
            font-weight: 700;
            color: #000;
        }

        .valor-destaque {
            font-size: 18px;
            font-weight: 700;
            color: #000;
            background: #f5f5f0;
            padding: 4px 12px;
            border-radius: 4px;
            display: inline-block;
        }

        .valor-extenso {
            font-style: italic;
            color: #444;
            font-size: 13px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 25px 0;
            padding: 20px;
            background: #fafafa;
            border-radius: 6px;
            border: 1px solid #eee;
        }

        .info-item {
            display: flex;
            flex-direction: column;
        }

        .info-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #888;
            font-weight: 600;
            margin-bottom: 2px;
        }

        .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #222;
        }

        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            padding-top: 10px;
        }

        .signature-block {
            width: 45%;
            text-align: center;
        }

        .signature-line {
            border-top: 1px solid #333;
            padding-top: 8px;
            margin-top: 50px;
        }

        .signature-name {
            font-size: 13px;
            font-weight: 600;
            color: #333;
        }

        .signature-label {
            font-size: 10px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 2px;
        }

        .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px dashed #ccc;
            text-align: center;
            font-size: 10px;
            color: #aaa;
            letter-spacing: 0.5px;
        }

        @media print {
            body { padding: 20px; }
            .receipt-container { border-width: 1px; }
            .no-print { display: none !important; }
        }

        .print-button {
            display: block;
            margin: 20px auto;
            padding: 12px 40px;
            background: #333;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            letter-spacing: 1px;
        }
        .print-button:hover { background: #555; }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="receipt-number">Parcela ${data.parcelaNumero}/${data.totalParcelas}</div>
        
        <div class="receipt-header">
            <h1>Recibo de Pagamento</h1>
            <div class="subtitle">Honorários Advocatícios</div>
        </div>

        <div class="receipt-date">
            ${formatDateFull(data.dataGeracao)}
        </div>

        <div class="receipt-body">
            <p>
                Recebi de <span class="highlight">${data.clientName}</span>,
                portador(a) do CPF nº <span class="highlight">${data.clientCpf}</span>${data.clientAddress ? `, residente em <span class="highlight">${data.clientAddress}</span>` : ''},
                a importância de:
            </p>

            <p style="text-align: center; margin: 20px 0;">
                <span class="valor-destaque">${formatCurrencyBR(data.valorParcela)}</span>
                <br/>
                <span class="valor-extenso">(${valorExtenso})</span>
            </p>

            <p>
                Referente ao pagamento da <span class="highlight">${data.parcelaNumero}ª parcela</span> 
                de <span class="highlight">${data.totalParcelas} parcelas</span> de honorários advocatícios,
                conforme contrato firmado entre as partes.
            </p>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Processo</span>
                <span class="info-value">${data.processoTitulo}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Nº do Processo</span>
                <span class="info-value">${data.processoNumero || '—'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Valor Total do Contrato</span>
                <span class="info-value">${formatCurrencyBR(data.valorTotal)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Parcela</span>
                <span class="info-value">${data.parcelaNumero}ª de ${data.totalParcelas}</span>
            </div>
        </div>

        <p style="font-size: 13px; color: #555; text-align: center; margin-top: 10px;">
            Para maior clareza, firmo o presente recibo para que produza os seus efeitos legais.
        </p>

        <div class="signatures">
            <div class="signature-block">
                <div class="signature-line">
                    <div class="signature-name">${data.clientName}</div>
                    <div class="signature-label">Cliente</div>
                </div>
            </div>
            <div class="signature-block">
                <div class="signature-line">
                    <div class="signature-name">Escritório</div>
                    <div class="signature-label">Responsável</div>
                </div>
            </div>
        </div>

        <div class="footer">
            Documento gerado em ${formatDateBR(data.dataGeracao)} • Este recibo é válido como comprovante de pagamento
        </div>
    </div>

    <button class="print-button no-print" onclick="window.print()">
        🖨️ Imprimir Recibo
    </button>
</body>
</html>`;
}

export function printReceipt(data: ReceiptData): void {
    const html = generateReceiptHTML(data);
    const autoPrintHtml = html.replace(
        '</body>',
        '<script>window.onload = function() { window.print(); }</script></body>'
    );

    // Use a hidden iframe to prevent popup blocker issues
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
        alert('Erro ao iniciar a impressão.');
        return;
    }

    iframeDoc.write(autoPrintHtml);
    iframeDoc.close();

    const handleAfterPrint = () => {
        try {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (iframe.contentWindow) {
        iframe.contentWindow.addEventListener('afterprint', handleAfterPrint);
    } else {
        setTimeout(handleAfterPrint, 60000);
    }
}
