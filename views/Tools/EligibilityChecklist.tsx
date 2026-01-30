
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckSquare, Info, AlertTriangle, CheckCircle2, XCircle, Copy, ClipboardList, HelpCircle } from 'lucide-react';

type BenefitType = 'rural' | 'bpc' | 'maternity';

interface ChecklistItem {
  id: string;
  question: string;
  required: boolean;
  tip: string;
}

const SCENARIOS: Record<BenefitType, { label: string; items: ChecklistItem[] }> = {
  rural: {
    label: 'Aposentadoria Rural',
    items: [
      { id: 'age', question: 'Idade mínima atingida (55 M / 60 H)?', required: true, tip: 'Mulher: 55 anos. Homem: 60 anos.' },
      { id: 'proof', question: 'Possui início de prova material?', required: true, tip: 'Ex: Certidão de casamento, Título de eleitor rural, Notas de produtor, Certidão de nascimento dos filhos em zona rural.' },
      { id: 'period', question: 'Carência de 180 meses (15 anos)?', required: true, tip: 'Deve comprovar atividade rural por 15 anos, mesmo que descontínuos, anteriores ao requerimento.' },
      { id: 'quality', question: 'Qualidade de segurado especial?', required: true, tip: 'Não pode ter vínculo urbano ativo predominante ou renda incompatível com a subsistência.' },
      { id: 'autodecl', question: 'Autodeclaração Rural preenchida?', required: false, tip: 'Documento obrigatório desde 2019. Validar se o cliente sabe os períodos exatos.' }
    ]
  },
  bpc: {
    label: 'BPC / LOAS',
    items: [
      { id: 'income', question: 'Renda per capita familiar < 1/4 salário?', required: true, tip: 'Dica: Descontar gastos com medicamentos, fraldas e alimentação especial (via Ação Civil Pública/Jurisprudência).' },
      { id: 'cadunico', question: 'CadÚnico atualizado há menos de 2 anos?', required: true, tip: 'Se não estiver, encaminhar ao CRAS antes de protocolar.' },
      { id: 'disability', question: 'Deficiência de longo prazo (> 2 anos)?', required: true, tip: '(Apenas para BPC Deficiente). Laudos devem indicar impedimento de longo prazo.' },
      { id: 'group', question: 'Grupo familiar reside na mesma casa?', required: true, tip: 'Atenção para quem mora no mesmo teto. Pessoas que não contribuem ou são de outro núcleo não entram no cálculo.' },
      { id: 'cpf', question: 'Todos da casa possuem CPF?', required: true, tip: 'Exigência administrativa do INSS.' }
    ]
  },
  maternity: {
    label: 'Salário Maternidade',
    items: [
      { id: 'birth', question: 'Parto ou Adoção ocorreu?', required: true, tip: 'Certidão de nascimento ou termo de guarda judicial.' },
      { id: 'quality', question: 'Qualidade de segurada na data do parto?', required: true, tip: 'Se desempregada, verificar Período de Graça (12 a 36 meses). Se rural, provar atividade anterior ao parto.' },
      { id: 'carencia', question: 'Carência de 10 meses cumprida?', required: true, tip: 'Exigido para Contribuinte Individual e Facultativo. Isento para Empregado, Doméstico e Avulso.' },
      { id: 'rural_act', question: 'Atividade rural nos 10 meses anteriores?', required: true, tip: '(Apenas Rural) Provar trabalho no campo imediatamente antes do parto.' }
    ]
  }
};

