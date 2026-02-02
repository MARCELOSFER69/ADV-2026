
import React, { useState, useEffect } from 'react';
import { FileText, X, Printer, Save } from 'lucide-react';

interface DocumentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  title: string;
}

const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({ isOpen, onClose, initialContent, title }) => {
  const [content, setContent] = useState('');

  // Strip HTML for editing (simplification for this demo)
  // In a real app, a rich text editor like Quill or TinyMCE would be better
  useEffect(() => {
      if (isOpen) {
          // Extract body content roughly or keep as HTML if user is comfortable
          // For simplicity, we will let them edit the raw HTML or text. 
          // To make it user friendly, let's strip tags for the textarea and re-wrap on print.
          // However, for legal docs, structure matters. Let's keep it as is but editable.
          setContent(initialContent);
      }
  }, [isOpen, initialContent]);

  if (!isOpen) return null;

  const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(content);
          printWindow.document.close();
          printWindow.print();
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-navy-900 border border-slate-700 rounded-xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col animate-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-navy-950 rounded-t-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={20} className="text-gold-500" /> 
                Editor: {title}
            </h3>
            <div className="flex gap-2">
                <button 
                    onClick={handlePrint}
                    className="bg-gold-600 hover:bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <Printer size={16} /> Imprimir
                </button>
                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"><X size={20}/></button>
            </div>
        </div>

        <div className="flex-1 p-0 relative">
            <textarea 
                className="w-full h-full bg-white text-black p-8 font-serif text-sm outline-none resize-none leading-relaxed"
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
            />
        </div>
      </div>
    </div>
  );
};

export default DocumentEditorModal;
