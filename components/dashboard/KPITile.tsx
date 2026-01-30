import React from 'react';
import { AlertOctagon, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface KPITileProps {
    title: string;
    value: number | string;
    subtitle?: string;
    type: string;
    onClick: () => void;
    icon: LucideIcon;
    colorClass: string;
    bgColorClass: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    format?: 'number' | 'currency' | 'percentage';
    outline?: boolean;
}

const KPITile: React.FC<KPITileProps> = ({
    title,
    value,
    subtitle,
    onClick,
    icon: Icon,
    colorClass,
    bgColorClass,
    trend,
    format = 'number',
    outline = false
}) => {
    const formattedValue = React.useMemo(() => {
        if (format === 'currency' && typeof value === 'number') {
            return new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(value);
        }
        if (format === 'percentage') {
            return `${value}%`;
        }
        return value;
    }, [value, format]);

    return (
        <motion.div
            className="h-full flex flex-col justify-between cursor-pointer group"
            onClick={onClick}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="flex justify-between items-start">
                <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    className={`p-2 rounded-lg 
                        ${bgColorClass.includes('/10') ? bgColorClass.replace('/10', '/20') : bgColorClass + '/20'} 
                        ${colorClass} 
                        group-hover:text-gold-500 group-hover:bg-gold-500/20
                        transition-all duration-300 shadow-sm border border-transparent group-hover:border-gold-500/20`}
                >
                    <Icon size={18} strokeWidth={2.5} />
                </motion.div>
                {trend && (
                    <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}
                    >
                        {trend.isPositive ? '+' : ''}{Math.round(trend.value)}%
                    </motion.span>
                )}
            </div>
            <div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5"
                >
                    {title}
                </motion.p>
                <div className="flex items-end gap-2">
                    <motion.h3
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-2xl font-bold transition-colors duration-300 ${colorClass.includes('red') ? 'text-red-500' : 'text-white'} group-hover:text-gold-500`}
                    >
                        {formattedValue}
                    </motion.h3>
                </div>
                {subtitle && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] text-zinc-600 mt-1"
                    >
                        {subtitle}
                    </motion.p>
                )}
            </div>
        </motion.div>
    );
};

export default React.memo(KPITile);
