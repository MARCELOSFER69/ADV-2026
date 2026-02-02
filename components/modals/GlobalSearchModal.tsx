import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, FileText, ChevronRight, Calculator, Archive, Briefcase, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAllCases } from '../../hooks/useCases';
import { Case, Client } from '../../types';

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

import { useAllClients } from '../../hooks/useClients';
// ...
const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
    const { setCurrentView, openNewCaseWithParams } = useApp();
    const { data: allClients = [] } = useAllClients();
    const { data: cases = [] } = useAllCases();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Results Types
    type SearchResult = {
        type: 'client' | 'case' | 'action';
        id: string;
        title: string;
        subtitle?: string;
        icon: React.ElementType;
        action: () => void;
    };

    const [results, setResults] = useState<SearchResult[]>([]);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setResults([]);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        const lowerTerm = searchTerm.toLowerCase();
        const newResults: SearchResult[] = [];

        // 1. Clients
        const matchedClients = allClients
            .filter(c => c.nome_completo.toLowerCase().includes(lowerTerm) || c.cpf_cnpj?.includes(lowerTerm))
            .slice(0, 5)
            .map(c => ({
                type: 'client' as const,
                id: c.id,
                title: c.nome_completo,
                subtitle: `CPF: ${c.cpf_cnpj || 'N/A'}`,
                icon: User,
                action: () => {
                    // Logic to open client details would ideally open the modal directly
                    // For now, switch to clients view. A more robust solution would be global triggers.
                    setCurrentView('clients');
                    // We might need a way to auto-select the client. 
                    // This is a constraint. For simplicity first version: Go to Clients and COPY name to clipboard?
                    // Better: The user expects to Open the Detail. 
                    // Constraint: ClientDetailsModal is local to Clients.tsx.
                    // Solution: We will inject a 'search_open_client_id' into AppContext or just navigate for now.
                    // Let's assume navigating to Clients is step 1.
                    onClose();
                }
            }));

        // 2. Cases
        const matchedCases = cases
            .filter(c => c.titulo.toLowerCase().includes(lowerTerm) || c.numero_processo?.includes(lowerTerm))
            .slice(0, 5)
            .map(c => ({
                type: 'case' as const,
                id: c.id,
                title: c.titulo,
                subtitle: `Proc: ${c.numero_processo || 'S/N'} • ${c.status}`,
                icon: Briefcase,
                action: () => {
                    setCurrentView('cases');
                    onClose();
                }
            }));

        newResults.push(...matchedClients, ...matchedCases);
        setResults(newResults);
        setSelectedIndex(0);

    }, [searchTerm, allClients, cases]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                results[selectedIndex].action();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">

                {/* Search Header */}
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                    <Search className="text-zinc-500" size={20} />
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent text-lg text-white outline-none placeholder:text-zinc-600"
                        placeholder="Buscar clientes, processos ou comandos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => { setSearchTerm(''); inputRef.current?.focus(); }}
                            className="text-zinc-500 hover:text-white transition-colors p-1"
                            title="Limpar busca"
                        >
                            <X size={18} />
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <kbd className="hidden md:inline-flex h-6 items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-[10px] font-medium text-zinc-500 font-mono">
                            ESC
                        </kbd>
                        <kbd className="hidden md:inline-flex h-6 items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-[10px] font-medium text-zinc-500 font-mono">
                            ALT + T
                        </kbd>
                    </div>
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {results.length > 0 ? (
                        <div className="p-2 space-y-1">
                            {results.map((result, index) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={result.action}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left group ${index === selectedIndex ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${result.type === 'client' ? 'bg-blue-500/10 text-blue-500' :
                                        result.type === 'case' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800 text-zinc-400'
                                        }`}>
                                        <result.icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className={`text-sm font-medium truncate ${index === selectedIndex ? 'text-white' : 'text-zinc-300'}`}>
                                                {result.title}
                                            </h4>
                                            {index === selectedIndex && <ChevronRight size={14} className="text-zinc-500" />}
                                        </div>
                                        {result.subtitle && (
                                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                                                {result.subtitle}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : searchTerm ? (
                        <div className="p-8 text-center text-zinc-500">
                            <p className="text-sm">Nenhum resultado encontrado para "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-zinc-600">
                            <p className="text-sm mb-2">Digite para pesquisar...</p>
                            <div className="flex gap-2 justify-center mt-4">
                                <span className="text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">Clientes</span>
                                <span className="text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">Processos</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-zinc-900/50 p-2 border-t border-zinc-800 text-[10px] text-zinc-600 flex justify-between px-4">
                    <span><strong>Enter</strong> para selecionar</span>
                    <span><strong>↑↓</strong> para navegar</span>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearchModal;
