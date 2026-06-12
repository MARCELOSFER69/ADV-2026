import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Printer, FileText, FileSignature, Layers } from 'lucide-react';
import { CaseType } from '../../types';
import { formatCurrencyInput, parseCurrencyToNumber, formatCurrency } from '../../services/formatters';

interface Contrato2026OptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (options: {
        mode: 'default' | 'blank' | 'custom';
        customBenefit?: string;
        customValue?: number;
        customPercentage?: number;
        addThreeInstallments: boolean;
    }) => void;
    defaultBenefit?: string;
    defaultValue?: number;
    defaultPercentage?: number;
}

const Contrato2026OptionsModal: React.FC<Contrato2026OptionsModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    defaultBenefit = '',
    defaultValue = 0,
    defaultPercentage = 30
}) => {
    const [mode, setMode] = useState<'default' | 'blank' | 'custom'>('default');
    const [customBenefit, setCustomBenefit] = useState<string>(Object.values(CaseType)[0]);
    const [customValueRaw, setCustomValueRaw] = useState<string>('');
    const [customPercentage, setCustomPercentage] = useState<number>(30);
    const [addThreeInstallments, setAddThreeInstallments] = useState<boolean>(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const value = mode === 'custom' ? parseCurrencyToNumber(customValueRaw) : undefined;
        onConfirm({
            mode,
            customBenefit: mode === 'custom' ? customBenefit : undefined,
            customValue: mode === 'custom' ? value : undefined,
            customPercentage: mode === 'custom' ? customPercentage : undefined,
            addThreeInstallments
        });
    };

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomValueRaw(formatCurrencyInput(e.target.value));
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#0f1014] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col"
            >
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#131418]">
                    <div className="flex items-center gap-2 text-gold-500">
                        <FileSignature size={20} />
                        <h3 className="font-bold text-white text-base">Contrato 2026 - Opções de Impressão</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
                    
                    {/* Mode Cards */}
                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Modo do Contrato</label>
                        
                        {/* Option 1: Padrão */}
                        <div
                            onClick={() => setMode('default')}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                                mode === 'default'
                                    ? 'border-gold-500 bg-gold-500/5'
                                    : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <input
                                type="radio"
                                checked={mode === 'default'}
                                onChange={() => setMode('default')}
                                className="mt-1 accent-gold-500"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-semibold text-white block">Opção Padrão</span>
                                <span className="text-xs text-slate-400 block mt-1">
                                    Puxa os dados vinculados ao processo mais recente do cliente.
                                </span>
                                {defaultBenefit ? (
                                    <div className="mt-2 text-xs bg-black/30 p-2 rounded border border-white/5 text-gold-400">
                                        <strong>Benefício:</strong> {defaultBenefit} <br />
                                        <strong>Valor do Processo:</strong> {formatCurrency(defaultValue)} <br />
                                        <strong>Honorários:</strong> {defaultPercentage}%
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-amber-500 italic">
                                        Nenhum processo ativo encontrado para este cliente. Ficará em branco se selecionado.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Option 2: Em Branco */}
                        <div
                            onClick={() => setMode('blank')}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                                mode === 'blank'
                                    ? 'border-gold-500 bg-gold-500/5'
                                    : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <input
                                type="radio"
                                checked={mode === 'blank'}
                                onChange={() => setMode('blank')}
                                className="mt-1 accent-gold-500"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-semibold text-white block">Deixar em Branco</span>
                                <span className="text-xs text-slate-400 block mt-1">
                                    Deixa os campos de tipo de benefício, valor e porcentagem com linhas pontilhadas (_____) no contrato.
                                </span>
                            </div>
                        </div>

                        {/* Option 3: Adicionar Extensão (Custom) */}
                        <div
                            onClick={() => setMode('custom')}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                                mode === 'custom'
                                    ? 'border-gold-500 bg-gold-500/5'
                                    : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <input
                                type="radio"
                                checked={mode === 'custom'}
                                onChange={() => setMode('custom')}
                                className="mt-1 accent-gold-500"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-semibold text-white block">Adicionar Extensão (Manual)</span>
                                <span className="text-xs text-slate-400 block mt-1">
                                    Permite definir manualmente o tipo de benefício, valor e porcentagem deste contrato.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Custom Form Fields (Only if custom mode selected) */}
                    {mode === 'custom' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-[#131418] border border-white/5 rounded-xl p-4 flex flex-col gap-4"
                        >
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Tipo de Benefício</label>
                                <select
                                    value={customBenefit}
                                    onChange={(e) => setCustomBenefit(e.target.value)}
                                    className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500/50 transition-colors"
                                >
                                    {Object.values(CaseType).map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Valor do Processo (R$)</label>
                                    <input
                                        type="text"
                                        value={customValueRaw}
                                        onChange={handleValueChange}
                                        placeholder="R$ 0,00"
                                        className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500/50 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Porcentagem Honorários (%)</label>
                                    <input
                                        type="number"
                                        value={customPercentage}
                                        onChange={(e) => setCustomPercentage(Math.max(0, parseInt(e.target.value) || 0))}
                                        placeholder="30"
                                        className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold-500/50 transition-colors"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Checkbox for 3 Installments */}
                    <div className="border-t border-white/5 pt-4 mt-1">
                        <label className="flex items-start gap-3 cursor-pointer group select-none">
                            <input
                                type="checkbox"
                                checked={addThreeInstallments}
                                onChange={(e) => setAddThreeInstallments(e.target.checked)}
                                className="mt-1 rounded border-white/10 text-gold-500 focus:ring-gold-500/30 accent-gold-500 w-4 h-4"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-semibold text-white group-hover:text-gold-400 transition-colors">
                                    Adicionar Cláusula de 3 Parcelas
                                </span>
                                <span className="text-xs text-slate-400 block mt-0.5">
                                    Acrescenta cláusula de pagamento de 3 parcelas de um salário mínimo (R$ 1.621,00 cada) aos honorários.
                                </span>
                            </div>
                        </label>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-[#131418] flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/10 text-slate-300 rounded-lg text-sm font-semibold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-5 py-2 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-gold-500/20 flex items-center gap-2"
                    >
                        <Printer size={16} />
                        Confirmar e Imprimir
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Contrato2026OptionsModal;
