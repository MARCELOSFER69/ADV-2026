import React from 'react';
import { Phone, Building2, AlertTriangle, MessageCircle, Edit2, Archive, RefreshCw, Trash2, Copy } from 'lucide-react';
import { Client, ColumnConfig } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';

interface ClientRowProps {
    client: Client;
    columns: ColumnConfig[];
    hasPendencias: boolean;
    getClientStatus: (id: string) => { label: string; color: string };
    setSelectedClient: (client: Client) => void;
    setIsClientEditMode: (val: boolean) => void;
    handleWhatsAppClick: (name: string, phone: string) => void;
    handleArchiveClick: (client: Client) => void;
    handleDeleteClick: (client: Client) => void;
    handleCopyPhone: (phone: string) => void;
}

const ClientRow: React.FC<ClientRowProps> = ({
    client,
    columns,
    hasPendencias,
    getClientStatus,
    setSelectedClient,
    setIsClientEditMode,
    handleWhatsAppClick,
    handleArchiveClick,
    handleDeleteClick,
    handleCopyPhone
}) => {
    return (
        <tr className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setSelectedClient(client)}>
            {columns.filter(c => c.visible).map(col => (
                <td key={`${client.id}-${col.id}`} className="px-6 py-4 align-middle">
                    {col.id === 'nome' && (
                        <div className="flex items-center gap-3">
                            {client.foto ? <img src={client.foto} alt={client.nome_completo} className="w-8 h-8 rounded-full border border-slate-700 object-cover" /> : (
                                <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${hasPendencias
                                    ? 'bg-red-600 text-white animate-pulse'
                                    : 'bg-zinc-300 text-zinc-900'
                                    }`}>
                                    {String(client.nome_completo || '').substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <p className="font-semibold text-slate-200 group-hover:text-amber-500 transition-colors text-sm flex items-center gap-2">
                                    {String(client.nome_completo)}
                                    {hasPendencias && <span title="Possui Pendências"><AlertTriangle size={12} className="text-red-500" /></span>}
                                </p>
                                <p className="text-[10px] text-slate-500">{String(client.cpf_cnpj || '')}</p>
                            </div>
                        </div>
                    )}
                    {col.id === 'contato' && (
                        <div className="flex items-center gap-2 group/phone">
                            <span className="text-sm text-slate-400 flex items-center gap-1">
                                <Phone size={12} /> {String(client.telefone || '-')}
                            </span>
                            {client.telefone && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCopyPhone(client.telefone!); }}
                                    className="opacity-0 group-hover/phone:opacity-100 p-1 text-slate-500 hover:text-white transition-all"
                                    title="Copiar Telefone"
                                >
                                    <Copy size={12} />
                                </button>
                            )}
                        </div>
                    )}
                    {col.id === 'filial' && (<div className="flex items-center gap-1 text-xs font-medium text-zinc-100"><Building2 size={12} /> {String(client.filial || 'Matriz')}</div>)}
                    {col.id === 'status' && (
                        client.status === 'arquivado'
                            ? <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-700 text-white border border-zinc-600 rounded-full">ARQUIVADO</span>
                            : (() => {
                                const status = getClientStatus(client.id);
                                return (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${status.color}`}>
                                        {status.label === 'Ativo' && <span className="w-1 h-1 rounded-full bg-emerald-500"></span>}
                                        {status.label}
                                    </span>
                                );
                            })()
                    )}
                    {col.id === 'gps' && (() => {
                        const clientCases = client.cases || [];
                        const activeCases = clientCases.filter(c => c.status?.toLowerCase() !== 'arquivado');
                        if (activeCases.length === 0) return <span className="text-zinc-600">-</span>;

                        let hasPuxada = false;
                        let hasPendente = false;

                        activeCases.forEach(c => {
                            const list = c.gps_lista || [];
                            if (!list || list.length === 0) {
                                hasPendente = true;
                            } else {
                                const hasUnpaid = list.some((g: any) => g.status !== 'Paga');
                                if (hasUnpaid) hasPuxada = true;
                            }
                        });

                        if (hasPuxada) return <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">Puxada</span>;
                        if (hasPendente) return <span className="text-[10px] font-bold px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full">Pendente</span>;
                        return <span className="text-[10px] font-medium px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">Regular</span>;
                    })()}
                    {col.id === 'endereco' && <span className="text-xs text-slate-400 truncate max-w-[200px] block" title={client.endereco}>{client.endereco || '-'}</span>}
                    {col.id === 'nascimento' && <span className="text-xs text-slate-400">{formatDateDisplay(client.data_nascimento)}</span>}
                    {col.id === 'captador' && <span className="text-xs text-slate-400">{client.captador || '-'}</span>}
                    {col.id === 'email' && <span className="text-xs text-slate-400 truncate max-w-[150px] block" title={client.email}>{client.email || '-'}</span>}
                </td>
            ))}
            <td className="px-6 py-4 text-right">
                <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {client.telefone && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleWhatsAppClick(client.nome_completo, client.telefone!); }}
                            className="p-1.5 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20"
                            title="WhatsApp"
                        >
                            <MessageCircle size={16} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setIsClientEditMode(true); }}
                        className="p-1.5 text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white rounded-lg transition-colors border border-white/5"
                        title="Editar"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleArchiveClick(client); }}
                        className="p-1.5 text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white rounded-lg transition-colors border border-white/5"
                        title={client.status === 'arquivado' ? 'Restaurar' : 'Arquivar'}
                    >
                        {client.status === 'arquivado' ? <RefreshCw size={16} /> : <Archive size={16} />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(client); }}
                        className="p-1.5 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                        title="Excluir"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default React.memo(ClientRow);
