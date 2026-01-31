import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded shadow-lg text-white transition-all transform animate-in slide-in-from-right ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;