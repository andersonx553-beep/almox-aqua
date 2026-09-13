import React from 'react';
import { ScreenType } from '../types';

export interface NavigationProps {
  currentScreen: ScreenType;
  onNavigate?: (screen: ScreenType) => void;
  onSelectScreen?: (screen: ScreenType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  onNavigate,
  onSelectScreen,
}) => {
  const handleNav = (screen: ScreenType) => {
    if (onNavigate) {
      onNavigate(screen);
    } else if (onSelectScreen) {
      onSelectScreen(screen);
    }
  };

  const tabs = [
    { id: 'dashboard' as ScreenType, label: 'Dashboard', icon: 'dashboard' },
    { id: 'ocr' as ScreenType, label: 'NF / OCR', icon: 'document_scanner' },
    { id: 'estoque' as ScreenType, label: 'Estoque', icon: 'inventory_2' },
    { id: 'movimentar' as ScreenType, label: 'Movimentar', icon: 'sync_alt' },
    { id: 'inventario' as ScreenType, label: 'Inventário', icon: 'fact_check' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-[#f7f9ff]/95 backdrop-blur-xl border-t border-[#bdc9ca]/25 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleNav(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] h-12 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? 'text-[#00616a] font-bold'
                  : 'text-[#3e494a] hover:text-[#001d32]'
              }`}
              type="button"
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-transform ${
                  isActive ? 'scale-110 fill-1 text-[#00616a]' : ''
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  isActive ? 'font-bold text-[#00616a]' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
