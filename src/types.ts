export type ScreenType =
  | 'login'
  | 'dashboard'
  | 'ocr'
  | 'estoque'
  | 'movimentar'
  | 'inventario'
  | 'relatorios';

export type ProductStatus = 'normal' | 'warning' | 'critical';
export type ProductCategory = 'quimicos' | 'manutencao' | 'epi' | 'alimentos' | 'rouparia';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  status: ProductStatus;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  location: string;
  lot: string;
  lotExpiration: string;
  costPrice: number;
  supplier: string;
  imageUrl: string;
  imageAlt: string;
  icon: string;
  weeklyConsumption: { day: string; count: number }[];
  technicalSpecs?: string;
  monthlyTurnover?: string;
  coverageDays?: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  location: string;
  systemStock: number;
  physicalCount: number;
  unit: string;
  discrepancyType: 'none' | 'shortage' | 'surplus';
  discrepancyQty: number;
  divergenceReason?: string;
  financialImpact: number;
  imageUrl: string;
  imageAlt: string;
  lotNumber?: string;
}

export interface Movement {
  id: string;
  code: string;
  type: 'entrada' | 'saida' | 'transferir' | 'ajuste';
  date: string;
  timeAgo: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  unit: string;
  user: string;
  department: string;
  costCenter: string;
  newBalance?: number;
  signatureId?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  sku: string;
  location: string;
  status: 'match' | 'divergence' | 'new';
  qty: number;
  unitPrice: number;
  expectedPrice?: number;
  subtotal: number;
  divergenceMsg?: string;
  suggestedSku?: string;
}

export interface InvoiceData {
  accessKey: string;
  supplier: string;
  cnpj: string;
  issueDate: string;
  issueTime: string;
  totalValue: number;
  freightType: string;
  freightStatus: string;
  items: InvoiceItem[];
}
