
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  icon?: LucideIcon;
  required?: boolean;
  placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  label, 
  value, 
  onChange, 
  options, 
  icon: Icon, 
  required,
  placeholder = "Selecione"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-[#0f1014] border ${isOpen ? 'border-yellow-600 ring-1 ring-yellow-600/20' : 'border-zinc-800'} text-zinc-200 px-3 py-2.5 rounded-xl transition-all outline-none group`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {Icon && (
            <Icon 
              size={18} 
              className={`shrink-0 transition-colors ${isOpen || value ? 'text-yellow-600' : 'text-zinc-600 group-hover:text-zinc-400'}`} 
            />
          )}
          <span className={`text-sm truncate ${!selectedOption ? 'text-zinc-600' : 'text-zinc-200'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-yellow-600' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-2 left-0 w-full bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col">
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  value === option.value 
                    ? 'bg-yellow-600/10 text-yellow-600 font-medium' 
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span>{option.label}</span>
                {value === option.value && <Check size={14} />}
              </button>
            ))}
            {options.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-zinc-500">
                    Nenhuma opção disponível
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
