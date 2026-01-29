import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FinancialRecord, CommissionReceipt } from '../../types';
import { X, Printer, Check, User, CreditCard, UploadCloud, FileText, Loader2, Eye } from 'lucide-react';
import { BRAND_CONFIG } from '../../logoData';
import { uploadFileToR2 } from '../../services/storageService';
import { supabase } from '../../services/supabaseClient'; // <--- Importante: Acesso direto ao banco

interface CommissionReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedRecords: FinancialRecord[];
    captadorName: string;
    existingReceipt?: CommissionReceipt;
}

const CommissionReceiptModal: React.FC<CommissionReceiptModalProps> = ({ isOpen, onClose, selectedRecords, captadorName, existingReceipt }) => {
    const { createCommissionReceipt, showToast, confirmReceiptSignature } = useApp();
    const [cpf, setCpf] = useState('');
    const [editableName, setEditableName] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [receiptFileUrl, setReceiptFileUrl] = useState<string | undefined>(existingReceipt?.arquivo_url);

    // Helper to safely calculate total
    const totalValue = selectedRecords.reduce((acc, curr) => {
        const val = typeof curr.valor === 'number' ? curr.valor : parseFloat(String(curr.valor));
        return acc + (isNaN(val) ? 0 : val);
    }, 0);

    useEffect(() => {
        if (isOpen) {
            if (existingReceipt) {
                setEditableName(existingReceipt.captador_nome);
                setCpf(existingReceipt.cpf_captador || '');
                setReceiptFileUrl(existingReceipt.arquivo_url);
            } else {
                setCpf('');
                let safeName = '';
                try {
                    if (typeof captadorName === 'string') safeName = captadorName;
                    else if (typeof captadorName === 'number') safeName = String(captadorName);
                } catch (e) { safeName = ''; }
                if (safeName === '[object Object]') safeName = '';
                setEditableName(safeName);
                setReceiptFileUrl(undefined);
            }
            setIsPrinting(false);
        }
    }, [isOpen, captadorName, existingReceipt]);

    const formatCPF = (value: string) => {
        if (!value) return '';
        return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
    };

    const safeString = (val: any, fallback = '') => {
        if (val === null || val === undefined) return fallback;
        if (typeof val === 'string') return val;
        return fallback;
    };

    // --- UPLOAD HANDLER (CORRIGIDO) ---
    const handleUploadSignedReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !existingReceipt) return;

        setIsUploading(true);
        try {
            // 1. Envia para o R2 (Nuvem)
            const { url } = await uploadFileToR2(file, 'recibos');

            // 2. Salva APENAS O LINK no Banco de Dados (Supabase)
            const { error } = await supabase
                .from('commission_receipts')
                .update({
                    arquivo_url: url,
                    status: 'signed',             // Atualiza status legado
                    status_assinatura: 'assinado' // Atualiza status novo
                })
                .eq('id', existingReceipt.id);

            if (error) throw error;

            setReceiptFileUrl(url); // Atualiza a tela na hora
            showToast('success', 'Recibo anexado e salvo com sucesso!');

        } catch (error) {
            console.error(error);
            showToast('error', 'Erro ao salvar o arquivo.');
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    const handlePrintAndGenerate = async () => {
        if (!editableName.trim()) { showToast('error', 'Nome obrigatório.'); return; }
        if (!cpf) { showToast('error', 'CPF obrigatório.'); return; }

        setIsPrinting(true);

        // 1. Save FIRST
        const receiptId = crypto.randomUUID();
        try {
            const receipt: CommissionReceipt = {
                id: receiptId,
                captador_nome: editableName,
                cpf_captador: cpf,
                valor_total: totalValue,
                data_geracao: new Date().toISOString(),
                status: 'pending',
                status_assinatura: 'pendente'
            };
            await createCommissionReceipt(receipt, selectedRecords.map(r => r.id));
        } catch (err) {
            console.error(err);
            showToast('error', 'Erro ao salvar recibo.');
            setIsPrinting(false);
            return;
        }

        // 2. Print
        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (printWindow) {
            const safeTitle = safeString(BRAND_CONFIG?.loginTitle, 'Escritório de Advocacia');
            const safeName = safeString(editableName).toUpperCase();
            const safeCpf = safeString(cpf);
            const safeDate = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

            const htmlContent = `
            <html>
              <head><title>Recibo - ${safeName}</title>
              <style>body{font-family:'Inter',sans-serif;padding:40px}.header{text-align:center;border-bottom:2px solid #000;padding-bottom:20px}.title{font-size:24px;font-weight:bold;text-transform:uppercase;font-family:'Playfair Display',serif}.table{width:100%;border-collapse:collapse;margin:20px 0}.table td{border:1px solid #ddd;padding:8px}.total{text-align:right;font-weight:bold;font-size:18px}.signatures{margin-top:80px;display:flex;justify-content:space-between}.sig-line{width:45%;border-top:1px solid #000;text-align:center;padding-top:5px}</style>
              </head>
              <body>
                <div class="header"><h2>${safeTitle}</h2><h1 class="title">RECIBO DE PAGAMENTO</h1></div>
                <p>Eu, <strong>${safeName}</strong> (CPF ${safeCpf}), recebi a importância de <strong>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</strong> referente a comissões.</p>
                <table class="table"><tbody>${selectedRecords.map(r => `<tr><td>${new Date(r.data_vencimento).toLocaleDateString('pt-BR')}</td><td>${safeString(r.descricao)}</td><td align="right">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r.valor) || 0)}</td></tr>`).join('')}</tbody></table>
                <div class="total">TOTAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</div>
                <p align="right">Santa Inês - MA, ${safeDate}.</p>
                <div class="signatures"><div class="sig-line"><strong>${safeTitle}</strong><br>Pagador</div><div class="sig-line"><strong>${safeName}</strong><br>Recebedor</div></div>
                <script>setTimeout(function(){window.print();},500);</script>
              </body>
            </html>
          `;
            printWindow.document.write(htmlContent);
            printWindow.document.close();
        }

        setIsPrinting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Printer className="text-gold-500" size={24} /> {existingReceipt ? 'Detalhes do Recibo' : 'Gerar Recibo'}
                    </h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                        <div className="flex justify-between items-center pt-2 border-t border-zinc-700 mt-2">
                            <span className="text-zinc-400 text-sm">Valor Total</span>
                            <span className="text-emerald-400 font-bold text-lg">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                            </span>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input
                                    className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white outline-none focus:border-gold-500"
                                    value={editableName}
                                    onChange={(e) => setEditableName(e.target.value)}
                                    disabled={!!existingReceipt}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">CPF</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input
                                    className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white outline-none focus:border-gold-500"
                                    value={cpf}
                                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                                    maxLength={14}
                                    disabled={!!existingReceipt}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ÁREA DE ARQUIVO */}
                    {existingReceipt && (
                        <div className="pt-4 border-t border-zinc-800">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Comprovante Assinado</h4>

                            {receiptFileUrl ? (
                                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <FileText size={18} />
                                        <span className="text-sm font-medium">Recibo Assinado.pdf</span>
                                    </div>
                                    <a
                                        href={receiptFileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 hover:bg-emerald-500/20 rounded transition-colors text-emerald-400"
                                        title="Ver Arquivo"
                                    >
                                        <Eye size={18} />
                                    </a>
                                </div>
                            ) : (
                                <label className="cursor-pointer w-full flex flex-col items-center justify-center bg-zinc-800/30 border border-dashed border-zinc-700 rounded-lg p-4 hover:bg-zinc-800 hover:border-gold-500/50 transition-all group">
                                    {isUploading ? (
                                        <div className="flex items-center gap-2 text-gold-500">
                                            <Loader2 className="animate-spin" size={18} /> Enviando...
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud size={24} className="text-zinc-500 group-hover:text-gold-500 mb-1" />
                                            <span className="text-xs text-zinc-400 group-hover:text-white">Clique para anexar o recibo assinado</span>
                                            <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleUploadSignedReceipt} />
                                        </>
                                    )}
                                </label>
                            )}
                        </div>
                    )}

                    <div className="pt-6 flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium">Fechar</button>
                        {!existingReceipt && (
                            <button
                                onClick={handlePrintAndGenerate}
                                disabled={isPrinting}
                                className="flex-1 px-4 py-2.5 bg-gold-600 hover:bg-gold-700 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all"
                            >
                                {isPrinting ? '...' : <><Check size={18} /> Gerar</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommissionReceiptModal;
