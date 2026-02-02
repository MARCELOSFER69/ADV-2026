import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, MessageSquare, Loader2, ChevronRight, BarChart3, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export const AssistantSidebar: React.FC = () => {
    const { currentView, user, isAssistantOpen: isOpen, setIsAssistantOpen: setIsOpen, mergedPreferences, saveUserPreferences } = useApp();
    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: `Olá ${user?.name || 'Advogado'}! Sou a Clara, sua assistente. Como posso te ajudar a gerir o escritório hoje?`,
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const triggerPosition = mergedPreferences.assistantTriggerPosition || 'floating';

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:3001/api/ai-copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    context: {
                        current_view: currentView,
                        user_name: user?.name
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Servidor retornou erro');
            }

            const data = await response.json();

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: data.response || 'Desculpe, tive um problema ao processar sua solicitação.',
                sender: 'ai',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Erro ao falar com a Clara:', error);
            const aiErrorMsg: Message = {
                id: Date.now().toString(),
                text: '⚠️ Desculpe, não consegui conectar ao meu servidor central. Verifique se o módulo "SISTEMA" no terminal está rodando corretamente.',
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiErrorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePosition = async () => {
        const newPos = triggerPosition === 'floating' ? 'sidebar' : 'floating';
        await saveUserPreferences({ assistantTriggerPosition: newPos });
        setShowSettings(false);
    };

    return (
        <>
            {/* Botão Flutuante - Só aparece se a posição for 'floating' */}
            <AnimatePresence>
                {triggerPosition === 'floating' && !isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl bg-gold-600 hover:bg-gold-500"
                    >
                        <div className="relative">
                            <Bot className="text-white" size={24} />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </span>
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Sidebar do Assistente */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        />

                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-[#131418] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-[70] flex flex-col"
                        >
                            {/* Header Premium */}
                            <div className="p-6 border-b border-white/5 bg-[#131418] flex items-center justify-between relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
                                        <Bot size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white font-serif tracking-tight flex items-center gap-2">
                                            Clara Copilot <Sparkles size={14} className="text-gold-500" />
                                        </h2>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                            <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Online & Conectada</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 relative z-10">
                                    <button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-gold-500/10 text-gold-500' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                        title="Configurações"
                                    >
                                        <ChevronRight size={18} className={`transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Menu de Configuração Rápida */}
                            <AnimatePresence>
                                {showSettings && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-[#0f1014]/50 border-b border-white/5"
                                    >
                                        <div className="p-4 space-y-3">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Posição do Lançador</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={togglePosition}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${triggerPosition === 'floating' ? 'bg-gold-600 shadow-lg shadow-gold-600/20 text-black' : 'bg-[#18181b] border border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
                                                >
                                                    Botão Flutuante
                                                </button>
                                                <button
                                                    onClick={togglePosition}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${triggerPosition === 'sidebar' ? 'bg-gold-600 shadow-lg shadow-gold-600/20 text-black' : 'bg-[#18181b] border border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
                                                >
                                                    Na Sidebar
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Alertas Rápidos Contextuais */}
                            <div className="px-6 py-4 bg-[#131418]/50 border-b border-white/5 overflow-x-auto custom-scrollbar">
                                <div className="flex gap-2">
                                    <button onClick={() => setInput('Como está meu faturamento este mês?')} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#18181b] border border-white/5 hover:border-gold-500/30 hover:bg-gold-500/5 transition-all text-xs font-medium text-slate-400 hover:text-gold-500 shrink-0 group">
                                        <div className="p-1 rounded-md bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-500 transition-colors">
                                            <BarChart3 size={12} />
                                        </div>
                                        Faturamento
                                    </button>
                                    <button onClick={() => setInput('Quais os prazos fatais da semana?')} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#18181b] border border-white/5 hover:border-gold-500/30 hover:bg-gold-500/5 transition-all text-xs font-medium text-slate-400 hover:text-gold-500 shrink-0 group">
                                        <div className="p-1 rounded-md bg-red-500/10 group-hover:bg-red-500/20 text-red-500 transition-colors">
                                            <Clock size={12} />
                                        </div>
                                        Prazos
                                    </button>
                                </div>
                            </div>

                            {/* Mensagens */}
                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth bg-[#131418]"
                            >
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg ${msg.sender === 'user'
                                            ? 'bg-gradient-to-br from-gold-500 to-gold-600 text-black font-medium rounded-tr-none'
                                            : 'bg-[#18181b] border border-white/10 text-slate-300 rounded-tl-none'
                                            }`}>
                                            <div className="prose prose-sm prose-invert max-w-none">
                                                {msg.text.split('\n').map((line, i) => (
                                                    <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                                                ))}
                                            </div>
                                            <span className={`text-[10px] mt-2 block font-medium ${msg.sender === 'user' ? 'text-black/60' : 'text-slate-500'}`}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex justify-start"
                                    >
                                        <div className="bg-[#18181b] border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-3 shadow-lg">
                                            <div className="p-1.5 bg-gold-500/10 rounded-lg">
                                                <Loader2 size={14} className="animate-spin text-gold-500" />
                                            </div>
                                            <span className="text-xs font-medium text-slate-400">Clara está digitando...</span>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-6 border-t border-white/5 bg-[#131418]">
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-gold-500/20 to-gold-600/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Pergunte qualquer coisa sobre o escritório..."
                                        className="relative w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-4 pr-14 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold-500/50 transition-all resize-none max-h-32 min-h-[56px] custom-scrollbar"
                                        rows={1}
                                        style={{ minHeight: '56px' }}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!input.trim() || isLoading}
                                        className="absolute right-2 bottom-2 p-2.5 rounded-lg bg-gold-600 hover:bg-gold-500 text-black disabled:opacity-50 disabled:grayscale transition-all shadow-lg hover:shadow-gold-500/20 active:scale-95 z-10"
                                    >
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-600 text-center mt-4 flex items-center justify-center gap-1.5 font-medium tracking-wide uppercase opacity-70">
                                    <Bot size={12} className="text-gold-500/50" /> Desenvolvido com IA Gemini
                                </p>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
