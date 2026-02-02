
import React, { useState } from 'react';
import { Sparkles, FileText, Upload, Scale, Copy, ArrowRight, Wand2, Loader2, Eraser } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const AiSummary: React.FC = () => {
  const { showToast } = useApp();
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState('');

  const handleAnalyze = () => {
      if (!inputText.trim()) {
          showToast('error', 'Por favor, insira o texto da decisão ou sentença.');
          return;
      }

      setIsAnalyzing(true);
      // Simulação de delay da IA
      setTimeout(() => {
          setIsAnalyzing(false);
          setResult(`
### ⚖️ Análise Jurídica Preliminar

**Resumo do Caso:**
O documento apresenta uma decisão interlocutória referente a um pedido de antecipação de tutela em ação previdenciária. O autor pleiteia o restabelecimento de auxílio-doença.

**Pontos Chave:**
*   **Juízo:** Deferiu parcialmente o pedido.
*   **Fundamentação:** O magistrado reconheceu a presença dos requisitos do art. 300 do CPC (probabilidade do direito e perigo de dano), baseando-se no laudo pericial anexado que comprova a incapacidade temporária.
*   **Determinação:** O INSS deve restabelecer o benefício no prazo de 15 dias, sob pena de multa diária.

**Sugestão de Próximos Passos:**
1.  Acompanhar o cumprimento da liminar pelo INSS.
2.  Preparar petição de cumprimento de obrigação de fazer caso o prazo expire.
3.  Informar o cliente imediatamente sobre a decisão favorável.

*Nota: Esta é uma análise gerada por IA. Valide sempre com o documento original.*
          `);
          showToast('success', 'Análise concluída com sucesso!');
      }, 2000);
  };

  const handleCopyResult = () => {
      if (!result) return;
      navigator.clipboard.writeText(result);
      showToast('success', 'Análise copiada para a área de transferência.');
  };

  const handleClear = () => {
      setInputText('');
      setResult('');
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <header className="mb-6 flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
                <Sparkles className="text-gold-500" /> Resumo de Processo com IA
            </h2>
            <p className="text-slate-400">Cole sentenças, decisões ou peças para obter um resumo analítico instantâneo.</p>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          
          {/* COLUNA ESQUERDA: ENTRADA */}
          <div className="flex flex-col bg-navy-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden h-full">
              <div className="p-4 border-b border-slate-800 bg-navy-950/50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" /> Documento Original
                  </h3>
                  <div className="flex gap-2">
                      <button 
                        onClick={handleClear}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors" 
                        title="Limpar"
                      >
                          <Eraser size={16} />
                      </button>
                      <button className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2 transition-all">
                          <Upload size={12} /> Upload PDF/TXT
                      </button>
                  </div>
              </div>
              
              <div className="flex-1 p-4 relative">
                  <textarea 
                      className="w-full h-full bg-transparent text-slate-300 text-sm outline-none resize-none placeholder:text-slate-600 font-mono leading-relaxed custom-scrollbar"
                      placeholder="Cole o texto da decisão, sentença ou despacho aqui..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                  />
                  
                  {/* Floating Action Button mobile or simple overlay */}
                  <div className="absolute bottom-4 right-4 lg:hidden">
                      <button 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing || !inputText}
                        className="bg-gold-600 text-white p-3 rounded-full shadow-lg disabled:opacity-50"
                      >
                          {isAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <Wand2 size={24} />}
                      </button>
                  </div>
              </div>

              {/* Desktop Action Area */}
              <div className="p-4 border-t border-slate-800 bg-navy-950/30 hidden lg:flex justify-end">
                  <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !inputText}
                      className="bg-gold-600 hover:bg-gold-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-gold-600/10 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                      {isAnalyzing ? 'Analisando...' : 'Analisar Juridicamente'}
                  </button>
              </div>
          </div>

          {/* COLUNA DIREITA: SAÍDA */}
          <div className="flex flex-col bg-navy-950 border border-slate-800 rounded-xl shadow-lg overflow-hidden h-full relative">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none">
                  <Scale size={300} />
              </div>

              <div className="p-4 border-b border-slate-800 bg-navy-900/50 flex justify-between items-center z-10">
                  <h3 className="text-sm font-bold text-gold-500 flex items-center gap-2">
                      <Sparkles size={16} /> Análise Jurídica
                  </h3>
                  {result && (
                      <button 
                        onClick={handleCopyResult}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 hover:bg-slate-800 px-2 py-1 rounded transition-colors"
                      >
                          <Copy size={12} /> Copiar
                      </button>
                  )}
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar z-10">
                  {result ? (
                      <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {result}
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-60">
                          {isAnalyzing ? (
                              <>
                                  <Loader2 size={40} className="animate-spin text-gold-500" />
                                  <p className="animate-pulse">Processando documento...</p>
                              </>
                          ) : (
                              <>
                                  <Scale size={48} />
                                  <p className="text-sm text-center max-w-xs">
                                      A análise da IA aparecerá aqui após você inserir o documento e clicar em analisar.
                                  </p>
                              </>
                          )}
                      </div>
                  )}
              </div>
          </div>

      </div>
    </div>
  );
};

export default AiSummary;
