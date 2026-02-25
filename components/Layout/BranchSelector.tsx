import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { Branch } from '../../types';
import { useAppContext } from '../../context/AppContext';

const BranchSelector: React.FC = () => {
    const { globalBranchFilter, setGlobalBranchFilter } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const branches = [
        { id: 'all', label: 'Todas as Filiais' },
        { id: Branch.SANTA_INES, label: 'Santa Inês' },
        { id: Branch.ASPEMA, label: 'Aspema' },
        { id: Branch.ALTO_ALEGRE, label: 'Alto Alegre' },
        { id: Branch.SAO_JOAO_DO_CARU, label: 'São João do Carú' },
    ];

    const currentBranchLabel = branches.find(b => b.id === globalBranchFilter)?.label || 'Todas as Filiais';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 h-10 px-4 rounded-xl border transition-all duration-300 ${isOpen
                        ? 'bg-gold-500/10 border-gold-500 text-gold-500 shadow-lg shadow-gold-500/10'
                        : 'bg-[#181818] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
            >
                <Building2 size={16} className={isOpen ? 'text-gold-500' : 'text-slate-500'} />
                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                    {currentBranchLabel}
                </span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[110] overflow-hidden"
                    >
                        <div className="p-2 space-y-1">
                            {branches.map((branch) => {
                                const isActive = globalBranchFilter === branch.id;
                                return (
                                    <button
                                        key={branch.id}
                                        onClick={() => {
                                            setGlobalBranchFilter(branch.id as any);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${isActive
                                                ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="uppercase tracking-wider">{branch.label}</span>
                                        {isActive && <Check size={14} />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BranchSelector;
