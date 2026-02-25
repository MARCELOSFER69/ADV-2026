
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  icon?: LucideIcon;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  icon: Icon,
  required,
  placeholder = "Selecione",
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [direction, setDirection] = useState<'up' | 'down'>('down');

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const menuHeight = 250; // Max height of the dropdown plus some margin
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        setDirection('up');
      } else {
        setDirection('down');
      }

      setMenuRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

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
      {label && (
        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-[#0f1014] border ${isOpen ? 'border-yellow-600 ring-1 ring-yellow-600/20' : 'border-zinc-800'} text-zinc-200 px-3 py-2.5 rounded-xl transition-all outline-none group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      {/* Dropdown Menu Portal */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: direction === 'down' ? -10 : 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: direction === 'down' ? -10 : 10, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'fixed',
                top: direction === 'down' && menuRect
                  ? menuRect.top - window.scrollY + menuRect.height + 8
                  : 'auto',
                bottom: direction === 'up' && menuRect
                  ? window.innerHeight - (menuRect.top - window.scrollY) + 8
                  : 'auto',
                left: menuRect?.left ? menuRect.left - window.scrollX : 0,
                width: menuRect?.width || 0,
                zIndex: 9999,
              }}
              className="bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
              <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${value === option.value
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
