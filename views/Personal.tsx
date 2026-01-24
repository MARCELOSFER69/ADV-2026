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
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="text-purple-500" /> Área Pessoal
          </h2>
          <p className="text-gray-400">Gerencie suas informações privadas e acessos.</p>
        </div>
      </div>

      {/* Tabs Internas */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'credentials' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Shield size={16} /> Credenciais Pessoais
        </button>
        <button
          onClick={() => setActiveTab('bot')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'bot' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Terminal size={16} /> Gerenciamento do Robô
        </button>
      </div>

      {activeTab === 'credentials' && (
        <div className="space-y-6">

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 bg-gray-900 p-4 rounded-xl border border-gray-800">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou site..."
                className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 pr-10 py-2 text-white outline-none focus:border-purple-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  title="Limpar busca"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus size={18} /> Nova Credencial
            </button>
          </div>

          {/* Grid de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCredentials.map(cred => (
              <div key={cred.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-purple-500/50 transition-all group shadow-lg">

                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{cred.site_nome}</h3>
                      {cred.site_url && (
                        <a href={cred.site_url.startsWith('http') ? cred.site_url : `https://${cred.site_url}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                          Acessar Site <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deletePersonalCredential(cred.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Card Body */}
                <div className="space-y-3">
                  {/* Pessoa */}
                  <div className="bg-gray-950/50 p-2 rounded border border-gray-800 flex justify-between items-center">
                    <span className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1"><User size={10} /> Pessoa</span>
                    <span className="text-sm text-gray-200">{cred.nome_pessoa}</span>
                  </div>

                  {/* Login/CPF */}
                  {cred.cpf_login && (
                    <div className="bg-gray-950/50 p-2 rounded border border-gray-800 flex justify-between items-center group/item">
                      <span className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1"><User size={10} /> Login/CPF</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-200 font-mono">{cred.cpf_login}</span>
                        <button onClick={() => copyToClipboard(cred.cpf_login)} className="text-gray-500 hover:text-white opacity-0 group-hover/item:opacity-100"><Copy size={12} /></button>
                      </div>
                    </div>
                  )}

                  {/* Senha */}
                  <div className="bg-gray-950/50 p-2 rounded border border-gray-800 flex justify-between items-center group/item">
                    <span className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1"><KeyRound size={10} /> Senha</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-200 font-mono">
                        {showPassword[cred.id] ? cred.senha : '••••••••'}
                      </span>
                      <button onClick={() => setShowPassword(prev => ({ ...prev, [cred.id]: !prev[cred.id] }))} className="text-gray-500 hover:text-white">
                        {showPassword[cred.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => copyToClipboard(cred.senha)} className="text-gray-500 hover:text-white opacity-0 group-hover/item:opacity-100"><Copy size={12} /></button>
                    </div>
                  </div>

                  {/* Obs */}
                  {cred.observacao && (
                    <div className="mt-2 text-xs text-gray-500 italic border-t border-gray-800 pt-2 flex gap-1">
                      <FileText size={12} className="shrink-0 mt-0.5" /> {cred.observacao}
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
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg group relative transition-all duration-300 hover:border-purple-500/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Activity size={18} className="text-purple-500" /> Status do Robô
                  </h3>
                  <div className={`px-2 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${isBotOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isBotOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                    {isBotOnline ? 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Máquina</span>
                    <span className="text-white font-mono">{botStatus?.machine || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Último Sinal</span>
                    <span className="text-white">{botStatus?.last_heartbeat ? new Date(botStatus.last_heartbeat).toLocaleTimeString() : '-'}</span>
                  </div>

                  {/* BOTOES DE ACAO */}
                  <div className="pt-4 border-t border-gray-800 flex gap-2">
                    <button
                      onClick={() => sendBotCommand('restart')}
                      disabled={!isBotOnline}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <RefreshCw size={16} /> Reiniciar
                    </button>
                    <button
                      onClick={() => sendBotCommand('stop')}
                      disabled={!isBotOnline}
                      className="bg-gray-800 hover:bg-red-600 text-white p-2 rounded-lg transition-all"
                      title="Parar Robô"
                    >
                      <Square size={16} />
                    </button>
                  </div>

                  {/* HOVER CONFIG: HEADLESS TOGGLE */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-800/50 mt-2">
                    <span className="flex items-center gap-1.5">
                      <Eye size={12} /> Ver navegador?
                    </span>
                    <button
                      onClick={toggleHeadless}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!isHeadless ? 'bg-purple-500' : 'bg-gray-700'}`}
                      title={isHeadless ? "Modo Oculto (Ativo)" : "Modo Visível (Ativo)"}
                    >
                      <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!isHeadless ? 'translate-x-3' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Logs Window (Real-time Interactive) */}
            <div className="md:col-span-8">
              <div className="bg-[#0c0d10] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
                <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 flex items-center gap-2">
                    <Terminal size={14} /> CLARA-BOT@TERMINAL (v2.0)
                    {isBotOnline && (
                      <span className="flex items-center gap-1.5 ml-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-500/50 font-normal">Real-Time</span>
                      </span>
                    )}
                  </span>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                  </div>
                </div>

                {/* Scrollable Logs Area */}
                <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto whitespace-pre-wrap selection:bg-emerald-500/20 custom-scrollbar flex flex-col gap-1">
                  {/* Histórico antigo (se houver) */}
                  {botLogs && <div className="text-gray-600 border-b border-gray-800 pb-2 mb-2">{botLogs.slice(-1000)}... [Histórico Carregado]</div>}

                  {/* Logs em Tempo Real */}
                  {terminalLines.map((line, i) => (
                    <div key={i} className={`${line.type === 'error' ? 'text-red-400' : line.type === 'warn' ? 'text-yellow-400' : 'text-emerald-500/90'} break-all`}>
                      <span className="opacity-30 mr-2">[{new Date(line.timestamp).toLocaleTimeString()}]</span>
                      {line.message}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>

                {/* Command Input Area */}
                <div className="bg-gray-900/50 p-2 border-t border-gray-800 flex items-center gap-2">
                  <span className="text-emerald-500 font-bold ml-2">❯</span>
                  <input
                    type="text"
                    className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder-gray-700"
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
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Nova Credencial</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white"><Trash2 size={20} className="rotate-45" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Pessoa *</label>
                <input className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-purple-500"
                  value={formData.nome_pessoa} onChange={e => setFormData({ ...formData, nome_pessoa: e.target.value })} placeholder="Ex: Dr. João" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Site *</label>
                  <input className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-purple-500"
                    value={formData.site_nome} onChange={e => setFormData({ ...formData, site_nome: e.target.value })} placeholder="Ex: Portal INSS" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link (URL)</label>
                  <input className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-purple-500"
                    value={formData.site_url} onChange={e => setFormData({ ...formData, site_url: e.target.value })} placeholder="www.site.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Login / CPF</label>
                <input
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-purple-500"
                  value={formData.cpf_login}
                  onChange={e => setFormData({ ...formData, cpf_login: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha *</label>
                <input className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-purple-500"
                  type="text"
                  value={formData.senha} onChange={e => setFormData({ ...formData, senha: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações</label>
                <textarea className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-purple-500 resize-none h-20"
                  value={formData.observacao} onChange={e => setFormData({ ...formData, observacao: e.target.value })} />
              </div>

              <button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors mt-2">
                Salvar Credencial
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
