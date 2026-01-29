import React from 'react';
import { Activity } from 'lucide-react';

interface WelcomeSectionProps {
    userName?: string;
}

const WelcomeSection: React.FC<WelcomeSectionProps> = ({ userName }) => {
    return (
        <div className="flex flex-col justify-center h-full relative overflow-hidden group p-2">
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-2.5 bg-gold-500/10 rounded-xl border border-gold-500/20 shadow-lg shadow-gold-500/5">
                        <Activity className="text-gold-500" size={24} />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-zinc-500 font-serif tracking-tight">
                        Visão Geral
                    </h2>
                </div>

                <p className="text-zinc-400 mt-1 text-lg font-medium opacity-90 leading-relaxed">
                    Bem-vindo de volta, <span className="text-gold-500 font-bold relative inline-block">
                        {userName}
                        <span className="absolute -bottom-1 left-0 w-full h-px bg-gold-500/30"></span>
                    </span>.
                    <br />
                    <span className="text-sm text-zinc-500 font-normal">Aqui está o resumo atualizado do seu escritório.</span>
                </p>

                <div className="flex items-center gap-3 mt-6">
                    <div className="flex items-center bg-[#131418] border border-white/10 rounded-full px-3 py-1.5 shadow-inner">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        <p className="text-[10px] text-slate-300 uppercase tracking-widest font-black">
                            Sincronizado: {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="absolute -right-12 -bottom-12 opacity-[0.03] transform group-hover:scale-110 group-hover:-translate-x-4 group-hover:-translate-y-4 transition-all duration-1000 ease-out pointer-events-none">
                <Activity size={280} strokeWidth={1} />
            </div>

            {/* Subtle radial glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 blur-[100px] pointer-events-none rounded-full" />
        </div>
    );
};

export default React.memo(WelcomeSection);
