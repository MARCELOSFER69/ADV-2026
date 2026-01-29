import React, { memo, useState } from 'react';
import { Client } from '../../types';
import { Lock, Check, Eye, EyeOff } from 'lucide-react';

interface ClientCredentialsTabProps {
    client: Client;
    activeTab: 'info' | 'docs' | 'credentials';
    isEditMode: boolean;
    editedClient: Client;
    setEditedClient: (client: Client) => void;
    showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

const ClientCredentialsTab: React.FC<ClientCredentialsTabProps> = ({
    client, activeTab, isEditMode, editedClient, setEditedClient, showToast
}) => {
    const [showGovPassword, setShowGovPassword] = useState(false);
    const [showInssPassword, setShowInssPassword] = useState(false);

    if (activeTab !== 'credentials') return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 font-serif">
                    <Lock size={20} className="text-gold-500" /> Acesso Gov.br
                </h3>

                <div className="grid grid-cols-1 gap-6 max-w-md">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF (Login)</label>
                        <div className="bg-[#131418] border border-white/5 rounded-lg px-4 py-3 text-white font-mono flex justify-between items-center">
                            <span>{client.cpf_cnpj}</span>
                            <button onClick={() => { navigator.clipboard.writeText(client.cpf_cnpj); showToast('success', 'CPF Copiado'); }} className="text-zinc-500 hover:text-white" title="Copiar"><Check size={14} /></button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Gov.br</label>
                        {isEditMode ? (
                            <div className="relative group">
                                <input
                                    type={showGovPassword ? "text" : "password"}
                                    className="w-full bg-[#131418] border border-white/5 rounded-lg px-4 py-3 text-white outline-none focus:border-gold-500 pr-10"
                                    value={editedClient.senha_gov || ''}
                                    onChange={(e) => setEditedClient({ ...editedClient, senha_gov: e.target.value })}
                                    placeholder="Digite a senha..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowGovPassword(!showGovPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                >
                                    {showGovPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-[#131418] border border-white/5 rounded-lg px-4 py-3 text-white font-mono flex justify-between items-center group">
                                <span>
                                    {client.senha_gov
                                        ? (showGovPassword ? client.senha_gov : '••••••••••••')
                                        : <span className="text-zinc-600 italic">Não cadastrada</span>
                                    }
                                </span>
                                <div className="flex gap-2">
                                    {client.senha_gov && (
                                        <button onClick={() => setShowGovPassword(!showGovPassword)} className="text-zinc-500 hover:text-white">
                                            {showGovPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (client.senha_gov) {
                                                navigator.clipboard.writeText(client.senha_gov);
                                                showToast('success', 'Senha copiada');
                                            } else {
                                                showToast('error', 'Sem senha para copiar');
                                            }
                                        }}
                                        className="text-zinc-500 hover:text-white"
                                    >
                                        <Check size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 font-serif">
                    <Lock size={20} className="text-blue-500" /> Acesso Meu INSS
                </h3>

                <div className="grid grid-cols-1 gap-6 max-w-md">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Meu INSS</label>
                        {isEditMode ? (
                            <div className="relative group">
                                <input
                                    type={showInssPassword ? "text" : "password"}
                                    className="w-full bg-[#131418] border border-white/5 rounded-lg px-4 py-3 text-white outline-none focus:border-gold-500 pr-10"
                                    value={editedClient.senha_inss || ''}
                                    onChange={(e) => setEditedClient({ ...editedClient, senha_inss: e.target.value })}
                                    placeholder="Digite a senha..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowInssPassword(!showInssPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                >
                                    {showInssPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-[#131418] border border-white/5 rounded-lg px-4 py-3 text-white font-mono flex justify-between items-center group">
                                <span>
                                    {client.senha_inss
                                        ? (showInssPassword ? client.senha_inss : '••••••••••••')
                                        : <span className="text-zinc-600 italic">Mesma do Gov.br</span>
                                    }
                                </span>
                                <div className="flex gap-2">
                                    {client.senha_inss && (
                                        <button onClick={() => setShowInssPassword(!showInssPassword)} className="text-zinc-500 hover:text-white">
                                            {showInssPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            const pass = client.senha_inss || client.senha_gov;
                                            if (pass) {
                                                navigator.clipboard.writeText(pass);
                                                showToast('success', 'Senha copiada');
                                            } else {
                                                showToast('error', 'Sem senha para copiar');
                                            }
                                        }}
                                        className="text-zinc-500 hover:text-white"
                                    >
                                        <Check size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ClientCredentialsTab);
