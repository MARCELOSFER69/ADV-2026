import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { BRAND_CONFIG } from '../../logoData';

const TitleBar: React.FC = () => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        // @ts-ignore
        if (window.electronAPI) {
            setIsDesktop(true);
            const checkMaximized = async () => {
                // @ts-ignore
                const maximized = await window.electronAPI.isMaximized();
                setIsMaximized(maximized);
            };

            checkMaximized();

            window.addEventListener('resize', checkMaximized);
            return () => window.removeEventListener('resize', checkMaximized);
        }
    }, []);

    if (!isDesktop) return null;

    const handleMinimize = () => {
        // @ts-ignore
        window.electronAPI.minimize();
    };

    const handleMaximize = () => {
        // @ts-ignore
        window.electronAPI.maximize();
    };

    const handleClose = () => {
        // @ts-ignore
        window.electronAPI.close();
    };

    return (
        <div className="h-8 bg-navy-950 flex items-center justify-between select-none relative z-[9999] border-b border-navy-800"
            style={{ WebkitAppRegion: 'drag' } as any}>

            <div className="flex items-center px-3 gap-2">
                <img src={BRAND_CONFIG.logoBase64} alt="Logo" className="w-auto h-4 opacity-100" />
                <span className="text-xs font-medium text-slate-400">Escritorio Noleto & Macedo</span>
            </div>

            <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <button
                    onClick={handleMinimize}
                    className="h-full px-3 flex items-center justify-center hover:bg-navy-800 text-slate-400 transition-colors duration-200"
                    title="Minimizar"
                >
                    <Minus size={14} />
                </button>

                <button
                    onClick={handleMaximize}
                    className="h-full px-3 flex items-center justify-center hover:bg-navy-800 text-slate-400 transition-colors duration-200"
                    title={isMaximized ? "Restaurar" : "Maximizar"}
                >
                    {isMaximized ? <Copy size={12} /> : <Square size={12} />}
                </button>

                <button
                    onClick={handleClose}
                    className="h-full px-4 flex items-center justify-center hover:bg-red-600 hover:text-white text-slate-400 transition-all duration-200"
                    title="Fechar"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
