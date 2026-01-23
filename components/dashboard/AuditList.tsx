import React from 'react';
import { History } from 'lucide-react';
import { CaseHistory } from '../../types';

interface AuditListProps {
    title: string;
    logs: CaseHistory[];
}

const AuditList: React.FC<AuditListProps> = ({ title, logs }) => {
    return (
        <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-white mb-4 font-serif flex items-center gap-2">
                <History size={16} className="text-purple-400" /> {title}
            </h3>
            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {logs.length > 0 ? logs.map(log => (
                    <div key={log.id} className="flex gap-3 items-start p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_5px_#a855f7]"></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-zinc-200">{log.action}</p>
                            <p className="text-[10px] text-zinc-400 line-clamp-2">{log.details}</p>
                            <div className="flex justify-between mt-1">
                                <span className="text-[9px] text-zinc-600 uppercase">{log.user_name?.split(' ')[0]}</span>
                                <span className="text-[9px] text-zinc-600">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>
                )) : <div className="text-center py-8 text-zinc-500 text-xs">Sem registros recentes.</div>}
            </div>
        </div>
    );
};

export default React.memo(AuditList);
