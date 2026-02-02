import React, { useState } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PendencyIndicatorProps {
    pendencies?: string[];
    className?: string;
    iconSize?: number;
    showLabel?: boolean;
    children?: React.ReactNode;
    align?: 'left' | 'center' | 'right';
}

const PendencyIndicator: React.FC<PendencyIndicatorProps> = ({
    pendencies = [],
    className = "",
    iconSize = 14,
    showLabel = false,
    children,
    align = 'center'
}) => {
    const [isHovered, setIsHovered] = useState(false);

    if (!pendencies || pendencies.length === 0) return <>{children}</>;

    const trigger = children || (
        <div className={`flex items-center gap-1.5 cursor-help ${showLabel ? 'bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full' : 'text-red-500'}`}>
            <AlertTriangle size={iconSize} className={showLabel ? "" : "animate-pulse"} />
            {showLabel && <span className="text-[10px] font-bold uppercase tracking-wider">{pendencies.length} {pendencies.length === 1 ? 'Pendência' : 'Pendências'}</span>}
        </div>
    );

    const getPositionClasses = () => {
        switch (align) {
            case 'left': return 'left-0 translate-x-0';
            case 'right': return 'right-0 translate-x-0';
            default: return 'left-1/2 -translate-x-1/2';
        }
    };

    const getArrowClasses = () => {
        switch (align) {
            case 'left': return 'left-6';
            case 'right': return 'right-6';
            default: return 'left-1/2 -translate-x-1/2';
        }
    };

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {trigger}

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`absolute bottom-full mb-3 z-[100] w-64 bg-[#09090b] border border-red-500/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-none ${getPositionClasses()}`}
                    >
                        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-2">
                            <AlertCircle size={14} className="text-red-500" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.1em]">Pendências Detectadas</span>
                        </div>
                        <ul className="p-3 space-y-2">
                            {pendencies.map((p, i) => (
                                <li key={i} className="flex items-start gap-2 text-zinc-300 text-[11px] leading-tight text-left">
                                    <div className="w-1 h-1 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                    <span>{p}</span>
                                </li>
                            ))}
                        </ul>
                        {/* Tooltip Arrow */}
                        <div className={`absolute top-full border-8 border-transparent border-t-[#09090b] ${getArrowClasses()}`} />
                        <div className={`absolute top-full border-[9px] border-transparent border-t-red-500/30 -z-10 ${getArrowClasses()}`} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PendencyIndicator;
