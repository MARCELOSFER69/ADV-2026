import React from 'react';
import { Download, Monitor, Shield, Zap } from 'lucide-react';

const DownloadPage: React.FC = () => {
    // Estado para armazenar a versão
    const [version, setVersion] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    // URL direta para o último release (redirecionamento do GitHub)
    const downloadUrl = "https://github.com/MARCELOSFER69/ADV-2026/releases/latest/download/Escritorio.Noleto.&.Macedo.Setup.exe";

    React.useEffect(() => {
        // Busca a versão mais recente via API do GitHub
        fetch('https://api.github.com/repos/MARCELOSFER69/ADV-2026/releases/latest')
            .then(res => res.json())
            .then(data => {
                if (data.tag_name) {
                    setVersion(data.tag_name);
                }
            })
            .catch(err => console.error("Erro ao buscar versão:", err))
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white font-serif flex items-center gap-3">
                    <Monitor className="text-gold-500" /> Aplicativo Desktop
                </h2>
                <p className="text-slate-400 mt-2">
                    Baixe a versão instalável para habilitar correções automáticas e máxima performance.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Card de Download */}
                <div className="bg-gradient-to-br from-navy-900 to-navy-950 border border-gold-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Download size={140} />
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-2">
                            {isLoading ? 'Buscando versão...' : `Versão Windows (${version || 'Recente'})`}
                        </h3>
                        <p className="text-emerald-400 font-medium mb-6 flex items-center gap-2">
                            <Shield size={16} /> Verificado e Seguro
                        </p>

                        <ul className="space-y-3 mb-8 text-slate-300">
                            <li className="flex items-center gap-2"><Zap size={16} className="text-gold-500" /> Robôs 3x mais rápidos</li>
                            <li className="flex items-center gap-2"><GlobeIcon size={16} className="text-gold-500" /> Auto-bloqueio de rastreadores</li>
                            <li className="flex items-center gap-2"><RefreshCwIcon size={16} className="text-gold-500" /> Atualizações Automáticas</li>
                        </ul>

                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-3 bg-gold-600 hover:bg-gold-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-gold-600/30 w-full md:w-auto"
                        >
                            <Download size={24} />
                            BAIXAR {version || 'INSTALADOR'}
                        </a>

                        <p className="mt-4 text-xs text-slate-500">
                            Hospedado via GitHub Releases. Sempre a última versão.
                        </p>
                    </div>
                </div>

                {/* Instruções */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white">Como Instalar?</h3>
                    <div className="space-y-4">
                        <Step number={1} title="Faça o Download" desc={`Clique no botão ao lado para baixar o arquivo Setup ${version || ''}.exe.`} />
                        <Step number={2} title="Execute o Arquivo" desc="O Windows pode pedir permissão (Tela SmartScreen). Clique em 'Mais Informações' > 'Executar mesmo assim'." />
                        <Step number={3} title="Login" desc="Use suas mesmas credenciais do sistema web." />
                    </div>
                </div>
            </div>
        </div>
    );
};

const Step = ({ number, title, desc }: { number: number, title: string, desc: string }) => (
    <div className="flex gap-4">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-gold-500 font-bold shrink-0 border border-slate-700">
            {number}
        </div>
        <div>
            <h4 className="font-bold text-slate-200">{title}</h4>
            <p className="text-sm text-slate-400">{desc}</p>
        </div>
    </div>
);

// Ícones auxiliares locais para evitar imports quebrados se lucide não tiver
const GlobeIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>;
const RefreshCwIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>;

export default DownloadPage;
