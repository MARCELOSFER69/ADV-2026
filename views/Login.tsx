
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, AlertCircle, Scale } from 'lucide-react';
import { BRAND_CONFIG } from '../logoData';
import { auditService } from '../services/auditService';

const Login: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    try {
      await login(email, password, rememberMe);
      // Log Success
      auditService.log({
        action: 'login_success',
        details: `User ${email} logged in successfully`,
        entity: 'auth',
        entity_id: email
      });
    } catch (error: any) {
      const msg = error.message || 'Email ou senha incorretos.';
      setLoginError(msg);
      // Log Failure
      auditService.log({
        action: 'login_failed',
        details: `Login failed for ${email}: ${msg}`,
        entity: 'auth',
        entity_id: email
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5 animate-in fade-in zoom-in duration-500">
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center text-center">
          {BRAND_CONFIG.logoBase64 ? (
            <img
              src={BRAND_CONFIG.logoBase64}
              alt={BRAND_CONFIG.loginTitle}
              className="w-auto h-24 mb-4 object-contain"
            />
          ) : (
            // Fallback Logo
            <div className="mb-6 flex flex-col items-center">
              <div className="w-16 h-16 border-2 border-gold-500 transform rotate-45 flex items-center justify-center rounded-xl mb-4 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                <Scale className="text-gold-500 transform -rotate-45" size={32} />
              </div>
              <h1 className="text-gold-500 font-serif font-bold text-lg tracking-widest leading-relaxed whitespace-pre-line">
                {BRAND_CONFIG.loginTitle}
              </h1>
              <p className="text-[10px] text-slate-500 tracking-[0.3em] mt-2 border-t border-slate-800 pt-2 w-full">{BRAND_CONFIG.loginSubtitle}</p>
            </div>
          )}
        </div>

        {/* Form Section */}
        <div className="bg-navy-900/50 backdrop-blur-sm p-6 rounded-2xl border border-white/5 shadow-2xl">
          <div className="mb-5 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white mb-1">Bem Vindo</h2>
            <p className="text-slate-400 text-xs">Use suas credenciais para acessar.</p>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 flex items-center gap-2 text-red-400 mb-4 animate-in slide-in-from-top-1">
              <AlertCircle size={18} />
              <span className="text-xs font-medium">{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-navy-800 text-white border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="exemplo@advocacia.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-navy-800 text-white border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-gold-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  className="rounded border-slate-700 bg-navy-800 text-gold-600 focus:ring-gold-500/50 accent-gold-500 w-3.5 h-3.5"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Lembrar de mim
              </label>
              <button type="button" className="text-gold-500 hover:text-gold-400 hover:underline">
                Esqueceu sua senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gold-600 hover:bg-gold-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-gold-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-center pt-4">
          <p className="text-slate-600 text-[10px]">
            © 2025 {BRAND_CONFIG.sidebarName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
