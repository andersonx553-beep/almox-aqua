import React, { useState } from 'react';
import { Movement } from '../types';
import { ProductImage } from './ProductImage';

interface MovimentarScreenProps {
  initialType?: 'entrada' | 'saida' | 'transferir' | 'ajuste';
  initialSku?: string;
  onAddMovement: (mov: Movement) => void;
  onCancel: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const MovimentarScreen: React.FC<MovimentarScreenProps> = ({
  initialType = 'saida',
  initialSku = 'QUI-0021',
  onAddMovement,
  onCancel,
  showToast,
}) => {
  const [operationType, setOperationType] = useState<'entrada' | 'saida' | 'transferir' | 'ajuste'>(
    initialType
  );
  const [department, setDepartment] = useState('Governança & Hotelaria');
  const [person, setPerson] = useState('Mariana Souza - Matrícula #1042');
  const [costCenter, setCostCenter] = useState('C.C. 201 - Manutenção Preventiva Piscina');
  const [quantity, setQuantity] = useState(2);
  const [justification, setJustification] = useState(
    'Retirada emergencial para tratamento de choque na piscina principal após alta temporada de feriado.'
  );
  const [signed, setSigned] = useState(true);

  const currentStock = 8;
  const newStock =
    operationType === 'entrada'
      ? currentStock + quantity
      : operationType === 'saida'
      ? Math.max(0, currentStock - quantity)
      : currentStock;

  const isBelowMin = operationType === 'saida' && newStock < 15;

  const handleConfirm = () => {
    const codeNumber = Math.floor(1000 + Math.random() * 9000);
    const prefix = operationType === 'entrada' ? '#ENT-' : '#SAI-';
    const newMovement: Movement = {
      id: `mov-${Date.now()}`,
      code: `${prefix}${codeNumber}`,
      type: operationType,
      date: 'Hoje',
      timeAgo: 'Agora',
      itemSku: initialSku,
      itemName: 'Cloro Líquido Concentrado 50L',
      quantity: operationType === 'saida' ? -quantity : quantity,
      unit: 'un',
      user: person.split('-')[0].trim(),
      department: department,
      costCenter: costCenter,
      newBalance: newStock,
      signatureId: signed ? 'SIG-883-MSR' : undefined,
    };

    onAddMovement(newMovement);
    showToast(
      `Movimentação ${newMovement.code} de ${operationType.toUpperCase()} registrada com sucesso!`,
      'check_circle'
    );
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto pb-32 pt-2 px-4 space-y-4">
      {/* Header Info */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#00616a]/10 text-[#00616a] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
            </span>
            <h2 className="font-display text-lg font-bold text-[#001d32] tracking-tight">
              Nova Movimentação de Estoque
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#e2efff] text-[#001d32] font-mono text-xs font-semibold">
            #MOV-8841
          </span>
        </div>
        <p className="text-xs text-[#3e494a]">
          Registre entradas avulsas, baixas de consumo, devoluções ou transferências.
        </p>
      </div>

      {/* Operation Type Switcher */}
      <div className="p-1 bg-[#edf4ff] rounded-2xl grid grid-cols-4 gap-1 shadow-sm border border-[#bdc9ca]/20">
        <button
          onClick={() => setOperationType('entrada')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
            operationType === 'entrada'
              ? 'bg-white text-[#00616a] shadow-sm font-bold'
              : 'text-[#6e797b] hover:bg-white/50'
          }`}
          type="button"
        >
          <span className="w-2 h-2 rounded-full bg-[#087c87]"></span>
          <span className="text-[11px]">Entrada</span>
        </button>

        <button
          onClick={() => setOperationType('saida')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
            operationType === 'saida'
              ? 'bg-white text-[#00616a] shadow-sm font-bold'
              : 'text-[#6e797b] hover:bg-white/50'
          }`}
          type="button"
        >
          <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
          <span className="text-[11px]">Saída</span>
        </button>

        <button
          onClick={() => setOperationType('transferir')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
            operationType === 'transferir'
              ? 'bg-white text-[#00616a] shadow-sm font-bold'
              : 'text-[#6e797b] hover:bg-white/50'
          }`}
          type="button"
        >
          <span className="w-2 h-2 rounded-full bg-[#005d8c]"></span>
          <span className="text-[11px]">Transferir</span>
        </button>

        <button
          onClick={() => setOperationType('ajuste')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
            operationType === 'ajuste'
              ? 'bg-white text-[#00616a] shadow-sm font-bold'
              : 'text-[#6e797b] hover:bg-white/50'
          }`}
          type="button"
        >
          <span className="w-2 h-2 rounded-full bg-[#bdc9ca]"></span>
          <span className="text-[11px]">Ajuste</span>
        </button>
      </div>

      {/* Section 1: Operação & Destino */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#bdc9ca]/25 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#00616a]">domain</span>
            <span className="text-xs font-bold text-[#001d32]">1. Operação & Destino</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#b0e8fc]/40 text-[#084e5e] text-[11px] font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">schedule</span> Hoje, 15:42
          </span>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="block text-xs text-[#3e494a] mb-1 font-semibold">
              Setor Solicitante
            </label>
            <div className="relative">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#edf4ff] text-[#001d32] text-xs sm:text-sm rounded-xl py-2.5 pl-3 pr-9 appearance-none focus:outline-none focus:ring-2 focus:ring-[#00616a]/30 transition-all cursor-pointer font-medium"
              >
                <option value="Governança & Hotelaria">Governança & Hotelaria</option>
                <option value="Manutenção Geral & Piscinas">Manutenção Geral & Piscinas</option>
                <option value="Alimentos & Bebidas (A&B)">Alimentos & Bebidas (A&B)</option>
                <option value="Recepção & Guest Relations">Recepção & Guest Relations</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[20px] text-[#6e797b] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#3e494a] mb-1 font-semibold">
              Responsável pela Retirada
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[18px] text-[#00616a]">
                badge
              </span>
              <input
                type="text"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                className="w-full bg-[#edf4ff] text-[#001d32] text-xs sm:text-sm rounded-xl py-2.5 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#00616a]/30 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#3e494a] mb-1 font-semibold">
              Centro de Custo / O.S.
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[18px] text-[#6e797b]">
                assignment
              </span>
              <input
                type="text"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                className="w-full bg-[#edf4ff] text-[#001d32] text-xs sm:text-sm rounded-xl py-2.5 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#00616a]/30 transition-all font-medium"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Itens da Movimentação */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#bdc9ca]/25 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#00616a]">
              inventory_2
            </span>
            <span className="text-xs font-bold text-[#001d32]">2. Itens da Movimentação</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#00616a]/10 text-[#00616a] font-bold">
            1 Adicionado
          </span>
        </div>

        <div className="bg-[#edf4ff] rounded-2xl p-3.5 space-y-3 border border-[#bdc9ca]/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white flex-shrink-0 flex items-center justify-center text-[#00616a] overflow-hidden border border-[#bdc9ca]/20">
                <ProductImage
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKtJkbSMZSH-Lbki_NtxyQkAZhePWnTP9m5Zv9O8LTsiMVYeH1vfQ4i-kmnP-BWzFBF1mSHSc6YUvv4qYBYWqon_tStVoH4V_r6aJaJF62XDtgVY40jCFfvg1kHJwE-L81SFLfzmcznKmTAhAZ8sXZjjCKyhKGyddyhUjTZC6CtXZJBzGyfOp9hxMd4XhPrOVeXeX5MJm92w_G9_wHgaVyAWeZPzMae2YEzbknPwuzcQCasVGqn1-lAg"
                  alt="Cloro Líquido Concentrado 50L"
                  fallbackIcon="science"
                />
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="font-mono text-[11px] text-[#00616a] font-bold">QUI-0021</span>
                <h3 className="text-xs font-bold text-[#001d32] truncate">
                  Cloro Líquido Concentrado 50L
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-[#2b6676] font-semibold bg-[#b0e8fc]/40 px-1.5 py-0.2 rounded">
                    Lote: #L-9921
                  </span>
                  <span className="text-[10px] text-[#6e797b]">Val: 15/12/2024</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => showToast('Item obrigatório para esta requisição', 'info')}
              aria-label="Remover Item"
              className="p-1 text-[#6e797b] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>

          {/* Stepper Counter */}
          <div className="bg-white rounded-xl p-2.5 flex items-center justify-between gap-2 border border-[#bdc9ca]/20">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#6e797b] font-semibold">
                Qtd. a {operationType === 'entrada' ? 'Adicionar' : 'Retirar'}
              </span>
              <span className="text-xs text-[#001d32] font-bold">Unidades (Gl 50L)</span>
            </div>

            <div className="flex items-center gap-2 bg-[#edf4ff] rounded-xl p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-white text-[#001d32] flex items-center justify-center active:scale-95 shadow-xs transition-transform hover:bg-[#d7eaff]"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <input
                type="number"
                min="1"
                max={operationType === 'saida' ? currentStock : 999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-10 text-center text-base font-bold text-[#00616a] bg-transparent focus:outline-none"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-[#00616a] text-white flex items-center justify-center active:scale-95 shadow-xs transition-transform hover:bg-[#087c87]"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>

          {/* Balance Comparison */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-[#6e797b]">
              Saldo Atual: <strong className="text-[#001d32]">{currentStock} un</strong>
            </span>
            <span className="material-symbols-outlined text-[14px] text-[#6e797b]">
              trending_flat
            </span>
            <span className="text-[#00616a] font-semibold">
              Novo Saldo: <strong>{newStock} un</strong>
            </span>
          </div>

          {/* Safety Warning */}
          {isBelowMin && (
            <div className="p-2.5 rounded-xl bg-[#ffdad6]/60 text-[#ba1a1a] flex items-start gap-2 border border-[#ffdad6]">
              <span className="material-symbols-outlined text-[18px] text-[#ba1a1a] flex-shrink-0 mt-0.5">
                warning
              </span>
              <p className="text-[11px] leading-snug font-medium">
                <strong>Atenção:</strong> Novo saldo ({newStock} un) ficará abaixo da margem de
                segurança configurada (15 un). Reposição sugerida.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => showToast('Catálogo aberto: selecione itens adicionais', 'add_circle')}
          className="w-full py-2.5 px-3 rounded-xl bg-[#edf4ff] text-[#00616a] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#e2efff] transition-colors active:scale-[0.99]"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Adicionar Outro Produto à Requisição
        </button>
      </section>

      {/* Section 3: Observações e Assinatura */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#bdc9ca]/25 space-y-3">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#00616a]">draw</span>
          <span className="text-xs font-bold text-[#001d32]">3. Observações e Assinatura</span>
        </div>

        <div>
          <label className="block text-xs text-[#3e494a] mb-1 font-semibold">
            Justificativa Operacional
          </label>
          <textarea
            rows={2}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="w-full bg-[#edf4ff] text-[#001d32] text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#00616a]/30 transition-all resize-none font-medium"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-[#3e494a] font-semibold">
              Assinatura Digital do Recebedor
            </label>
            <button
              onClick={() => {
                setSigned(!signed);
                showToast(signed ? 'Assinatura limpa.' : 'Assinatura validada com sucesso!', 'draw');
              }}
              className="text-[11px] text-[#00616a] font-bold flex items-center gap-0.5 hover:underline"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              {signed ? 'Limpar' : 'Assinar'}
            </button>
          </div>

          <div className="h-24 bg-[#edf4ff] rounded-2xl relative overflow-hidden flex flex-col justify-between p-2.5 border border-[#bdc9ca]/20">
            <div className="flex items-center justify-between text-[#6e797b] font-mono text-[10px]">
              <span>ID: SIG-883-MSR</span>
              <span>IP: 192.168.10.42 • 15:42</span>
            </div>

            {/* Dynamic visual signature svg */}
            {signed ? (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg
                  className="w-4/5 h-16 text-[#087c87] opacity-85"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  viewBox="0 0 320 80"
                >
                  <path d="M 20 50 Q 55 10, 80 45 T 140 35 T 200 50 Q 220 20, 250 40 T 295 45" />
                  <path d="M 60 48 Q 110 65, 175 42" />
                </svg>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[#6e797b] italic pointer-events-none">
                Clique em "Assinar" ou use a tela sensível ao toque
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#001d32] font-bold">Mariana Souza Rocha</span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  signed ? 'text-[#00616a] bg-[#00616a]/10' : 'text-[#6e797b] bg-[#bdc9ca]/30'
                }`}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {signed ? 'verified' : 'pending'}
                </span>
                {signed ? 'Validada' : 'Pendente'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-16 left-0 w-full z-40 bg-white/95 backdrop-blur-md border-t border-[#bdc9ca]/25 shadow-lg px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-3 rounded-xl bg-[#edf4ff] text-[#001d32] font-bold text-xs hover:bg-[#e2efff] active:scale-95 transition-all text-center"
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] py-3 px-3 rounded-xl bg-[#087c87] text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:bg-[#00616a]"
            type="button"
          >
            <span>
              Confirmar {operationType.charAt(0).toUpperCase() + operationType.slice(1)} (
              {quantity} un)
            </span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
