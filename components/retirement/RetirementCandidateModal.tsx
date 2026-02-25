import React from 'react';
import { X, Briefcase, MapPin, Phone, MessageCircle } from 'lucide-react';
import { RetirementCandidate } from '../../types';

interface RetirementCandidateModalProps {
    selectedCandidate: RetirementCandidate;
    onClose: () => void;
    onWhatsAppClick: (phone: string | undefined) => void;
    onViewFullProfile: (clientId: string, tab: 'cnis') => void;
}

export const RetirementCandidateModal: React.FC<RetirementCandidateModalProps> = ({
    selectedCandidate,
    onClose,
    onWhatsAppClick,
    onViewFullProfile
}) => {
    const [activeMode, setActiveMode] = React.useState<'Rural' | 'Urbana'>(selectedCandidate.bestChance);

    const formatTimeRemaining = (val: number) => {
        if (val <= 0) return "Já atingiu idade";
        const years = Math.floor(val);
        const months = Math.floor((val - years) * 12);
        if (years === 0) return `${months} meses`;
        return `${years} anos e ${months} meses`;
    };

    const currentRemaining = activeMode === 'Rural' ? selectedCandidate.ruralRemaining : selectedCandidate.urbanRemaining;
    const isEligible = currentRemaining <= 0;

    // Lógica para sugestão de Híbrida (Simplificada conforme padrão do sistema)
    const isHybridCandidate = activeMode === 'Urbana' && currentRemaining > 0 && selectedCandidate.ruralRemaining < currentRemaining;

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-2 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#09090b] border border-white/10 rounded-[32px] max-w-3xl w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row h-fit max-h-[95vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                {/* Left Side: Visual/Status */}
                <div className="w-full md:w-2/5 bg-gradient-to-br from-zinc-800 to-zinc-950 p-8 flex flex-col items-center justify-center text-center relative border-r border-white/5">
                    <div className="absolute top-6 left-6 md:hidden">
                        <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl mb-6 border-4 border-white/10 ${isEligible
                        ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                        : (selectedCandidate.client.pendencias && selectedCandidate.client.pendencias.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-100')
                        }`}>
                        {selectedCandidate.client.nome_completo.substring(0, 2).toUpperCase()}
                    </div>

                    <h3 className="text-2xl font-black text-white leading-tight mb-2 uppercase tracking-tighter">{selectedCandidate.client.nome_completo}</h3>
                    <p className="text-zinc-400 font-mono text-xs tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/5">{selectedCandidate.client.cpf_cnpj}</p>

                    <div className="mt-8 pt-8 border-t border-white/5 w-full">
                        <span className={`text-xs font-black px-4 py-1.5 rounded-full border tracking-[0.2em] uppercase ${isEligible
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-gold-500/10 text-gold-500 border-gold-500/20'}`}>
                            {isEligible ? 'Elegível Agora' : 'Em Prospecção'}
                        </span>
                    </div>
                </div>

                {/* Right Side: Data/Actions */}
                <div className="flex-1 p-8 sm:p-12 relative flex flex-col bg-[#09090b]">
                    <div className="absolute top-8 right-8 hidden md:block">
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-all">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-8">
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Análise de Tempo</h4>
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setActiveMode('Rural')}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeMode === 'Rural' ? 'bg-gold-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        RURAL
                                    </button>
                                    <button
                                        onClick={() => setActiveMode('Urbana')}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeMode === 'Urbana' ? 'bg-gold-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        URBANA
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-sm text-zinc-500 font-medium">Idade Atual</p>
                                    <p className="text-2xl font-black text-white">{selectedCandidate.age.years} anos</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-zinc-500 font-medium">Tempo Restante</p>
                                    <p className={`text-2xl font-black ${isEligible ? 'text-emerald-400' : 'text-gold-500'}`}>
                                        {formatTimeRemaining(currentRemaining)}
                                    </p>
                                </div>
                            </div>

                            {isHybridCandidate && (
                                <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-3 animate-pulse">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Sugestão: Aposentadoria Híbrida</span>
                                </div>
                            )}

                            <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gold-500/10 text-gold-500">
                                        <Briefcase size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-300">Sugestão do Sistema</span>
                                </div>
                                <span className="text-sm font-black text-white uppercase tracking-wider">{selectedCandidate.bestChance}</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4">Contato e Localização</h4>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 group">
                                    <MapPin size={18} className="text-zinc-700 group-hover:text-gold-500 shrink-0 mt-0.5 transition-colors" />
                                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">{selectedCandidate.client.endereco || 'Endereço não informado'}</p>
                                </div>
                                <div className="flex items-center gap-3 group">
                                    <Phone size={18} className="text-zinc-700 group-hover:text-emerald-500 shrink-0 transition-colors" />
                                    <p className="text-zinc-400 text-sm font-medium">{selectedCandidate.client.telefone || 'Sem telefone'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex gap-4">
                        {selectedCandidate.client.telefone && (
                            <button
                                onClick={() => onWhatsAppClick(selectedCandidate.client.telefone)}
                                className="flex-1 bg-[#25D366] hover:bg-[#22c35e] text-black h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/10 active:scale-[0.98]"
                            >
                                <MessageCircle size={18} /> WhatsApp
                            </button>
                        )}
                        <button
                            onClick={() => onViewFullProfile(selectedCandidate.client.id, 'cnis')}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all active:scale-[0.98]"
                        >
                            Ver Cadastro
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
