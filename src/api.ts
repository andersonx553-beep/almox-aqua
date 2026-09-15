const API_URL = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:3001';

export type ApiUser = { id: string; name: string; email: string; role: string; defaultUnitId?: string | null };
export type ApiWarehouse = { id: string; unitId: string; code: string; name: string; locations: { id: string; code: string; name: string }[] };

function userId() {
  return localStorage.getItem('almx.userId') || '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (userId()) headers.set('X-User-Id', userId());
  const unitId = localStorage.getItem('almx.unitId');
  if (unitId) headers.set('X-Unit-Id', unitId);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'Erro na comunicação com o ALMX');
  return body as T;
}

export const api = {
  baseUrl: API_URL,
  listUsers: () => fetch(`${API_URL}/api/auth/users`).then(async (response) => {
    if (!response.ok) throw new Error('Não foi possível carregar os usuários');
    return response.json() as Promise<ApiUser[]>;
  }),
  createUser: (data: { name: string; email?: string }) => request<{ user: ApiUser }>('/api/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  selectUser: (userIdValue: string) => request<{ user: ApiUser }>('/api/auth/select', { method: 'POST', body: JSON.stringify({ userId: userIdValue }) }),
  getUnits: () => request<{ id: string; code: string; name: string }[]>('/api/units'),
  getWarehouses: (unitId: string) => request<ApiWarehouse[]>(`/api/units/${unitId}/warehouses`),
  getProducts: () => request<any[]>('/api/products'),
  getCategories: () => request<any[]>('/api/categories'),
  getSuppliers: () => request<any[]>('/api/suppliers'),
  getBalances: () => request<any[]>('/api/stock/balances'),
  getMovements: () => request<any[]>('/api/movements'),
  getInventories: () => request<any[]>('/api/inventories'),
  getInvoices: () => request<any[]>('/api/invoices'),
  getStockReport: () => request<any>('/api/reports/stock'),
  createMovement: (data: unknown) => request<any>('/api/stock/movements', { method: 'POST', body: JSON.stringify(data) }),
  scanInvoice: (data: { fileName: string; mimeType: string; data: string }) => request<any>('/api/invoices/scan', { method: 'POST', body: JSON.stringify(data) }),
  confirmScannedInvoice: (data: unknown) => request<any>('/api/invoices/confirm-scan', { method: 'POST', body: JSON.stringify(data) }),
};

export function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo'));
    reader.readAsDataURL(file);
  });
}
