import React from 'react';
import { Layout, Bold, Calendar, Maximize, AlignLeft, AlignCenter, AlignRight, Trash2, ImageIcon, MousePointer2 } from 'lucide-react';
import { FieldMark } from '../../types';

interface DocumentPropertiesProps {
    isCodeMode: boolean;
    templateTitle: string;
    setTemplateTitle: (title: string) => void;
    selectedField: FieldMark | undefined;
    updateField: (id: string, changes: Partial<FieldMark>) => void;
    VARIABLES: { label: string; key: string }[];
    removeField: (id: string) => void;
}

const DocumentProperties: React.FC<DocumentPropertiesProps> = ({
    isCodeMode,
    templateTitle,
    setTemplateTitle,
    selectedField,
    updateField,
    VARIABLES,
    removeField
}) => {
    if (isCodeMode) return null;

    return (
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
                                        <button key={v.key} onClick={() => updateField(selectedField.id, { template: (selectedField.template || '') + ' ' + v.key })} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-2 py-1 rounded m-0.5" title={v.label}>{v.key}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-xs font-bold text-zinc-400 block mb-1">Fonte (px)</label><input type="number" className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white outline-none" value={selectedField.fontSize} onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })} /></div>
                                <div className="flex items-end"><button onClick={() => updateField(selectedField.id, { isBold: !selectedField.isBold })} className={`w-full py-2 rounded border flex items-center justify-center gap-2 ${selectedField.isBold ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-700'}`}><Bold size={14} /> Negrito</button></div>
                            </div>

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

                            <div>
                                <label className="text-xs font-bold text-zinc-400 block mb-1">Alinhamento</label>
                                <div className="flex bg-zinc-900 rounded p-1 border border-zinc-700">
                                    <button onClick={() => updateField(selectedField.id, { textAlign: 'left' })} className={`flex-1 flex justify-center py-1 rounded ${selectedField.textAlign === 'left' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><AlignLeft size={14} /></button>
                                    <button onClick={() => updateField(selectedField.id, { textAlign: 'center' })} className={`flex-1 flex justify-center py-1 rounded ${selectedField.textAlign === 'center' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><AlignCenter size={14} /></button>
                                    <button onClick={() => updateField(selectedField.id, { textAlign: 'right' })} className={`flex-1 flex justify-center py-1 rounded ${selectedField.textAlign === 'right' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><AlignRight size={14} /></button>
                                </div>
                            </div>
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
    );
};

export default DocumentProperties;
