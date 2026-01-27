import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Case, CaseHistory } from '../../types';
import { Clock, User, Calendar, Info } from 'lucide-react';
// Removed duplicate import
// Wait, CaseDetailsModal used getRelativeTime but ClientHistoryTab used formatDateDisplay. 
// The user asked for "mesmo padrao", ClientHistoryTab uses formatDateDisplay. I should check which one looks better or if I should follow ClientHistoryTab exactly.
// ClientHistoryTab used formatDateDisplay.
import { formatDateDisplay } from '../../utils/dateUtils';

interface CaseHistoryTabProps {
    caseId: string;
    registeredBy?: string;
    updatedBy?: string;
}

const CaseHistoryTab: React.FC<CaseHistoryTabProps> = ({ caseId, registeredBy, updatedBy }) => {
    const { getCaseHistory } = useApp();
    const [history, setHistory] = useState<CaseHistory[]>([]);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        const loadHistory = async () => {
            setFetching(true);
            try {
                const data = await getCaseHistory(caseId);
                setHistory(data);
            } catch (err) {
                console.error('Erro ao carregar histórico:', err);
            } finally {
                setFetching(false);
            }
        };
        loadHistory();
    }, [caseId, getCaseHistory]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-main)]">
                    <div className="flex items-center gap-3 text-[var(--text-muted)] mb-2 text-[10px] uppercase tracking-wider font-bold">
                        <User size={14} className="text-gold-500" />
                        Registrado Por
                    </div>
                    <div className="text-[var(--text-main)] font-medium text-sm">
                        {registeredBy || 'Sistema'}
                    </div>
                </div>

                <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-main)]">
                    <div className="flex items-center gap-3 text-[var(--text-muted)] mb-2 text-[10px] uppercase tracking-wider font-bold">
                        <Clock size={14} className="text-gold-500" />
                        Última Atualização Por
                    </div>
                    <div className="text-[var(--text-main)] font-medium text-sm">
                        {updatedBy || 'N/A'}
                    </div>
                </div>
            </div>

            <div className="relative">
                <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-gold-500" />
                    Log de Atividades
                </h3>

                {fetching ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-8 text-center">
                        <Info size={32} className="mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-[var(--text-muted)] text-sm">Nenhum histórico encontrado para este processo.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((item, index) => (
                            <div key={item.id} className="relative pl-8 pb-4 last:pb-0">
                                {/* Linha do Timeline */}
                                {index !== history.length - 1 && (
                                    <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-[var(--border-main)]"></div>
                                )}
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-gold-500/50 flex items-center justify-center z-10 shadow-lg">
                                    <div className="w-2 h-2 rounded-full bg-gold-500"></div>
                                </div>

                                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-4 hover:border-gold-500/30 transition-colors shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-gold-500 font-bold text-sm">{item.action}</span>
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">{formatDateDisplay(item.timestamp)}</span>
                                    </div>
                                    <div className="text-[var(--text-main)] text-sm mb-2 opacity-90">
                                        {item.details.includes(' | ') ? (
                                            <ul className="list-disc list-inside space-y-1">
                                                {item.details.split(' | ').map((change, i) => (
                                                    <li key={i}>{change}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p>{item.details}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] uppercase tracking-tighter">
                                        <User size={10} />
                                        <span>{item.user_name}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CaseHistoryTab;
