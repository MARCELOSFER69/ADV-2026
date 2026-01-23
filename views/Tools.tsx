
import React, { useState } from 'react';
import { Calculator, Calendar, Clock, RotateCcw } from 'lucide-react';

const Tools: React.FC = () => {
  // Estado Calculadora Idade
  const [birthDate, setBirthDate] = useState('');
  const [ageResult, setAgeResult] = useState<{ years: number; months: number; days: number } | null>(null);

  // Estado Calculadora Prazos
  const [startDate, setStartDate] = useState('');
  const [daysToAdd, setDaysToAdd] = useState('');
  const [deadlineResult, setDeadlineResult] = useState<string | null>(null);

  const calculateAge = () => {
    if (!birthDate) return;
    const today = new Date();
    const birth = new Date(birthDate);
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      // Dias no mês anterior
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    setAgeResult({ years, months, days });
  };

  const calculateDeadline = () => {
    if (!startDate || !daysToAdd) return;
    const start = new Date(startDate);
    // Adicionar dias (considerando apenas dias corridos por enquanto)
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(daysToAdd));
    
    setDeadlineResult(end.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white font-serif">Calculadoras Jurídicas</h2>
        <p className="text-slate-400">Ferramentas para agilizar cálculos de idade e prazos.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Calculadora de Idade */}
        <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                <UserClockIcon size={24} />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">Idade Previdenciária</h3>
                <p className="text-xs text-slate-500">Calcule a idade exata para benefícios.</p>
             </div>
          </div>

          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Data de Nascimento</label>
                <input 
                   type="date"
                   className="w-full bg-navy-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-gold-500"
                   value={birthDate}
                   onChange={(e) => setBirthDate(e.target.value)}
                />
             </div>
             <button 
                onClick={calculateAge}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
             >
                Calcular Idade
             </button>

             {ageResult && (
                 <div className="mt-4 p-4 bg-navy-800 rounded-lg border border-slate-700 text-center animate-in zoom-in">
                    <p className="text-slate-400 text-sm mb-1">Idade Atual</p>
                    <div className="flex justify-center items-end gap-2 text-white">
                        <span className="text-3xl font-bold text-gold-500">{ageResult.years}</span> <span className="text-sm pb-1">anos</span>
                        <span className="text-xl font-bold">{ageResult.months}</span> <span className="text-sm pb-1">meses</span>
                        <span className="text-xl font-bold">{ageResult.days}</span> <span className="text-sm pb-1">dias</span>
                    </div>
                 </div>
             )}
          </div>
        </div>

        {/* Calculadora de Prazos */}
        <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Calendar size={24} />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">Calculadora de Prazos</h3>
                <p className="text-xs text-slate-500">Projeção de datas futuras (dias corridos).</p>
             </div>
          </div>

          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Data Inicial (Notificação/Evento)</label>
                <input 
                   type="date"
                   className="w-full bg-navy-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-gold-500"
                   value={startDate}
                   onChange={(e) => setStartDate(e.target.value)}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Prazo (em dias)</label>
                <input 
                   type="number"
                   className="w-full bg-navy-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-gold-500"
                   placeholder="Ex: 15, 30, 45"
                   value={daysToAdd}
                   onChange={(e) => setDaysToAdd(e.target.value)}
                />
             </div>
             <button 
                onClick={calculateDeadline}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors"
             >
                Calcular Data Final
             </button>

             {deadlineResult && (
                 <div className="mt-4 p-4 bg-navy-800 rounded-lg border border-slate-700 text-center animate-in zoom-in">
                    <p className="text-slate-400 text-sm mb-1">O prazo vence em:</p>
                    <p className="text-xl font-bold text-white capitalize">
                        {deadlineResult}
                    </p>
                 </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Ícone Auxiliar
const UserClockIcon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <circle cx="20" cy="8" r="3" />
      <path d="M22 7v2l-1 1" />
    </svg>
);

export default Tools;