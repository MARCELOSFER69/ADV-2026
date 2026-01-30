import React from 'react';
import { useApp } from '../../context/AppContext';
import { Phone, Building2, AlertTriangle, MessageCircle, Edit2, Archive, RefreshCw, Trash2, Copy, Check } from 'lucide-react';
import { Client, ColumnConfig } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import PendencyIndicator from '../ui/PendencyIndicator';

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
    isSelected: boolean;
    anySelected: boolean;
    onToggleSelect: (id: string) => void;
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
    handleCopyPhone,
    isSelected,
    anySelected,
    onToggleSelect
}) => {
    return (
        <tr
            className={`transition-colors cursor-pointer group border-l-2 ${isSelected
                ? 'bg-gold-500/10 border-gold-500 hover:bg-gold-500/15'
                : 'hover:bg-white/5 border-transparent'
                }`}
            onClick={() => setSelectedClient(client)}
        >
            <td className="px-6 py-4 align-middle" onClick={(e) => { e.stopPropagation(); onToggleSelect(client.id); }}>
                <div className="relative flex items-center justify-center w-5 h-5">
                    {/* Small Dot (Visible when nothing is selected and not hovered) */}
                    <div className={`w-1.5 h-1.5 rounded-full bg-slate-700 transition-all duration-300 ${(anySelected || isSelected) ? 'opacity-0 scale-0' : 'group-hover:opacity-0 group-hover:scale-0'
                        }`} />

                    {/* Checkbox (Visible on hover or when something is selected) */}
                    <div
                        className={`absolute inset-0 rounded border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                            ? 'bg-gold-500 border-gold-500 text-black translate-y-0 opacity-100 scale-100'
                            : (anySelected || isSelected)
                                ? 'border-slate-600 bg-white/5 opacity-100 scale-100'
                                : 'border-slate-700 bg-white/5 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'
                            }`}
                    >
                        {isSelected && <Check size={14} className="stroke-[4]" />}
                    </div>
                </div>
            </td>
            {columns.filter(c => c.visible).map(col => (
                <td key={`${client.id}-${col.id}`} className="px-6 py-4 align-middle">
                    {col.id === 'nome' && (
                        <PendencyIndicator pendencies={client.pendencias} align="left" className="w-full">
                            <div className="flex items-center gap-3 cursor-help">
                                {client.foto ? <img src={client.foto} alt={client.nome_completo} className="w-8 h-8 rounded-full border border-slate-700 object-cover" /> : (
                                    <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm relative transition-all duration-300 ${hasPendencias
                                        ? 'bg-rose-600 text-white border-rose-500/50 shadow-[0_0_10px_rgba(225,29,72,0.2)]'
                                        : 'bg-zinc-300 text-zinc-900'
                                        }`}>
                                        {String(client.nome_completo || '').substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-slate-200 group-hover:text-amber-500 transition-colors flex items-center gap-2">
                                        {String(client.nome_completo)}
                                    </p>
                                    <p className="opacity-50 text-[0.85em]">{String(client.cpf_cnpj || '')}</p>
                                </div>
                            </div>
                        </PendencyIndicator>
                    )}
                    {col.id === 'contato' && (
                        <div className="flex items-center gap-2 group/phone">
                            <span className="text-slate-400 flex items-center gap-1">
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
                        const { isStatusBlinking } = useApp();
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

                        if (hasPuxada) return (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all duration-500 ${isStatusBlinking
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                : 'bg-white/5 text-slate-500 border-white/10'
                                }`}>
                                Puxada
                            </span>
                        );
                        if (hasPendente) return (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all duration-500 ${isStatusBlinking
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                : 'bg-white/5 text-slate-500 border-white/10'
                                }`}>
                                Pendente
                            </span>
                        );
                        return <span className="text-[10px] font-medium px-2 py-0.5 bg-green-500/5 text-green-500/40 border border-green-500/10 rounded-full">Regular</span>;
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
