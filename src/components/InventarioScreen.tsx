import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { ProductImage } from './ProductImage';

interface InventarioScreenProps {
  items: InventoryItem[];
  showToast: (msg: string, icon?: string) => void;
  onApproveAudit: () => void;
}

export const InventarioScreen: React.FC<InventarioScreenProps> = ({
  items: initialItems,
  showToast,
  onApproveAudit,
}) => {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);

  const handleStep = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newCount = Math.max(0, item.physicalCount + delta);
        const diff = newCount - item.systemStock;
        const discType = diff < 0 ? 'shortage' : diff > 0 ? 'surplus' : 'none';
        return {
          ...item,
          physicalCount: newCount,
          discrepancyQty: diff,
          discrepancyType: discType,
        };
      })
    );
    showToast('Contagem física atualizada!', 'fact_check');
  };

  const shortagesCount = items.filter((i) => i.discrepancyType === 'shortage').length;
  const surplusesCount = items.filter((i) => i.discrepancyType === 'surplus').length;
  const totalDivergences = shortagesCount + surplusesCount;

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto pb-32 pt-2 px-4 space-y-4">
      {/* Header Card: Inventory Context & Auditor Identity */}
      <section className="rounded-2xl bg-white p-4 shadow-sm border border-[#bdc9ca]/25 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#b0e8fc]/20 pointer-events-none"></div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00616a]/10 text-[#00616a] text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00616a] animate-pulse"></span>
                Ciclo Ativo
              </span>
              <span className="text-xs text-[#6e797b] font-medium">Q4 • Auditoria Real-Time</span>
            </div>
            <h2 className="font-display text-lg font-bold text-[#001d32] truncate">
              Inventário Físico Ciclo Q4
            </h2>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#edf4ff] text-[#001d32] text-xs shadow-xs flex-shrink-0">
            <span className="material-symbols-outlined text-[16px] text-[#00616a] fill-1">
              check_circle
            </span>
            <span className="font-bold text-[#00616a]">78%</span>
          </div>
        </div>

        {/* Active Location & Responsible Personnel */}
        <div className="mt-3 flex flex-col gap-1.5 bg-[#edf4ff] p-3 rounded-xl border border-[#bdc9ca]/20">
          <div className="flex items-center gap-1.5 text-[#001d32]">
            <span className="material-symbols-outlined text-[18px] text-[#2b6676]">
              share_location
            </span>
            <span className="text-xs font-semibold truncate">
              Setor Químicos & Limpeza • Corredores A e B
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#6e797b]">badge</span>
              <span className="text-xs text-[#3e494a] truncate">
                Carlos Mendes (Conferente Sênior)
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#004e5e] bg-[#b0e8fc] px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[12px]">security</span>
              Nível 2
            </span>
          </div>
        </div>

        {/* Progress Bar with tactile dots */}
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs text-[#3e494a]">
            <span className="font-semibold">Progresso da Amostragem</span>
            <span className="text-[#00616a] font-bold">24 de 30 itens conferidos</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#edf4ff] overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-[#087c87] transition-all duration-500"
              style={{ width: '78%' }}
            ></div>
          </div>
        </div>
      </section>

      {/* KPI Banner: Divergences and Financial Impact */}
      <section className="grid grid-cols-3 gap-2">
        {/* Metric 1 */}
        <div className="flex flex-col p-3 rounded-2xl bg-white shadow-sm border border-[#bdc9ca]/25">
          <span className="text-[11px] text-[#6e797b] font-medium">Conferidos</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-display text-base font-bold text-[#001d32]">24</span>
            <span className="font-mono text-xs text-[#6e797b]">/30</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[#00616a]">
            <span className="material-symbols-outlined text-[14px]">checklist_rtl</span>
            <span className="text-[10px] font-bold">80% meta</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="flex flex-col p-3 rounded-2xl bg-white shadow-sm border border-[#bdc9ca]/25">
          <span className="text-[11px] text-[#6e797b] font-medium">Divergências</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-display text-base font-bold text-[#ba1a1a]">
              {totalDivergences}
            </span>
            <span className="text-[11px] text-[#6e797b]">itens</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6e797b]">
            <span className="text-[#ba1a1a] font-bold">{shortagesCount} faltas</span> •{' '}
            <span className="text-[#2b6676] font-bold">{surplusesCount} sobra</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="flex flex-col p-3 rounded-2xl bg-white shadow-sm border border-[#bdc9ca]/25">
          <span className="text-[11px] text-[#6e797b] font-medium">Impacto Fin.</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-display text-xs sm:text-sm font-bold text-[#ba1a1a]">
              -R$ 340
            </span>
          </div>
          <div className="mt-1 flex items-center gap-0.5 text-[#ba1a1a]">
            <span className="material-symbols-outlined text-[13px]">trending_down</span>
            <span className="text-[10px] font-semibold">Ajuste prov.</span>
          </div>
        </div>
      </section>

      {/* Barcode Scanner Field Trigger */}
      <section>
        <button
          onClick={() => showToast('Leitor óptico ativado para conferência cega!', 'qr_code_scanner')}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#087c87] text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.98] hover:bg-[#00616a] transition-all font-bold text-xs sm:text-sm"
          type="button"
        >
          <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
          <span>Escanear Próximo Item com Câmera</span>
        </button>
      </section>

      {/* Filter & List Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-sm font-bold text-[#001d32]">Itens Auditados</span>
          <span className="px-2 py-0.5 rounded-full bg-[#e2efff] text-[#001d32] font-mono text-xs font-bold">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[#6e797b]">
          <button
            onClick={() => showToast('Filtrando apenas itens com divergência', 'filter_list')}
            className="p-1.5 rounded-lg hover:bg-[#edf4ff] transition-colors"
            title="Filtrar divergências"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-[#00616a]">
              filter_list
            </span>
          </button>
          <button
            onClick={() => showToast('Ordenando por localização física', 'sort_by_alpha')}
            className="p-1.5 rounded-lg hover:bg-[#edf4ff] transition-colors"
            title="Ordenar por localização"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">sort_by_alpha</span>
          </button>
        </div>
      </div>

      {/* Audited Items List */}
      <div className="flex flex-col gap-3">
        {items.map((it) => {
          const isShortage = it.discrepancyType === 'shortage';
          const isSurplus = it.discrepancyType === 'surplus';
          const isMatch = it.discrepancyType === 'none';

          return (
            <article
              key={it.id}
              className="rounded-2xl bg-white p-4 shadow-sm border border-[#bdc9ca]/25 flex flex-col gap-2.5 relative overflow-hidden transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-[#edf4ff] flex-shrink-0 overflow-hidden border border-[#bdc9ca]/20">
                    <ProductImage src={it.imageUrl} alt={it.imageAlt} fallbackIcon="inventory_2" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-xs text-[#00616a] font-bold">{it.sku}</span>
                    <h3 className="text-xs sm:text-sm font-bold text-[#001d32] truncate leading-tight">
                      {it.name}
                    </h3>
                    <div className="mt-1 inline-flex items-center gap-1 text-[#6e797b] text-[11px]">
                      <span className="material-symbols-outlined text-[13px] text-[#00616a]">
                        shelves
                      </span>
                      <span className="truncate">{it.location}</span>
                    </div>
                  </div>
                </div>

                {/* Stock Tag Badge */}
                {isShortage ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span>
                    {it.discrepancyQty} un (Falta)
                  </span>
                ) : isSurplus ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#b0e8fc] text-[#084e5e] text-xs font-bold flex-shrink-0">
                    <span className="material-symbols-outlined text-[14px] text-[#2b6676]">
                      add_circle
                    </span>
                    +{it.discrepancyQty} un (Sobra)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00616a]/10 text-[#00616a] text-xs font-bold flex-shrink-0">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Match Perfeito (0)
                  </span>
                )}
              </div>

              {/* Quantity Counting Counter Grid */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#edf4ff] items-center border border-[#bdc9ca]/20">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#6e797b] font-medium">Estoque Sistema</span>
                  <span className="font-mono text-sm sm:text-base font-bold text-[#001d32]">
                    {it.systemStock} <span className="text-xs font-normal text-[#6e797b]">un</span>
                  </span>
                </div>

                <div className="flex flex-col items-end">
                  <label className="text-[11px] text-[#6e797b] mb-1 font-semibold">
                    Contagem Física
                  </label>
                  <div className="flex items-center bg-white rounded-xl shadow-xs p-0.5 border border-[#bdc9ca]/20">
                    <button
                      onClick={() => handleStep(it.id, -1)}
                      className="w-8 h-8 rounded-lg bg-[#edf4ff] flex items-center justify-center text-[#001d32] active:scale-95 transition-all hover:bg-[#d7eaff]"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={it.physicalCount}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        const diff = val - it.systemStock;
                        const discType = diff < 0 ? 'shortage' : diff > 0 ? 'surplus' : 'none';
                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === it.id
                              ? {
                                  ...item,
                                  physicalCount: val,
                                  discrepancyQty: diff,
                                  discrepancyType: discType,
                                }
                              : item
                          )
                        );
                      }}
                      className={`w-12 h-8 text-center text-sm font-bold bg-transparent outline-none ${
                        isShortage
                          ? 'text-[#ba1a1a]'
                          : isSurplus
                          ? 'text-[#2b6676]'
                          : 'text-[#00616a]'
                      }`}
                    />
                    <button
                      onClick={() => handleStep(it.id, 1)}
                      className="w-8 h-8 rounded-lg bg-[#edf4ff] flex items-center justify-center text-[#001d32] active:scale-95 transition-all hover:bg-[#d7eaff]"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Explanation or confirmation */}
              {it.divergenceReason && (
                <div className="flex flex-col gap-1 pt-0.5">
                  <div className="flex items-center justify-between text-[#6e797b]">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isShortage ? 'text-[#ba1a1a]' : 'text-[#2b6676]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isShortage ? 'warning' : 'info'}
                      </span>
                      {isShortage ? 'Motivo da Divergência:' : 'Origem da Sobra:'}
                    </span>
                    <button
                      onClick={() =>
                        showToast(`Edição aberta para ${it.sku}`, 'edit')
                      }
                      className="text-[11px] text-[#00616a] font-bold hover:underline"
                      type="button"
                    >
                      Alterar
                    </button>
                  </div>
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-start gap-1.5 border ${
                      isShortage
                        ? 'bg-[#ffdad6]/40 text-[#93000a] border-[#ffdad6]'
                        : 'bg-[#b0e8fc]/30 text-[#084e5e] border-[#b0e8fc]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5">
                      {isShortage ? 'report_problem' : 'assignment_return'}
                    </span>
                    <span className="leading-snug">{it.divergenceReason}</span>
                  </div>
                </div>
              )}

              {isMatch && (
                <div className="flex items-center justify-between text-[#6e797b] pt-0.5 text-xs">
                  <span className="flex items-center gap-1 text-[#00616a] font-medium">
                    <span className="material-symbols-outlined text-[16px] fill-1">verified</span>
                    Validado por leitura óptica de lote
                  </span>
                  <span className="font-mono text-[11px]">{it.lotNumber || 'Lote #9940'}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Bottom Closing Actions */}
      <section className="flex flex-col gap-2.5 pt-2">
        <button
          onClick={() => showToast('Rascunho salvo em cache seguro offline.', 'save')}
          className="w-full py-3 px-4 rounded-xl bg-white border border-[#bdc9ca]/30 text-[#001d32] font-bold text-xs flex items-center justify-center gap-2 active:bg-[#edf4ff] transition-colors shadow-xs"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px] text-[#00616a]">save</span>
          Salvar Rascunho da Contagem
        </button>

        <div className="flex flex-col gap-1">
          <button
            onClick={onApproveAudit}
            className="w-full py-3.5 px-4 rounded-xl bg-[#087c87] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] hover:bg-[#00616a] transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">published_with_changes</span>
            <span>Aprovar e Ajustar Saldo Automaticamente</span>
          </button>
          <div className="flex items-center justify-center gap-1 text-[#6e797b] text-[11px] text-center mt-1">
            <span className="material-symbols-outlined text-[14px] text-[#00616a]">
              verified_user
            </span>
            <span>Requer Chave Gerencial • Impacto contábil registrado via Blockchain ALMX</span>
          </div>
        </div>
      </section>
    </div>
  );
};
