import React, { useState, useRef } from 'react';
import { InvoiceData } from '../types';

interface OcrScreenProps {
  invoice: InvoiceData;
  onApproveEntries: (totalItems: number) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const OcrScreen: React.FC<OcrScreenProps> = ({
  invoice,
  onApproveEntries,
  showToast,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(82);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [divergenceResolved, setDivergenceResolved] = useState(false);
  const [newProductConfigured, setNewProductConfigured] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<{ nfe: boolean; items: boolean }>({
    nfe: true,
    items: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyAccessKey = () => {
    navigator.clipboard.writeText(invoice.accessKey.replace(/\s+/g, ''));
    showToast('Chave de acesso copiada para a área de transferência!', 'content_copy');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateOcr(file.name);
    }
  };

  const simulateOcr = (fileName: string) => {
    setUploadedFileName(fileName);
    setIsProcessing(true);
    setProgress(15);
    showToast(`Arquivo "${fileName}" recebido. Executando OCR...`, 'document_scanner');

    let current = 15;
    const interval = setInterval(() => {
      current += 20;
      if (current >= 100) {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          setIsProcessing(false);
          showToast('NF-e lida e reconciliada com sucesso via SEFAZ!', 'verified');
        }, 500);
      } else {
        setProgress(current);
      }
    }, 250);
  };

  const handleApprove = () => {
    onApproveEntries(45);
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 space-y-4 pb-32 pt-2">
      {/* Hidden real file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".xml,.pdf,image/*"
        className="hidden"
      />

      {/* Header do Módulo */}
      <section className="flex flex-col space-y-1 pt-1">
        <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-[#b0e8fc]/40 text-[#084e5e] text-xs font-semibold">
          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
          <span>Motor de Visão Computacional ALMX</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-[#001d32] tracking-tight">
          Leitura Inteligente de NF-e
        </h2>
        <p className="text-sm text-[#3e494a] leading-relaxed">
          OCR assistido por IA com reconciliação automática de estoque e tributos.
        </p>
      </section>

      {/* Step 1: Área de Upload & Captura Drag & Drop */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            simulateOcr(file.name);
          }
        }}
        className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border transition-all duration-300 ${
          isDragging
            ? 'border-[#00616a] scale-[0.99] bg-[#edf4ff]'
            : 'border-[#bdc9ca]/25 hover:shadow-md'
        }`}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#97f1fd]/20 blur-2xl pointer-events-none"></div>

        <div className="flex flex-col items-center text-center space-y-3 py-2">
          {/* Icon cloud circle with tactile micro-depth */}
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-[#edf4ff] text-[#00616a] shadow-inner">
            <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
            <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#087c87] text-white shadow-sm">
              <span className="material-symbols-outlined text-[13px]">document_scanner</span>
            </span>
          </div>

          <div className="space-y-1 max-w-xs">
            <p className="font-display text-sm font-bold text-[#001d32]">
              {uploadedFileName
                ? `Arquivo: ${uploadedFileName}`
                : 'Arraste o arquivo .XML ou .PDF da Nota Fiscal aqui'}
            </p>
            <p className="text-xs text-[#3e494a]">
              Nossa rede neural lê o DANFE impresso ou a chave eletrônica instantaneamente
            </p>
          </div>

          {/* Action Buttons Group */}
          <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              className="w-full flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#087c87] text-white font-semibold text-xs shadow-sm active:scale-[0.98] transition-transform hover:bg-[#00616a]"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Selecionar Arquivo</span>
            </button>
            <button
              onClick={() => {
                simulateOcr('DANFE_Foto_Camera_00148921.jpg');
              }}
              type="button"
              className="w-full flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#e2efff] text-[#001d32] font-semibold text-xs active:scale-[0.98] transition-transform hover:bg-[#d7eaff]"
            >
              <span className="material-symbols-outlined text-[18px] text-[#00616a]">
                photo_camera
              </span>
              <span>Fotografar NF</span>
            </button>
          </div>

          {/* Compliance Format Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[#3e494a] text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#edf4ff]">
              <span className="material-symbols-outlined text-[13px] text-[#00616a]">code</span>
              XML NF-e v4.0
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#edf4ff]">
              <span className="material-symbols-outlined text-[13px] text-[#ba1a1a]">
                picture_as_pdf
              </span>
              DANFE PDF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#edf4ff]">
              <span className="material-symbols-outlined text-[13px] text-[#2b6676]">
                receipt_long
              </span>
              Cupom SAT/NFC-e
            </span>
          </div>
        </div>
      </section>

      {/* Step 2: Banner de Processamento Inteligente Ativo */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0077b1] text-white p-4 shadow-md">
        <div className="absolute -left-12 -top-12 w-36 h-36 rounded-full bg-white/10 blur-xl animate-pulse"></div>

        <div className="relative flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20 flex-shrink-0">
                <span
                  className={`material-symbols-outlined text-[20px] text-white ${
                    isProcessing ? 'animate-spin' : ''
                  }`}
                >
                  {isProcessing ? 'sync' : 'check'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">
                  {isProcessing
                    ? 'Processando NF-e #000.148.921'
                    : 'NF-e #000.148.921 Processada'}
                </span>
                <span className="text-[11px] text-[#ddfbff] truncate">
                  {isProcessing
                    ? 'OCR extraindo 4 itens e cruzando tributos...'
                    : '4 itens extraídos e reconciliados com sucesso'}
                </span>
              </div>
            </div>
            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-[10px] font-bold">
              {isProcessing ? 'Etapa 2/3' : 'Concluído'}
            </span>
          </div>

          {/* Linear progress bar animated */}
          <div className="w-full h-1.5 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Status tag acurácia */}
          <div className="flex items-center justify-between text-white text-[11px] pt-0.5">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#97f1fd] fill-1">
                verified
              </span>
              <span>
                Precisão IA: <strong>99.4%</strong>
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[#ddfbff]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#97f1fd]"></span>
              <span>Chave validada na SEFAZ</span>
            </span>
          </div>
        </div>
      </section>

      {/* Step 3: Painel de Revisão em Cards Expansíveis / Acordeons */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[20px] text-[#00616a]">
              analytics
            </span>
            <h3 className="font-display text-sm font-bold text-[#001d32]">
              Revisão e Validação
            </h3>
          </div>
          <span className="text-xs text-[#3e494a] font-medium">Reconciliação Pronta</span>
        </div>

        {/* Accordion Card 1: Dados da Nota Fiscal */}
        <div className="rounded-2xl bg-white shadow-sm border border-[#bdc9ca]/25 overflow-hidden">
          <button
            type="button"
            onClick={() =>
              setOpenAccordions((prev) => ({ ...prev, nfe: !prev.nfe }))
            }
            className="w-full flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-[#edf4ff]/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#edf4ff] text-[#00616a]">
                <span className="material-symbols-outlined text-[18px]">receipt</span>
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="text-xs font-bold text-[#001d32] truncate">
                  Dados da Nota Fiscal
                </h4>
                <p className="text-[11px] text-[#6e797b] truncate">
                  Emissão, Emitente e Valor Homologado
                </p>
              </div>
            </div>
            <span
              className={`material-symbols-outlined text-[#6e797b] transition-transform duration-300 ${
                openAccordions.nfe ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>

          {openAccordions.nfe && (
            <div className="p-4 pt-0 space-y-3">
              {/* Chave de Acesso Box */}
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#edf4ff] border border-[#bdc9ca]/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#6e797b]">
                    Chave de Acesso (44 Dígitos)
                  </span>
                  <button
                    onClick={handleCopyAccessKey}
                    className="text-[#00616a] hover:text-[#087c87] text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>Copiar</span>
                  </button>
                </div>
                <p className="font-mono text-xs text-[#001d32] font-semibold tracking-wider break-all select-all">
                  {invoice.accessKey}
                </p>
              </div>

              {/* Supplier Details */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#edf4ff]">
                <span className="material-symbols-outlined text-[#00616a] text-[20px] mt-0.5">
                  storefront
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-[#6e797b]">Fornecedor / Razão Social</span>
                  <span className="text-xs text-[#001d32] truncate font-bold">
                    {invoice.supplier}
                  </span>
                  <span className="font-mono text-[11px] text-[#3e494a]">
                    CNPJ: {invoice.cnpj}
                  </span>
                </div>
              </div>

              {/* Highlights Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col p-2.5 rounded-xl bg-[#edf4ff]">
                  <span className="text-[10px] text-[#6e797b]">Emissão</span>
                  <span className="text-xs text-[#001d32] font-bold mt-0.5">
                    {invoice.issueDate}
                  </span>
                  <span className="text-[10px] text-[#6e797b]">{invoice.issueTime}</span>
                </div>
                <div className="flex flex-col p-2.5 rounded-xl bg-[#edf4ff]">
                  <span className="text-[10px] text-[#6e797b]">Valor Total</span>
                  <span className="text-xs text-[#00616a] font-bold mt-0.5">
                    R$ {invoice.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-[#6e797b]">Tributos inc.</span>
                </div>
                <div className="flex flex-col p-2.5 rounded-xl bg-[#edf4ff]">
                  <span className="text-[10px] text-[#6e797b]">Frete</span>
                  <span className="text-xs text-[#001d32] font-bold mt-0.5">
                    {invoice.freightType}
                  </span>
                  <span className="text-[10px] text-[#2b6676] font-semibold">
                    {invoice.freightStatus}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion Card 2: Reconciliação de Itens */}
        <div className="rounded-2xl bg-white shadow-sm border border-[#bdc9ca]/25 overflow-hidden">
          <button
            type="button"
            onClick={() =>
              setOpenAccordions((prev) => ({ ...prev, items: !prev.items }))
            }
            className="w-full flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-[#edf4ff]/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#edf4ff] text-[#00616a]">
                <span className="material-symbols-outlined text-[18px]">rule</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#001d32] truncate">
                    Reconciliação de Itens
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-[#e2efff] text-[#001d32] text-[10px] font-bold">
                    3 Itens
                  </span>
                </div>
                <p className="text-[11px] text-[#6e797b] truncate">
                  Comparativo inteligente de SKU, volume e valores
                </p>
              </div>
            </div>
            <span
              className={`material-symbols-outlined text-[#6e797b] transition-transform duration-300 ${
                openAccordions.items ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>

          {openAccordions.items && (
            <div className="p-4 pt-0 space-y-3">
              {/* Item 1: Match Perfeito 100% */}
              <article className="p-3 rounded-xl bg-[#edf4ff] space-y-2 border border-[#bdc9ca]/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <h5 className="text-xs text-[#001d32] font-bold truncate">
                      Cloro Shock 10kg
                    </h5>
                    <div className="flex items-center gap-2 text-[#6e797b] font-mono text-[11px]">
                      <span>
                        SKU: <strong className="text-[#001d32]">QUI-0021</strong>
                      </span>
                      <span>•</span>
                      <span>Depósito: Corredor C-02</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00616a]/10 text-[#00616a] text-[11px] font-bold flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00616a]"></span>
                    <span>Match Ok (100%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 text-xs text-[#3e494a]">
                  <span>
                    Qtd NF: <strong className="text-[#001d32]">20 un</strong>
                  </span>
                  <span>
                    Preço un: <strong className="text-[#001d32]">R$ 110,00</strong>
                  </span>
                  <span className="text-xs text-[#00616a] font-bold">
                    Subtotal: R$ 2.200,00
                  </span>
                </div>
              </article>

              {/* Item 2: Divergência de Preço */}
              <article className="p-3 rounded-xl bg-[#edf4ff] space-y-2 border-l-4 border-l-[#2b6676] border border-[#bdc9ca]/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <h5 className="text-xs text-[#001d32] font-bold truncate">
                      Desengordurante Industrial 5L
                    </h5>
                    <div className="flex items-center gap-2 text-[#6e797b] font-mono text-[11px]">
                      <span>
                        SKU: <strong className="text-[#001d32]">QUI-0089</strong>
                      </span>
                      <span>•</span>
                      <span>Depósito: Setor Higiene</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#b0e8fc] text-[#084e5e] text-[11px] font-bold flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2b6676]"></span>
                    <span>{divergenceResolved ? 'Ajustado' : 'Divergência'}</span>
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-white text-[#306a7b] text-xs flex items-center gap-1.5 border border-[#bdc9ca]/20">
                  <span className="material-symbols-outlined text-[16px] text-[#2b6676]">
                    warning
                  </span>
                  <span>
                    {divergenceResolved
                      ? 'Divergência aprovada pelo gestor com justificativa homologada.'
                      : 'Preço NF +8% acima do pedido de compra homologado (#492)'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-[#3e494a]">
                  <span>
                    Qtd NF: <strong className="text-[#001d32]">15 un</strong>
                  </span>
                  <span>
                    Preço un: <strong className="text-[#001d32]">R$ 95,00</strong> (esp. R$ 88,00)
                  </span>
                  <button
                    onClick={() => {
                      setDivergenceResolved(!divergenceResolved);
                      showToast(
                        divergenceResolved
                          ? 'Divergência reaberta.'
                          : 'Divergência de preço justificada e aprovada!',
                        'check'
                      );
                    }}
                    type="button"
                    className="text-xs text-[#00616a] font-bold hover:underline"
                  >
                    {divergenceResolved ? 'Reverter' : 'Ajustar'}
                  </button>
                </div>
              </article>

              {/* Item 3: Produto Novo */}
              <article className="p-3 rounded-xl bg-[#edf4ff] space-y-2 border-l-4 border-l-[#005d8c] border border-[#bdc9ca]/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <h5 className="text-xs text-[#001d32] font-bold truncate">
                      Pastilha Tricloro 200g (Balde 5kg)
                    </h5>
                    <span className="text-[#6e797b] text-[11px]">
                      NCM: 2933.69.19 • Código Barras EAN extraído
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#cde5ff] text-[#005d8c] text-[11px] font-bold flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#005d8c]"></span>
                    <span>{newProductConfigured ? 'Cadastrado' : 'Produto Novo'}</span>
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-white text-[#005d8c] text-xs flex items-center justify-between border border-[#bdc9ca]/20">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">add_box</span>
                    <span>
                      Sugestão de SKU: <strong className="font-mono font-bold">QUI-0155</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNewProductConfigured(!newProductConfigured);
                      showToast(
                        newProductConfigured
                          ? 'Pré-configuração resetada.'
                          : 'SKU QUI-0155 vinculado com parâmetros de estoque!',
                        'check_circle'
                      );
                    }}
                    type="button"
                    className="text-[#00616a] font-bold hover:underline text-xs"
                  >
                    {newProductConfigured ? 'Configurado ✓' : 'Pré-configurar'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-[#3e494a]">
                  <span>
                    Qtd NF: <strong className="text-[#001d32]">10 un</strong>
                  </span>
                  <span>
                    Preço un: <strong className="text-[#001d32]">R$ 122,50</strong>
                  </span>
                  <span className="text-xs text-[#005d8c] font-bold">
                    Total: R$ 1.225,00
                  </span>
                </div>
              </article>
            </div>
          )}
        </div>
      </section>

      {/* Barra de Ações Destacada */}
      <section className="sticky bottom-20 z-20 pt-1">
        <div className="p-3.5 rounded-2xl bg-white/95 backdrop-blur-xl shadow-xl border border-[#bdc9ca]/30 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-[#6e797b] text-xs">
            <span className="flex items-center gap-1 text-[#00616a] font-medium">
              <span className="material-symbols-outlined text-[15px] fill-1">task_alt</span>
              Pronto para escrituração e saldo
            </span>
            <span className="font-bold text-[#001d32]">45 volumes no total</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                setDivergenceResolved(true);
                setNewProductConfigured(true);
                showToast('Todas as divergências resolvidas automaticamente!', 'tune');
              }}
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#e2efff] hover:bg-[#d7eaff] text-[#2b6676] font-semibold text-xs active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              <span>Corrigir Divergências</span>
            </button>

            <button
              onClick={handleApprove}
              type="button"
              className="flex-[1.5] inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#087c87] hover:bg-[#00616a] text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Aprovar & Dar Entrada (45 itens)</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
