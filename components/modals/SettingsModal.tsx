import React from 'react';
import { X, Settings, Zap, Monitor, Cpu } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { isLowPerformance, togglePerformanceMode } = useAppContext();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1a1d] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-500/20 rounded-lg">
              <Settings size={20} className="text-gold-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Configurações</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Seção: Desempenho */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gold-500 uppercase tracking-wider">
              <Zap size={16} />
              Desempenho
            </div>

            <div className="bg-[#18181b] border border-white/5 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu size={18} className="text-blue-400" />
                    <span className="font-semibold text-white">Modo de Baixo Desempenho</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Ative esta opção para desativar animações pesadas e efeitos visuais,
                    melhorando a velocidade em computadores antigos.
                  </p>

                  {/* Indicador de detecção */}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <Monitor size={14} className="text-slate-500" />
                    <span className="text-slate-500">
                      {isLowPerformance
                        ? 'Animações desativadas para melhor performance'
                        : 'Animações e efeitos visuais ativos'}
                    </span>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={togglePerformanceMode}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${isLowPerformance
                    ? 'bg-gold-500'
                    : 'bg-slate-600'
                    }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${isLowPerformance
                      ? 'translate-x-6'
                      : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Informações do Sistema (Opcional) */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Monitor size={18} className="text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-400 mb-1">Dica</h4>
                <p className="text-sm text-slate-400">
                  O sistema detecta automaticamente se seu computador precisa do modo de baixo desempenho.
                  Você pode alternar manualmente a qualquer momento.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;