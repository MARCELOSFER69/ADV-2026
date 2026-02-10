import React from 'react';
import { Building2, AlertTriangle, Phone, MapPin, MessageCircle, RefreshCw, Archive, Trash2, Eye } from 'lucide-react';
import { Client } from '../../types';
import PendencyIndicator from '../ui/PendencyIndicator';
import { isClientIncomplete } from '../../services/importService';

interface ClientGridViewProps {
    sortedClients: Client[];
    selectedClient: Client | null;
    setSelectedClient: (client: Client) => void;
    getClientStatus: (clientId: string) => { label: string; color: string };
    handleWhatsAppClick: (name: string, phone: string) => void;
    handleArchiveClick: (client: Client) => void;
    handleDeleteClick: (client: Client) => void;
    mergedPreferences: any;
}

const ClientGridCard = React.memo(({ client, setSelectedClient, getClientStatus, handleWhatsAppClick, handleArchiveClick, handleDeleteClick }: any) => {
    const hasPendencias = (client.pendencias || []).length > 0;
    const status = getClientStatus(client.id);

    return (
        <div
            onClick={() => setSelectedClient(client)}
            className={`bg-zinc-900/60 backdrop-blur-md border ${hasPendencias ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-white/5'} rounded-xl p-5 hover:border-gold-600/30 transition-all cursor-pointer group relative shadow-lg hover:shadow-2xl`}
        >
            <div className="flex items-start justify-between mb-4">
                <PendencyIndicator pendencies={client.pendencias} align="left" className="w-full">
                    <div className="flex items-center gap-4 cursor-help">
                        {client.foto ? (
                            <img src={client.foto} alt={client.nome_completo} className="w-14 h-14 rounded-full border-2 border-slate-700 object-cover" />
                        ) : (
                            <div className={`w-14 h-14 rounded-full border-2 border-white/10 flex items-center justify-center font-bold text-xl shadow-inner relative transition-all duration-300 ${hasPendencias ? 'bg-rose-600 text-white border-rose-500/50' : (client.import_source === 'imported' && isClientIncomplete(client)) ? 'bg-amber-500 text-white border-amber-400/50' : 'bg-zinc-700 text-zinc-300'}`}>
                                {String(client.nome_completo || '').substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-slate-200 group-hover:text-gold-500 transition-colors line-clamp-1">{client.nome_completo}</h3>
                            <p className="text-xs text-slate-500">{client.cpf_cnpj}</p>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-100 font-medium"><Building2 size={12} /> {client.filial || 'Matriz'}</div>
                        </div>
                    </div>
                </PendencyIndicator>
            </div>
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-400"><Phone size={14} /> {client.telefone || '-'}</div>
                <div className="flex items-center gap-2 text-sm text-slate-400 truncate"><MapPin size={14} /> {client.cidade ? `${client.cidade} - ${client.uf}` : (client.endereco ? client.endereco.split(',')[0] : 'Endereço não informado')}</div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                    {status.label === 'Ativo' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                    {status.label}
                </span>
                <div className="flex gap-1">
                    {client.telefone && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleWhatsAppClick(client.nome_completo, client.telefone || ''); }}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors"
                            title="WhatsApp"
                        >
                            <MessageCircle size={16} />
                        </button>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); handleArchiveClick(client); }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title={client.status === 'arquivado' ? 'Restaurar' : 'Arquivar'}
                    >
                        {client.status === 'arquivado' ? <RefreshCw size={16} /> : <Archive size={16} />}
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(client); }}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Excluir"
                    >
                        <Trash2 size={16} />
                    </button>

                    <button onClick={() => setSelectedClient(client)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"><Eye size={16} /></button>
                </div>
            </div>
        </div>
    );
});
const ClientGridView: React.FC<ClientGridViewProps> = ({
    sortedClients,
    setSelectedClient,
    getClientStatus,
    handleWhatsAppClick,
    handleArchiveClick,
    handleDeleteClick,
    mergedPreferences
}) => {
    return (
        <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
            style={{
                transform: `scale(${mergedPreferences.clientsCardScale || 1})`,
                transformOrigin: 'top left',
                width: `${100 / (mergedPreferences.clientsCardScale || 1)}%`
            }}
        >
            {sortedClients.map(client => (
                <ClientGridCard
                    key={client.id}
                    client={client}
                    setSelectedClient={setSelectedClient}
                    getClientStatus={getClientStatus}
                    handleWhatsAppClick={handleWhatsAppClick}
                    handleArchiveClick={handleArchiveClick}
                    handleDeleteClick={handleDeleteClick}
                />
            ))}
            {sortedClients.length === 0 && <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">Nenhum cliente encontrado.</div>}
        </div>
    );
};

export default React.memo(ClientGridView);
