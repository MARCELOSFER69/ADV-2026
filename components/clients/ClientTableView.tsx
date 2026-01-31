import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check } from 'lucide-react';
import { Client, ColumnConfig } from '../../types';
import ClientRow from './ClientRow';

interface ClientTableViewProps {
    sortedClients: Client[];
    columns: ColumnConfig[];
    sortConfig: { key: keyof Client | 'status'; direction: 'asc' | 'desc' };
    handleSort: (key: keyof Client | 'status') => void;
    getClientStatus: (clientId: string) => { label: string; color: string };
    setSelectedClient: (client: Client) => void;
    setIsClientEditMode: (mode: boolean) => void;
    handleWhatsAppClick: (name: string, phone: string) => void;
    handleArchiveClick: (client: Client) => void;
    handleDeleteClick: (client: Client) => void;
    handleCopyPhone: (phone: string) => void;
    mergedPreferences: any;
    selectedIds: string[];
    onToggleSelect: (id: string) => void;
    onSelectAll: () => void;
}

const ClientTableView: React.FC<ClientTableViewProps> = ({
    sortedClients,
    columns,
    sortConfig,
    handleSort,
    getClientStatus,
    setSelectedClient,
    setIsClientEditMode,
    handleWhatsAppClick,
    handleArchiveClick,
    handleDeleteClick,
    handleCopyPhone,
    mergedPreferences,
    selectedIds,
    onToggleSelect,
    onSelectAll
}) => {
    const allSelectedOnPage = sortedClients.length > 0 && selectedIds.length === sortedClients.length;
    const someSelectedOnPage = selectedIds.length > 0 && !allSelectedOnPage;

    return (
        <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl shadow-2xl overflow-hidden flex-1 flex flex-col relative z-0">
            <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse" style={{ fontSize: `${mergedPreferences.clientsFontSize || 14}px` }}>
                    <thead className="bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 w-10">
                                <div
                                    onClick={(e) => { e.stopPropagation(); onSelectAll(); }}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${allSelectedOnPage
                                        ? 'bg-gold-500 border-gold-500 text-black'
                                        : someSelectedOnPage
                                            ? 'bg-gold-500/20 border-gold-500 text-gold-500'
                                            : 'border-slate-700 hover:border-slate-500 bg-white/5'
                                        }`}
                                >
                                    {allSelectedOnPage && <Check size={14} className="stroke-[4]" />}
                                    {someSelectedOnPage && <div className="w-2.5 h-0.5 bg-gold-500 rounded-full" />}
                                </div>
                            </th>
                            {columns.filter(c => c.visible).map(col => (
                                <th
                                    key={col.id}
                                    className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                                    onClick={() => {
                                        if (col.id === 'nome') handleSort('nome_completo');
                                        if (col.id === 'filial') handleSort('filial');
                                        if (col.id === 'captador') handleSort('captador');
                                    }}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {(col.id === 'nome' && sortConfig.key === 'nome_completo') || (col.id === 'filial' && sortConfig.key === 'filial') || (col.id === 'captador' && sortConfig.key === 'captador') ? (
                                            sortConfig.direction === 'asc' ? <ArrowDown size={12} className="text-gold-500" /> : <ArrowUp size={12} className="text-gold-500" />
                                        ) : (
                                            ['nome', 'filial', 'captador'].includes(col.id) && <ArrowUpDown size={12} className="text-slate-600" />
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedClients.map((client, i) => (
                            <ClientRow
                                key={client.id}
                                index={i}
                                client={client}
                                columns={columns}
                                hasPendencias={(client.pendencias || []).length > 0}
                                getClientStatus={getClientStatus}
                                setSelectedClient={setSelectedClient}
                                setIsClientEditMode={setIsClientEditMode}
                                handleWhatsAppClick={handleWhatsAppClick}
                                handleArchiveClick={handleArchiveClick}
                                handleDeleteClick={handleDeleteClick}
                                handleCopyPhone={handleCopyPhone}
                                isSelected={selectedIds.includes(client.id)}
                                anySelected={selectedIds.length > 0}
                                onToggleSelect={onToggleSelect}
                            />
                        ))}
                        {sortedClients.length === 0 && (
                            <tr>
                                <td colSpan={columns.filter(c => c.visible).length + 2} className="text-center py-12 text-slate-500">
                                    Nenhum cliente encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClientTableView;
