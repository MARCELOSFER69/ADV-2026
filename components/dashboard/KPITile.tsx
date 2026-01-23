import React from 'react';
import { AlertOctagon, LucideIcon } from 'lucide-react';

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
    format = 'number'
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
        <div className="h-full flex flex-col justify-between cursor-pointer group" onClick={onClick}>
            <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${bgColorClass} ${colorClass} group-hover:scale-110 transition-transform`}>
                    <Icon size={18} />
                </div>
                {trend && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trend.isPositive ? '+' : ''}{Math.round(trend.value)}%
                    </span>
                )}
            </div>
            <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">{title}</p>
                <div className="flex items-end gap-2">
                    <h3 className={`text-2xl font-bold transition-colors duration-300 ${colorClass.includes('red') ? 'text-red-500' : 'text-white'} group-hover:text-yellow-500`}>
                        {formattedValue}
                    </h3>
                </div>
                {subtitle && <p className="text-[10px] text-zinc-600 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
};

export default React.memo(KPITile);
