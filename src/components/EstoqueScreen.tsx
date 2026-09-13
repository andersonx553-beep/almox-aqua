import React, { useState } from 'react';
import { Product } from '../types';
import { ProductImage } from './ProductImage';

interface EstoqueScreenProps {
  products: Product[];
  initialFilter?: string;
  onNavigateToMovimentar: (sku: string, type: 'entrada' | 'saida') => void;
  showToast: (msg: string, icon?: string) => void;
}

export const EstoqueScreen: React.FC<EstoqueScreenProps> = ({
  products,
  initialFilter = 'all',
  onNavigateToMovimentar,
  showToast,
}) => {
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalTab, setModalTab] = useState<'lotes' | 'geral' | 'consumo' | 'historico'>('lotes');

  // Filter logic
  const filteredProducts = products.filter((item) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // Filter pills
    if (activeFilter === 'all') return true;
    if (activeFilter === 'critical') return item.status === 'critical';
    if (activeFilter === 'warning') return item.status === 'warning';
    if (activeFilter === 'normal') return item.status === 'normal';
    if (activeFilter === 'quimicos') return item.category === 'quimicos';
    if (activeFilter === 'manutencao') return item.category === 'manutencao';
    if (activeFilter === 'epi') return item.category === 'epi';
    if (activeFilter === 'curva-ab') return item.status === 'critical' || item.category === 'quimicos';

    return true;
  });

  const handleSimulateScan = (sku: string) => {
    setShowScanner(false);
    const prod = products.find((p) => p.sku === sku) || products[0];
    setSelectedProduct(prod);
    showToast(`Código de barras lido com sucesso: ${prod.sku}`, 'qr_code_scanner');
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto pb-28 pt-2">
      {/* Interactive Barcode Scanner Viewport Overlay */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-[#001d32]/95 backdrop-blur-md flex flex-col justify-between p-4 text-white animate-in fade-in duration-200">
          <div className="flex items-center justify-between pt-safe">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#97f1fd] text-[24px]">
                qr_code_scanner
              </span>
              <span className="font-display font-bold text-base tracking-wide text-white">
                Leitor Óptico ALMX
              </span>
            </div>
            <button
              onClick={() => setShowScanner(false)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Scanner Target Visual Area */}
          <div className="relative w-full max-w-xs mx-auto aspect-square rounded-3xl overflow-hidden flex items-center justify-center border-2 border-[#97f1fd]/40">
            <div className="absolute inset-0 bg-gradient-to-b from-[#00616a]/20 via-transparent to-[#00616a]/20"></div>
            <div className="relative w-64 h-64 rounded-2xl flex flex-col items-center justify-center p-4">
              {/* Laser Scan Animation */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#97f1fd] to-transparent animate-pulse shadow-[0_0_15px_#97f1fd]"></div>
              <span className="material-symbols-outlined text-[#97f1fd]/40 text-[96px] animate-pulse">
                barcode_reader
              </span>
              <p className="text-xs text-center text-[#d7eaff] mt-3 font-medium">
                Alinhe o código de barras ou QR code do item na moldura
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-center pb-safe max-w-sm mx-auto w-full">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-[#d7eaff] font-mono text-xs">
              <span className="material-symbols-outlined text-[16px] text-[#97f1fd]">
                flash_on
              </span>
              <span>Modo Contínuo Ativo</span>
            </div>
            <button
              onClick={() => handleSimulateScan('QUI-0021')}
              className="w-full py-3.5 rounded-2xl bg-[#00616a] text-white font-bold text-sm shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 hover:bg-[#087c87]"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">barcode</span>
              <span>Simular Leitura (QUI-0021)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Search & Trigger Bar */}
      <div className="px-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <span className="absolute left-3.5 material-symbols-outlined text-[#6e797b] text-[20px] pointer-events-none">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar SKU, nome, código de barras..."
              type="text"
              className="w-full pl-11 pr-10 py-2.5 rounded-2xl bg-white text-[#001d32] text-xs sm:text-sm placeholder:text-[#6e797b]/60 shadow-sm border border-[#bdc9ca]/25 focus:outline-none focus:ring-2 focus:ring-[#00616a]/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 w-6 h-6 rounded-full flex items-center justify-center text-[#6e797b] hover:text-[#001d32]"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowScanner(true)}
            aria-label="Escanear Código de Barras"
            className="flex-shrink-0 w-11 h-11 rounded-2xl bg-[#00616a] text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform hover:bg-[#087c87]"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">center_focus_strong</span>
          </button>
        </div>

        {/* Location Selector Breadcrumb */}
        <div className="flex items-center justify-between bg-[#edf4ff] px-3.5 py-2 rounded-xl border border-[#bdc9ca]/20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[#00616a] text-[18px] flex-shrink-0">
              shelves
            </span>
            <span className="text-xs text-[#001d32] font-semibold truncate">
              Corredor A • Prateleiras 01 a 04
            </span>
          </div>
          <button
            onClick={() => showToast('Filtro de localização ativo: Corredores A/B/C', 'tune')}
            className="flex items-center gap-0.5 text-[#00616a] font-bold text-xs pl-2 flex-shrink-0"
            type="button"
          >
            <span>Filtrar</span>
            <span className="material-symbols-outlined text-[16px]">tune</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Quick Filters Pills */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto px-4 no-scrollbar pb-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`filter-chip flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all ${
            activeFilter === 'all'
              ? 'bg-[#00616a] text-white'
              : 'bg-white text-[#3e494a] border border-[#bdc9ca]/20'
          }`}
          type="button"
        >
          <span>Todos</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 font-mono text-[10px]">
            1.248
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('normal')}
          className={`filter-chip flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all ${
            activeFilter === 'normal'
              ? 'bg-[#00616a] text-white'
              : 'bg-white text-[#3e494a] border border-[#bdc9ca]/20'
          }`}
          type="button"
        >
          <span className="w-2 h-2 rounded-full bg-[#2b6676]"></span>
          <span>Normal</span>
          <span className="text-[10px] opacity-75 font-mono">(1.180)</span>
        </button>

        <button
          onClick={() => setActiveFilter('warning')}
          className={`filter-chip flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all ${
            activeFilter === 'warning'
              ? 'bg-[#00616a] text-white'
              : 'bg-white text-[#3e494a] border border-[#bdc9ca]/20'
          }`}
          type="button"
        >
          <span className="w-2 h-2 rounded-full bg-[#306a7b]"></span>
          <span>Atenção</span>
          <span className="text-[10px] opacity-75 font-mono">(54)</span>
        </button>

        <button
          onClick={() => setActiveFilter('critical')}
          className={`filter-chip flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all ${
            activeFilter === 'critical'
              ? 'bg-[#ba1a1a] text-white'
              : 'bg-white text-[#3e494a] border border-[#bdc9ca]/20'
          }`}
          type="button"
        >
          <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
          <span>Crítico</span>
          <span className="text-white bg-[#ba1a1a] px-1 rounded font-mono text-[10px] font-bold">
            (14)
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('quimicos')}
          className={`filter-chip flex-shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all ${
            activeFilter === 'quimicos'
              ? 'bg-[#00616a] text-white'
              : 'bg-white text-[#3e494a] border border-[#bdc9ca]/20'
          }`}
          type="button"
        >
          <span>Químicos</span>
        </button>

        <button
          onClick={() => setActiveFilter('manutencao')}
          className={`filter-chip flex-shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all ${
            activeFilter === 'manutencao'
              ? 'bg-[#00616a] text-white'
              : 'bg-white text-[#3e494a] border border-[#bdc9ca]/20'
          }`}
          type="button"
        >
          <span>Manutenção</span>
        </button>

        <button
          onClick={() => setActiveFilter('epi')}
          className={`filter-chip flex-shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all ${
            activeFilter === 'epi'
              ? 'bg-[#00616a] text-white'
              : 'bg-white text-[#3e494a] border border-[#bdc9ca]/20'
          }`}
          type="button"
        >
          <span>EPI</span>
        </button>

        <button
          onClick={() => setActiveFilter('curva-ab')}
          className={`filter-chip flex-shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all ${
            activeFilter === 'curva-ab'
              ? 'bg-[#00616a] text-white'
              : 'bg-white text-[#3e494a] border border-[#bdc9ca]/20'
          }`}
          type="button"
        >
          <span>Curva A/B</span>
        </button>
      </div>

      {/* Product Count Indicator & Status Summary */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between text-[#3e494a]">
        <span className="text-xs font-medium">
          Mostrando {filteredProducts.length} itens prioritários
        </span>
        <button
          onClick={() => showToast('Ordenação por criticidade e giro aplicada', 'swap_vert')}
          className="text-xs text-[#00616a] font-semibold flex items-center gap-0.5"
          type="button"
        >
          <span>Mais Recentes</span>
          <span className="material-symbols-outlined text-[16px]">swap_vert</span>
        </button>
      </div>

      {/* Product List */}
      <div className="px-4 flex flex-col gap-3.5 mt-2">
        {filteredProducts.map((prod) => {
          const isCritical = prod.status === 'critical';
          const isWarning = prod.status === 'warning';
          const fillPercentage = Math.min(100, Math.round((prod.stock / prod.maxStock) * 100));

          return (
            <article
              key={prod.id}
              className="bg-white rounded-3xl p-4 shadow-sm border border-[#bdc9ca]/25 flex flex-col gap-2.5 relative overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="relative w-16 h-16 rounded-2xl bg-[#edf4ff] flex-shrink-0 overflow-hidden border border-[#bdc9ca]/20">
                  <ProductImage
                    src={prod.imageUrl}
                    alt={prod.imageAlt}
                    fallbackIcon={prod.icon}
                  />
                  <span className="absolute bottom-1 right-1 p-0.5 rounded-md bg-[#001d32]/80 text-white">
                    <span className="material-symbols-outlined text-[14px]">{prod.icon}</span>
                  </span>
                </div>

                {/* Info Header */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs text-[#00616a] font-bold tracking-tight">
                      SKU: {prod.sku}
                    </span>
                    {isCritical ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-ping"></span>
                        Crítico
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#b0e8fc] text-[#084e5e] text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2b6676]"></span>
                        Perto do Mínimo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e2efff] text-[#00616a] text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00616a]"></span>
                        Em Estoque
                      </span>
                    )}
                  </div>

                  <h2 className="font-display text-sm font-bold text-[#001d32] truncate mt-0.5">
                    {prod.name}
                  </h2>

                  <div className="flex items-center gap-1.5 text-[#6e797b] text-xs mt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-[#edf4ff] text-[#2b6676] font-semibold text-[10px]">
                      {prod.categoryLabel}
                    </span>
                    <span>•</span>
                    <span className="truncate">{prod.location}</span>
                  </div>
                </div>
              </div>

              {/* Stock Meter Progress & Levels */}
              <div className="bg-[#edf4ff] rounded-2xl p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-display text-xl font-bold ${
                        isCritical
                          ? 'text-[#ba1a1a]'
                          : isWarning
                          ? 'text-[#084e5e]'
                          : 'text-[#001d32]'
                      }`}
                    >
                      {prod.stock}
                    </span>
                    <span className="text-xs text-[#6e797b] font-medium">{prod.unit}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-[#3e494a]">
                    <span>
                      Mín: <strong className="text-[#001d32]">{prod.minStock}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Máx: <strong className="text-[#001d32]">{prod.maxStock}</strong>
                    </span>
                  </div>
                </div>

                {/* Progress Bar for Stock Fill */}
                <div className="w-full h-1.5 rounded-full bg-[#cde5ff] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical
                        ? 'bg-[#ba1a1a]'
                        : isWarning
                        ? 'bg-[#2b6676]'
                        : 'bg-[#00616a]'
                    }`}
                    style={{ width: `${fillPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Card Action Row */}
              <div className="flex items-center justify-between pt-0.5">
                <span
                  className={`text-[11px] flex items-center gap-1 font-semibold ${
                    isCritical
                      ? 'text-[#ba1a1a]'
                      : isWarning
                      ? 'text-[#2b6676]'
                      : 'text-[#6e797b]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isCritical ? 'warning' : isWarning ? 'info' : 'check_circle'}
                  </span>
                  {isCritical
                    ? `Reposição urgente (-${prod.minStock - prod.stock} un)`
                    : isWarning
                    ? 'Próximo do ponto de compra'
                    : `Nível saudável (${fillPercentage}%)`}
                </span>

                <button
                  onClick={() => setSelectedProduct(prod)}
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-[#087c87] text-white text-xs font-bold flex items-center gap-1 active:scale-95 shadow-xs hover:bg-[#00616a] transition-all"
                >
                  <span>Detalhes 360°</span>
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bottom Sheet Modal: Visão 360° do Item */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedProduct(null)}
            className="fixed inset-0 bg-[#001d32]/40 backdrop-blur-sm transition-opacity"
          ></div>

          {/* Sheet Body */}
          <section
            aria-labelledby="modalItemTitle"
            className="relative z-50 max-h-[85vh] bg-white rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 border-t border-[#bdc9ca]/30"
          >
            {/* Drag Handle and Header */}
            <div className="pt-3 pb-2 px-4 flex flex-col items-center flex-shrink-0 bg-white">
              <div className="w-12 h-1.5 rounded-full bg-[#bdc9ca]/60 mb-3"></div>
              <div className="w-full flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#edf4ff] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#bdc9ca]/20">
                    <ProductImage
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.imageAlt}
                      fallbackIcon={selectedProduct.icon}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#00616a]">
                        {selectedProduct.sku}
                      </span>
                      {selectedProduct.status === 'critical' ? (
                        <span className="px-2 py-0.2 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold">
                          Crítico
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded-full bg-[#e2efff] text-[#00616a] text-[10px] font-bold">
                          Ativo
                        </span>
                      )}
                    </div>
                    <h3
                      id="modalItemTitle"
                      className="font-display text-sm sm:text-base font-bold text-[#001d32] truncate mt-0.5"
                    >
                      {selectedProduct.name}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedProduct(null)}
                  aria-label="Fechar Detalhes"
                  className="w-9 h-9 rounded-full bg-[#edf4ff] flex items-center justify-center text-[#3e494a] hover:bg-[#e2efff] transition-colors active:scale-95 flex-shrink-0"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center px-4 border-b border-[#bdc9ca]/20 overflow-x-auto no-scrollbar flex-shrink-0 bg-[#f7f9ff]">
              <button
                onClick={() => setModalTab('lotes')}
                className={`px-3 py-2.5 text-xs whitespace-nowrap transition-all ${
                  modalTab === 'lotes'
                    ? 'text-[#00616a] font-bold border-b-2 border-[#00616a]'
                    : 'text-[#6e797b] hover:text-[#001d32]'
                }`}
                type="button"
              >
                Lotes & Validade
              </button>
              <button
                onClick={() => setModalTab('geral')}
                className={`px-3 py-2.5 text-xs whitespace-nowrap transition-all ${
                  modalTab === 'geral'
                    ? 'text-[#00616a] font-bold border-b-2 border-[#00616a]'
                    : 'text-[#6e797b] hover:text-[#001d32]'
                }`}
                type="button"
              >
                Informações Gerais
              </button>
              <button
                onClick={() => setModalTab('consumo')}
                className={`px-3 py-2.5 text-xs whitespace-nowrap transition-all ${
                  modalTab === 'consumo'
                    ? 'text-[#00616a] font-bold border-b-2 border-[#00616a]'
                    : 'text-[#6e797b] hover:text-[#001d32]'
                }`}
                type="button"
              >
                Consumo & Giro
              </button>
              <button
                onClick={() => setModalTab('historico')}
                className={`px-3 py-2.5 text-xs whitespace-nowrap transition-all ${
                  modalTab === 'historico'
                    ? 'text-[#00616a] font-bold border-b-2 border-[#00616a]'
                    : 'text-[#6e797b] hover:text-[#001d32]'
                }`}
                type="button"
              >
                Histórico
              </button>
            </div>

            {/* Scrollable Sheet Content */}
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3.5">
              {modalTab === 'lotes' && (
                <div className="flex flex-col gap-3.5">
                  {/* Batch Metadata Card */}
                  <div className="bg-[#edf4ff] rounded-2xl p-4 flex flex-col gap-2.5 border border-[#bdc9ca]/20">
                    <div className="flex items-center justify-between pb-2 border-b border-[#bdc9ca]/20">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#00616a] text-[18px]">
                          verified
                        </span>
                        <span className="text-xs font-bold text-[#001d32]">
                          Lote Principal em Uso
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#001d32] bg-white px-2 py-0.5 rounded-lg border border-[#bdc9ca]/25">
                        {selectedProduct.lot}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#6e797b]">Validade</span>
                        <span className="text-xs font-bold text-[#ba1a1a] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">event</span>
                          {selectedProduct.lotExpiration}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#6e797b]">Custo Médio Unitário</span>
                        <span className="font-mono text-xs font-bold text-[#001d32]">
                          R$ {selectedProduct.costPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col col-span-2 pt-1 border-t border-[#bdc9ca]/15">
                        <span className="text-[10px] text-[#6e797b]">Fornecedor Homologado</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="material-symbols-outlined text-[#2b6676] text-[16px]">
                            local_shipping
                          </span>
                          <span className="text-xs text-[#001d32] font-semibold truncate">
                            {selectedProduct.supplier}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Consumption Bar Chart Component */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#bdc9ca]/25 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#00616a] text-[18px]">
                          bar_chart
                        </span>
                        <span className="text-xs font-bold text-[#001d32]">
                          Consumo Semanal (Últimos 5 dias)
                        </span>
                      </div>
                      <span className="text-xs text-[#00616a] font-bold">25 un total</span>
                    </div>

                    {/* Inline Bar Chart Component */}
                    <div className="pt-3 pb-1 flex items-end justify-between h-28 gap-2 px-1">
                      {selectedProduct.weeklyConsumption.map((c, i) => {
                        const isMax = c.count === 8;
                        const heightPct = Math.round((c.count / 10) * 100);
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                          >
                            <span
                              className={`font-mono text-[10px] font-bold ${
                                isMax ? 'text-[#ba1a1a]' : 'text-[#6e797b]'
                              }`}
                            >
                              {c.count}
                            </span>
                            <div
                              className={`w-full rounded-t-md transition-all duration-300 ${
                                isMax ? 'bg-[#ba1a1a]/85' : 'bg-[#b0e8fc] hover:bg-[#00616a]'
                              }`}
                              style={{ height: `${heightPct}%` }}
                            ></div>
                            <span
                              className={`text-[10px] ${
                                isMax ? 'text-[#001d32] font-bold' : 'text-[#6e797b]'
                              }`}
                            >
                              {c.day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-[#6e797b] text-center pt-1">
                      Pico de demanda na sexta-feira devido à manutenção preventiva e fluxo de hóspedes.
                    </p>
                  </div>

                  {/* Location & Safe Storage Tag */}
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#edf4ff] text-[#001d32] border border-[#bdc9ca]/20">
                    <span className="material-symbols-outlined text-[#00616a] text-[20px]">
                      fmd_good
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#6e797b]">
                        Posicionamento Físico
                      </span>
                      <span className="text-xs font-semibold truncate">
                        {selectedProduct.location} • Posição Restrita
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'geral' && (
                <div className="flex flex-col gap-3 p-1">
                  <div className="p-3.5 bg-[#edf4ff] rounded-2xl text-xs space-y-1">
                    <h4 className="font-bold text-sm text-[#001d32]">Especificações Técnicas</h4>
                    <p className="text-[#3e494a] leading-relaxed">
                      {selectedProduct.technicalSpecs ||
                        'Insumo de almoxarifado em conformidade com as normas sanitárias e de controle de estoque do resort.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-white border border-[#bdc9ca]/25 rounded-xl">
                      <span className="text-[#6e797b] block text-[10px]">Unidade de Medida</span>
                      <strong className="text-[#001d32]">{selectedProduct.unit}</strong>
                    </div>
                    <div className="p-3 bg-white border border-[#bdc9ca]/25 rounded-xl">
                      <span className="text-[#6e797b] block text-[10px]">Categoria</span>
                      <strong className="text-[#001d32]">{selectedProduct.categoryLabel}</strong>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'consumo' && (
                <div className="flex flex-col gap-3 p-1 text-xs">
                  <div className="p-3.5 bg-[#edf4ff] rounded-2xl space-y-1">
                    <span className="font-bold text-sm text-[#001d32]">Giro & Cobertura</span>
                    <p className="text-[#3e494a] leading-relaxed">
                      Giro médio mensal: <strong>{selectedProduct.monthlyTurnover}</strong>. Dias
                      de cobertura com saldo atual: <strong>{selectedProduct.coverageDays} dias</strong>.
                    </p>
                  </div>
                </div>
              )}

              {modalTab === 'historico' && (
                <div className="flex flex-col gap-2 p-1 text-xs">
                  <div className="p-3 bg-[#edf4ff] rounded-xl flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#00616a]">
                      add_circle
                    </span>
                    <div>
                      <strong className="text-[#001d32] block">Última Entrada: NF-e 44921</strong>
                      <span className="text-[#6e797b]">02/11/2024 • +30 un por Química & Cia</span>
                    </div>
                  </div>
                  <div className="p-3 bg-[#edf4ff] rounded-xl flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#2b6676]">
                      remove_circle
                    </span>
                    <div>
                      <strong className="text-[#001d32] block">Última Saída: Req. Lazer</strong>
                      <span className="text-[#6e797b]">08/11/2024 • -4 un para Piscinas Térmicas</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Modal Action Bar */}
            <div className="p-4 bg-white border-t border-[#bdc9ca]/20 flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  onNavigateToMovimentar(selectedProduct.sku, 'entrada');
                }}
                className="flex-1 py-3 px-2 rounded-xl bg-[#edf4ff] text-[#00616a] font-bold text-xs hover:bg-[#e2efff] transition-colors flex items-center justify-center gap-1 active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                <span className="truncate">Ajustar Saldo</span>
              </button>
              <button
                onClick={() => {
                  showToast(
                    `Solicitação de compra gerada no ERP para ${selectedProduct.sku}!`,
                    'shopping_cart'
                  );
                }}
                className="flex-1 py-3 px-2 rounded-xl bg-[#00616a] text-white font-bold text-xs shadow-sm hover:bg-[#087c87] transition-colors flex items-center justify-center gap-1 active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  shopping_cart_checkout
                </span>
                <span className="truncate">Comprar</span>
              </button>
              <button
                onClick={() => {
                  showToast(
                    `Transferência de localização aberta para ${selectedProduct.name}`,
                    'swap_horiz'
                  );
                }}
                className="w-11 h-11 rounded-xl bg-[#edf4ff] text-[#001d32] flex items-center justify-center hover:bg-[#e2efff] transition-colors active:scale-95 flex-shrink-0"
                title="Transferir Local"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
