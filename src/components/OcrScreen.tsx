import React, { useEffect, useRef, useState } from 'react';
import { api, ApiWarehouse, toBase64 } from '../api';

type ExtractedItem = {
  code: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  total: number | null;
  lot: string | null;
  expirationDate: string | null;
  productId?: string | null;
  lotId?: string | null;
  matchedSku?: string | null;
  matchStatus?: string;
};
type ExtractedInvoice = {
  supplier: { cnpj: string | null; name: string | null };
  supplierId?: string | null;
  supplierMatched?: boolean;
  invoice: { number: string | null; series: string | null; accessKey: string | null; issueDate: string | null; entryDate: string | null };
  items: ExtractedItem[];
  needsReview: string[];
  canConfirm?: boolean;
};

interface OcrScreenProps {
  onApproveEntries: (totalItems: number) => void;
  showToast: (msg: string, icon?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const OcrScreen: React.FC<OcrScreenProps> = ({ onApproveEntries, showToast }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ExtractedInvoice | null>(null);
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unitId = localStorage.getItem('almx.unitId');
    if (unitId) api.getWarehouses(unitId).then((items) => { setWarehouses(items); setWarehouseId(items[0]?.id || ''); setLocationId(items[0]?.locations[0]?.id || ''); }).catch(() => undefined);
  }, []);

