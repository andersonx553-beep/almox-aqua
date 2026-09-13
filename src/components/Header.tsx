import React, { useState } from 'react';
import { AlmxLogo } from './AlmxLogo';
import { USER_AVATAR_URL } from '../data/mockData';
import { ScreenType } from '../types';

export interface HeaderProps {
  currentScreen?: ScreenType;
  selectedUnit?: string;
  currentUnit?: string;
  onSelectUnit?: (unit: string) => void;
  onSwitchUnit?: (unit: string) => void;
  onNavigate?: (screen: ScreenType) => void;
  onLogout?: () => void;
  onNotificationClick?: () => void;
}

const screenTitles: Record<ScreenType, string> = {
  login: 'Acesso ao Sistema',
  dashboard: 'Dashboard Operacional',
  ocr: 'Importação e Leitura de Nota Fiscal OCR IA',
  estoque: 'Gestão de Produtos e Estoque',
  movimentar: 'Movimentações Entrada Saída Manual',
  inventario: 'Inventário e Contagem de Divergências',
  relatorios: 'Relatórios e Automação de IA',
};

export const Header: React.FC<HeaderProps> = ({
  currentScreen = 'dashboard',
  selectedUnit,
  currentUnit,
  onSelectUnit,
  onSwitchUnit,
  onNavigate,
  onLogout,
  onNotificationClick,
}) => {
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const activeUnit = selectedUnit || currentUnit || 'AquaVille Resort - Unidade Principal';

  const handleSelectUnit = (unit: string) => {
    if (onSelectUnit) onSelectUnit(unit);
    if (onSwitchUnit) onSwitchUnit(unit);
    setShowUnitDropdown(false);
  };

  const handleNavigate = (screen: ScreenType) => {
    if (onNavigate) {
      onNavigate(screen);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const units = [
    { id: 'aquaville', name: 'AquaVille Resort - Unidade Principal' },
    { id: 'central', name: 'Depósito Central - Hub Logístico' },
    { id: 'almox-2', name: 'Almoxarifado II - Suprimentos Frios' },
  ];

  const notifications = [
    {
      id: 'n1',
      icon: 'warning',
      color: 'text-[#ba1a1a]',
      title: '14 itens abaixo do estoque mínimo',
      time: 'Há 5 min',
      screen: 'estoque' as ScreenType,
    },
    {
      id: 'n2',
      icon: 'notification_important',
      color: 'text-[#ba1a1a]',
      title: 'Cloro granulado vence em 6 dias',
      time: 'Há 25 min',
      screen: 'estoque' as ScreenType,
    },
    {
      id: 'n3',
      icon: 'description',
      color: 'text-[#005d8c]',
      title: 'Nova NF-e #148.921 aguardando conciliação',
      time: 'Há 1 hora',
      screen: 'ocr' as ScreenType,
    },
  ];

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-[#f7f9ff]/90 backdrop-blur-xl border-b border-[#bdc9ca]/20 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-col gap-1.5">
        {/* Top row */}
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Title */}
          <button
            onClick={() => handleNavigate('dashboard')}
            className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-90 transition-opacity"
            title="Ir para o Dashboard"
          >
            <AlmxLogo size="md" />
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-[17px] font-bold text-[#001d32] truncate leading-tight tracking-tight">
                ALMX
              </span>
              <span className="text-[10px] text-[#3e494a] uppercase font-semibold tracking-wider">
                Almoxarifado
              </span>
            </div>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* IA Online Pill */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#b0e8fc]/40 text-[#306a7b] text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#087c87] animate-pulse"></span>
              <span className="hidden sm:inline">IA Online</span>
            </span>

            {/* Quick link to AI Reports */}
            <button
              onClick={() => handleNavigate('relatorios')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${
                currentScreen === 'relatorios'
                  ? 'bg-[#00616a] text-white shadow-sm'
                  : 'bg-[#edf4ff] text-[#00616a] hover:bg-[#e2efff]'
              }`}
              title="IA ALMX Assist & Relatórios"
            >
              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
              <span className="hidden xs:inline">ALMX Assist</span>
            </button>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => {
                  if (onNotificationClick) {
                    onNotificationClick();
                  }
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                  setShowUnitDropdown(false);
                }}
                aria-label="Notificações operacionais"
                className="relative w-10 h-10 flex items-center justify-center rounded-full text-[#001d32] hover:bg-[#edf4ff] active:scale-95 transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#ba1a1a] text-white text-[10px] flex items-center justify-center font-bold">
                  3
                </span>
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-[#bdc9ca]/30 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2efff]">
                    <span className="font-bold text-sm text-[#001d32]">Alertas & Notificações</span>
                    <span className="text-[11px] bg-[#edf4ff] text-[#00616a] px-2 py-0.5 rounded-full font-semibold">
                      3 pendentes
                    </span>
                  </div>
                  <div className="divide-y divide-[#edf4ff] mt-1 max-h-72 overflow-y-auto">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleNavigate(item.screen);
                          setShowNotifications(false);
                        }}
                        className="w-full py-2.5 px-2 flex items-start gap-2.5 text-left hover:bg-[#edf4ff]/60 rounded-xl transition-colors"
                      >
                        <span className={`material-symbols-outlined text-[20px] mt-0.5 ${item.color}`}>
                          {item.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#001d32] leading-snug truncate">
                            {item.title}
                          </p>
                          <span className="text-[10px] text-[#6e797b]">{item.time}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-[#e2efff]">
                    <button
                      onClick={() => {
                        handleNavigate('relatorios');
                        setShowNotifications(false);
                      }}
                      className="w-full py-1.5 text-center text-xs text-[#00616a] font-semibold hover:underline"
                    >
                      Ver todos os insights de estoque →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar & Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                  setShowUnitDropdown(false);
                }}
                aria-label="Perfil do usuário"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:ring-2 hover:ring-[#00616a]/30 transition-all"
                type="button"
              >
                {!avatarError ? (
                  <img
                    src={USER_AVATAR_URL}
                    alt="Mariana Souza - Coordenadora de Almoxarifado"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-[#00616a]/20 shadow-xs"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#087c87] text-white flex items-center justify-center font-bold text-xs">
                    MS
                  </div>
                )}
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-[#bdc9ca]/30 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-[#edf4ff]">
                    <img
                      src={USER_AVATAR_URL}
                      alt="Mariana Souza"
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-[#00616a]/30"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs text-[#001d32] truncate">
                        Mariana Souza Rocha
                      </span>
                      <span className="text-[10px] text-[#2b6676] font-medium truncate">
                        Coordenadora de Almoxarifado
                      </span>
                      <span className="text-[9px] text-[#6e797b]">Matrícula #1042</span>
                    </div>
                  </div>

                  <div className="py-2 space-y-1">
                    <button
                      onClick={() => {
                        handleNavigate('inventario');
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#001d32] hover:bg-[#edf4ff] flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#00616a]">
                        fact_check
                      </span>
                      Auditoria de Inventário
                    </button>
                    <button
                      onClick={() => {
                        handleNavigate('relatorios');
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#001d32] hover:bg-[#edf4ff] flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#00616a]">
                        analytics
                      </span>
                      Painel Analítico
                    </button>
                  </div>

                  <div className="pt-2 border-t border-[#edf4ff]">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Encerrar Sessão
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sub row: Unit selector & current screen name */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Facility / Unit Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUnitDropdown(!showUnitDropdown);
                setShowNotifications(false);
                setShowProfileMenu(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e2efff] text-[#001d32] text-xs font-medium hover:bg-[#d7eaff] transition-colors max-w-[280px]"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-[#00616a]">warehouse</span>
              <span className="truncate">{activeUnit}</span>
              <span className="material-symbols-outlined text-[16px] text-[#6e797b]">
                expand_more
              </span>
            </button>

            {showUnitDropdown && (
              <div className="absolute left-0 top-9 w-72 bg-white rounded-xl shadow-xl border border-[#bdc9ca]/30 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[11px] text-[#6e797b] uppercase font-semibold">
                  Selecione a Unidade
                </div>
                {units.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      handleSelectUnit(u.name);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#edf4ff] transition-colors ${
                      activeUnit === u.name ? 'font-bold text-[#00616a] bg-[#edf4ff]/50' : 'text-[#001d32]'
                    }`}
                  >
                    <span className="truncate">{u.name}</span>
                    {activeUnit === u.name && (
                      <span className="material-symbols-outlined text-[16px] text-[#00616a]">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Screen Title */}
          <h1 className="text-xs text-[#00616a] font-bold truncate ml-auto tracking-tight hidden xs:block">
            {screenTitles[currentScreen] || 'Dashboard Operacional'}
          </h1>
        </div>
      </div>
    </header>
  );
};
