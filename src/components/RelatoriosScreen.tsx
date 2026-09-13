import React, { useState } from 'react';
import { Product, Movement, ScreenType } from '../types';

interface RelatoriosScreenProps {
  products: Product[];
  movements: Movement[];
  onNavigate: (screen: ScreenType, initialAction?: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const RelatoriosScreen: React.FC<RelatoriosScreenProps> = ({
  products,
  movements,
  onNavigate,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'ia' | 'consumo' | 'abc' | 'conformidade'>('ia');
  const [isExporting, setIsExporting] = useState(false);

  const criticalProducts = products.filter((p) => p.status === 'critical');
  const warningProducts = products.filter((p) => p.status === 'warning');

  const handleExport = (format: 'pdf' | 'excel') => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      showToast(
        `Relatório exportado em ${format.toUpperCase()} com sucesso! Arquivo gravado.`,
        'file_download'
      );
    }, 1000);
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 gap-4 pb-28 pt-2">
      {/* Header Banner */}
      <section className="w-full rounded-2xl bg-gradient-to-br from-[#e0f3f8] via-white to-white p-4 shadow-sm border border-[#00616a]/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#00616a] text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-[#00616a] tracking-wider bg-[#b0e8fc]/40 px-2 py-0.5 rounded-full">
                  IA ALMX Assist 3.0
                </span>
                <span className="w-2 h-2 rounded-full bg-[#087c87] animate-pulse"></span>
              </div>
              <h2 className="text-lg font-bold text-[#001d32] mt-0.5">
                Relatórios Analíticos & Previsão IA
              </h2>
            </div>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-1.5 rounded-lg text-[#3e494a] hover:bg-[#edf4ff] transition-colors"
            title="Voltar ao Dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <p className="text-xs text-[#3e494a] mt-2.5 leading-relaxed">
          Monitoramento preditivo de giro, sugestões automatizadas de reposição e auditoria de
          conformidade fiscal para o Depósito Central.
        </p>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 mt-3.5 p-1 bg-[#edf4ff] rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('ia')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'ia'
                ? 'bg-white text-[#00616a] shadow-sm'
                : 'text-[#3e494a] hover:text-[#001d32]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            Previsão & Sugestões IA
          </button>
          <button
            onClick={() => setActiveTab('consumo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'consumo'
                ? 'bg-white text-[#00616a] shadow-sm'
                : 'text-[#3e494a] hover:text-[#001d32]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            Giro por Setor
          </button>
          <button
            onClick={() => setActiveTab('abc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'abc'
                ? 'bg-white text-[#00616a] shadow-sm'
                : 'text-[#3e494a] hover:text-[#001d32]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">pie_chart</span>
            Curva ABC
          </button>
          <button
            onClick={() => setActiveTab('conformidade')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'conformidade'
                ? 'bg-white text-[#00616a] shadow-sm'
                : 'text-[#3e494a] hover:text-[#001d32]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Auditoria & Lotes
          </button>
        </div>
      </section>

      {/* Tab: IA Previsão */}
      {activeTab === 'ia' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Card 1: Ruptura Iminente */}
          <div className="p-4 rounded-2xl bg-white border border-[#ba1a1a]/30 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[18px]">emergency</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#ba1a1a] uppercase tracking-wider">
                    Alerta de Ruptura Iminente (2.4 Dias)
                  </h3>
                  <span className="text-sm font-bold text-[#001d32]">
                    QUI-0021 • Cloro Líquido Concentrado 50L
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full">
                Crítico
              </span>
            </div>
            <p className="text-xs text-[#3e494a] mt-2 leading-relaxed">
              Consumo diário médio de <strong>4.2 unidades</strong> com saldo de apenas 8 unidades. O
              lead time do fornecedor é de 3 dias úteis. Recomenda-se pedido imediato de{' '}
              <strong>30 unidades</strong>.
            </p>
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#edf4ff]">
              <button
                onClick={() => onNavigate('movimentar', 'entrada')}
                className="px-3 py-1.5 rounded-lg bg-[#00616a] text-white text-xs font-semibold hover:bg-[#004f56] transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                Lançar Pedido de Compra
              </button>
              <button
                onClick={() => onNavigate('estoque', 'critical')}
                className="px-3 py-1.5 rounded-lg bg-[#edf4ff] text-[#001d32] text-xs font-semibold hover:bg-[#dbeaff] transition-colors"
              >
                Ver no Estoque
              </button>
            </div>
          </div>

          {/* Card 2: IA Sugestão de Otimização */}
          <div className="p-4 rounded-2xl bg-white border border-[#bdc9ca]/25 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#b0e8fc]/40 text-[#00616a] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#00616a]">
                  Otimização de Lote Econômico de Compra (LEC)
                </h4>
                <span className="text-xs text-[#6e797b]">EPI-0540 • Óculos de Proteção UV</span>
              </div>
            </div>
            <p className="text-xs text-[#3e494a] leading-relaxed">
              Comprando em lotes de 20 unidades, o custo unitário reduz de R$ 18,90 para R$ 14,20 com
              a Distribuidora Master Segurança. Economia estimada: <strong>R$ 376,00/mês</strong>.
            </p>
          </div>

          {/* Card 3: Status dos Itens Críticos */}
          <div className="p-4 rounded-2xl bg-white border border-[#bdc9ca]/25 shadow-sm">
            <h4 className="text-xs font-bold text-[#001d32] uppercase tracking-wider mb-2">
              Resumo Operacional de Risco
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-[#ffdad6]/40 border border-[#ba1a1a]/20">
                <span className="text-[11px] text-[#ba1a1a] font-semibold">Abaixo do Mínimo</span>
                <p className="text-lg font-bold text-[#ba1a1a] mt-0.5">
                  {criticalProducts.length} itens
                </p>
                <span className="text-[10px] text-[#ba1a1a]">Requer compra imediata</span>
              </div>
              <div className="p-3 rounded-xl bg-[#fff8e1] border border-[#f57c00]/30">
                <span className="text-[11px] text-[#e65100] font-semibold">Atenção / Atenuado</span>
                <p className="text-lg font-bold text-[#e65100] mt-0.5">
                  {warningProducts.length} itens
                </p>
                <span className="text-[10px] text-[#e65100]">Cobertura de 4 a 7 dias</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Consumo por Setor */}
      {activeTab === 'consumo' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-white border border-[#bdc9ca]/25 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-[#001d32] uppercase tracking-wider">
              Distribuição de Saídas por Centro de Custo (Mês Vigente)
            </h3>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-[#001d32]">Governança & Rouparia</span>
                <span className="font-bold text-[#00616a]">42% • R$ 14.820,00</span>
              </div>
              <div className="w-full bg-[#edf4ff] rounded-full h-2">
                <div className="bg-[#00616a] h-2 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-[#001d32]">Manutenção Predial & Elétrica</span>
                <span className="font-bold text-[#00616a]">31% • R$ 10.940,00</span>
              </div>
              <div className="w-full bg-[#edf4ff] rounded-full h-2">
                <div className="bg-[#00616a] h-2 rounded-full" style={{ width: '31%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-[#001d32]">Parque Aquático & Piscinas</span>
                <span className="font-bold text-[#ba1a1a]">19% • R$ 6.700,00</span>
              </div>
              <div className="w-full bg-[#edf4ff] rounded-full h-2">
                <div className="bg-[#ba1a1a] h-2 rounded-full" style={{ width: '19%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-[#001d32]">Alimentos & Bebidas (Suporte)</span>
                <span className="font-bold text-[#00616a]">8% • R$ 2.820,00</span>
              </div>
              <div className="w-full bg-[#edf4ff] rounded-full h-2">
                <div className="bg-[#74d3df] h-2 rounded-full" style={{ width: '8%' }}></div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#bdc9ca]/25 shadow-sm">
            <h4 className="text-xs font-bold text-[#001d32] uppercase tracking-wider mb-2">
              Últimas 5 Movimentações no Almoxarifado
            </h4>
            <div className="divide-y divide-[#edf4ff]">
              {movements.slice(0, 5).map((m) => (
                <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[#001d32]">{m.itemName}</span>
                    <p className="text-[10px] text-[#6e797b]">
                      {m.department} • {m.user}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold ${
                        m.type === 'entrada' ? 'text-[#00616a]' : 'text-[#ba1a1a]'
                      }`}
                    >
                      {m.type === 'entrada' ? '+' : '-'}
                      {m.quantity} {m.unit}
                    </span>
                    <p className="text-[10px] text-[#6e797b]">{m.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Curva ABC */}
      {activeTab === 'abc' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-white border border-[#bdc9ca]/25 shadow-sm space-y-2.5">
            <h3 className="text-xs font-bold text-[#001d32] uppercase tracking-wider">
              Classificação por Relevância Financeira (Pareto)
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-[#00616a]/10 border border-[#00616a]/20">
                <span className="text-xs font-bold text-[#00616a]">Classe A</span>
                <p className="text-lg font-bold text-[#001d32] mt-0.5">80%</p>
                <span className="text-[10px] text-[#3e494a]">Valor / 20% SKUs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#005d8c]/10 border border-[#005d8c]/20">
                <span className="text-xs font-bold text-[#005d8c]">Classe B</span>
                <p className="text-lg font-bold text-[#001d32] mt-0.5">15%</p>
                <span className="text-[10px] text-[#3e494a]">Valor / 30% SKUs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#6e797b]/10 border border-[#6e797b]/20">
                <span className="text-xs font-bold text-[#6e797b]">Classe C</span>
                <p className="text-lg font-bold text-[#001d32] mt-0.5">5%</p>
                <span className="text-[10px] text-[#3e494a]">Valor / 50% SKUs</span>
              </div>
            </div>
            <p className="text-xs text-[#3e494a] leading-relaxed pt-1">
              Químicos de piscina (Cloro e Algicidas) e Equipamentos de Segurança representam o topo
              da Curva A com maior impacto em caso de desabastecimento.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Conformidade */}
      {activeTab === 'conformidade' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-white border border-[#bdc9ca]/25 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-[#001d32] uppercase tracking-wider">
              Controle Sanitário & Validade de Lotes
            </h3>
            <div className="p-3 rounded-xl bg-[#ffdad6]/40 border border-[#ba1a1a]/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#ba1a1a]">Lote #L-9921 com Vencimento Próximo</span>
                <p className="text-[11px] text-[#3e494a]">Cloro Líquido 50L • Vence em 15/12/2024</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ba1a1a] text-white">
                Alerta ANVISA
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#edf4ff] border border-[#bdc9ca]/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#001d32]">Acuracidade Física Q4</span>
                <p className="text-[11px] text-[#3e494a]">Última amostragem: 98.4% de precisão</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00616a] text-white">
                Homologado
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Export Bar */}
      <section className="p-3.5 rounded-2xl bg-white border border-[#bdc9ca]/25 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#001d32]">
          <span className="material-symbols-outlined text-[20px] text-[#00616a]">
            file_download
          </span>
          <span>Exportar Dossiê Gerencial</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-lg bg-[#ba1a1a] text-white text-xs font-semibold hover:bg-[#93000a] transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
            PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-lg bg-[#00616a] text-white text-xs font-semibold hover:bg-[#004f56] transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">table_view</span>
            Excel
          </button>
        </div>
      </section>
    </div>
  );
};
