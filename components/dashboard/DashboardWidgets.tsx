import React from 'react';
import { Wallet, Radar as RadarIcon, Filter, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart as ReBarChart, XAxis, YAxis, Tooltip, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Legend, CartesianGrid } from 'recharts';

interface CashFlowWidgetProps {
    data: any[];
    onClick: () => void;
    customTitle?: string;
}

export const CashFlowWidget: React.FC<CashFlowWidgetProps> = ({ data, onClick, customTitle }) => (
    <div className="flex flex-col h-full cursor-pointer" onClick={onClick}>
        <h3 className="text-sm font-bold text-white mb-2 font-serif flex items-center gap-2"><Wallet size={16} className="text-emerald-500" /> {customTitle || 'Fluxo de Caixa'}</h3>
        <div className="flex-1 min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={data} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#ccc', fontSize: 10 }} width={80} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} formatter={(val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} />
                    <Bar dataKey="valor" barSize={20} radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Bar>
                </ReBarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

interface RadarFinancialWidgetProps {
    data: any[];
    onClick: () => void;
    customTitle?: string;
}

export const RadarFinancialWidget: React.FC<RadarFinancialWidgetProps> = ({ data, onClick, customTitle }) => (
    <div className="flex flex-col h-full cursor-pointer" onClick={onClick}>
        <h3 className="text-sm font-bold text-white mb-2 font-serif flex items-center gap-2"><RadarIcon size={16} className="text-yellow-500" /> {customTitle || 'Radar Financeiro'}</h3>
        <div className="flex-1 min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="#3f3f46" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar name="Financeiro" dataKey="A" stroke="#EAB308" strokeWidth={2} fill="#EAB308" fillOpacity={0.3} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} formatter={(val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

interface FunnelChartWidgetProps {
    data: any[];
    onClick: () => void;
    customTitle?: string;
}

export const FunnelChartWidget: React.FC<FunnelChartWidgetProps> = ({ data, onClick, customTitle }) => (
    <div className="flex flex-col h-full cursor-pointer" onClick={onClick}>
        <h3 className="text-sm font-bold text-white mb-4 font-serif flex items-center gap-2"><Filter size={16} className="text-blue-400" />{customTitle || 'Funil de Processos'}</h3>
        <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} />
                    <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>{data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Bar>
                </ReBarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

interface TypeDistributionWidgetProps {
    data: any[];
    totalCases: number;
    onClick: () => void;
    customTitle?: string;
}

const COLORS = ['#EAB308', '#10B981', '#3B82F6', '#F97316', '#EF4444', '#8B5CF6'];

export const TypeDistributionWidget: React.FC<TypeDistributionWidgetProps> = ({ data, totalCases, onClick, customTitle }) => (
    <div className="flex flex-col h-full cursor-pointer" onClick={onClick}>
        <h3 className="text-sm font-bold text-white mb-4 font-serif flex items-center gap-2">
            <PieChartIcon size={16} className="text-yellow-500" />
            {customTitle || 'Distribuição'}
        </h3>
        <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-zinc-400 text-[10px] ml-1">{value}</span>} />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-xl font-bold text-white">{totalCases}</span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Processos</span>
            </div>
        </div>
    </div>
);