const EligibilityChecklist: React.FC = () => {
  const { showToast } = useApp();
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitType>('rural');
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  // Reset answers when switching benefit
  const handleBenefitChange = (type: BenefitType) => {
    setSelectedBenefit(type);
    setAnswers({});
  };

  const toggleAnswer = (id: string) => {
    setAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const status = useMemo(() => {
    const currentScenario = SCENARIOS[selectedBenefit];
    const requiredItems = currentScenario.items.filter(i => i.required);
    const optionalItems = currentScenario.items.filter(i => !i.required);

    // Check Required
    const missingRequired = requiredItems.filter(i => !answers[i.id]);
    
    if (missingRequired.length > 0) {
        // If user hasn't answered yet, don't show "Ineligible" immediately unless they explicitly marked NO?
        // But here we toggle. False means No/Unchecked.
        // Let's assume unchecked is "No".
        
        // Wait, for a better UX, maybe we should distinguish "Unchecked" vs "No"? 
        // For this simple UI, Unchecked = No.
        return { label: 'Inelegível', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle, desc: 'Requisitos obrigatórios não preenchidos.' };
    }

    // If all required are checked
    const missingOptional = optionalItems.filter(i => !answers[i.id]);
    
    if (missingOptional.length > 0) {
        return { label: 'Atenção', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertTriangle, desc: 'Elegível, mas faltam requisitos secundários.' };
    }

    return { label: 'Elegível', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2, desc: 'Todos os requisitos preenchidos.' };

  }, [answers, selectedBenefit]);

  const handleCopyAnalysis = () => {
      const scenario = SCENARIOS[selectedBenefit];
      let text = `📋 *Análise de Elegibilidade: ${scenario.label}*\n\n`;
      
      text += `*Status:* ${status.label.toUpperCase()}\n\n`;
      
      scenario.items.forEach(item => {
          const ans = answers[item.id] ? '✅ Sim' : '❌ Não';
          text += `${ans} - ${item.question}\n`;
      });

      if (status.label === 'Inelegível') {
          text += `\n⚠️ *Pendências Obrigatórias:* Verificar requisitos marcados como 'Não'.`;
      }

      navigator.clipboard.writeText(text);
      showToast('success', 'Análise copiada para a área de transferência!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-white font-serif flex items-center gap-2">
            <CheckSquare className="text-gold-500" /> Checklist de Requisitos
        </h2>
        <p className="text-slate-400">Validação rápida de elegibilidade com dicas de documentação.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Benefit Selector Tabs */}
              <div className="bg-navy-900 border border-slate-800 p-1 rounded-xl flex overflow-x-auto">
                  {Object.entries(SCENARIOS).map(([key, data]) => (
                      <button
                        key={key}
                        onClick={() => handleBenefitChange(key as BenefitType)}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedBenefit === key ? 'bg-navy-800 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-navy-800/50'}`}
                      >
                          {data.label}
                      </button>
                  ))}
              </div>

              {/* Questions List */}
              <div className="bg-navy-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-navy-950/50 flex justify-between items-center">
                      <h3 className="font-bold text-white flex items-center gap-2">
                          <ClipboardList size={18} className="text-blue-400" /> Perguntas
                      </h3>
                      <span className="text-xs text-slate-500">Marque os requisitos cumpridos</span>
                  </div>
                  
                  <div className="divide-y divide-slate-800">
                      {SCENARIOS[selectedBenefit].items.map((item) => (
                          <div key={item.id} className={`p-4 flex items-start justify-between transition-colors hover:bg-navy-800/30 ${item.required && !answers[item.id] ? 'bg-red-500/5' : ''}`}>
                              <div className="flex-1 mr-4">
                                  <div className="flex items-center gap-2 mb-1">
                                      <p className={`text-sm font-medium ${item.required && !answers[item.id] ? 'text-red-300' : 'text-slate-200'}`}>
                                          {item.question}
                                          {item.required && <span className="text-red-500 ml-1" title="Obrigatório">*</span>}
                                      </p>
                                      
                                      {/* Tooltip */}
                                      <div className="relative group">
                                          <HelpCircle size={14} className="text-slate-500 cursor-help hover:text-gold-500 transition-colors" />
                                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-navy-950 border border-slate-700 text-slate-300 text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10">
                                              <strong className="block text-gold-500 mb-1">Dica de Prova:</strong>
                                              {item.tip}
                                              {/* Seta do Tooltip */}
                                              <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-navy-950 border-l border-b border-slate-700 transform rotate-45"></div>
                                          </div>
                                      </div>
                                  </div>
                                  <p className="text-xs text-slate-500 line-clamp-1">{item.tip}</p>
                              </div>

                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={!!answers[item.id]}
                                    onChange={() => toggleAnswer(item.id)}
                                  />
                                  <div className="w-11 h-6 bg-navy-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 border border-slate-700"></div>
                              </label>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* Sidebar Result */}
          <div className="lg:col-span-1">
              <div className={`sticky top-6 p-6 rounded-xl border ${status.bg} ${status.border} shadow-lg transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-full ${status.bg} ${status.color} border ${status.border} bg-opacity-50`}>
                          <status.icon size={32} />
                      </div>
                      <div>
                          <h3 className={`text-xl font-bold ${status.color}`}>{status.label}</h3>
                          <p className="text-xs text-slate-400 opacity-80">Resultado da Análise</p>
                      </div>
                  </div>
                  
                  <p className="text-sm text-slate-300 mb-6 leading-relaxed border-t border-dashed border-slate-700/50 pt-4">
                      {status.desc}
                  </p>

                  <div className="space-y-3">
                      <button 
                        onClick={handleCopyAnalysis}
                        className="w-full bg-navy-900 hover:bg-navy-800 text-white border border-slate-700 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                          <Copy size={18} /> Copiar Análise
                      </button>
                  </div>
                  
                  {status.label === 'Inelegível' && (
                      <div className="mt-6 bg-navy-950/50 p-3 rounded text-xs text-red-300 border border-red-500/10">
                          <p>Verifique se há documentos alternativos ou teses revisionais aplicáveis para reverter os requisitos não atendidos.</p>
                      </div>
                  )}
              </div>
          </div>

      </div>
    </div>
  );
};

export default EligibilityChecklist;
