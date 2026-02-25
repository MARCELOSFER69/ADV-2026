
import React, { useState } from 'react';
import { MessageCircle, X, Send, Copy } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  phone: string;
  caseTitle?: string;
}

const TEMPLATES = [
    {
        id: 'boas-vindas',
        label: '👋 Boas Vindas',
        text: 'Olá {NOME}, tudo bem? Aqui é do escritório Jayrton Noleto & Macedo. Confirmamos seu cadastro em nosso sistema. Qualquer dúvida, estamos à disposição!'
    },
    {
        id: 'andamento',
        label: '⚖️ Andamento Processual',
        text: 'Olá {NOME}. Gostaríamos de informar que houve uma atualização no seu processo de {PROCESSO}. Por favor, entre em contato para mais detalhes.'
    },
    {
        id: 'audiencia',
        label: '📅 Lembrete de Audiência',
        text: 'Olá {NOME}. Lembrando que sua audiência referente ao processo {PROCESSO} está marcada para breve. É muito importante sua presença.'
    },
    {
        id: 'cobranca',
        label: '💰 Honorários',
        text: 'Olá {NOME}, tudo bem? Estamos entrando em contato referente aos honorários do processo {PROCESSO}. Podemos agendar uma conversa?'
    },
    {
        id: 'documentos',
        label: '📄 Solicitação de Documentos',
        text: 'Olá {NOME}. Precisamos que nos envie alguns documentos pendentes para dar andamento ao seu processo de {PROCESSO}.'
    }
];

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, clientName, phone, caseTitle }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [customMessage, setCustomMessage] = useState('');

  if (!isOpen) return null;

  const getProcessedMessage = () => {
      let msg = selectedTemplate.text;
      msg = msg.replace(/{NOME}/g, clientName);
      msg = msg.replace(/{PROCESSO}/g, caseTitle || 'seu caso');
      return msg;
  };

  const handleSend = () => {
      const msg = customMessage || getProcessedMessage();
      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-navy-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle size={20} className="text-emerald-500" /> 
                Enviar Mensagem
            </h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="p-4 flex gap-4 h-[400px]">
            {/* Template List */}
            <div className="w-1/3 border-r border-slate-800 pr-4 space-y-2 overflow-y-auto custom-scrollbar">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Modelos</h4>
                {TEMPLATES.map(t => (
                    <button
                        key={t.id}
                        onClick={() => { setSelectedTemplate(t); setCustomMessage(''); }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${selectedTemplate.id === t.id && !customMessage ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Preview & Edit */}
            <div className="flex-1 flex flex-col">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Mensagem</h4>
                <textarea 
                    className="flex-1 bg-navy-950 border border-slate-700 rounded-lg p-3 text-sm text-white resize-none focus:border-emerald-500 outline-none"
                    value={customMessage || getProcessedMessage()}
                    onChange={e => setCustomMessage(e.target.value)}
                />
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-2 text-slate-400 hover:text-white text-sm">Cancelar</button>
                    <button 
                        onClick={handleSend}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                        <Send size={16} /> Enviar WhatsApp
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppModal;