  const selectedWarehouse = warehouses.find((item) => item.id === warehouseId);
  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setIsProcessing(true);
    setResult(null);
    try {
      const extracted = await api.scanInvoice({ fileName: file.name, mimeType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'), data: await toBase64(file) });
      setResult(extracted);
      showToast('Nota processada. Revise os campos antes de confirmar.', 'fact_check', 'info');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao processar a nota.', 'error', 'error'); }
    finally { setIsProcessing(false); }
  };

  const confirm = async () => {
    if (!result || !warehouseId || !locationId) return;
    setIsConfirming(true);
    try {
      const confirmed = await api.confirmScannedInvoice({ extracted: result, warehouseId, locationId, idempotencyKey: `SCAN-${result.invoice.accessKey || result.invoice.number}` });
      onApproveEntries(confirmed.invoice?.items?.length || result.items.length);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível confirmar a entrada.', 'error', 'error'); }
    finally { setIsConfirming(false); }
  };

  const needsReview = result?.needsReview || [];
  const allMatched = Boolean(result?.items.length && result.items.every((item) => item.productId && item.lotId && item.quantity && item.unit && item.unitPrice != null));

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 space-y-4 pb-32 pt-2">
      <input ref={fileInputRef} type="file" accept=".xml,.pdf,image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
      <section className="flex flex-col space-y-1 pt-1">
        <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-[#b0e8fc]/40 text-[#084e5e] text-xs font-semibold"><span className="material-symbols-outlined text-[14px]">auto_awesome</span><span>Leitor de Nota Fiscal ALMX</span></div>
        <h2 className="font-display text-2xl font-bold text-[#001d32] tracking-tight">Leitura Inteligente de NF-e</h2>
        <p className="text-sm text-[#3e494a] leading-relaxed">Envie uma imagem, PDF ou XML. A IA extrai os dados, mas somente a confirmação lança no estoque.</p>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm border border-[#bdc9ca]/25">
        <div className="flex flex-col items-center text-center gap-3 py-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#edf4ff] text-[#00616a]"><span className="material-symbols-outlined text-[32px]">document_scanner</span></div>
          <p className="font-display text-sm font-bold text-[#001d32]">{fileName || 'Selecione a Nota Fiscal'}</p>
          <p className="text-xs text-[#3e494a]">A chave Gemini fica somente no backend.</p>
          <div className="w-full flex flex-col sm:flex-row gap-2.5">
            <button onClick={() => fileInputRef.current?.click()} type="button" className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#087c87] text-white font-semibold text-xs"><span className="material-symbols-outlined text-[18px]">upload_file</span>Selecionar arquivo</button>
            <button onClick={() => cameraInputRef.current?.click()} type="button" className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#e2efff] text-[#001d32] font-semibold text-xs"><span className="material-symbols-outlined text-[18px] text-[#00616a]">photo_camera</span>Fotografar NF</button>
          </div>
        </div>
      </section>
      {isProcessing && <section className="rounded-2xl bg-[#0077b1] text-white p-4 shadow-md"><div className="flex items-center gap-2"><span className="material-symbols-outlined animate-spin">sync</span><strong>Processando nota fiscal...</strong></div><div className="mt-3 h-1.5 rounded-full bg-white/25 overflow-hidden"><div className="h-full w-2/3 bg-white animate-pulse" /></div></section>}
      {result && !isProcessing && <>
        <section className="rounded-2xl bg-white shadow-sm border border-[#bdc9ca]/25 overflow-hidden">
          <div className="p-4 border-b border-[#edf4ff]"><h3 className="font-bold text-sm text-[#001d32]">DADOS DA NOTA</h3></div>
          <div className="p-4 grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-[#6e797b]">Fornecedor</span><strong className="block text-[#001d32]">{result.supplier.name || 'Não identificado'}</strong></div>
            <div><span className="text-[#6e797b]">CNPJ</span><strong className="block text-[#001d32]">{result.supplier.cnpj || 'Não identificado'}</strong></div>
            <div><span className="text-[#6e797b]">Número / Série</span><strong className="block text-[#001d32]">{result.invoice.number || '-'} / {result.invoice.series || '-'}</strong></div>
            <div><span className="text-[#6e797b]">Chave</span><strong className="block text-[#001d32] break-all">{result.invoice.accessKey || 'Não encontrada'}</strong></div>
            <div><span className="text-[#6e797b]">Emissão</span><strong className="block text-[#001d32]">{result.invoice.issueDate || 'Não encontrada'}</strong></div>
            <div><span className="text-[#6e797b]">Entrada</span><strong className="block text-[#001d32]">{result.invoice.entryDate || 'Não encontrada'}</strong></div>
          </div>
        </section>
        <section className="rounded-2xl bg-white shadow-sm border border-[#bdc9ca]/25 overflow-hidden"><div className="p-4 border-b border-[#edf4ff] flex justify-between"><h3 className="font-bold text-sm text-[#001d32]">ITENS</h3><span className="text-xs text-[#6e797b]">{result.items.length} encontrados</span></div><div className="divide-y divide-[#edf4ff]">{result.items.map((item, index) => <div key={`${item.code}-${index}`} className="p-4 text-xs flex flex-col gap-1"><div className="flex justify-between gap-2"><strong className="text-[#001d32]">{item.description || 'Descrição não encontrada'}</strong><span className={item.productId && item.lotId ? 'text-[#00616a]' : 'text-[#ba1a1a]'}>{item.productId && item.lotId ? 'Conferido' : 'Conferência necessária'}</span></div><span className="text-[#6e797b]">Código: {item.code || '-'} · Qtd: {item.quantity ?? '-'} {item.unit || ''} · Unitário: R$ {item.unitPrice?.toFixed(2) || '-'}</span><span className="text-[#6e797b]">Lote: {item.lot || 'Não encontrado'} · Validade: {item.expirationDate || 'Não encontrada'} · Produto: {item.matchedSku || 'não vinculado'}</span></div>)}</div></section>
        {needsReview.length > 0 && <section className="rounded-2xl bg-[#fff8e1] border border-[#f57c00]/30 p-4 text-xs text-[#7a4100]"><strong>Campos que precisam de conferência:</strong><ul className="list-disc pl-5 mt-1">{needsReview.map((field, index) => <li key={`${field}-${index}`}>{field}</li>)}</ul></section>}
        <section className="rounded-2xl bg-white p-4 shadow-sm border border-[#bdc9ca]/25 space-y-3"><h3 className="font-bold text-sm text-[#001d32]">Destino da entrada</h3><select value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setLocationId(warehouses.find((item) => item.id === event.target.value)?.locations[0]?.id || ''); }} className="w-full bg-[#edf4ff] rounded-xl px-3 py-2.5 text-xs"><option value="">Selecione o depósito</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={locationId} onChange={(event) => setLocationId(event.target.value)} className="w-full bg-[#edf4ff] rounded-xl px-3 py-2.5 text-xs"><option value="">Selecione a localização</option>{(selectedWarehouse?.locations || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></section>
        <button disabled={!allMatched || !warehouseId || !locationId || isConfirming} onClick={confirm} type="button" className="w-full py-3.5 rounded-xl bg-[#087c87] text-white font-bold text-xs disabled:opacity-50"><span className="material-symbols-outlined text-[18px] align-middle mr-1">check_circle</span>{isConfirming ? 'Confirmando entrada...' : 'CONFIRMAR ENTRADA'}</button>
      </>}
    </div>
  );
};
