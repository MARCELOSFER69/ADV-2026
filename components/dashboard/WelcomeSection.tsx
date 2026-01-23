import React from 'react';
import { Activity } from 'lucide-react';

interface WelcomeSectionProps {
    userName?: string;
}

const WelcomeSection: React.FC<WelcomeSectionProps> = ({ userName }) => {
    return (
        <div className="flex flex-col justify-center h-full relative overflow-hidden group">
            <div className="relative z-10">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 font-serif tracking-wide">Visão Geral</h2>
                <p className="text-zinc-400 mt-2 text-lg">Bem-vindo de volta, <span className="text-yellow-500 font-semibold">{userName}</span>.</p>
                <div className="flex items-center gap-2 mt-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>
            <div className="absolute right-0 bottom-0 opacity-5 transform group-hover:scale-110 transition-transform duration-700">
                <Activity size={150} />
            </div>
        </div>
    );
};

export default React.memo(WelcomeSection);
