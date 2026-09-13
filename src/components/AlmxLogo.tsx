import React, { useState } from 'react';
import { ALMX_LOGO_URL } from '../data/mockData';

interface AlmxLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const AlmxLogo: React.FC<AlmxLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'h-7',
    md: 'h-8',
    lg: 'h-10',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {!hasError ? (
        <img
          src={ALMX_LOGO_URL}
          alt="Logo ALMX Almoxarifado Inteligente"
          className={`${sizeClasses} w-auto object-contain flex-shrink-0`}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex items-center gap-2 bg-[#00616a]/10 text-[#00616a] px-2 py-1 rounded-lg">
          <span className="material-symbols-outlined text-[24px]">inventory_2</span>
          <div className="flex flex-col">
            <span className="font-extrabold text-[15px] tracking-tight text-[#00616a] leading-none">
              ALMX
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[#2b6676] font-semibold">
              Almoxarifado
            </span>
          </div>
        </div>
      )}

      {showSubtitle && (
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-[#001d32] text-sm leading-tight tracking-tight">
            ALMX
          </span>
          <span className="text-[10px] text-[#3e494a] uppercase tracking-wider font-semibold">
            Almoxarifado Inteligente
          </span>
        </div>
      )}
    </div>
  );
};
