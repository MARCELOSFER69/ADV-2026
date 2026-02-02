import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PersonalCredential } from '../types';
import {
  User, Globe, Eye, EyeOff, Copy, Trash2, Plus,
  Search, Shield, FileText, ExternalLink, KeyRound, X,
  Terminal, RefreshCw, Square, Activity, Cpu, ShieldCheck
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export function Personal() {
  const { personalCredentials, addPersonalCredential, deletePersonalCredential, showToast } = useApp();

  // Tabs internas
  const [activeTab, setActiveTab] = useState<'credentials' | 'bot'>('credentials');

  // Estado do Modal/Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<PersonalCredential>>({
    nome_pessoa: '',
    site_nome: '',
    site_url: '',
    cpf_login: '',
    senha: '',
    observacao: ''
  });

  // --- BOT MANAGEMENT STATE ---
  const [botStatus, setBotStatus] = useState<{ status: string, last_heartbeat: string, machine: string } | null>(null);
  const [botLogs, setBotLogs] = useState<string>('');
  const [isBotOnline, setIsBotOnline] = useState(false);
  const [isHeadless, setIsHeadless] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Ref para auto-scroll dos logs
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'bot' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [botLogs, activeTab]);

  // --- NEW TERMINAL STATE ---
  const [terminalLines, setTerminalLines] = useState<{ type: string, message: string, timestamp: string }[]>([]);
  const [terminalInput, setTerminalInput] = useState('');

  useEffect(() => {
    // 1. Carregar Status Inicial
    const fetchStatus = async () => {
      try {
        const { data } = await supabase.from('system_settings').select('value').eq('key', 'clara_bot_control').single();
        if (data?.value) {
          setBotStatus(data.value);
          checkOnline(data.value.last_heartbeat);
          if (data.value.config?.headless !== undefined) {
            setIsHeadless(data.value.config.headless);
          }
        }
        const { data: logData } = await supabase.from('system_settings').select('value').eq('key', 'clara_bot_logs').single();
        if (logData?.value) setBotLogs(logData.value.content || '');
      } catch (e) {
        console.error("Erro ao buscar status do bot:", e);
      }
    };

    const checkOnline = (heartbeat: string | undefined) => {
      if (!heartbeat) {
        setIsBotOnline(false);
        return;
      }
      const last = new Date(heartbeat).getTime();
      const now = new Date().getTime();
      setIsBotOnline(now - last < 65000); // 1 minuto de tolerância
    };

    fetchStatus();

    // Intervalo para revalidar status offline (caso pare de chegar heartbeats)
    const interval = setInterval(() => {
      setBotStatus(prev => {
        if (prev) checkOnline(prev.last_heartbeat);
        return prev;
      });
    }, 5000);

    // 2. Escutar Mudanças em Tempo Real (Status e Controle)
    const channelSettings = supabase.channel('bot-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, payload => {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 2000);

        const newData = (payload.new as any);
        if (newData.key === 'clara_bot_control') {
          setBotStatus(newData.value);
          checkOnline(newData.value.last_heartbeat);
          if (newData.value.config?.headless !== undefined) {
            setIsHeadless(newData.value.config.headless);
          }
        } else if (newData.key === 'clara_bot_logs') {
          setBotLogs(newData.value.content || '');
        }
      })
      .subscribe();

    // 3. NOVO: Canal de Terminal Real-Time (Logs e Comandos)
    const channelTerminal = supabase.channel('bot_terminal')
      .on('broadcast', { event: 'log' }, (payload) => {
        const log = payload.payload;
        setTerminalLines(prev => [...prev, log]);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      channelSettings.unsubscribe();
      channelTerminal.unsubscribe();
    };
  }, []);

  const sendBotCommand = async (command: 'restart' | 'stop') => {
    try {
      showToast('success', `Enviando comando: ${command}...`);
      await supabase.from('system_settings').update({
        value: { ...botStatus, command, command_at: new Date().toISOString() }
      }).eq('key', 'clara_bot_control');

      // Limpar comando após 5s para não ficar em loop
      setTimeout(async () => {
        const { data: current } = await supabase.from('system_settings').select('value').eq('key', 'clara_bot_control').single();
        await supabase.from('system_settings').update({
          value: { ...(current?.value || {}), command: 'none' }
        }).eq('key', 'clara_bot_control');
      }, 5000);
    } catch (e) {
      showToast('error', 'Erro ao enviar comando');
    }
  };

  const toggleHeadless = async () => {
    try {
      const newValue = !isHeadless;
      setIsHeadless(newValue);
      showToast('success', `Modo Oculto ${newValue ? 'Ativado' : 'Desativado'}`);

      // Atualiza no banco
      const { data: current } = await supabase.from('system_settings').select('value').eq('key', 'clara_bot_control').single();
      const updatedValue = {
        ...(current?.value || {}),
        config: {
          ...(current?.value?.config || {}),
          headless: newValue
        }
      };

      await supabase.from('system_settings').update({
        value: updatedValue
      }).eq('key', 'clara_bot_control');
    } catch (e) {
      showToast('error', 'Erro ao alterar configuração');
    }
  };

  // --- FUNÇÃO DE MÁSCARA CPF ---
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '') // Remove tudo o que não é dígito
      .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto entre o terceiro e o quarto dígitos
      .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto entre o sexto e o sétimo dígitos
      .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca hífen entre o nono e o décimo dígitos
      .replace(/(-\d{2})\d+?$/, '$1'); // Impede digitar mais caracteres
  };

  const handleSave = async () => {
    if (!formData.nome_pessoa || !formData.senha || !formData.site_nome) {
      showToast('error', 'Preencha os campos obrigatórios (*)');
      return;
    }

    const newCred: PersonalCredential = {
      id: crypto.randomUUID(),
      nome_pessoa: formData.nome_pessoa,
      site_nome: formData.site_nome,
      site_url: formData.site_url || '',
      cpf_login: formData.cpf_login || '',
      senha: formData.senha,
      observacao: formData.observacao || ''
    };

    await addPersonalCredential(newCred);
    setIsModalOpen(false);
    setFormData({ nome_pessoa: '', site_nome: '', site_url: '', cpf_login: '', senha: '', observacao: '' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', 'Copiado!');
  };

  const filteredCredentials = personalCredentials.filter(c =>
    c.nome_pessoa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.site_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-6 animate-in fade-in duration-500 pr-2">

      {/* Header Standardized with Robots Style */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
            <User size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
              Área Pessoal
            </h1>
            <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
              Gerencie suas informações privadas e acessos de forma segura.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Internas */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'credentials' ? 'border-gold-500 text-gold-500' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Shield size={16} /> Credenciais Pessoais
        </button>
        <button
          onClick={() => setActiveTab('bot')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'bot' ? 'border-gold-500 text-gold-500' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Terminal size={16} /> Gerenciamento do Robô
        </button>
      </div>

      {activeTab === 'credentials' && (
        <div className="space-y-6">

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 bg-[#0f1014] p-4 rounded-xl border border-white/10 shadow-lg">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou site..."
                className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-11 pr-10 py-3 text-white outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all placeholder:text-slate-600"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  title="Limpar busca"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gold-600 hover:bg-gold-500 text-black px-6 py-3 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-all shadow-lg shadow-gold-600/20 active:scale-95"
            >
              <Plus size={18} /> Nova Credencial
            </button>
          </div>

          {/* Grid de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCredentials.map(cred => (
              <div key={cred.id} className="bg-[#0f1014] border border-white/5 rounded-xl p-6 hover:border-purple-500/30 transition-all group shadow-xl hover:shadow-2xl hover:shadow-purple-900/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 bg-purple-500/5 rounded-full blur-2xl -mr-4 -mt-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                {/* Card Header */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#18181b] rounded-xl text-purple-500 border border-white/5 group-hover:border-purple-500/20 transition-colors shadow-inner">
                      <Globe size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-lg tracking-tight group-hover:text-purple-400 transition-colors">{cred.site_nome}</h3>
                      {cred.site_url && (
                        <a href={cred.site_url.startsWith('http') ? cred.site_url : `https://${cred.site_url}`} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all flex items-center gap-1 w-fit mt-1 uppercase font-bold tracking-wider">
                          Acessar <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deletePersonalCredential(cred.id)} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Card Body */}
                <div className="space-y-3 relative z-10">
                  {/* Pessoa */}
                  <div className="bg-[#18181b] p-3 rounded-xl border border-white/5 flex justify-between items-center group/field hover:border-white/10 transition-colors">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1.5"><User size={12} /> Pessoa</span>
                    <span className="text-sm font-medium text-slate-200">{cred.nome_pessoa}</span>
                  </div>

                  {/* Login/CPF */}
                  {cred.cpf_login && (
                    <div className="bg-[#18181b] p-3 rounded-xl border border-white/5 flex justify-between items-center group/field hover:border-white/10 transition-colors">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1.5"><Shield size={12} /> Login/CPF</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-slate-200 tracking-tight">{cred.cpf_login}</span>
                        <button onClick={() => copyToClipboard(cred.cpf_login)} className="text-slate-500 hover:text-white transition-colors opacity-0 group-hover/field:opacity-100"><Copy size={14} /></button>
                      </div>
                    </div>
                  )}

                  {/* Senha */}
                  <div className="bg-[#18181b] p-3 rounded-xl border border-white/5 flex justify-between items-center group/field hover:border-white/10 transition-colors">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1.5"><KeyRound size={12} /> Senha</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-slate-200 tracking-tight">
                        {showPassword[cred.id] ? cred.senha : '••••••••'}
                      </span>
                      <button onClick={() => setShowPassword(prev => ({ ...prev, [cred.id]: !prev[cred.id] }))} className="text-slate-500 hover:text-purple-400 transition-colors">
                        {showPassword[cred.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => copyToClipboard(cred.senha)} className="text-slate-500 hover:text-white transition-colors opacity-0 group-hover/field:opacity-100"><Copy size={14} /></button>
                    </div>
                  </div>

                  {/* Obs */}
                  {cred.observacao && (
                    <div className="mt-3 text-xs text-slate-500 italic border-t border-white/5 pt-3 flex gap-2">
                      <FileText size={14} className="shrink-0 mt-0.5 text-purple-500/50" /> {cred.observacao}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredCredentials.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
                Nenhuma credencial encontrada.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bot' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Status Card */}
            <div className="md:col-span-4 space-y-4">
              <div className="bg-[#0f1014] border border-white/10 rounded-xl p-6 shadow-2xl group relative transition-all duration-300 hover:border-purple-500/30 overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                    <Activity size={20} className="text-purple-500" /> Status do Robô
                  </h3>
                  <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-2 ${isBotOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                    <span className={`w-2 h-2 rounded-full ${isBotOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
                    {isBotOnline ? 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center text-sm p-3 bg-[#18181b] rounded-xl border border-white/5">
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Máquina</span>
                    <span className="text-white font-mono">{botStatus?.machine || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-3 bg-[#18181b] rounded-xl border border-white/5">
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Último Sinal</span>
                    <span className="text-emerald-400 font-mono text-xs">{botStatus?.last_heartbeat ? new Date(botStatus.last_heartbeat).toLocaleTimeString() : '-'}</span>
                  </div>

                  {/* BOTOES DE ACAO */}
                  <div className="pt-4 border-t border-white/10 flex gap-2">
                    <button
                      onClick={() => sendBotCommand('restart')}
                      disabled={!isBotOnline}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 active:scale-95"
                    >
                      <RefreshCw size={18} /> Reiniciar Sistema
                    </button>
                    <button
                      onClick={() => sendBotCommand('stop')}
                      disabled={!isBotOnline}
                      className="bg-[#18181b] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 text-slate-400 border border-white/10 p-3 rounded-xl transition-all"
                      title="Parar Robô"
                    >
                      <Square size={18} />
                    </button>
                  </div>

                  {/* HOVER CONFIG: HEADLESS TOGGLE */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-white/5 mt-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Eye size={12} /> Visualizar navegador
                    </span>
                    <button
                      onClick={toggleHeadless}
                      className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!isHeadless ? 'bg-purple-500' : 'bg-[#18181b] border-white/20'}`}
                      title={isHeadless ? "Modo Oculto (Ativo)" : "Modo Visível (Ativo)"}
                    >
                      <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!isHeadless ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Logs Window (Real-time Interactive) */}
            <div className="md:col-span-8">
              <div className="bg-[#0c0d10] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
                <div className="bg-[#18181b] px-4 py-3 border-b border-white/5 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Terminal size={14} className="text-purple-500" /> CLARA-BOT@TERMINAL (v2.0)
                    {isBotOnline && (
                      <span className="flex items-center gap-1.5 ml-2 bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-500 border border-emerald-500/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold">LIVE</span>
                      </span>
                    )}
                  </span>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                </div>

                {/* Scrollable Logs Area */}
                <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto whitespace-pre-wrap selection:bg-purple-500/30 custom-scrollbar flex flex-col gap-1 bg-[#0c0d10]">
                  {/* Histórico antigo (se houver) */}
                  {botLogs && <div className="text-slate-600 border-b border-white/5 pb-2 mb-2">{botLogs.slice(-1000)}... [Histórico Carregado]</div>}

                  {/* Logs em Tempo Real */}
                  {terminalLines.map((line, i) => (
                    <div key={i} className={`${line.type === 'error' ? 'text-red-400' : line.type === 'warn' ? 'text-yellow-400' : 'text-emerald-500/90'} break-all border-l-2 pl-2 ${line.type === 'error' ? 'border-red-500/50 bg-red-500/5' : 'border-emerald-500/20 hover:bg-white/5'} transition-colors py-0.5`}>
                      <span className="opacity-30 mr-2 text-slate-500">[{new Date(line.timestamp).toLocaleTimeString()}]</span>
                      {line.message}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>

                {/* Command Input Area */}
                <div className="bg-[#18181b] p-3 border-t border-white/10 flex items-center gap-2">
                  <span className="text-purple-500 font-bold ml-1 animate-pulse">❯</span>
                  <input
                    type="text"
                    className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs placeholder-slate-600"
                    placeholder="Digite um comando (ex: status, help)..."
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && terminalInput.trim()) {
                        const cmd = terminalInput.trim();
                        // Adiciona log local
                        setTerminalLines(prev => [...prev, { type: 'info', message: `❯ ${cmd}`, timestamp: new Date().toISOString() }]);
                        setTerminalInput('');

                        // Envia Broadcast
                        await supabase.channel('bot_terminal').send({
                          type: 'broadcast',
                          event: 'command',
                          payload: { cmd }
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ADICIONAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1014] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#18181b]">
              <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2"><Shield size={18} className="text-purple-500" /> Nova Credencial</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome da Pessoa *</label>
                <input className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-slate-700"
                  value={formData.nome_pessoa} onChange={e => setFormData({ ...formData, nome_pessoa: e.target.value })} placeholder="Ex: Dr. João" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome do Site *</label>
                  <input className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-slate-700"
                    value={formData.site_nome} onChange={e => setFormData({ ...formData, site_nome: e.target.value })} placeholder="Ex: Portal INSS" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Link (URL)</label>
                  <input className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-slate-700"
                    value={formData.site_url} onChange={e => setFormData({ ...formData, site_url: e.target.value })} placeholder="www.site.com" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Login / CPF</label>
                <input
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-slate-700"
                  value={formData.cpf_login}
                  onChange={e => setFormData({ ...formData, cpf_login: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Senha *</label>
                <input className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-slate-700"
                  type="text"
                  value={formData.senha} onChange={e => setFormData({ ...formData, senha: e.target.value })} />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Observações</label>
                <textarea className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-slate-700 resize-none h-24"
                  value={formData.observacao} onChange={e => setFormData({ ...formData, observacao: e.target.value })} />
              </div>

              <button onClick={handleSave} className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-purple-600/20 transition-all transform active:scale-[0.98] mt-2">
                Salvar Credencial
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
