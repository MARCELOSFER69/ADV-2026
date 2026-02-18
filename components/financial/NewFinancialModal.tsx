import React from 'react';
import { FinancialRecord, FinancialType, Branch } from '../../types';
import { MapPin, ChevronDown } from 'lucide-react';

interface NewFinancialModalProps {
    isModalOpen: boolean;
    setIsModalOpen: (open: boolean) => void;
    newRecord: Partial<FinancialRecord>;
    setNewRecord: (record: Partial<FinancialRecord>) => void;
    amountStr: string;
    handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAddAvulso: () => void;
}

const NewFinancialModal: React.FC<NewFinancialModalProps> = ({
    isModalOpen,
    setIsModalOpen,
    newRecord,
    setNewRecord,
    amountStr,
    handleAmountChange,
    handleAddAvulso
}) => {
    if (!isModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-200">
                <h3 className="text-xl font-bold text-white mb-4">Novo Lançamento Avulso</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
                        <input
                            className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                            value={newRecord.titulo}
                            onChange={e => setNewRecord({ ...newRecord, titulo: e.target.value })}
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Valor</label>
                            <input
                                className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                                value={amountStr}
                                onChange={handleAmountChange}
                                placeholder="R$ 0,00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tipo</label>
                            <select
                                className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                                value={newRecord.tipo}
                                onChange={e => setNewRecord({ ...newRecord, tipo: e.target.value as any })}
                            >
                                <option value={FinancialType.RECEITA}>Receita</option>
                                <option value={FinancialType.DESPESA}>Despesa</option>
                            </select>
                        </div>
                    </div>

                    {/* Filial */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1">
                            <MapPin size={12} className="text-gold-500" /> Filial
                        </label>
                        <div className="relative">
                            <select
                                className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                                value={newRecord.filial || ''}
                                onChange={(e) => setNewRecord({ ...newRecord, filial: e.target.value as Branch })}
                            >
                                <option value="">Selecione a Filial...</option>
                                {Object.values(Branch).map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleAddAvulso}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-2"
                    >
                        Salvar
                    </button>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="w-full text-zinc-500 hover:text-white py-2 text-sm"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewFinancialModal;
