
import React from 'react';

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

  // Inline style for dynamic primary color
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
