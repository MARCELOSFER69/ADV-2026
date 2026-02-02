import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Search, AlertCircle, Clock, Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { BRAND_CONFIG } from '../logoData';
import { formatCPFOrCNPJ } from '../services/formatters';

interface PublicCase {
    id: string;
    titulo: string;
    numero_processo: string;
    status: string;
    tipo: string;
    data_abertura: string;
}

const PublicConsultation: React.FC = () => {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ clientName: string, cases: PublicCase[] } | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    // 1. Prepara os dois formatos possíveis de CPF
    const cleanCpf = cpf.replace(/\D/g, '');
    const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    
    if (cleanCpf.length < 11) {
        setError('CPF inválido. Digite os 11 números.');
        setLoading(false);
        return;
    }

    try {
        console.log(`🔍 Buscando CPF: ${formattedCpf} OU ${cleanCpf}`);

        // 2. Busca Inteligente (Tenta achar formatado OU limpo)
        const { data: clients, error: clientError } = await supabase
            .from('clients')
            .select('id, nome_completo')
            .or(`cpf_cnpj.eq.${formattedCpf},cpf_cnpj.eq.${cleanCpf}`)
            .limit(1);

        if (clientError) {
            console.error('Erro Supabase:', clientError);
            throw clientError;
        }

        if (!clients || clients.length === 0) {
            setError('CPF não encontrado. Verifique se digitou corretamente ou contate o escritório.');
            setLoading(false);
            return;
        }

        const targetClient = clients[0];
        console.log('✅ Cliente encontrado:', targetClient.nome_completo);

        // 3. Busca os Processos desse Cliente
        const { data: cases, error: caseError } = await supabase
            .from('cases')
            .select('id, titulo, numero_processo, status, tipo, data_abertura')
            .eq('client_id', targetClient.id);

        if (caseError) throw caseError;

        setResult({ 
            clientName: targetClient.nome_completo, 
            cases: cases as PublicCase[] 
        });

    } catch (err: any) {
        console.error(err);
        // Se o erro for de permissão (RLS), avisa o usuário (e você, desenvolvedor)
        if (err.code === '42501' || err.message?.includes('permission')) {
            setError('Erro de permissão. O acesso público precisa ser configurado no banco de dados.');
        } else {
            setError('Ocorreu um erro ao buscar. Tente novamente.');
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 font-sans text-slate-200">
      
      {/* Header */}
      <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center mb-4">
            {BRAND_CONFIG.logoBase64 ? (
                <img src={BRAND_CONFIG.logoBase64} alt="Logo" className="h-24 object-contain" />
            ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-navy-900 to-black rounded-2xl border border-gold-500/30 flex items-center justify-center shadow-2xl shadow-gold-900/20">
                    <Shield className="h-10 w-10 text-gold-500" />
                </div>
            )}
        </div>
        <h1 className="text-3xl font-serif text-white font-bold tracking-wide">{BRAND_CONFIG.loginTitle || 'Área do Cliente'}</h1>
        <p className="text-zinc-500 mt-2 text-sm">Consulte o andamento dos seus processos de forma segura.</p>
      </div>

      {/* Search Box */}
      <div className="w-full max-w-md bg-[#0f1014] border border-zinc-800 p-8 rounded-2xl shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-50"></div>

        {!result ? (
            <form onSubmit={handleSearch} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-gold-600 uppercase mb-2 tracking-wider">Informe seu CPF</label>
                    <div className="relative group">
                        <input 
                            type="text" 
                            className="w-full bg-zinc-900/50 border border-zinc-700 text-white text-lg px-4 py-3.5 rounded-xl outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all placeholder:text-zinc-600 font-mono tracking-wide"
                            placeholder="000.000.000-00"
                            value={cpf}
                            onChange={(e) => setCpf(formatCPFOrCNPJ(e.target.value))}
                            maxLength={18}
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-gold-500 transition-colors" />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading || cpf.length < 14}
                    className="w-full bg-gold-600 hover:bg-gold-500 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-gold-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 uppercase tracking-wide text-sm flex justify-center items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={20}/> : 'Consultar Processos'}
                </button>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm animate-in slide-in-from-left-2">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" /> 
                        <span>{error}</span>
                    </div>
                )}
            </form>
        ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Bem-vindo(a),</p>
                        <h2 className="text-lg font-bold text-white truncate max-w-[200px]">{result.clientName}</h2>
                    </div>
                    <button onClick={() => setResult(null)} className="text-xs text-gold-500 hover:text-white flex items-center gap-1 transition-colors">
                        <ArrowLeft size={14} /> Nova Busca
                    </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {result.cases.length === 0 && (
                        <div className="text-center py-8 text-zinc-500">
                            <p>Nenhum processo ativo encontrado.</p>
                        </div>
                    )}

                    {result.cases.map((c) => (
                        <div key={c.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl hover:border-gold-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                    c.status.includes('Concluído') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                    c.status === 'Arquivado' ? 'bg-zinc-800 text-zinc-500 border-zinc-700' :
                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                    {c.status}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">{new Date(c.data_abertura).toLocaleDateString('pt-BR')}</span>
                            </div>
                            
                            <h3 className="text-white font-bold text-sm mb-1 group-hover:text-gold-500 transition-colors">{c.titulo}</h3>
                            <p className="text-xs text-zinc-500 mb-3 font-mono">{c.numero_processo || 'Processo sem número'}</p>
                            
                            <div className="pt-3 border-t border-zinc-800/50 flex items-center gap-2 text-xs text-zinc-400">
                                <Clock size={12} />
                                <span>Tipo: {c.tipo}</span>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-500">
                        *Atualizado em tempo real. Para detalhes jurídicos, contate seu advogado.
                    </p>
                </div>
            </div>
        )}
      </div>

      <div className="mt-12 text-zinc-600 text-xs opacity-60">
          &copy; 2026 {BRAND_CONFIG.sidebarName || 'Noleto & Macedo'}. Todos os direitos reservados.
      </div>
    </div>
  );
};

export default PublicConsultation;
