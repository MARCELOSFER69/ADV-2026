
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, AlertTriangle } from 'lucide-react';
import { DeclaracaoResidenciaTemplate } from '../documents/DeclaracaoResidenciaTemplate';
import { ProcuracaoTemplate } from '../documents/ProcuracaoTemplate';
import { Client } from '../../types';

interface PrintOverlayProps { 
  client: Client; 
  selectedDocs: { declaracao: boolean; procuracao: boolean }; 
  onClose: () => void; 
}

export const PrintOverlay: React.FC<PrintOverlayProps> = ({ client, selectedDocs, onClose }) => {

  // 1. Travar scroll do corpo da página ao montar
  useEffect(() => { 
    document.body.style.overflow = 'hidden'; 
    return () => { document.body.style.overflow = 'unset'; }; 
  }, []);

  // 2. Função de Impressão Direta com pequeno delay para renderização
  const triggerPrint = () => { 
    setTimeout(() => window.print(), 100); 
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] font-sans text-left">
      {/* --- CSS DE IMPRESSÃO --- */}
      <style>{`
        @media print {
          /* Esconde TUDO no body */
          body > * { display: none !important; }
          
          /* Exibe apenas o nosso container de impressão (que será movido para o body pelo Portal, mas precisamos garantir visibilidade) */
          /* Nota: Como estamos usando Portal, o React joga esta div no body. 
             Precisamos garantir que ELA e seus filhos sejam visíveis. */
          
          /* O truque: A div raiz deste componente não tem classe, mas o conteudo sim. */
          
          /* Regra específica para exibir o conteúdo da impressão */
          .print-root { 
            display: block !important; 
            position: absolute !important; 
            top: 0 !important; 
            left: 0 !important; 
            width: 100% !important; 
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            z-index: 99999999 !important;
          }

          .no-print { display: none !important; }
          
          @page { margin: 0; size: auto; }
          
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            text-shadow: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* --- CAMADA 1: FUNDO ESCURO (Clicar fora fecha) --- */}
      <div 
        className="fixed inset-0 bg-black/90 cursor-pointer no-print backdrop-blur-sm" 
        onClick={onClose} 
        style={{ zIndex: 40 }}
      ></div>

      {/* --- CAMADA 2: BARRA DE BOTÕES (FIXA E BLINDADA) --- */}
      {/* pointer-events-none no container permite clicar 'através' dele nas áreas vazias */}
      <div 
        className="fixed top-0 left-0 w-full h-24 flex items-center justify-end px-8 gap-4 no-print"
        style={{ zIndex: 9999999, pointerEvents: 'none' }} 
      >
          {/* pointer-events-auto nos botões restaura o clique */}
          <div className="flex gap-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-yellow-500/20 text-yellow-400 text-xs px-4 py-2 rounded-lg border border-yellow-500/30 flex items-center gap-2 backdrop-blur-md shadow-lg">
                  <AlertTriangle size={14} />
                  <span>Se sair P/B: Marque <strong>"Gráficos de plano de fundo"</strong></span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); triggerPrint(); }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg shadow-xl font-bold flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 border border-white/20 cursor-pointer"
              >
                <Printer size={20} /> IMPRIMIR
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg shadow-xl font-bold flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 border border-white/20 cursor-pointer"
              >
                <X size={20} /> FECHAR
              </button>
          </div>
      </div>

      {/* --- CAMADA 3: DOCUMENTO (PAPEL) --- */}
      <div 
        className="absolute inset-0 top-24 overflow-y-auto flex justify-center pb-20 print-root"
        style={{ zIndex: 50, pointerEvents: 'auto' }} // Permite scroll e seleção de texto
      >
          <div className="w-[210mm] min-h-[297mm] bg-white text-black shadow-2xl relative print:w-full print:shadow-none print:m-0">
              
              {selectedDocs.declaracao && (
                  <div className="print:break-after-page">
                      <DeclaracaoResidenciaTemplate client={client} />
                  </div>
              )}
              
              {/* Separador visual apenas na tela */}
              {selectedDocs.declaracao && selectedDocs.procuracao && (
                  <div className="h-2 bg-gray-200 w-full no-print border-y border-gray-400 my-0 flex items-center justify-center relative">
                      <span className="bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-widest absolute">Quebra de Página</span>
                  </div>
              )}

              {selectedDocs.procuracao && (
                  <div className="print:break-after-page">
                      <ProcuracaoTemplate client={client} />
                  </div>
              )}

              {!selectedDocs.declaracao && !selectedDocs.procuracao && (
                  <div className="flex flex-col items-center justify-center h-[297mm] text-gray-400 no-print">
                      <p>Nenhum documento selecionado para impressão.</p>
                  </div>
              )}
          </div>
      </div>
    </div>,
    document.body
  );
};
