
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PrintPortalProps {
  children: React.ReactNode;
  onAfterPrint: () => void;
}

export const PrintPortal: React.FC<PrintPortalProps> = ({ children, onAfterPrint }) => {
  const [container] = useState(() => {
    const el = document.createElement('div');
    el.id = 'print-portal-root';
    return el;
  });

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, [container]);

  useEffect(() => {
    // Pequeno delay para garantir que o DOM foi pintado antes de imprimir
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    // Listener para quando a janela de print fechar
    const handleAfterPrint = () => {
        onAfterPrint();
    };

    window.addEventListener('afterprint', handleAfterPrint);
    
    // Fallback: em alguns navegadores o afterprint pode não disparar confiavelmente,
    // mas aqui estamos contando que o usuário vai interagir com a janela de impressão.
    // Opcionalmente, poderíamos não fechar automaticamente e deixar um botão de "Fechar" no portal,
    // mas o fluxo solicitado é automático.

    return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onAfterPrint]);

  return createPortal(
    <>
      <style>{`
        @media print {
          /* Esconde tudo que é filho direto do body, exceto o portal */
          body > *:not(#print-portal-root) {
            display: none !important;
          }
          
          /* Garante que o portal seja visível e ocupe tudo */
          #print-portal-root {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            background: white;
          }

          /* Configurações de página */
          @page { 
            size: A4; 
            margin: 0; 
          }
          
          /* Utilitário de quebra de página */
          .break-after-page { 
            page-break-after: always; 
            display: block; 
            height: 0; 
          }
        }

        /* Esconde o portal na tela normal para não atrapalhar a UI */
        @media screen {
           #print-portal-root {
             display: none;
           }
        }
      `}</style>
      {children}
    </>,
    container
  );
};
