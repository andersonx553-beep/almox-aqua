import React, { useEffect, useState } from 'react';
import { AlmxLogo } from './AlmxLogo';
import { api } from '../api';

type DevelopmentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  defaultUnitId?: string | null;
};

interface LoginScreenProps {
  onLoginSuccess: (user: DevelopmentUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [users, setUsers] = useState<DevelopmentUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    api.listUsers()
      .then((data: DevelopmentUser[]) => {
        setUsers(data);
        if (data.length) setSelectedUserId(data[0].id);
        else setIsRegistering(true);
      })
      .catch(() => setIsRegistering(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = isRegistering
        ? await api.createUser({ name, email })
        : await api.selectUser(selectedUserId);
      localStorage.setItem('almx.userId', data.user.id);
      localStorage.setItem('almx.userName', data.user.name);
      localStorage.setItem('almx.unitId', data.user.defaultUnitId || '');
      setLoading(false);
      setAuthenticated(true);
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 700);
    } catch (error) {
      setLoading(false);
      window.alert(error instanceof Error ? error.message : 'Não foi possível entrar.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#087c87] text-white px-4 py-8 selection:bg-[#97f1fd] selection:text-[#001f23]">
      {/* Subtle Logistics Grid & Node Topology Ambient Canvas */}
      <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center">
        <svg className="w-full h-full" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="logistics-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="0" cy="0" r="2" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#logistics-grid)" />
        </svg>
      </div>

      {/* Ambient Glow Blobs */}
      <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-[#7bd4e0]/20 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-20 w-80 h-80 rounded-full bg-[#0077b1]/30 blur-3xl pointer-events-none"></div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Branding Header */}
        <header className="flex flex-col items-center text-center mb-6">
          <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-lg mb-3 flex items-center justify-center border border-white/40">
            <AlmxLogo size="lg" />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[#ddfbff] tracking-tight">
            ALMX
          </h1>
          <p className="text-xs text-[#97f1fd] font-medium mt-0.5 opacity-95">
            Almoxarifado Inteligente & Gestão de Estoque
          </p>
        </header>

        {/* Authentication Card */}
        <main className="w-full bg-white text-[#001d32] rounded-3xl shadow-2xl p-6 sm:p-7 flex flex-col border border-white/60">
          {/* Welcome Copy */}
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold text-[#001d32] tracking-tight">
              Acesse sua conta
            </h2>
            <p className="text-xs text-[#3e494a] mt-1">
              Gerencie o fluxo de insumos e estoque da sua unidade
            </p>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            {/* Registered User Selector */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#3e494a]" htmlFor="development-user">
                  {isRegistering ? 'Cadastrar primeiro usuário' : 'Usuário em uso'}
                </label>
                <span className="text-[11px] font-semibold text-[#2b6676] bg-[#b0e8fc]/30 px-2 py-0.5 rounded-full">
                  Identificação local
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#6e797b] pointer-events-none text-[20px]">
                  person
                </span>
                {isRegistering ? (
                  <input
                    id="development-user"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do usuário"
                    className="w-full bg-[#edf4ff] text-[#001d32] text-sm pl-11 pr-4 py-2.5 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00616a]/30 transition-all"
                  />
                ) : (
                  <select
                    id="development-user"
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-[#edf4ff] text-[#001d32] text-sm pl-11 pr-10 py-2.5 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00616a]/30 transition-all appearance-none cursor-pointer"
                  >
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                )}
                <span className="material-symbols-outlined absolute right-3.5 text-[#6e797b] pointer-events-none text-[20px]">
                  {isRegistering ? 'edit' : 'expand_more'}
                </span>
              </div>
            </div>

            {isRegistering && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail (opcional)"
                className="w-full bg-[#edf4ff] text-[#001d32] text-sm px-3 py-2.5 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00616a]/30 transition-all"
              />
            )}

            {users.length > 0 && (
              <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-left text-xs text-[#00616a] font-semibold hover:underline">
                {isRegistering ? 'Selecionar usuário já cadastrado' : 'Cadastrar novo usuário'}
              </button>
            )}

            <div className="flex items-center gap-2 rounded-xl bg-[#edf4ff] px-3 py-2.5 text-xs text-[#3e494a]">
              <span className="material-symbols-outlined text-[18px] text-[#00616a]">warehouse</span>
              <span>A unidade disponível será definida pelos acessos reais do usuário.</span>
            </div>

            <p className="text-xs text-[#3e494a] pt-1">
              A seleção identifica quem está operando o ALMX e será registrada no histórico.
            </p>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-[#087c87] text-white font-semibold text-sm py-3 px-5 rounded-xl shadow-md hover:bg-[#00616a] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-80"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                  <span>Validando Acesso...</span>
                </>
              ) : authenticated ? (
                <>
                  <span>Sessão Autenticada</span>
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                </>
              )}
            </button>
          </form>

          {/* Security & Technical Badges Footer */}
          <footer className="mt-5 pt-3 bg-[#edf4ff]/60 rounded-xl p-3.5 flex flex-col space-y-2 border border-[#bdc9ca]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#00616a]">
                <span className="material-symbols-outlined text-[18px] fill-1">
                  verified_user
                </span>
                <span className="text-xs font-semibold">SSL 256-bit</span>
              </div>
              <div className="bg-[#e2efff] text-[#2b6676] px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold">
                ALMX v2.4 SaaS Enterprise
              </div>
            </div>

            <div className="flex items-center justify-between text-[#6e797b] text-xs pt-1 border-t border-[#bdc9ca]/20">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00616a] animate-pulse"></span>
                Nuvem Operacional Ativa
              </span>
              <button
                type="button"
                onClick={() => alert('Canal de Suporte TI ALMX: Ramal 4040 ou ti@aquaville.com.br')}
                className="text-[#2b6676] hover:text-[#00616a] flex items-center gap-1 font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">support_agent</span>
                <span>Suporte TI</span>
              </button>
            </div>
          </footer>
        </main>

        {/* Operational Notice / Shift Status */}
        <div className="mt-4 flex items-center gap-1.5 text-[#97f1fd] text-xs opacity-90">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          <span>Turno Vigente: Operação B (14h - 22h)</span>
        </div>
      </div>
    </div>
  );
};
