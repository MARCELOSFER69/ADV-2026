import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Fish, MapPin, CalendarDays, ChevronRight, Loader2 } from 'lucide-react';

interface ReapConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (fishingData: FishingMonthData[]) => void;
    clientName: string;
    clientLocation?: string; // rgp_localidade do cliente
}

interface FishingMonthData {
    MES: string;
    DIAS: number;
    QUANTIDADE: number; // kg
    VALOR: string; // preço médio
    ESPECIE: string;
    TIPO_LOCAL: string;
    NOME_LOCAL: string;
    MUNICIPIO: string;
    PETRECHO: string;
}

// Meses de pesca (Abril a Novembro = 8 meses)
const MESES_PESCA = ['Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro'];

const ReapConfigModal: React.FC<ReapConfigModalProps> = ({
    isOpen, onClose, onConfirm, clientName, clientLocation
}) => {
    // Estados para configuração global (aplicada a todos os meses)
    const [diasPorMes, setDiasPorMes] = useState<number>(15);
    const [kgPorMes, setKgPorMes] = useState<number>(50);
    const [precoMedio, setPrecoMedio] = useState<string>('8,00');
    const [especiesPorMes, setEspeciesPorMes] = useState<number>(1);

    // Peixes (carregados da planilha)
    const [peixes, setPeixes] = useState<string[]>([]);
    const [selectedPeixes, setSelectedPeixes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Petrecho sorteado aleatoriamente (Vara ou Arrasto) - mesmo para todos os meses
    const [petrecho, setPetrecho] = useState<string>(() =>
        Math.random() > 0.5 ? 'Vara' : 'Arrasto'
    );

    // Máximo de peixes selecionáveis = 8 meses × espécies por mês
    const maxPeixesSelecionaveis = MESES_PESCA.length * especiesPorMes;

    // Carrega dados das planilhas via API
    useEffect(() => {
        if (isOpen) {
            loadConfigData();
        }
    }, [isOpen]);

    // Quando mudar espécies por mês, limita seleção se necessário
    useEffect(() => {
        if (selectedPeixes.length > maxPeixesSelecionaveis) {
            setSelectedPeixes(selectedPeixes.slice(0, maxPeixesSelecionaveis));
        }
    }, [especiesPorMes]);

    const loadConfigData = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/reap-config');
            if (res.ok) {
                const data = await res.json();
                setPeixes(data.peixes || []);

                // Seleciona 1 peixe por padrão
                if (data.peixes?.length >= 1) {
                    setSelectedPeixes([data.peixes[0]]);
                }
            }
        } catch (e) {
            console.error('Erro ao carregar config REAP:', e);
        }
        setLoading(false);
    };

    const handleConfirm = () => {
        // Distribui os peixes selecionados pelos meses
        // Cada mês recebe [especiesPorMes] de peixes da lista (ciclando se necessário)
        const fishingData: FishingMonthData[] = [];

        let peixeIndex = 0;
        for (const mes of MESES_PESCA) {
            // Para cada mês, pega [especiesPorMes] peixes diferentes
            for (let i = 0; i < especiesPorMes; i++) {
                const peixe = selectedPeixes[peixeIndex % selectedPeixes.length];
                peixeIndex++;

                fishingData.push({
                    MES: mes,
                    DIAS: diasPorMes,
                    QUANTIDADE: Math.round(kgPorMes / especiesPorMes), // Divide kg entre espécies do mês
                    VALOR: precoMedio,
                    ESPECIE: peixe,
                    TIPO_LOCAL: 'Rio',
                    NOME_LOCAL: 'Rio Local',
                    MUNICIPIO: clientLocation || 'Buriticupu',
                    PETRECHO: petrecho // Usa o petrecho sorteado (Vara ou Arrasto)
                });
            }
        }

        onConfirm(fishingData);
    };

    const togglePeixe = (peixe: string) => {
        if (selectedPeixes.includes(peixe)) {
            // Remove se já selecionado
            setSelectedPeixes(selectedPeixes.filter(p => p !== peixe));
        } else if (selectedPeixes.length < maxPeixesSelecionaveis) {
            // Adiciona se não atingiu o máximo
            setSelectedPeixes([...selectedPeixes, peixe]);
        }
    };

    if (!isOpen) return null;

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-[#131418] border-b border-white/5 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Fish className="text-gold-500" size={24} />
                        <div>
                            <h3 className="font-bold text-white text-lg">Configurar Dados de Pesca</h3>
                            <p className="text-gray-400 text-xs">{clientName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="p-10 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-gold-500" size={40} />
                        <p className="text-slate-400">Carregando configurações...</p>
                    </div>
                ) : (
                    <>
                        {/* Form */}
                        <div className="p-5 space-y-5">
                            {/* Período */}
                            <div className="bg-[#131418] border border-white/5 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-gold-500 mb-3">
                                    <CalendarDays size={18} />
                                    <span className="font-bold text-sm">Período de Pesca: Abril a Novembro (8 meses)</span>
                                </div>
                                <p className="text-zinc-400 text-xs">
                                    Janeiro, Fevereiro, Março e Dezembro são meses de defeso (sem pesca).
                                </p>
                            </div>

                            {/* Localidade e Petrecho */}
                            <div className="flex gap-3">
                                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
                                    <MapPin className="text-emerald-500" size={20} />
                                    <div>
                                        <p className="text-xs text-zinc-400">Localidade Pesqueira</p>
                                        <p className="text-white font-bold">{clientLocation || 'Não definida'}</p>
                                    </div>
                                </div>
                                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 flex items-center gap-3">
                                    <span className="text-xl">🎣</span>
                                    <div>
                                        <p className="text-xs text-zinc-400">Petrecho (sortido)</p>
                                        <p className="text-white font-bold">{petrecho}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Dados Mensais */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-zinc-400 text-sm font-medium mb-2 block">
                                        Dias trabalhados/mês
                                    </label>
                                    <input
                                        type="number"
                                        value={diasPorMes}
                                        onChange={(e) => setDiasPorMes(Number(e.target.value))}
                                        min={1}
                                        max={30}
                                        className="w-full bg-[#131418] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-zinc-400 text-sm font-medium mb-2 block">
                                        Kg de peixe/mês
                                    </label>
                                    <input
                                        type="number"
                                        value={kgPorMes}
                                        onChange={(e) => setKgPorMes(Number(e.target.value))}
                                        min={1}
                                        className="w-full bg-[#131418] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-zinc-400 text-sm font-medium mb-2 block">
                                        Preço médio (R$/kg)
                                    </label>
                                    <input
                                        type="text"
                                        value={precoMedio}
                                        onChange={(e) => setPrecoMedio(e.target.value)}
                                        placeholder="8,00"
                                        className="w-full bg-[#131418] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-zinc-400 text-sm font-medium mb-2 block">
                                        Espécies por mês
                                    </label>
                                    <input
                                        type="number"
                                        value={especiesPorMes}
                                        onChange={(e) => setEspeciesPorMes(Math.max(1, Number(e.target.value)))}
                                        min={1}
                                        max={5}
                                        className="w-full bg-[#131418] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-gold-500 focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Peixes */}
                            <div>
                                <label className="text-zinc-400 text-sm font-medium mb-2 flex items-center gap-2">
                                    <Fish size={16} className="text-gold-500" />
                                    Espécies de Peixes (máximo {maxPeixesSelecionaveis})
                                </label>
                                <p className="text-zinc-500 text-xs mb-2">
                                    Serão distribuídas pelos 8 meses • {especiesPorMes} espécie(s) por mês
                                </p>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-[#131418] border border-white/5 rounded-lg custom-scrollbar">
                                    {peixes.map((peixe, i) => (
                                        <button
                                            key={i}
                                            onClick={() => togglePeixe(peixe)}
                                            disabled={!selectedPeixes.includes(peixe) && selectedPeixes.length >= maxPeixesSelecionaveis}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedPeixes.includes(peixe)
                                                ? 'bg-gold-500 text-navy-900'
                                                : selectedPeixes.length >= maxPeixesSelecionaveis
                                                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                }`}
                                        >
                                            {peixe}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-slate-500 text-xs mt-1">
                                    Selecionados: <span className={selectedPeixes.length >= 1 ? 'text-gold-500' : 'text-red-500'}>{selectedPeixes.length}</span>/{maxPeixesSelecionaveis}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 border-t border-white/5 flex justify-end gap-3 bg-[#131418]">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-lg transition-colors border border-white/5"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={selectedPeixes.length === 0}
                                className="px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-navy-900 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                Iniciar REAP
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ReapConfigModal;
