import React from 'react';
import { Movement, ScreenType } from '../types';

interface DashboardScreenProps {
  movements: Movement[];
  onNavigate: (screen: ScreenType, initialAction?: string) => void;
  onSelectCategoryFilter?: (cat: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  movements,
  onNavigate,
  onSelectCategoryFilter,
}) => {
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
    .format(new Date())
    .replace('.', '');

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 gap-4 pb-28 pt-2">
      {/* Top Banner Institucional */}
      <section className="w-full rounded-2xl bg-gradient-to-br from-[#edf4ff] via-white to-white p-4 shadow-sm border border-[#bdc9ca]/25">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00616a] animate-pulse"></span>
              <span className="text-[11px] text-[#2b6676] font-bold uppercase tracking-wider">
                Turno Ativo • 14 operando
              </span>
            </div>
            <h2 className="font-display text-base font-bold text-[#001d32] mt-0.5 truncate">
              AquaVille Resort - Depósito Central
            </h2>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-[#e2efff] text-[#001d32] font-mono text-xs flex items-center gap-1 flex-shrink-0 font-medium">
            <span className="material-symbols-outlined text-[14px] text-[#00616a]">
              calendar_today
            </span>
            <span>Hoje, {todayFormatted}</span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#bdc9ca]/20 flex items-center justify-between text-xs text-[#3e494a]">
          <div className="flex items-center gap-1 text-[#00616a] font-medium">
            <span className="material-symbols-outlined text-[16px] fill-1">verified_user</span>
            <span>Sincronização IA Ativa</span>
          </div>
          <span className="text-[#6e797b] text-[11px]">Última checagem: há 3 min</span>
        </div>
      </section>

      {/* Grade de KPIs Operacionais */}
      <section className="w-full flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display text-base font-bold text-[#001d32]">
            Visão em Tempo Real
          </h3>
          <span className="text-xs text-[#2b6676] flex items-center gap-1 font-medium">
            Tempo real
            <span className="material-symbols-outlined text-[14px]">sensors</span>
          </span>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {/* KPI 1: Total de Itens (Span 2) */}
          <div
            onClick={() => onNavigate('estoque')}
            className="col-span-2 rounded-2xl bg-white p-4 shadow-sm border border-[#bdc9ca]/20 relative overflow-hidden flex items-center justify-between cursor-pointer hover:border-[#00616a]/40 transition-all"
          >
            <div className="flex flex-col min-w-0 z-10">
              <span className="text-xs text-[#3e494a] font-medium">
                Total de Itens Cadastrados
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-display text-3xl font-extrabold text-[#001d32] tracking-tight">
                  1.248
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#b0e8fc] text-[#084e5e] text-xs font-bold inline-flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">trending_up</span>
                  +12 este mês
                </span>
              </div>
              <span className="text-xs text-[#6e797b] mt-1">
                98.4% de acuracidade física confirmada
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#b0e8fc]/40 flex items-center justify-center text-[#00616a] flex-shrink-0 z-10">
              <span className="material-symbols-outlined text-[26px]">inventory_2</span>
            </div>
            <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#00616a]/5 to-transparent pointer-events-none"></div>
          </div>

          {/* KPI 2: Abaixo do Mínimo */}
          <div
            onClick={() => onNavigate('estoque', 'critical')}
            className="rounded-2xl bg-[#ffdad6]/40 p-4 shadow-sm border border-[#ffdad6] flex flex-col justify-between min-w-0 cursor-pointer hover:bg-[#ffdad6]/60 transition-colors"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-[#ba1a1a] font-bold">Abaixo Mínimo</span>
              <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">warning</span>
            </div>
            <div className="mt-3 flex flex-col">
              <span className="font-display text-2xl font-extrabold text-[#ba1a1a] tracking-tight">
                14
              </span>
              <div className="mt-1">
                <span className="inline-block px-1.5 py-0.5 rounded bg-[#ba1a1a] text-white text-[10px] font-bold uppercase tracking-wider">
                  URGENTE
                </span>
              </div>
            </div>
          </div>

          {/* KPI 3: NFs Pendentes */}
          <div
            onClick={() => onNavigate('ocr')}
            className="rounded-2xl bg-[#0077b1]/10 p-4 shadow-sm border border-[#90cdff]/40 flex flex-col justify-between min-w-0 cursor-pointer hover:bg-[#0077b1]/15 transition-colors"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-[#005d8c] font-bold">NFs Pendentes</span>
              <span className="material-symbols-outlined text-[#005d8c] text-[20px]">
                description
              </span>
            </div>
            <div className="mt-3 flex flex-col">
              <span className="font-display text-2xl font-extrabold text-[#005d8c] tracking-tight">
                3
              </span>
              <div className="mt-1">
                <span className="inline-block px-1.5 py-0.5 rounded bg-[#005d8c] text-white text-[10px] font-medium tracking-wide">
                  Aguardando OCR
                </span>
              </div>
            </div>
          </div>

          {/* KPI 4: Entradas (Mês) */}
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-[#bdc9ca]/20 flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-[#3e494a] font-medium">Entradas (Mês)</span>
              <div className="w-7 h-7 rounded-lg bg-[#087c87]/15 flex items-center justify-center text-[#087c87]">
                <span className="material-symbols-outlined text-[16px]">south_west</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-2xl font-bold text-[#00616a]">182</span>
              <span className="text-xs text-[#6e797b]">remessas</span>
            </div>
          </div>

          {/* KPI 5: Saídas (Mês) */}
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-[#bdc9ca]/20 flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-[#3e494a] font-medium">Saídas (Mês)</span>
              <div className="w-7 h-7 rounded-lg bg-[#e2efff] flex items-center justify-center text-[#2b6676]">
                <span className="material-symbols-outlined text-[16px]">north_east</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-2xl font-bold text-[#2b6676]">341</span>
              <span className="text-xs text-[#6e797b]">requisições</span>
            </div>
          </div>
        </div>
      </section>

      {/* Ações Imediatas */}
      <section className="w-full flex flex-col gap-2">
        <span className="text-xs text-[#6e797b] font-bold uppercase tracking-wider px-1">
          Ações Imediatas
        </span>
        <div className="grid grid-cols-3 gap-2">
          {/* Botão + Nova Entrada */}
          <button
            onClick={() => onNavigate('movimentar', 'entrada')}
            className="flex flex-col items-center justify-center gap-1.5 p-3 h-20 rounded-2xl bg-[#087c87] text-white shadow-sm hover:bg-[#00616a] active:scale-95 transition-all text-center"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">add_circle</span>
            <span className="text-xs font-bold leading-tight">+ Nova Entrada</span>
          </button>

          {/* Botão - Nova Saída */}
          <button
            onClick={() => onNavigate('movimentar', 'saida')}
            className="flex flex-col items-center justify-center gap-1.5 p-3 h-20 rounded-2xl bg-white text-[#00616a] shadow-sm hover:bg-[#edf4ff] border border-[#bdc9ca]/25 active:scale-95 transition-all text-center"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">remove_circle_outline</span>
            <span className="text-xs font-bold leading-tight">- Nova Saída</span>
          </button>

          {/* Botão Importar NF */}
          <button
            onClick={() => onNavigate('ocr')}
            className="relative flex flex-col items-center justify-center gap-1.5 p-3 h-20 rounded-2xl bg-[#0077b1] text-white shadow-sm hover:bg-[#005d8c] active:scale-95 transition-all text-center overflow-hidden"
            type="button"
          >
            <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded bg-[#b3ebff] text-[#001f27] text-[9px] font-extrabold">
              IA
            </span>
            <span className="material-symbols-outlined text-[24px]">document_scanner</span>
            <span className="text-xs font-bold leading-tight">Importar NF</span>
          </button>
        </div>
      </section>

      {/* Seção Alertas de Validade Próxima */}
      <section className="w-full flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">
              notification_important
            </span>
            <h3 className="font-display text-sm font-bold text-[#001d32]">Validade Crítica</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold">
            2 alertas
          </span>
        </div>

        {/* Alert Cards */}
        <div className="flex flex-col gap-2">
          {/* Alerta 1 */}
          <div
            onClick={() => onNavigate('estoque')}
            className="rounded-2xl bg-white p-3.5 shadow-sm border border-[#bdc9ca]/25 flex items-center justify-between gap-3 cursor-pointer hover:border-[#ba1a1a]/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#ffdad6]/60 flex items-center justify-center text-[#ba1a1a] flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">science</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#001d32] truncate">
                  Cloro granulado 10kg
                </span>
                <span className="text-[11px] text-[#3e494a]">
                  Lote #4410 • Almox. B - Rua 02
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="px-2 py-1 rounded-lg bg-[#ba1a1a] text-white text-[11px] font-bold tracking-tight">
                Vence em 6 dias
              </span>
              <span className="font-mono text-[11px] text-[#ba1a1a] mt-0.5 font-semibold">
                18 baldes rest.
              </span>
            </div>
          </div>

          {/* Alerta 2 */}
          <div
            onClick={() => onNavigate('estoque')}
            className="rounded-2xl bg-white p-3.5 shadow-sm border border-[#bdc9ca]/25 flex items-center justify-between gap-3 cursor-pointer hover:border-[#00616a]/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#edf4ff] flex items-center justify-center text-[#2b6676] flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">sanitizer</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#001d32] truncate">
                  Detergente enzimático 5L
                </span>
                <span className="text-[11px] text-[#3e494a]">
                  Lote #9822 • 8 unidades em estoque
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="px-2 py-1 rounded-lg bg-[#cde5ff] text-[#001d32] text-[11px] font-bold tracking-tight">
                Vence em 14 dias
              </span>
              <span className="font-mono text-[11px] text-[#3e494a] mt-0.5">
                Substituir lote
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Estoque por Categoria */}
      <section className="w-full rounded-2xl bg-white p-4 shadow-sm border border-[#bdc9ca]/25 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#00616a]">
              pie_chart
            </span>
            <h3 className="font-display text-sm font-bold text-[#001d32]">
              Estoque por Categoria
            </h3>
          </div>
          <span className="font-mono text-xs text-[#6e797b]">100% alocado</span>
        </div>

        {/* Multi-Segment Visual Progress Bar */}
        <div className="w-full h-3 rounded-full bg-[#edf4ff] flex overflow-hidden">
          <div
            className="h-full bg-[#087c87] hover:opacity-90 transition-all cursor-pointer"
            style={{ width: '35%' }}
            title="Químicos 35%"
            onClick={() => onSelectCategoryFilter?.('quimicos')}
          />
          <div
            className="h-full bg-[#0077b1] hover:opacity-90 transition-all cursor-pointer"
            style={{ width: '28%' }}
            title="Alimentos/Bebidas 28%"
            onClick={() => onSelectCategoryFilter?.('alimentos')}
          />
          <div
            className="h-full bg-[#2b6676] hover:opacity-90 transition-all cursor-pointer"
            style={{ width: '22%' }}
            title="Manutenção 22%"
            onClick={() => onSelectCategoryFilter?.('manutencao')}
          />
          <div
            className="h-full bg-[#bdc9ca] hover:opacity-90 transition-all cursor-pointer"
            style={{ width: '15%' }}
            title="Rouparia 15%"
            onClick={() => onSelectCategoryFilter?.('rouparia')}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
          <button
            onClick={() => onSelectCategoryFilter?.('quimicos')}
            className="flex items-center justify-between text-left hover:bg-[#edf4ff] p-1 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#087c87] flex-shrink-0"></span>
              <span className="text-xs text-[#3e494a] truncate">Químicos</span>
            </div>
            <span className="font-mono text-xs font-bold text-[#001d32]">35%</span>
          </button>
          <button
            onClick={() => onSelectCategoryFilter?.('alimentos')}
            className="flex items-center justify-between text-left hover:bg-[#edf4ff] p-1 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0077b1] flex-shrink-0"></span>
              <span className="text-xs text-[#3e494a] truncate">Alimentos & Beb.</span>
            </div>
            <span className="font-mono text-xs font-bold text-[#001d32]">28%</span>
          </button>
          <button
            onClick={() => onSelectCategoryFilter?.('manutencao')}
            className="flex items-center justify-between text-left hover:bg-[#edf4ff] p-1 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2b6676] flex-shrink-0"></span>
              <span className="text-xs text-[#3e494a] truncate">Manutenção</span>
            </div>
            <span className="font-mono text-xs font-bold text-[#001d32]">22%</span>
          </button>
          <button
            onClick={() => onSelectCategoryFilter?.('rouparia')}
            className="flex items-center justify-between text-left hover:bg-[#edf4ff] p-1 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#bdc9ca] flex-shrink-0"></span>
              <span className="text-xs text-[#3e494a] truncate">Rouparia</span>
            </div>
            <span className="font-mono text-xs font-bold text-[#001d32]">15%</span>
          </button>
        </div>
      </section>

      {/* Lista: Últimas Movimentações */}
      <section className="w-full flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#00616a]">
              history
            </span>
            <h3 className="font-display text-sm font-bold text-[#001d32]">
              Últimas Movimentações
            </h3>
          </div>
          <span className="text-xs text-[#6e797b]">Recentes</span>
        </div>

        <div className="flex flex-col gap-2">
          {movements.slice(0, 4).map((mov) => {
            const isEntry = mov.type === 'entrada';
            return (
              <div
                key={mov.id}
                className="rounded-2xl bg-white p-3.5 shadow-sm border border-[#bdc9ca]/25 flex items-center justify-between gap-3 active:bg-[#edf4ff] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isEntry
                        ? 'bg-[#087c87]/15 text-[#00616a]'
                        : 'bg-[#b0e8fc]/40 text-[#2b6676]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isEntry ? 'add' : 'remove'}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#001d32] truncate">
                      {mov.itemName}
                    </span>
                    <span className="text-[11px] text-[#6e797b] truncate">
                      {mov.user} • {mov.timeAgo}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span
                    className={`font-mono text-xs font-bold ${
                      isEntry ? 'text-[#00616a]' : 'text-[#2b6676]'
                    }`}
                  >
                    {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                  </span>
                  <span className="font-mono text-[10px] text-[#6e797b]">{mov.code}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Link Ver Histórico Completo */}
        <button
          onClick={() => onNavigate('movimentar')}
          className="w-full py-2.5 mt-1 rounded-xl bg-[#e2efff] text-[#00616a] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#d7eaff] active:scale-[0.99] transition-all"
        >
          <span>Ver histórico completo de movimentações</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </section>
    </div>
  );
};
