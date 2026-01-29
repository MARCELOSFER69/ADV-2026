import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, User, CheckCircle2, Send, Search,
    MoreVertical, CheckCheck, UserCheck, Trash2, RotateCw,
    History
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import AttendanceHistoryModal from '../components/modals/AttendanceHistoryModal';

const WhatsApp: React.FC = () => {
    const {
        chats, chatMessages, fetchChatMessages, assumeChat,
        sendMessage, markChatAsRead, deleteChat, finishChat, user,
        setCurrentView, setClientToView
    } = useApp();

    const [activeTab, setActiveTab] = useState<'my' | 'waiting' | 'all' | 'finished'>('waiting');
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeChat = chats.find(c => c.id === selectedChatId);

    useEffect(() => {
        if (selectedChatId) {
            fetchChatMessages(selectedChatId);
            markChatAsRead(selectedChatId);
        }
    }, [selectedChatId, fetchChatMessages, markChatAsRead]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const filteredChats = chats.filter(chat => {
        const matchesSearch = chat.client_name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        // Se o chat está selecionado, ele SÓ deve aparecer se condizer com a aba atual
        // Isso evita que um chat "Ativo" apareça na aba "Fila" só porque está selecionado.
        const isMyChat = chat.assigned_to_id === user?.id && chat.status === 'active';

        if (activeTab === 'waiting') return chat.status === 'waiting';
        if (activeTab === 'my') return isMyChat;
        if (activeTab === 'finished') return chat.status === 'finished';
        return true;
    });

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChatId || !messageText.trim()) return;
        sendMessage(selectedChatId, messageText.trim());
        setMessageText('');
    };

    const isAssignedToMe = activeChat?.assigned_to_id === user?.id;

    const formatTime = (isoString: string) => {
        try {
            return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(isoString));
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="absolute inset-0 bg-[#09090b] text-zinc-300 flex overflow-hidden z-[5]">
            {/* Sidebar de Conversas */}
            <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/20">
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <MessageSquare className="text-emerald-500" size={24} />
                        Central WhatsApp
                    </h2>

                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar conversas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-emerald-500 outline-none transition-all"
                        />
                    </div>

                    <div className="flex gap-1 p-1 bg-zinc-950 rounded-lg overflow-x-auto no-scrollbar">
                        {[
                            { id: 'waiting', label: `Fila (${chats.filter(c => c.status === 'waiting').length})` },
                            { id: 'my', label: 'Meus' },
                            { id: 'finished', label: 'Atendidos' },
                            { id: 'all', label: 'Todos' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredChats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => setSelectedChatId(chat.id)}
                            className={`w-full p-4 flex items-start gap-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-all text-left relative group cursor-pointer overflow-hidden ${selectedChatId === chat.id ? 'bg-zinc-800/50' : ''}`}
                            role="button"
                            tabIndex={0}
                        >
                            {/* Destaque Refinado para Fila */}
                            {chat.status === 'waiting' && (
                                <>
                                    <div className="absolute inset-0 bg-emerald-500/5 pulse-subtle" />
                                    <div className="absolute inset-0 border-l-4 border-emerald-500 shadow-[inset_4px_0_10px_-4px_rgba(16,185,129,0.4)]" />
                                </>
                            )}

                            <div className="relative z-10 flex items-start gap-3 w-full">
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                                    <User size={20} className="text-zinc-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-zinc-100 text-sm truncate">{chat.client_name}</span>
                                        <span className="text-[10px] text-zinc-500">
                                            {chat.last_message_at ? formatTime(chat.last_message_at) : ''}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 truncate">{chat.last_message || 'Nenhuma mensagem'}</p>
                                    {chat.assigned_to && (
                                        <div className="mt-2 flex items-center gap-1">
                                            <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                                <UserCheck size={10} /> {chat.assigned_to}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {chat.unread_count > 0 && (
                                    <div className="absolute top-0 right-[-8px] min-w-[18px] h-[18px] bg-emerald-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold px-1 shadow-lg shadow-emerald-500/20">
                                        {chat.unread_count}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Janela de Chat */}
            <div className="flex-1 flex flex-col bg-[#0b0c10]">
                {!selectedChatId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                        <div className="p-6 rounded-full bg-zinc-900/50 mb-4 border border-zinc-800">
                            <MessageSquare size={48} className="text-zinc-700" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-400">Selecione uma conversa</h3>
                        <p className="text-sm mb-6">Inicie um atendimento clicando na lista ao lado.</p>

                        {/* Botão para criar chat de teste se a lista estiver vazia */}
                        {chats.length === 0 && (
                            <button
                                onClick={async () => {
                                    const { supabase } = await import('../services/supabaseClient');
                                    // Pega o primeiro cliente do banco para o teste
                                    const { data: clients } = await supabase.from('clients').select('id, nome_completo').limit(1);
                                    if (clients && clients.length > 0) {
                                        await supabase.from('chats').insert([{
                                            client_id: clients[0].id,
                                            client_name: clients[0].nome_completo,
                                            status: 'waiting',
                                            remote_jid: '5500000000000@s.whatsapp.net',
                                            last_message: 'Olá, sou um chat de teste!',
                                            last_message_at: new Date().toISOString(),
                                            unread_count: 1
                                        }]);
                                        // A lista deve atualizar via Realtime
                                    } else {
                                        alert('Cadastre pelo menos um cliente para criar um chat de teste.');
                                    }
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg transition-all"
                            >
                                Criar Chat de Teste
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Header do Chat */}
                        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/40">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                    <User size={18} className="text-emerald-500" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-zinc-100 hover:text-gold-500 cursor-pointer transition-colors"
                                        onClick={() => {
                                            if (activeChat?.client_id) {
                                                setClientToView(activeChat.client_id, 'info');
                                                setCurrentView('clients');
                                            }
                                        }}
                                    >
                                        {activeChat?.client_name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${activeChat?.status === 'waiting' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${activeChat?.status === 'waiting' ? 'text-emerald-500' : 'text-blue-500'}`}>
                                                {activeChat?.status === 'waiting' ? 'Aguardando Atendimento' : `Em atendimento com ${activeChat?.assigned_to}`}
                                            </span>
                                        </div>
                                        {activeChat?.client_id && (
                                            <button
                                                onClick={() => setIsHistoryModalOpen(true)}
                                                className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-gold-500 bg-zinc-800/50 px-1.5 py-0.5 rounded transition-colors"
                                                title="Ver histórico de quem atendeu este cliente"
                                            >
                                                <History size={10} /> Ver Histórico
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {activeChat?.status === 'active' && isAssignedToMe && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Deseja encerrar este atendimento?')) {
                                                finishChat(selectedChatId!);
                                            }
                                        }}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-zinc-700 transition-all flex items-center gap-2"
                                    >
                                        <CheckCircle2 size={14} className="text-emerald-500" /> Encerrar Atendimento
                                    </button>
                                )}
                                {activeChat?.status === 'waiting' && (
                                    <button
                                        onClick={() => assumeChat(selectedChatId!)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                                    >
                                        <CheckCircle2 size={14} /> Assumir Atendimento
                                    </button>
                                )}
                                <button
                                    onClick={() => fetchChatMessages(selectedChatId!)}
                                    className="text-zinc-500 hover:text-white p-2"
                                    title="Recarregar mensagens"
                                >
                                    <Send size={16} className="rotate-90" />
                                </button>

                                <button
                                    onClick={async () => {
                                        if (!selectedChatId) return;
                                        await deleteChat(selectedChatId);
                                        setSelectedChatId(null);
                                    }}
                                    className="text-zinc-500 hover:text-red-500 p-2 transition-colors"
                                    title="Apagar conversa permanentemente"
                                >
                                    <Trash2 size={20} />
                                </button>

                                <button className="text-zinc-500 hover:text-white p-2">
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-950/20 scroll-smooth">
                            {chatMessages
                                .filter(m => {
                                    if (!selectedChatId) return false;
                                    // Compara os IDs de forma "bruta" (string) para evitar erros de tipo
                                    return String(m.chat_id).toLowerCase() === String(selectedChatId).toLowerCase();
                                })
                                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                .map((msg, idx) => {
                                    if (msg.sender_type === 'system') {
                                        return (
                                            <div key={msg.id || idx} className="flex justify-center my-4">
                                                <div className="bg-zinc-900/50 border border-zinc-800 px-4 py-1.5 rounded-full">
                                                    <p className="text-[11px] text-zinc-500 italic font-medium flex items-center gap-2">
                                                        <RotateCw size={10} className="animate-spin-slow" /> {msg.content}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const senderType = String(msg.sender_type).trim().toLowerCase();
                                    const isMe = senderType === 'user';
                                    return (
                                        <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[70%] p-3 rounded-2xl shadow-lg ${isMe
                                                ? 'bg-emerald-600 text-white rounded-tr-none'
                                                : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none'
                                                }`}>
                                                {msg.content}
                                            </div>
                                            <div className="flex items-center gap-1 mt-1 px-1">
                                                <span className="text-[10px] text-zinc-600 font-medium">
                                                    {formatTime(msg.timestamp)}
                                                </span>
                                                {isMe && <CheckCheck size={12} className={msg.read ? 'text-emerald-500' : 'text-zinc-600'} />}
                                            </div>
                                        </div>
                                    );
                                })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input de Mensagem */}
                        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-5xl mx-auto bg-zinc-950 border border-zinc-800 rounded-xl p-2 focus-within:border-emerald-500/50 transition-all group">
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder={isAssignedToMe ? "Digite sua mensagem..." : "Você precisa assumir o atendimento para responder..."}
                                    disabled={!isAssignedToMe}
                                    className="flex-1 bg-transparent border-none outline-none px-4 text-sm text-zinc-300 disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={!isAssignedToMe || !messageText.trim()}
                                    className="p-2 bg-zinc-800 rounded-lg text-zinc-600 group-focus-within:bg-emerald-600 group-focus-within:text-white transition-all disabled:opacity-50"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de Histórico */}
            {activeChat && (
                <AttendanceHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    clientId={activeChat.client_id || ''}
                    clientName={activeChat.client_name}
                />
            )}
        </div >
    );
};

export default WhatsApp;
