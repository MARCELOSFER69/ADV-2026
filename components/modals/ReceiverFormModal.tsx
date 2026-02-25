import React, { useState } from 'react';
import { X, Save, User, Building, Landmark, Info, Trash2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FinancialReceiver } from '../../types';
import { useApp } from '../../context/AppContext';

interface ReceiverFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (receiver: Partial<FinancialReceiver>) => Promise<void>;
}

const ReceiverFormModal: React.FC<ReceiverFormModalProps> = ({ isOpen, onClose, onAdd }) => {
    const { receivers, deleteReceiver, confirmCustom } = useApp();
    const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
    const [name, setName] = useState('');
    const [type, setType] = useState<'PF' | 'PJ'>('PF');
    const [bankName, setBankName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            await onAdd({
                name: name.trim().toUpperCase(),
                type,
                bank_name: bankName,
            });
            // Don't close immediately if we want to manage? 
            // Actually onAdd usually handles closing in the caller.
            // Reset fields
            setName('');
            setBankName('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredReceivers = (receivers || []).filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.bank_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[#0f1115] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-8 py-6 bg-gradient-to-r from-gold-600/10 to-transparent border-b border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gold-500/20 rounded-2xl text-gold-500 border border-gold-500/20">
                                <User size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white font-serif">Gerenciar Recebedores</h2>
                                <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-widest font-medium">Contas e favorecidos para pagamentos</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-8 pt-4 gap-4 border-b border-white/5 bg-[#131418]/30 shrink-0">
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'create' ? 'border-gold-500 text-gold-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            Novo Cadastro
                        </button>
                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'manage' ? 'border-gold-500 text-gold-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            Lista de Contas ({receivers?.length || 0})
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeTab === 'create' ? (
                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-gold-500/80 mb-2">
                                        <Info size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Identificação</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo / Razão Social</label>
                                            <input
                                                autoFocus
                                                className="w-full bg-[#131418] border border-white/5 text-white px-4 py-3 rounded-2xl focus:border-gold-500/50 transition-all outline-none"
                                                placeholder="Ex: JOÃO DA SILVA ou EMPRESA LTDA"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Pessoa (CPF / CNPJ)</label>
                                            <div className="flex p-1 bg-[#131418] rounded-2xl border border-white/5">
                                                <button
                                                    onClick={() => setType('PF')}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${type === 'PF' ? 'bg-gold-600 text-black font-bold shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    <User size={14} />
                                                    <span className="text-xs">PF</span>
                                                </button>
                                                <button
                                                    onClick={() => setType('PJ')}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${type === 'PJ' ? 'bg-gold-600 text-black font-bold shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    <Building size={14} />
                                                    <span className="text-xs">PJ</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-2">
                                                <Landmark size={12} />
                                                Banco para Recebimento
                                            </label>
                                            <input
                                                className="w-full bg-[#131418] border border-white/5 text-white px-4 py-3 rounded-2xl focus:border-gold-500/50 transition-all outline-none"
                                                placeholder="Ex: BB, Itaú, Nubank..."
                                                value={bankName}
                                                onChange={(e) => setBankName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 space-y-4">
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input
                                        className="w-full bg-[#131418] border border-white/5 text-white pl-10 pr-4 py-2.5 rounded-xl focus:border-gold-500/50 transition-all outline-none text-sm"
                                        placeholder="Buscar conta..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    {filteredReceivers.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500 italic text-sm">Nenhum recebedor encontrado.</div>
                                    ) : filteredReceivers.map(r => (
                                        <div key={r.id} className="flex items-center justify-between p-4 bg-[#131418] rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gold-500">
                                                    {r.type === 'PJ' ? <Building size={18} /> : <User size={18} />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white">{r.name}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                                                        {r.type || 'PF'} • {r.bank_name || 'Sem Banco'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const confirmed = await confirmCustom({
                                                        title: 'Excluir Recebedor',
                                                        message: `Deseja realmente remover "${r.name}"? Esta ação não pode ser desfeita.`,
                                                        confirmLabel: 'Excluir',
                                                        cancelLabel: 'Cancelar',
                                                        variant: 'danger'
                                                    });
                                                    if (confirmed) {
                                                        deleteReceiver(r.id);
                                                    }
                                                }}
                                                className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer - Only show for create tab */}
                    {activeTab === 'create' && (
                        <div className="p-8 bg-[#131418]/50 border-t border-white/5 flex gap-4 justify-end shrink-0">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !name.trim()}
                                className="px-8 py-3 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-gold-600/20"
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <Save size={18} />
                                )}
                                Salvar Recebedor
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ReceiverFormModal;
