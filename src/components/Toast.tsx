import React from 'react';

interface ToastProps {
  message: string | null;
  icon?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  icon = 'check_circle',
  type = 'success',
}) => {
  if (!message) return null;

  const bgStyles = {
    success: 'bg-[#001d32] text-white',
    info: 'bg-[#087c87] text-white',
    warning: 'bg-[#ffdad6] text-[#ba1a1a]',
    error: 'bg-[#ba1a1a] text-white',
  }[type];

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform pointer-events-none max-w-sm w-[90%] sm:w-auto">
      <div
        className={`${bgStyles} px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4`}
      >
        <span className="material-symbols-outlined text-[18px] flex-shrink-0">
          {icon}
        </span>
        <span className="truncate">{message}</span>
      </div>
    </div>
  );
};
