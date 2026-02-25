import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, User, FileText, Command, ArrowRight, X,
  Plus, Calculator, FileCheck, MessageSquare, LayoutDashboard,
  Briefcase, Scale, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const {
    setCurrentView,
    setIsNewClientModalOpen, setIsNewCaseModalOpen,
    setClientToView, setCaseToView
  } = useApp();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const QUICK_ACTIONS = useMemo(() => [
    { id: 'dash', label: 'Ver Dashboard', icon: LayoutDashboard, category: 'Navegação', subtitle: '', action: () => setCurrentView('dashboard') },
    { id: 'new-client', label: 'Cadastrar Novo Cliente', icon: Plus, category: 'Ações Rápidas', subtitle: '', action: () => setIsNewClientModalOpen(true) },
    { id: 'new-case', label: 'Abrir Novo Processo', icon: Briefcase, category: 'Ações Rápidas', subtitle: '', action: () => setIsNewCaseModalOpen(true) },
    { id: 'cnis', label: 'Calculadora de CNIS', icon: Calculator, category: 'Ferramentas', subtitle: '', action: () => setCurrentView('cnis') },
    { id: 'docs', label: 'Gerador de Documentos', icon: FileCheck, category: 'Ferramentas', subtitle: '', action: () => setCurrentView('document-builder') },
    { id: 'whatsapp', label: 'WhatsApp Web', icon: MessageSquare, category: 'Navegação', subtitle: '', action: () => setCurrentView('whatsapp') },
  ], [setCurrentView, setIsNewClientModalOpen, setIsNewCaseModalOpen]);

  // Global Search Logic
  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults(QUICK_ACTIONS);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('search_global', { query_text: query });
        if (error) throw error;

        const filteredActions = QUICK_ACTIONS.filter(a =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.category.toLowerCase().includes(query.toLowerCase())
        );

        const clients = (data.clients || []).map((c: any) => ({
          id: `client-${c.id}`,
          label: c.nome_completo,
          icon: User,
          category: 'Clientes',
          subtitle: c.cpf_cnpj,
          action: () => {
            setCurrentView('clients');
            setClientToView(c.id);
          }
        }));

        const cases = (data.cases || []).map((c: any) => {
          let targetView: any = 'cases';
          const isSeguro = c.tipo === 'Seguro Defeso';
          const isJudicial = c.tribunal && c.tribunal.toUpperCase() !== 'INSS' && c.tribunal.trim() !== '';

          if (isSeguro) targetView = 'cases-insurance';
          else if (isJudicial) targetView = 'cases-judicial';
          else targetView = 'cases-administrative';

          return {
            id: `case-${c.id}`,
            label: c.titulo,
            icon: Scale,
            category: 'Processos',
            subtitle: c.numero_processo,
            action: () => {
              setCurrentView(targetView);
              setCaseToView(c.id);
            }
          };
        });

        setResults([...filteredActions, ...clients, ...cases]);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(search, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, QUICK_ACTIONS, setCurrentView, setClientToView, setCaseToView]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = useCallback((item: any) => {
    if (!item) return;
    item.action();
    onClose();
    setQuery('');
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[12vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl glass-gold rounded-2xl shadow-[0_0_50px_-12px_rgba(202,138,4,0.15)] overflow-hidden ring-1 ring-white/5 z-10"
          >
            {/* Search Bar */}
            <div className="flex items-center px-6 py-5 border-b border-zinc-800/50 bg-black/20">
              <Search className="text-gold-500/70 mr-4" size={22} />
              <input
                ref={inputRef}
                className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-600 text-xl font-light tracking-wide"
                placeholder="Pesquisar..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev + 1) % results.length); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev - 1 + results.length) % results.length); }
                  if (e.key === 'Enter') handleSelect(results[selectedIndex]);
                  if (e.key === 'Escape') onClose();
                }}
              />
              <div className="flex items-center gap-1.5 ml-4">
                <kbd className="h-6 flex items-center bg-zinc-900 border border-zinc-800 rounded px-1.5 text-[10px] font-bold text-zinc-500">ESC</kbd>
              </div>
            </div>

            {/* Content */}
            <motion.div
              layout
              className="max-h-[65vh] overflow-y-auto p-3 custom-scrollbar min-h-[200px]"
            >
              {isLoading ? (
                <div className="py-20 text-center">
                  <div className="w-12 h-12 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-zinc-500 text-sm font-medium animate-pulse">Buscando no servidor...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((item, index) => {
                    const Icon = item.icon;
                    const isSelected = index === selectedIndex;
                    const showCategory = index === 0 || results[index - 1].category !== item.category;

                    return (
                      <React.Fragment key={item.id}>
                        {showCategory && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="px-4 pt-4 pb-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]"
                          >
                            {item.category}
                          </motion.div>
                        )}
                        <motion.button
                          layout
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative active-scale ${isSelected
                            ? 'bg-zinc-800/50 border border-zinc-700/50 shadow-inner'
                            : 'text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900/30'
                            }`}
                        >
                          <div className="flex items-center gap-4">
                            <motion.div
                              animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
                              className={`p-2.5 rounded-xl transition-all duration-300 ${isSelected
                                ? 'bg-gold-500 text-black shadow-[0_0_20px_rgba(202,138,4,0.3)]'
                                : 'bg-zinc-900 text-zinc-500 group-hover:text-zinc-300'
                                }`}>
                              <Icon size={20} />
                            </motion.div>
                            <div className="flex flex-col items-start translate-z-0">
                              <span className={`font-semibold text-sm transition-colors ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                {item.label}
                              </span>
                              {item.subtitle && (
                                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.subtitle}</span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ x: -10, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              className="flex items-center gap-2"
                            >
                              <span className="text-[10px] font-bold text-gold-500/50 uppercase tracking-widest mr-2">Abrir</span>
                              <ArrowRight size={16} className="text-gold-500" />
                            </motion.div>
                          )}
                        </motion.button>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-20 text-center"
                >
                  <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-zinc-800" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-400">Nenhum resultado</h3>
                  <p className="text-zinc-600 text-sm mt-1 max-w-[280px] mx-auto">Não encontramos nada para "{query}". Tente buscar por nomes, CPFs ou números de processos.</p>
                </motion.div>
              )}
            </motion.div>

            {/* Footer Tips */}
            <div className="px-6 py-4 bg-black/40 border-t border-zinc-800/50 flex justify-between items-center text-[10px]">
              <div className="flex gap-6">
                <div className="flex items-center gap-2 group cursor-default">
                  <span className="bg-zinc-900 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded shadow-sm group-hover:border-gold-500/30 transition-colors">↑↓</span>
                  <span className="text-zinc-500 font-bold uppercase tracking-widest">Navegar</span>
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                  <span className="bg-zinc-900 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded shadow-sm group-hover:border-gold-500/30 transition-colors">ENTER</span>
                  <span className="text-zinc-500 font-bold uppercase tracking-widest">Selecionar</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gold-500/40">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500/50 animate-pulse"></span>
                <span className="font-black uppercase tracking-[0.2em]">ADV-2026 Core v2</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;