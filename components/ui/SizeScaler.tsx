import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SizeScalerProps {
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    step?: number;
}

const SizeScaler: React.FC<SizeScalerProps> = ({ value, onChange, min = 0.5, max = 1.6, step = 0.05 }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="relative flex items-center z-40"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <motion.div
                initial={false}
                animate={{ width: isHovered ? '180px' : '40px' }}
                className="h-10 bg-[#131418] rounded-full flex items-center shadow-lg shadow-gold-500/5 overflow-hidden cursor-pointer border border-white/10"
            >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <Maximize2 size={18} className="text-gold-500" />
                </div>

                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex-1 pr-4 flex items-center gap-3"
                        >
                            <input
                                type="range"
                                min={min}
                                max={max}
                                step={step}
                                value={value}
                                onChange={(e) => onChange(parseFloat(e.target.value))}
                                className="w-full accent-gold-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] font-black text-white whitespace-nowrap uppercase tracking-widest">
                                {max > 5 ? `${value}px` : `${Math.round(value * 100)}%`}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default SizeScaler;
