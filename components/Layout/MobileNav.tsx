
import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Users, Scale, LogOut, Hourglass } from 'lucide-react';

const MobileNav: React.FC = () => {
  const { currentView, setCurrentView, logout } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'cases', label: 'Processos', icon: Scale },
    { id: 'retirements', label: 'Aposent.', icon: Hourglass },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-900 border-t border-slate-800 z-40 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id as any)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              currentView === item.id ? 'text-gold-500' : 'text-slate-500'
            }`}
          >
            <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        <button
            onClick={logout}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500 hover:text-red-500"
          >
            <LogOut size={20} />
            <span className="text-[10px] font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNav;