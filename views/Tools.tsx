
import React, { useState } from 'react';
import { Calculator, Calendar, Clock, RotateCcw, UserPlus, Timer, ClipboardList } from 'lucide-react';

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
      <div className="space-y-8 pb-10">
         {/* Standard Premium Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
            <div className="flex items-center gap-4">
               <div className="p-2.5 bg-gold-500/10 rounded-2xl text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5 transition-transform hover:scale-105">
                  <Calculator size={24} />
               </div>
               <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">
                     Calculadoras Jurídicas
                  </h1>
                  <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-0.5 opacity-80 uppercase tracking-widest">
                     Calculadoras e utilitários para otimizar seu trabalho.
                  </p>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Calculadora de Idade */}
            <div className="group relative bg-[#131418] border border-white/10 rounded-2xl p-6 shadow-2xl hover:border-gold-500/30 transition-all duration-500 overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20 shadow-inner">
                        <UserPlus size={24} />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Idade Previdenciária</h3>
                        <p className="text-xs text-slate-500 font-medium">Contagem precisa para benefícios do RGPS/RPPS.</p>
                     </div>
                  </div>

                  <div className="space-y-5">
                     <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data de Nascimento</label>
                        <input
                           type="date"
                           className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                           value={birthDate}
                           onChange={(e) => setBirthDate(e.target.value)}
                        />
                     </div>
                     <button
                        onClick={calculateAge}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                     >
                        Calcular Idade
                     </button>

                     {ageResult && (
                        <div className="mt-6 p-6 bg-[#18181b]/50 rounded-2xl border border-white/5 text-center animate-in zoom-in duration-300">
                           <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Resultado Obtido</p>
                           <div className="flex justify-center items-center gap-6 text-white">
                              <div className="flex flex-col items-center">
                                 <span className="text-4xl font-bold text-blue-400">{ageResult.years}</span>
                                 <span className="text-[10px] text-slate-500 uppercase font-bold">Anos</span>
                              </div>
                              <div className="h-8 w-px bg-white/5" />
                              <div className="flex flex-col items-center">
                                 <span className="text-2xl font-bold text-zinc-300">{ageResult.months}</span>
                                 <span className="text-[10px] text-slate-500 uppercase font-bold">Meses</span>
                              </div>
                              <div className="h-8 w-px bg-white/5" />
                              <div className="flex flex-col items-center">
                                 <span className="text-2xl font-bold text-zinc-300">{ageResult.days}</span>
                                 <span className="text-[10px] text-slate-500 uppercase font-bold">Dias</span>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Calculadora de Prazos */}
            <div className="group relative bg-[#131418] border border-white/10 rounded-2xl p-6 shadow-2xl hover:border-gold-500/30 transition-all duration-500 overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-inner">
                        <Timer size={24} />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Calculadora de Prazos</h3>
                        <p className="text-xs text-slate-500 font-medium">Cronograma de vencimentos processuais.</p>
                     </div>
                  </div>

                  <div className="space-y-5">
                     <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data de Início</label>
                        <input
                           type="date"
                           className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                           value={startDate}
                           onChange={(e) => setStartDate(e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Prazo (Dias Corridos)</label>
                        <input
                           type="number"
                           className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                           placeholder="Ex: 15"
                           value={daysToAdd}
                           onChange={(e) => setDaysToAdd(e.target.value)}
                        />
                     </div>
                     <button
                        onClick={calculateDeadline}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                     >
                        Projetar Data Final
                     </button>

                     {deadlineResult && (
                        <div className="mt-6 p-6 bg-[#18181b]/50 rounded-2xl border border-white/5 text-center animate-in zoom-in duration-300">
                           <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Vencimento em</p>
                           <p className="text-2xl font-bold text-gold-500 capitalize px-2">
                              {deadlineResult}
                           </p>
                           <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                              <ClipboardList size={12} strokeWidth={3} />
                              Cálculo baseado em dias corridos
                           </div>
                        </div>
                     )}
                  </div>
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