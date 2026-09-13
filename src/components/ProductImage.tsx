import React, { useState } from 'react';

interface ProductImageProps {
  src: string;
  alt: string;
  fallbackIcon?: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  fallbackIcon = 'inventory_2',
  className = 'w-full h-full object-cover',
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return (
      <div className="w-full h-full bg-[#edf4ff] text-[#00616a] flex flex-col items-center justify-center p-1">
        <span className="material-symbols-outlined text-[24px] opacity-70">
          {fallbackIcon}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#edf4ff]">
      {loading && (
        <div className="absolute inset-0 bg-[#edf4ff] animate-pulse flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px] text-[#2b6676]/40">
            {fallbackIcon}
          </span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
};
