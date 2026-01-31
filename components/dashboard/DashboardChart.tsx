import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart } from 'lucide-react';

interface DashboardChartProps {
    title: string;
    data: any[];
    dataType: 'financial' | 'clients' | 'cases';
    financialViewMode?: 'all' | 'income' | 'profit';
    onFilterChange?: (mode: 'all' | 'income' | 'profit') => void;
    onClick: () => void;
}

const DashboardChart: React.FC<DashboardChartProps> = ({
    title,
    data,
    dataType,
    financialViewMode = 'all',
    onFilterChange,
    onClick
}) => {
    return (
        <div className="flex flex-col h-full cursor-pointer" onClick={onClick}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-white font-serif flex items-center gap-2">
                    <BarChart size={16} className="text-emerald-500" />
                    {title}
                </h3>
                {dataType === 'financial' && onFilterChange && (
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5" onClick={(e) => e.stopPropagation()}>
                        {[{ id: 'all', label: 'Tudo' }, { id: 'income', label: 'Receita' }, { id: 'profit', label: 'Lucro' }].map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => onFilterChange(filter.id as any)}
                                className={`px-2 py-1 text-[10px] rounded font-medium transition-all ${financialViewMode === filter.id ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                            <linearGradient id="colorSec" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EAB308" stopOpacity={0.4} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(val) => dataType === 'financial' ? `R$${val / 1000}k` : val} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} formatter={(value: number) => dataType === 'financial' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : value} />
                        {dataType === 'financial' ? (
                            <>
                                {(financialViewMode === 'all' || financialViewMode === 'income') && <Area type="monotone" dataKey="Receita" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorMain)" />}
                                {(financialViewMode === 'all') && <Area type="monotone" dataKey="Despesa" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSec)" />}
                                {(financialViewMode === 'profit') && <Area type="monotone" dataKey="Lucro" stroke="#EAB308" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />}
                            </>
                        ) : (
                            <Area type="monotone" dataKey={dataType === 'clients' ? 'Clientes' : 'Processos'} stroke="#FBBF24" strokeWidth={2} fillOpacity={1} fill="url(#colorMain)" />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default React.memo(DashboardChart);
