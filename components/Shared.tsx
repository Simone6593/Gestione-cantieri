
import React from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}> = ({ children, className, onDragOver, onDrop }) => (
  <div 
    className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
    onDragOver={onDragOver}
    onDrop={onDrop}
  >
    {children}
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  className?: string;
  title?: string;
}> = ({ children, onClick, type = 'button', variant = 'primary', disabled, className, title }) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "text-white shadow-sm",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };

  const dynamicStyle = variant === 'primary' ? {
    backgroundColor: 'var(--primary-color)',
  } : {};

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled} 
      className={`${base} ${variants[variant]} ${className}`}
      style={dynamicStyle}
      title={title}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<{
  label?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  suffix?: React.ReactNode;
}> = ({ label, type = 'text', value, onChange, placeholder, className, required, disabled, suffix }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
    <div className="relative flex items-center">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all outline-none ${suffix ? 'pr-12' : ''}`}
      />
      {suffix && (
        <div className="absolute right-3 flex items-center">
          {suffix}
        </div>
      )}
    </div>
  </div>
);

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'success' | 'info';
}> = ({ isOpen, onClose, title, message, type = 'info' }) => {
  if (!isOpen) return null;

  const colors = {
    error: { bg: 'bg-red-50', text: 'text-red-800', icon: 'text-red-500', border: 'border-red-100', btn: 'bg-red-600' },
    success: { bg: 'bg-green-50', text: 'text-green-800', icon: 'text-green-500', border: 'border-green-100', btn: 'bg-green-600' },
    info: { bg: 'bg-blue-50', text: 'text-blue-800', icon: 'text-blue-500', border: 'border-blue-100', btn: 'bg-blue-600' }
  };

  const theme = colors[type];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className={`w-full max-w-sm p-6 relative animate-in zoom-in duration-300 ${theme.bg} ${theme.border}`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 ${theme.icon}`}>
            {type === 'error' ? <AlertCircle size={48} /> : <CheckCircle2 size={48} />}
          </div>
          <h3 className={`text-xl font-bold mb-2 ${theme.text}`}>{title}</h3>
          <p className="text-sm text-slate-600 mb-6">{message}</p>
          <Button onClick={onClose} className={`w-full ${theme.btn} text-white hover:opacity-90`}>
            Chiudi
          </Button>
        </div>
      </Card>
    </div>
  );
};
