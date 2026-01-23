
import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Scale, DollarSign, LayoutDashboard, Hourglass, X, LucideIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type SearchResultItem = 
  | { type: 'view'; id: string; label: string; icon: LucideIcon; sub?: string }
  | { type: 'client'; id: string; label: string; sub: string; icon?: undefined }
  | { type: 'case'; id: string; label: string; sub: string; icon?: undefined };

const CommandPalette: React.FC = () => {
  const { clients, cases, setCurrentView, setClientToView, setCaseToView } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredResults = React.useMemo<SearchResultItem[]>(() => {
    if (!query) return [];

    const lowerQuery = query.toLowerCase();
    
    // Views
    const views = [
        { id: 'dashboard', label: 'Ir para Dashboard', type: 'view' as const, icon: LayoutDashboard },
        { id: 'clients', label: 'Ir para Clientes', type: 'view' as const, icon: User },
        { id: 'cases', label: 'Ir para Processos', type: 'view' as const, icon: Scale },
        { id: 'financial', label: 'Ir para Financeiro', type: 'view' as const, icon: DollarSign },
        { id: 'retirements', label: 'Ir para Aposentadorias', type: 'view' as const, icon: Hourglass },
    ].filter(v => v.label.toLowerCase().includes(lowerQuery));

    // Clients
    const filteredClients = clients
        .filter(c => c.nome_completo.toLowerCase().includes(lowerQuery) || c.cpf_cnpj.includes(query))
        .slice(0, 3)
        .map(c => ({ id: c.id, type: 'client' as const, label: c.nome_completo, sub: c.cpf_cnpj }));

    // Cases
    const filteredCases = cases
        .filter(c => c.titulo.toLowerCase().includes(lowerQuery) || c.numero_processo.includes(query))
        .slice(0, 3)
        .map(c => ({ id: c.id, type: 'case' as const, label: c.titulo, sub: c.numero_processo }));

    return [...views, ...filteredClients, ...filteredCases] as SearchResultItem[];
  }, [query, clients, cases]);

  const handleSelect = (item: SearchResultItem) => {
      if (item.type === 'view') {
          setCurrentView(item.id as any);
      } else if (item.type === 'client') {
          setClientToView(item.id);
          setCurrentView('clients');
      } else if (item.type === 'case') {
          setCaseToView(item.id);
          setCurrentView('cases');
      }
      setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredResults.length);
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
      } else if (e.key === 'Enter') {
          if (filteredResults.length > 0) {
              handleSelect(filteredResults[selectedIndex]);
          }
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[20vh] p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-navy-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
            <Search className="text-slate-500" size={20} />
            <input 
                ref={inputRef}
                className="flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
                placeholder="Busque clientes, processos ou telas..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2">
            {filteredResults.length > 0 ? (
                filteredResults.map((item, index) => (
                    <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${index === selectedIndex ? 'bg-gold-600/10 border border-gold-600/20' : 'hover:bg-slate-800 border border-transparent'}`}
                    >
                        <div className={`p-2 rounded-lg ${index === selectedIndex ? 'bg-gold-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            {item.type === 'view' && <item.icon size={18} />}
                            {item.type === 'client' && <User size={18} />}
                            {item.type === 'case' && <Scale size={18} />}
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${index === selectedIndex ? 'text-gold-500' : 'text-slate-200'}`}>{item.label}</p>
                            {item.sub && <p className="text-xs text-slate-500">{item.sub}</p>}
                        </div>
                        {index === selectedIndex && <span className="ml-auto text-xs text-slate-500">Enter</span>}
                    </button>
                ))
            ) : (
                <div className="py-8 text-center text-slate-500 text-sm">
                    {query ? 'Nenhum resultado encontrado.' : 'Digite para buscar...'}
                </div>
            )}
        </div>
        <div className="bg-navy-950 px-4 py-2 border-t border-slate-800 flex justify-between text-[10px] text-slate-500">
            <span>Use as setas para navegar</span>
            <span>ESC para fechar</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;