import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import { prisma } from './server/prisma.js';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const port = Number(process.env.PORT || 3001);

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || 'http://localhost:3000');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Unit-Id, X-Request-Id');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  if (request.method === 'OPTIONS') return response.status(204).end();
  return next();
});
app.use(express.json({ limit: '12mb' }));

const errorResponse = (response, status, message) => response.status(status).json({ error: message });
const asDecimal = (value, field) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${field} inválido`);
  return number;
};
const asDate = (value, field) => {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} inválida`);
  return date;
};

function ensureUnitAccess(request, unitId) {
  if (!unitId) throw new Error('Unidade operacional não informada');
  const membership = request.auth.user.memberships.find((item) => item.unitId === unitId);
  if (!membership && request.auth.user.role !== 'ADMIN') throw new Error('Usuário sem acesso à unidade');
  return unitId;
}

function ensureNonNegative(value, field) {
  const number = asDecimal(value, field);
  if (number < 0) throw new Error(`${field} não pode ser negativa`);
  return number;
}
const requireDevelopmentMode = (response) => {
  if (process.env.NODE_ENV === 'production') {
    errorResponse(response, 404, 'Rota não disponível');
    return false;
  }
  return true;
};

const invoiceResponseSchema = {
  type: Type.OBJECT,
  properties: {
    supplier: { type: Type.OBJECT, properties: { cnpj: { type: Type.STRING, nullable: true }, name: { type: Type.STRING, nullable: true } } },
    invoice: { type: Type.OBJECT, properties: { number: { type: Type.STRING, nullable: true }, series: { type: Type.STRING, nullable: true }, accessKey: { type: Type.STRING, nullable: true }, issueDate: { type: Type.STRING, nullable: true }, entryDate: { type: Type.STRING, nullable: true } } },
    items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { code: { type: Type.STRING, nullable: true }, description: { type: Type.STRING, nullable: true }, quantity: { type: Type.NUMBER, nullable: true }, unit: { type: Type.STRING, nullable: true }, unitPrice: { type: Type.NUMBER, nullable: true }, total: { type: Type.NUMBER, nullable: true }, lot: { type: Type.STRING, nullable: true }, expirationDate: { type: Type.STRING, nullable: true } } } },
    needsReview: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
};

function normalizeExtractedInvoice(value) {
  const source = value && typeof value === 'object' ? value : {};
  const supplier = source.supplier && typeof source.supplier === 'object' ? source.supplier : {};
  const invoice = source.invoice && typeof source.invoice === 'object' ? source.invoice : {};
  const items = Array.isArray(source.items) ? source.items : [];
  const normalized = {
    supplier: { cnpj: supplier.cnpj || null, name: supplier.name || null },
    invoice: { number: invoice.number || null, series: invoice.series || null, accessKey: invoice.accessKey || null, issueDate: invoice.issueDate || null, entryDate: invoice.entryDate || null },
    items: items.map((item) => ({ code: item.code || null, description: item.description || null, quantity: item.quantity == null ? null : Number(item.quantity), unit: item.unit || null, unitPrice: item.unitPrice == null ? null : Number(item.unitPrice), total: item.total == null ? null : Number(item.total), lot: item.lot || null, expirationDate: item.expirationDate || null })),
    needsReview: Array.isArray(source.needsReview) ? source.needsReview : [],
  };
  if (!normalized.supplier.cnpj) normalized.needsReview.push('CNPJ do fornecedor');
  if (!normalized.supplier.name) normalized.needsReview.push('Nome do fornecedor');
  for (const field of ['number', 'series', 'issueDate']) if (!normalized.invoice[field]) normalized.needsReview.push(`Nota: ${field}`);
  normalized.items.forEach((item, index) => {
    for (const field of ['description', 'quantity', 'unit', 'unitPrice']) if (item[field] == null || (typeof item[field] === 'number' && !Number.isFinite(item[field]))) normalized.needsReview.push(`Item ${index + 1}: ${field}`);
  });
  return normalized;
}

async function matchInvoiceData(extracted) {
  const supplier = extracted.supplier.cnpj ? await prisma.supplier.findFirst({ where: { taxId: extracted.supplier.cnpj } }) : null;
  const products = [];
  for (const item of extracted.items) {
    const product = item.code ? await prisma.product.findFirst({ where: { OR: [{ sku: item.code }, { barcode: item.code }], isActive: true } }) : null;
    const descriptionMatch = !product && item.description ? await prisma.product.findFirst({ where: { name: { contains: item.description, mode: 'insensitive' }, isActive: true } }) : null;
    const matchedProduct = product || descriptionMatch;
    const matchedLot = matchedProduct && item.lot ? await prisma.productLot.findFirst({ where: { productId: matchedProduct.id, lotNumber: item.lot } }) : null;
    products.push({ ...item, productId: matchedProduct?.id || null, lotId: matchedLot?.id || null, matchedSku: matchedProduct?.sku || null, matchStatus: matchedProduct ? 'MATCHED' : 'PENDING' });
  }
  return { ...extracted, supplierId: supplier?.id || null, supplierMatched: Boolean(supplier), items: products };
}

async function extractInvoiceWithGemini({ data, mimeType, fileName }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY não configurada no backend'), { statusCode: 503 });
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Leia esta nota fiscal brasileira e retorne somente JSON no schema solicitado. Não invente valores: use null quando ilegível ou ausente. Inclua needsReview com cada campo que precise de conferência manual. Arquivo: ${fileName || 'nota fiscal'}.`;
  const result = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType, data } }] }], config: { responseMimeType: 'application/json', responseSchema: invoiceResponseSchema } });
  const text = result.text || '{}';
  return normalizeExtractedInvoice(JSON.parse(text));
}

async function authenticate(request, response, next) {
  const selectedUserId = request.headers['x-user-id'] || request.headers['x-dev-user-id'];
  if (selectedUserId) {
    const user = await prisma.user.findUnique({
      where: { id: String(selectedUserId) },
      include: { memberships: true, defaultUnit: true },
    });
    if (user?.status === 'ACTIVE') {
      request.auth = { user, devMode: true };
      return next();
    }
  }
  return errorResponse(response, 401, 'Usuário selecionado necessário');
}

function activeUnitId(request) {
  const requested = request.headers['x-unit-id'];
  const unitId = requested || request.auth.user.defaultUnitId;
  if (!unitId) return null;
  const membership = request.auth.user.memberships.find((item) => item.unitId === unitId);
  if (!membership && request.auth.user.role !== 'ADMIN') throw new Error('Usuário sem acesso à unidade');
  return unitId;
}

function requireRole(...roles) {
  return (request, response, next) => {
    try {
      const unitId = activeUnitId(request);
      const membership = request.auth.user.memberships.find((item) => item.unitId === unitId);
      const role = membership?.role || request.auth.user.role;
      if (!roles.includes(role) && request.auth.user.role !== 'ADMIN') return errorResponse(response, 403, 'Permissão insuficiente');
      request.auth.unitId = unitId;
      request.auth.role = role;
      return next();
    } catch (error) {
      return errorResponse(response, 403, error.message);
    }
  };
}

async function createMovementTransaction(tx, { unitId, type, referenceCode, reason, warehouseId, locationId, sourceWarehouseId = null, targetWarehouseId = null, items, invoiceId = null, inventoryId = null, transferId = null, transferLeg = null, idempotencyKey = null, userId, requestId = null }) {
  if (!unitId || !warehouseId || !locationId || !items?.length) throw new Error('Unidade, depósito, localização e itens são obrigatórios');
  if (!['ENTRY', 'EXIT', 'ADJUSTMENT', 'INVENTORY'].includes(type)) throw new Error('Tipo de movimentação inválido');
  if (idempotencyKey) {
    const existing = await tx.stockMovement.findUnique({ where: { idempotencyKey }, include: { items: true } });
    if (existing) return existing;
  }
  const warehouse = await tx.warehouse.findFirst({ where: { id: warehouseId, unitId, isActive: true } });
  if (!warehouse) throw new Error('Depósito inválido para a unidade');
  const location = await tx.warehouseLocation.findFirst({ where: { id: locationId, warehouseId, isActive: true } });
  if (!location) throw new Error('Localização inválida para o depósito');
  const movement = await tx.stockMovement.create({ data: { unitId, type, referenceCode: String(referenceCode), reason: reason || null, sourceWarehouseId, targetWarehouseId, invoiceId, inventoryId, transferId, transferLeg, performedById: userId, idempotencyKey, occurredAt: new Date() } });
  for (const item of items) {
    const quantity = asDecimal(item.quantity ?? item.quantityDelta, 'quantity');
    if (!Number.isFinite(quantity) || quantity === 0 || (['ENTRY', 'EXIT'].includes(type) && quantity < 0)) throw new Error('A quantidade deve ser positiva');
    const delta = type === 'EXIT' ? -Math.abs(quantity) : type === 'ENTRY' ? Math.abs(quantity) : quantity;
    const product = await tx.product.findFirst({ where: { id: String(item.productId), isActive: true } });
    if (!product) throw new Error(`Produto inválido: ${item.productId}`);
    const lot = await tx.productLot.findFirst({ where: { id: String(item.lotId), productId: product.id } });
    if (!lot) throw new Error(`Lote inválido para o produto ${product.sku}`);
    const key = { unitId, productId: product.id, warehouseId, lotId: lot.id, locationId };
    const existing = await tx.stockBalance.findUnique({ where: { unitId_productId_warehouseId_lotId_locationId: key } });
    const current = existing ? Number(existing.quantityOnHand) : 0;
    const next = current + delta;
    if (next < 0) throw new Error(`Saldo insuficiente para o produto ${product.sku}`);
    const balance = existing
      ? await tx.stockBalance.update({ where: { id: existing.id }, data: { quantityOnHand: next } })
      : await tx.stockBalance.create({ data: { ...key, quantityOnHand: next } });
    await tx.stockMovementItem.create({ data: { movementId: movement.id, unitId, productId: product.id, lotId: lot.id, warehouseId, locationId, quantityDelta: delta, unit: String(item.unit || product.unit), unitCost: item.unitCost == null ? null : asDecimal(item.unitCost, 'unitCost'), balanceAfter: balance.quantityOnHand } });
  }
  await tx.auditLog.create({ data: { userId, unitId, action: 'STOCK_MOVEMENT', result: 'SUCCESS', entityType: 'StockMovement', entityId: movement.id, requestId } });
  return tx.stockMovement.findUnique({ where: { id: movement.id }, include: { items: true } });
}

function requireUnit(request) {
  const unitId = request.auth.unitId || activeUnitId(request);
  if (!unitId) throw new Error('Unidade operacional não selecionada');
  return unitId;
}

app.get('/api/status', (_request, response) => response.json({ sistema: 'ALMX', status: 'online' }));

app.get('/api/auth/users', async (_request, response) => {
  if (!requireDevelopmentMode(response)) return;
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, email: true, role: true, defaultUnitId: true },
    orderBy: { name: 'asc' },
  });
  return response.json(users);
});

app.post('/api/auth/users', async (request, response) => {
  try {
    if (!requireDevelopmentMode(response)) return;
    const name = String(request.body.name || '').trim();
    const email = String(request.body.email || '').trim().toLowerCase();
    if (name.length < 2) return errorResponse(response, 400, 'Informe o nome do usuário');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return errorResponse(response, 400, 'E-mail inválido');
    const user = await prisma.user.create({
      data: {
        name,
        email: email || `local-${crypto.randomUUID()}@almx.local`,
        status: 'ACTIVE',
        role: 'OPERATOR',
      },
      select: { id: true, name: true, email: true, role: true, defaultUnitId: true },
    });
    return response.status(201).json({ user });
  } catch (error) {
    return errorResponse(response, 400, error.message);
  }
});

app.post('/api/auth/select', async (request, response) => {
  try {
    if (!requireDevelopmentMode(response)) return;
    let user = await prisma.user.findFirst({
      where: { id: String(request.body.userId || ''), status: 'ACTIVE' },
      include: { memberships: true, defaultUnit: true },
    });
    if (!user) return errorResponse(response, 404, 'Usuário não encontrado');
    if (!user.defaultUnitId) {
      const unit = await prisma.operationalUnit.findFirst({ where: { isActive: true }, orderBy: { name: 'asc' } });
      if (unit) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: user.id }, data: { defaultUnitId: unit.id } }),
          prisma.userUnit.upsert({ where: { userId_unitId: { userId: user.id, unitId: unit.id } }, update: {}, create: { userId: user.id, unitId: unit.id, role: user.role } }),
        ]);
        user = await prisma.user.findUnique({ where: { id: user.id }, include: { memberships: true, defaultUnit: true } });
      }
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', result: 'SUCCESS', entityType: 'User', entityId: user.id, metadata: { mode: 'user-selection' } } });
    return response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, defaultUnitId: user.defaultUnitId }, developmentMode: true });
  } catch (error) {
    return errorResponse(response, 400, error.message);
  }
});

app.get('/api/units', authenticate, async (request, response) => {
  const unitIds = request.auth.user.role === 'ADMIN' ? undefined : request.auth.user.memberships.map((membership) => membership.unitId);
  return response.json(await prisma.operationalUnit.findMany({ where: { isActive: true, ...(unitIds ? { id: { in: unitIds } } : {}) }, orderBy: { name: 'asc' } }));
});
app.post('/api/units', authenticate, async (request, response) => {
  try {
    const code = String(request.body.code || '').trim().toUpperCase();
    const name = String(request.body.name || '').trim();
    if (!code || !name) return errorResponse(response, 400, 'Código e nome da unidade são obrigatórios');
    const unit = await prisma.$transaction(async (tx) => {
      const created = await tx.operationalUnit.create({ data: { code, name } });
      await tx.user.update({ where: { id: request.auth.user.id }, data: { defaultUnitId: created.id } });
      await tx.userUnit.create({ data: { userId: request.auth.user.id, unitId: created.id, role: 'OPERATOR' } });
      return created;
    });
    return response.status(201).json(unit);
  } catch (error) { return errorResponse(response, 400, error.message); }
});
app.get('/api/units/:unitId/warehouses', authenticate, async (request, response) => {
  try {
    ensureUnitAccess(request, request.params.unitId);
    return response.json(await prisma.warehouse.findMany({ where: { unitId: request.params.unitId, isActive: true }, include: { locations: true }, orderBy: { name: 'asc' } }));
  } catch (error) { return errorResponse(response, 403, error.message); }
});
app.post('/api/units/:unitId/warehouses', authenticate, async (request, response) => {
  try {
    const unitId = request.params.unitId;
    ensureUnitAccess(request, unitId);
    const code = String(request.body.code || '').trim().toUpperCase();
    const name = String(request.body.name || '').trim();
    if (!code || !name) return errorResponse(response, 400, 'Código e nome do depósito são obrigatórios');
    return response.status(201).json(await prisma.warehouse.create({ data: { unitId, code, name, address: request.body.address || null } }));
  } catch (error) { return errorResponse(response, 400, error.message); }
});
app.post('/api/warehouses/:warehouseId/locations', authenticate, async (request, response) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: request.params.warehouseId } });
    if (!warehouse) return errorResponse(response, 404, 'Depósito não encontrado');
    ensureUnitAccess(request, warehouse.unitId);
    const code = String(request.body.code || '').trim().toUpperCase();
    const name = String(request.body.name || '').trim();
    if (!code || !name) return errorResponse(response, 400, 'Código e nome da localização são obrigatórios');
    return response.status(201).json(await prisma.warehouseLocation.create({ data: { warehouseId: warehouse.id, code, name } }));
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/auth/login', async (request, response) => {
  return errorResponse(response, 410, 'Login com senha desativado; selecione um usuário');
});

app.post('/api/auth/logout', authenticate, async (request, response) => {
  await prisma.auditLog.create({ data: { userId: request.auth.user.id, unitId: request.auth.user.defaultUnitId, action: 'LOGOUT', result: 'SUCCESS', entityType: 'User', entityId: request.auth.user.id } });
  return response.status(204).end();
});

app.get('/api/auth/me', authenticate, (request, response) => response.json({ user: request.auth.user }));

const activeFilter = (request) => request.query.includeInactive === 'true' ? {} : { isActive: true };

app.get('/api/categories', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => response.json(await prisma.category.findMany({ where: activeFilter(request), orderBy: { name: 'asc' } })));
app.post('/api/categories', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const code = String(request.body.code || '').trim().toUpperCase();
    const name = String(request.body.name || '').trim();
    if (!code || !name) return errorResponse(response, 400, 'Código e nome são obrigatórios');
    return response.status(201).json(await prisma.category.create({ data: { code, name, description: request.body.description || null } }));
  }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.patch('/api/categories/:id', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const data = {};
    if (request.body.code !== undefined) data.code = String(request.body.code).trim().toUpperCase();
    if (request.body.name !== undefined) data.name = String(request.body.name).trim();
    if (request.body.description !== undefined) data.description = request.body.description || null;
    if (request.body.isActive !== undefined) data.isActive = Boolean(request.body.isActive);
    return response.json(await prisma.category.update({ where: { id: request.params.id }, data }));
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.patch('/api/categories/:id/status', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try { return response.json(await prisma.category.update({ where: { id: request.params.id }, data: { isActive: Boolean(request.body.isActive) } })); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/products', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  const search = String(request.query.search || '').trim();
  const products = await prisma.product.findMany({ where: { ...activeFilter(request), ...(search ? { OR: [{ sku: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] } : {}), ...(request.query.categoryId ? { categoryId: String(request.query.categoryId) } : {}) }, include: { category: true }, orderBy: { name: 'asc' } });
  return response.json(products);
});
app.get('/api/products/:id', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  const product = await prisma.product.findUnique({ where: { id: request.params.id }, include: { category: true, lots: true } });
  if (!product) return errorResponse(response, 404, 'Produto não encontrado');
  return response.json(product);
});
app.post('/api/products', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const data = request.body;
    if (!data.sku || !data.name || !data.unit || !data.categoryId) return errorResponse(response, 400, 'SKU, nome, unidade e categoria são obrigatórios');
    const minStock = ensureNonNegative(data.minStock ?? 0, 'minStock');
    const maxStock = data.maxStock == null ? null : ensureNonNegative(data.maxStock, 'maxStock');
    const reorderPoint = data.reorderPoint == null ? null : ensureNonNegative(data.reorderPoint, 'reorderPoint');
    if (maxStock != null && maxStock < minStock) return errorResponse(response, 400, 'maxStock deve ser maior ou igual a minStock');
    if (reorderPoint != null && reorderPoint < minStock) return errorResponse(response, 400, 'reorderPoint deve ser maior ou igual a minStock');
    const category = await prisma.category.findFirst({ where: { id: String(data.categoryId), isActive: true } });
    if (!category) return errorResponse(response, 400, 'Categoria inválida ou inativa');
    const product = await prisma.product.create({ data: { sku: String(data.sku), barcode: data.barcode || null, name: String(data.name), description: data.description || null, unit: String(data.unit), categoryId: String(data.categoryId), minStock, maxStock, reorderPoint, imageUrl: data.imageUrl || null, technicalSpecs: data.technicalSpecs || null } });
    return response.status(201).json(product);
  } catch (error) { return errorResponse(response, 400, error.message); }
});
app.patch('/api/products/:id', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const allowed = ['sku', 'barcode', 'name', 'description', 'unit', 'categoryId', 'imageUrl', 'technicalSpecs', 'isActive'];
    const data = Object.fromEntries(Object.entries(request.body).filter(([key]) => allowed.includes(key)));
    for (const field of ['minStock', 'maxStock', 'reorderPoint']) if (request.body[field] !== undefined) data[field] = request.body[field] == null ? null : asDecimal(request.body[field], field);
    return response.json(await prisma.product.update({ where: { id: request.params.id }, data }));
  }
  catch (error) { return errorResponse(response, 400, error.message); }
});
app.patch('/api/products/:id/status', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try { return response.json(await prisma.product.update({ where: { id: request.params.id }, data: { isActive: Boolean(request.body.isActive) } })); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/products/:id/lots', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const lotNumber = String(request.body.lotNumber || '').trim();
    if (!lotNumber) return errorResponse(response, 400, 'Número do lote é obrigatório');
    const product = await prisma.product.findFirst({ where: { id: request.params.id, isActive: true } });
    if (!product) return errorResponse(response, 404, 'Produto não encontrado ou inativo');
    const supplierId = request.body.supplierId || null;
    if (supplierId && !(await prisma.supplier.findFirst({ where: { id: String(supplierId), isActive: true } }))) return errorResponse(response, 400, 'Fornecedor inválido ou inativo');
    const expirationDate = asDate(request.body.expirationDate, 'expirationDate');
    const manufactureDate = asDate(request.body.manufactureDate, 'manufactureDate');
    if (expirationDate && manufactureDate && expirationDate < manufactureDate) return errorResponse(response, 400, 'expirationDate deve ser posterior a manufactureDate');
    return response.status(201).json(await prisma.productLot.create({ data: { productId: product.id, lotNumber, supplierId, expirationDate, manufactureDate } }));
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.patch('/api/lots/:id', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const lot = await prisma.productLot.findUnique({ where: { id: request.params.id }, include: { product: true } });
    if (!lot) return errorResponse(response, 404, 'Lote não encontrado');
    if (!lot.product.isActive) return errorResponse(response, 400, 'Produto do lote está inativo');
    const data = {};
    if (request.body.lotNumber !== undefined) {
      const lotNumber = String(request.body.lotNumber).trim();
      if (!lotNumber) return errorResponse(response, 400, 'Número do lote é obrigatório');
      data.lotNumber = lotNumber;
    }
    if (request.body.supplierId !== undefined) {
      const supplierId = request.body.supplierId || null;
      if (supplierId && !(await prisma.supplier.findFirst({ where: { id: String(supplierId), isActive: true } }))) return errorResponse(response, 400, 'Fornecedor inválido ou inativo');
      data.supplierId = supplierId;
    }
    if (request.body.expirationDate !== undefined) data.expirationDate = asDate(request.body.expirationDate, 'expirationDate');
    if (request.body.manufactureDate !== undefined) data.manufactureDate = asDate(request.body.manufactureDate, 'manufactureDate');
    const expirationDate = data.expirationDate === undefined ? lot.expirationDate : data.expirationDate;
    const manufactureDate = data.manufactureDate === undefined ? lot.manufactureDate : data.manufactureDate;
    if (expirationDate && manufactureDate && expirationDate < manufactureDate) return errorResponse(response, 400, 'expirationDate deve ser posterior a manufactureDate');
    return response.json(await prisma.productLot.update({ where: { id: lot.id }, data }));
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/suppliers', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  const search = String(request.query.search || '').trim();
  return response.json(await prisma.supplier.findMany({ where: { ...activeFilter(request), ...(search ? { OR: [{ legalName: { contains: search, mode: 'insensitive' } }, { tradeName: { contains: search, mode: 'insensitive' } }, { taxId: { contains: search } }] } : {}) }, orderBy: { legalName: 'asc' } }));
});
app.get('/api/suppliers/:id', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  const supplier = await prisma.supplier.findUnique({ where: { id: request.params.id }, include: { products: { include: { product: true } } } });
  if (!supplier) return errorResponse(response, 404, 'Fornecedor não encontrado');
  return response.json(supplier);
});
app.post('/api/suppliers', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try { if (!request.body.legalName) return errorResponse(response, 400, 'Razão social é obrigatória'); return response.status(201).json(await prisma.supplier.create({ data: { legalName: String(request.body.legalName).trim(), tradeName: request.body.tradeName || null, taxId: request.body.taxId || null, email: request.body.email || null, phone: request.body.phone || null, contactName: request.body.contactName || null, city: request.body.city || null, state: request.body.state || null, postalCode: request.body.postalCode || null } })); }
  catch (error) { return errorResponse(response, 400, error.message); }
});
app.patch('/api/suppliers/:id', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try { const allowed = ['legalName', 'tradeName', 'taxId', 'email', 'phone', 'contactName', 'addressLine', 'addressNumber', 'addressExtra', 'neighborhood', 'city', 'state', 'postalCode', 'isActive']; const data = Object.fromEntries(Object.entries(request.body).filter(([key]) => allowed.includes(key))); return response.json(await prisma.supplier.update({ where: { id: request.params.id }, data })); }
  catch (error) { return errorResponse(response, 400, error.message); }
});
app.patch('/api/suppliers/:id/status', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try { return response.json(await prisma.supplier.update({ where: { id: request.params.id }, data: { isActive: Boolean(request.body.isActive) } })); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/stock/balances', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  try { const unitId = request.auth.unitId || activeUnitId(request); if (!unitId) return errorResponse(response, 400, 'Unidade operacional não selecionada'); const where = { unitId, ...(request.query.warehouseId ? { warehouseId: String(request.query.warehouseId) } : {}), ...(request.query.productId ? { productId: String(request.query.productId) } : {}), ...(request.query.lotId ? { lotId: String(request.query.lotId) } : {}), ...(request.query.locationId ? { locationId: String(request.query.locationId) } : {}) }; return response.json(await prisma.stockBalance.findMany({ where, include: { product: true, lot: true, warehouse: true, location: true }, orderBy: { updatedAt: 'desc' } })); }
  catch (error) { return errorResponse(response, 403, error.message); }
});

app.get('/api/stock/low', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  try {
    const unitId = request.auth.unitId || activeUnitId(request);
    if (!unitId) return errorResponse(response, 400, 'Unidade operacional não selecionada');
    const balances = await prisma.stockBalance.findMany({ where: { unitId, ...(request.query.warehouseId ? { warehouseId: String(request.query.warehouseId) } : {}) }, include: { product: true, lot: true, warehouse: true, location: true }, orderBy: { quantityOnHand: 'asc' } });
    return response.json(balances.filter((balance) => Number(balance.quantityOnHand) <= Number(balance.product.minStock)));
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/invoices/scan', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const mimeType = String(request.body.mimeType || '').toLowerCase();
    const data = String(request.body.data || '').replace(/^data:[^;]+;base64,/, '');
    const fileName = String(request.body.fileName || 'nota-fiscal');
    if (!data || !['application/pdf', 'text/xml', 'application/xml', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return errorResponse(response, 400, 'Arquivo de NF inválido; envie imagem, PDF ou XML em base64');
    const extracted = await extractInvoiceWithGemini({ data, mimeType, fileName });
    const matched = await matchInvoiceData(extracted);
    return response.json({ ...matched, canConfirm: matched.items.length > 0 && matched.items.every((item) => item.productId && item.quantity > 0 && item.unit && item.unitPrice >= 0) && matched.invoice.number && matched.invoice.series });
  } catch (error) { return errorResponse(response, error.statusCode || 500, error.message || 'Falha ao processar NF'); }
});

app.post('/api/invoices/confirm-scan', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const unitId = requireUnit(request);
    const extracted = normalizeExtractedInvoice(request.body.extracted || request.body);
    const supplierId = request.body.supplierId || extracted.supplierId || null;
    const warehouseId = String(request.body.warehouseId || '');
    const locationId = String(request.body.locationId || '');
    const idempotencyKey = request.body.idempotencyKey || request.headers['x-idempotency-key']?.toString() || null;
    if (!warehouseId || !locationId || !extracted.invoice.number || !extracted.invoice.series || !extracted.items.length) return errorResponse(response, 400, 'NF, depósito, localização e itens são obrigatórios');
    const result = await prisma.$transaction(async (tx) => {
      const existingInvoice = await tx.invoice.findFirst({ where: { unitId, number: String(extracted.invoice.number), series: String(extracted.invoice.series), deletedAt: null }, include: { items: true, movements: { include: { items: true } } } });
      if (existingInvoice?.processingStatus === 'CONFIRMED') return { invoice: existingInvoice, movement: existingInvoice.movements[0] || null, alreadyConfirmed: true };
      const warehouse = await tx.warehouse.findFirst({ where: { id: warehouseId, unitId, isActive: true } });
      const location = await tx.warehouseLocation.findFirst({ where: { id: locationId, warehouseId, isActive: true } });
      if (!warehouse || !location) throw new Error('Depósito ou localização inválidos para a unidade');
      if (supplierId && !(await tx.supplier.findFirst({ where: { id: String(supplierId), isActive: true } }))) throw new Error('Fornecedor inválido ou inativo');
      const items = [];
      for (const item of extracted.items) {
        if (!item.productId || !item.quantity || item.quantity <= 0 || !item.unit || item.unitPrice == null || item.unitPrice < 0) throw new Error('Todos os itens precisam ser conferidos antes da confirmação');
        const product = await tx.product.findFirst({ where: { id: String(item.productId), isActive: true } });
        if (!product) throw new Error(`Produto não encontrado para o item ${item.description || ''}`);
        let lot = item.lotId ? await tx.productLot.findFirst({ where: { id: String(item.lotId), productId: product.id } }) : null;
        if (!lot && item.lot) lot = await tx.productLot.findFirst({ where: { productId: product.id, lotNumber: String(item.lot) } });
        if (!lot) throw new Error(`Lote precisa ser vinculado para o produto ${product.sku}`);
        items.push({ product, lot, source: item });
      }
      const invoice = existingInvoice || await tx.invoice.create({ data: { unitId, supplierId: supplierId ? String(supplierId) : null, number: String(extracted.invoice.number), series: String(extracted.invoice.series || '0'), accessKey: extracted.invoice.accessKey || null, issueDate: asDate(extracted.invoice.issueDate, 'issueDate'), receivedAt: asDate(extracted.invoice.entryDate, 'entryDate'), totalValue: items.reduce((sum, item) => sum + Number(item.source.total ?? item.source.quantity * item.source.unitPrice), 0), origin: 'OCR', processingStatus: 'UNDER_REVIEW', createdById: request.auth.user.id } });
      if (!existingInvoice) {
        await tx.invoiceItem.createMany({ data: items.map(({ product, lot, source }) => ({ invoiceId: invoice.id, productId: product.id, lotId: lot.id, description: String(source.description || product.name), unit: String(source.unit), quantity: source.quantity, unitPrice: source.unitPrice, totalPrice: source.total ?? source.quantity * source.unitPrice, matchStatus: 'MATCHED' })) });
      }
      const movement = await createMovementTransaction(tx, { unitId, type: 'ENTRY', referenceCode: `NF-${invoice.id}`, reason: 'Entrada confirmada após conferência da NF', warehouseId, locationId, items: items.map(({ product, lot, source }) => ({ productId: product.id, lotId: lot.id, quantity: source.quantity, unit: source.unit, unitCost: source.unitPrice })), invoiceId: invoice.id, idempotencyKey, userId: request.auth.user.id, requestId: request.headers['x-request-id']?.toString() || null });
      const confirmed = await tx.invoice.update({ where: { id: invoice.id }, data: { processingStatus: 'CONFIRMED', confirmedById: request.auth.user.id, confirmedAt: new Date(), reviewedById: request.auth.user.id, reviewedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: request.auth.user.id, unitId, action: 'CONFIRM', result: 'SUCCESS', entityType: 'Invoice', entityId: invoice.id, metadata: { movementId: movement.id, source: 'scan' } } });
      return { invoice: confirmed, movement, alreadyConfirmed: false };
    }, { isolationLevel: 'Serializable' });
    return response.status(result.alreadyConfirmed ? 200 : 201).json(result);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/stock/movements', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const unitId = requireUnit(request);
    const { type, referenceCode, reason, warehouseId, locationId, items = [], invoiceId, inventoryId, idempotencyKey } = request.body;
    if (!referenceCode || !items.length) return errorResponse(response, 400, 'Movimentação inválida');
    const result = await prisma.$transaction(async (tx) => {
      return createMovementTransaction(tx, { unitId, type, referenceCode, reason, warehouseId, locationId, items, invoiceId, inventoryId, idempotencyKey, userId: request.auth.user.id, requestId: request.headers['x-request-id']?.toString() || null });
    }, { isolationLevel: 'Serializable' });
    return response.status(201).json(result);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/movements', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  try { return response.json(await prisma.stockMovement.findMany({ where: { unitId: request.auth.unitId, deletedAt: null }, include: { items: { include: { product: true, lot: true } }, performedBy: { select: { id: true, name: true } } }, orderBy: { occurredAt: 'desc' }, take: Math.min(Number(request.query.limit) || 100, 500) })); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/transfers', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const unitId = requireUnit(request);
    const { sourceWarehouseId, sourceLocationId, targetWarehouseId, targetLocationId, referenceCode, reason, items = [], idempotencyKey } = request.body;
    if (!sourceWarehouseId || !sourceLocationId || !targetWarehouseId || !targetLocationId || !referenceCode || !items.length) return errorResponse(response, 400, 'Origem, destino, referência e itens são obrigatórios');
    if (sourceWarehouseId === targetWarehouseId && sourceLocationId === targetLocationId) return errorResponse(response, 400, 'Origem e destino devem ser diferentes');
    const result = await prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.transfer.findUnique({ where: { idempotencyKey }, include: { items: true, movements: { include: { items: true } } } });
        if (existing) return existing;
      }
      const sourceWarehouse = await tx.warehouse.findFirst({ where: { id: String(sourceWarehouseId), unitId, isActive: true } });
      const targetWarehouse = await tx.warehouse.findFirst({ where: { id: String(targetWarehouseId), unitId, isActive: true } });
      if (!sourceWarehouse || !targetWarehouse) throw new Error('Depósito de origem ou destino inválido');
      const sourceLocation = await tx.warehouseLocation.findFirst({ where: { id: String(sourceLocationId), warehouseId: sourceWarehouse.id, isActive: true } });
      const targetLocation = await tx.warehouseLocation.findFirst({ where: { id: String(targetLocationId), warehouseId: targetWarehouse.id, isActive: true } });
      if (!sourceLocation || !targetLocation) throw new Error('Localização de origem ou destino inválida');
      const normalizedItems = [];
      const keys = new Set();
      for (const item of items) {
        const quantity = asDecimal(item.quantity, 'quantity');
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('A quantidade da transferência deve ser positiva');
        const product = await tx.product.findFirst({ where: { id: String(item.productId), isActive: true } });
        if (!product) throw new Error(`Produto inválido: ${item.productId}`);
        const lot = await tx.productLot.findFirst({ where: { id: String(item.lotId), productId: product.id } });
        if (!lot) throw new Error(`Lote inválido para o produto ${product.sku}`);
        const key = `${product.id}:${lot.id}`;
        if (keys.has(key)) throw new Error(`Item duplicado na transferência: ${product.sku}`);
        keys.add(key);
        normalizedItems.push({ product, lot, quantity, unit: String(item.unit || product.unit) });
      }
      const transfer = await tx.transfer.create({ data: { unitId, sourceWarehouseId: sourceWarehouse.id, targetWarehouseId: targetWarehouse.id, referenceCode: String(referenceCode).trim(), idempotencyKey: idempotencyKey || null, status: 'DRAFT', requestedById: request.auth.user.id } });
      await tx.transferItem.createMany({ data: normalizedItems.map((item) => ({ transferId: transfer.id, productId: item.product.id, lotId: item.lot.id, quantitySent: item.quantity, quantityReceived: item.quantity, unit: item.unit })) });
      const movementItems = normalizedItems.map((item) => ({ productId: item.product.id, lotId: item.lot.id, quantity: item.quantity, unit: item.unit }));
      const exit = await createMovementTransaction(tx, { unitId, type: 'EXIT', referenceCode: `TR-${transfer.id}-OUT`, reason: reason || 'Transferência de estoque - saída', warehouseId: sourceWarehouse.id, locationId: sourceLocation.id, sourceWarehouseId: sourceWarehouse.id, targetWarehouseId: targetWarehouse.id, items: movementItems, transferId: transfer.id, transferLeg: 'OUTBOUND', idempotencyKey: idempotencyKey ? `${idempotencyKey}:out` : null, userId: request.auth.user.id, requestId: request.headers['x-request-id']?.toString() || null });
      const entry = await createMovementTransaction(tx, { unitId, type: 'ENTRY', referenceCode: `TR-${transfer.id}-IN`, reason: reason || 'Transferência de estoque - entrada', warehouseId: targetWarehouse.id, locationId: targetLocation.id, sourceWarehouseId: sourceWarehouse.id, targetWarehouseId: targetWarehouse.id, items: movementItems, transferId: transfer.id, transferLeg: 'INBOUND', idempotencyKey: idempotencyKey ? `${idempotencyKey}:in` : null, userId: request.auth.user.id, requestId: request.headers['x-request-id']?.toString() || null });
      const completed = await tx.transfer.update({ where: { id: transfer.id }, data: { status: 'COMPLETED', approvedById: request.auth.user.id, approvedAt: new Date(), dispatchedAt: new Date(), completedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: request.auth.user.id, unitId, action: 'CONFIRM', result: 'SUCCESS', entityType: 'Transfer', entityId: transfer.id, metadata: { outboundMovementId: exit.id, inboundMovementId: entry.id } } });
      return { ...completed, items: await tx.transferItem.findMany({ where: { transferId: transfer.id } }), movements: [exit, entry] };
    }, { isolationLevel: 'Serializable' });
    return response.status(201).json(result);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/transfers', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  try {
    const unitId = requireUnit(request);
    return response.json(await prisma.transfer.findMany({ where: { unitId, deletedAt: null }, include: { items: true, sourceWarehouse: true, targetWarehouse: true, movements: true }, orderBy: { requestedAt: 'desc' }, take: Math.min(Number(request.query.limit) || 100, 500) }));
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/transfers/:id', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  try {
    const transfer = await prisma.transfer.findUnique({ where: { id: request.params.id }, include: { items: { include: { product: true, lot: true } }, sourceWarehouse: true, targetWarehouse: true, movements: { include: { items: true } } } });
    if (!transfer || transfer.deletedAt) return errorResponse(response, 404, 'Transferência não encontrada');
    ensureUnitAccess(request, transfer.unitId);
    return response.json(transfer);
  } catch (error) { return errorResponse(response, 403, error.message); }
});

app.post('/api/inventories', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const unitId = requireUnit(request);
    if (!request.body.warehouseId || !request.body.name) return errorResponse(response, 400, 'Nome e depósito são obrigatórios');
    const warehouse = await prisma.warehouse.findFirst({ where: { id: request.body.warehouseId, unitId, isActive: true } });
    if (!warehouse) return errorResponse(response, 400, 'Depósito inválido');
    const inventory = await prisma.$transaction(async (tx) => {
      const created = await tx.inventory.create({ data: { unitId, warehouseId: warehouse.id, name: String(request.body.name).trim(), responsibleId: request.auth.user.id, status: 'DRAFT' } });
      await tx.auditLog.create({ data: { userId: request.auth.user.id, unitId, action: 'CREATE', result: 'SUCCESS', entityType: 'Inventory', entityId: created.id } });
      return created;
    });
    return response.status(201).json(inventory);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/inventories', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  try { const unitId = requireUnit(request); return response.json(await prisma.inventory.findMany({ where: { unitId, deletedAt: null }, include: { warehouse: true, responsible: { select: { id: true, name: true } }, items: true }, orderBy: { createdAt: 'desc' } })); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/inventories/:id', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  const inventory = await prisma.inventory.findUnique({ where: { id: request.params.id }, include: { warehouse: true, items: { include: { product: true, lot: true, location: true } }, responsible: { select: { id: true, name: true } } } });
  if (!inventory) return errorResponse(response, 404, 'Inventário não encontrado');
  try { ensureUnitAccess(request, inventory.unitId); } catch (error) { return errorResponse(response, 403, error.message); }
  return response.json(inventory);
});

app.post('/api/inventories/:id/items', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const item = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({ where: { id: request.params.id } });
      if (!inventory || !['DRAFT', 'IN_PROGRESS'].includes(inventory.status)) throw new Error('Inventário não está aberto');
      ensureUnitAccess(request, inventory.unitId);
      const product = await tx.product.findFirst({ where: { id: String(request.body.productId), isActive: true } });
      if (!product) throw new Error('Produto inválido ou inativo');
      const location = await tx.warehouseLocation.findFirst({ where: { id: request.body.locationId, warehouseId: inventory.warehouseId, isActive: true } });
      if (!location) throw new Error('Localização inválida');
      const lot = await tx.productLot.findFirst({ where: { id: request.body.lotId, productId: product.id } });
      if (!lot) throw new Error('Lote inválido para o produto');
      const duplicate = await tx.inventoryItem.findFirst({ where: { inventoryId: inventory.id, productId: product.id, lotId: lot.id, locationId: location.id } });
      if (duplicate) throw new Error('Item já incluído no inventário');
      const balance = await tx.stockBalance.findUnique({ where: { unitId_productId_warehouseId_lotId_locationId: { unitId: inventory.unitId, productId: product.id, warehouseId: inventory.warehouseId, lotId: lot.id, locationId: location.id } } });
      const created = await tx.inventoryItem.create({ data: { inventoryId: inventory.id, warehouseId: inventory.warehouseId, productId: product.id, lotId: lot.id, locationId: location.id, locationSnapshot: location.name, expectedQuantity: balance?.quantityOnHand || 0 } });
      await tx.inventory.update({ where: { id: inventory.id }, data: { status: 'IN_PROGRESS', startedAt: inventory.startedAt || new Date() } });
      return created;
    });
    return response.status(201).json(item);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.patch('/api/inventories/:id/items/:itemId', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: request.params.itemId, inventoryId: request.params.id }, include: { inventory: true } });
    if (!item || !['DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(item.inventory.status)) return errorResponse(response, 404, 'Item de inventário não encontrado');
    ensureUnitAccess(request, item.inventory.unitId);
    const counted = asDecimal(request.body.countedQuantity, 'countedQuantity');
    if (counted < 0) return errorResponse(response, 400, 'Quantidade contada não pode ser negativa');
    return response.json(await prisma.inventoryItem.update({ where: { id: item.id }, data: { countedQuantity: counted, differenceQuantity: counted - Number(item.expectedQuantity), observation: request.body.observation || null, countedAt: new Date() } }));
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/inventories/:id/finalize', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({ where: { id: request.params.id }, include: { items: true } });
      if (!inventory || !['IN_PROGRESS', 'UNDER_REVIEW'].includes(inventory.status)) throw new Error('Inventário não está pronto para finalizar');
      ensureUnitAccess(request, inventory.unitId);
      if (inventory.items.some((item) => item.countedQuantity == null)) throw new Error('Todos os itens precisam ser contados');
      const updated = [];
      for (const item of inventory.items) {
        const difference = Number(item.countedQuantity) - Number(item.expectedQuantity);
        await tx.inventoryItem.update({ where: { id: item.id }, data: { differenceQuantity: difference } });
        if (difference !== 0) {
          const movement = await createMovementTransaction(tx, { unitId: inventory.unitId, type: 'INVENTORY', referenceCode: `INV-${inventory.id}-${item.id}`, reason: 'Ajuste de inventário', warehouseId: inventory.warehouseId, locationId: item.locationId, items: [{ productId: item.productId, lotId: item.lotId, quantityDelta: difference, unit: item.unit }], inventoryId: inventory.id, userId: request.auth.user.id, requestId: request.headers['x-request-id']?.toString() || null });
          updated.push(movement.id);
        }
      }
      const finished = await tx.inventory.update({ where: { id: inventory.id }, data: { status: 'CONFIRMED', completedAt: new Date(), confirmedAt: new Date(), confirmedById: request.auth.user.id } });
      await tx.auditLog.create({ data: { userId: request.auth.user.id, unitId: inventory.unitId, action: 'CONFIRM', result: 'SUCCESS', entityType: 'Inventory', entityId: inventory.id, metadata: { movementIds: updated } } });
      return finished;
    }, { isolationLevel: 'Serializable' });
    return response.json(result);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/invoices', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  try { const unitId = requireUnit(request); return response.json(await prisma.invoice.findMany({ where: { unitId, deletedAt: null, ...(request.query.supplierId ? { supplierId: String(request.query.supplierId) } : {}) }, include: { supplier: true, items: true }, orderBy: { createdAt: 'desc' } })); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/invoices', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const unitId = requireUnit(request);
    if (!request.body.number || !request.body.origin) return errorResponse(response, 400, 'Número e origem são obrigatórios');
    const supplierId = request.body.supplierId || null;
    if (supplierId && !(await prisma.supplier.findFirst({ where: { id: String(supplierId), isActive: true } }))) return errorResponse(response, 400, 'Fornecedor inválido ou inativo');
    const totalValue = request.body.totalValue == null ? null : ensureNonNegative(request.body.totalValue, 'totalValue');
    const issueDate = asDate(request.body.issueDate, 'issueDate');
    const receivedAt = asDate(request.body.receivedAt, 'receivedAt');
    const invoice = await prisma.invoice.create({ data: { unitId, supplierId, number: String(request.body.number).trim(), series: String(request.body.series || '0').trim(), accessKey: request.body.accessKey || null, issueDate, receivedAt, totalValue, origin: request.body.origin } });
    await prisma.auditLog.create({ data: { userId: request.auth.user.id, unitId, action: 'CREATE', result: 'SUCCESS', entityType: 'Invoice', entityId: invoice.id } });
    return response.status(201).json(invoice);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/invoices/:id/items', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: request.params.id } });
    if (!invoice || invoice.processingStatus === 'CONFIRMED') return errorResponse(response, 400, 'Nota não pode receber itens');
    ensureUnitAccess(request, invoice.unitId);
    const productId = request.body.productId || null;
    const lotId = request.body.lotId || null;
    if ((productId && !lotId) || (!productId && lotId)) return errorResponse(response, 400, 'Produto e lote devem ser informados juntos');
    if (productId && !(await prisma.productLot.findFirst({ where: { id: String(lotId), productId: String(productId) } }))) return errorResponse(response, 400, 'Lote inválido para o produto');
    const quantity = ensureNonNegative(request.body.quantity, 'quantity');
    if (quantity === 0) return errorResponse(response, 400, 'quantity deve ser maior que zero');
    const unitPrice = ensureNonNegative(request.body.unitPrice, 'unitPrice');
    const totalPrice = ensureNonNegative(request.body.totalPrice, 'totalPrice');
    const confidence = request.body.confidence == null ? null : ensureNonNegative(request.body.confidence, 'confidence');
    if (confidence != null && confidence > 1) return errorResponse(response, 400, 'confidence deve estar entre 0 e 1');
    const item = await prisma.invoiceItem.create({ data: { invoiceId: invoice.id, productId, lotId, description: String(request.body.description || '').trim(), supplierSku: request.body.supplierSku || null, unit: String(request.body.unit || '').trim(), quantity, unitPrice, totalPrice, matchStatus: request.body.matchStatus || 'PENDING', confidence } });
    return response.status(201).json(item);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/invoices/:id/confirm', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: request.params.id }, include: { items: true } });
      if (!invoice || invoice.processingStatus === 'CONFIRMED') throw new Error('Nota inválida ou já confirmada');
      if (!invoice.items.length || invoice.items.some((item) => !item.productId || !item.lotId || item.matchStatus !== 'MATCHED')) throw new Error('Todos os itens precisam estar conciliados e marcados como MATCHED');
      const movement = await createMovementTransaction(tx, { unitId: invoice.unitId, type: 'ENTRY', referenceCode: `NF-${invoice.id}`, reason: 'Entrada confirmada de nota fiscal', warehouseId: request.body.warehouseId, locationId: request.body.locationId, items: invoice.items.map((item) => ({ productId: item.productId, lotId: item.lotId, quantity: item.quantity, unit: item.unit, unitCost: item.unitPrice })), invoiceId: invoice.id, userId: request.auth.user.id, requestId: request.headers['x-request-id']?.toString() || null });
      const confirmed = await tx.invoice.update({ where: { id: invoice.id }, data: { processingStatus: 'CONFIRMED', confirmedById: request.auth.user.id, confirmedAt: new Date(), reviewedById: request.auth.user.id, reviewedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: request.auth.user.id, unitId: invoice.unitId, action: 'CONFIRM', result: 'SUCCESS', entityType: 'Invoice', entityId: invoice.id, metadata: { movementId: movement.id } } });
      return { invoice: confirmed, movement };
    }, { isolationLevel: 'Serializable' });
    return response.json(result);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/invoices/:id/documents', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: request.params.id } });
    if (!invoice || invoice.deletedAt) return errorResponse(response, 404, 'Nota fiscal não encontrada');
    ensureUnitAccess(request, invoice.unitId);
    const fileName = String(request.body.fileName || '').trim();
    const mediaType = String(request.body.mediaType || '').trim();
    const storageKey = String(request.body.storageKey || '').trim();
    if (!fileName || !mediaType || !storageKey) return errorResponse(response, 400, 'fileName, mediaType e storageKey são obrigatórios');
    const document = await prisma.invoiceDocument.create({ data: { invoiceId: invoice.id, fileName, mediaType, storageKey, checksum: request.body.checksum || null } });
    return response.status(201).json(document);
  }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/invoices/:id/ocr-runs', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: request.params.id } });
      if (!invoice || invoice.deletedAt) throw new Error('Nota fiscal não encontrada');
      ensureUnitAccess(request, invoice.unitId);
      const run = await tx.ocrRun.create({ data: { invoiceId: invoice.id, requestedById: request.auth.user.id, status: 'QUEUED', provider: request.body.provider || null, model: request.body.model || null } });
      await tx.invoice.update({ where: { id: invoice.id }, data: { processingStatus: 'OCR_PROCESSING' } });
      return run;
    });
    return response.status(201).json(result);
  }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.patch('/api/ocr-runs/:id/review', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.ocrRun.findUnique({ where: { id: request.params.id } });
      if (!current || current.deletedAt) throw new Error('Execução OCR não encontrada');
      const invoice = await tx.invoice.findUnique({ where: { id: current.invoiceId } });
      if (!invoice) throw new Error('Nota fiscal não encontrada');
      ensureUnitAccess(request, invoice.unitId);
      const confidence = request.body.confidence == null ? null : ensureNonNegative(request.body.confidence, 'confidence');
      if (confidence != null && confidence > 1) throw new Error('confidence deve estar entre 0 e 1');
      const completedAt = asDate(request.body.completedAt, 'completedAt') || new Date();
      const run = await tx.ocrRun.update({ where: { id: current.id }, data: { status: 'REVIEWED', reviewedById: request.auth.user.id, reviewedAt: new Date(), completedAt, confidence, rawOutput: request.body.rawOutput || undefined } });
      await tx.invoice.update({ where: { id: invoice.id }, data: { processingStatus: 'UNDER_REVIEW' } });
      return run;
    });
    return response.json(result);
  }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/reports/stock', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  try { const unitId = requireUnit(request); const balances = await prisma.stockBalance.findMany({ where: { unitId, ...(request.query.warehouseId ? { warehouseId: String(request.query.warehouseId) } : {}) }, include: { product: true, warehouse: true, location: true, lot: true }, orderBy: { quantityOnHand: 'asc' } }); return response.json({ generatedAt: new Date().toISOString(), totalLines: balances.length, totalQuantity: balances.reduce((sum, item) => sum + Number(item.quantityOnHand), 0), lowStock: balances.filter((item) => Number(item.quantityOnHand) <= Number(item.product.minStock)), balances }); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/reports/movements', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR', 'AUDITOR', 'VIEWER'), async (request, response) => {
  try { const unitId = requireUnit(request); const from = request.query.from ? new Date(String(request.query.from)) : undefined; const to = request.query.to ? new Date(String(request.query.to)) : undefined; const movements = await prisma.stockMovement.findMany({ where: { unitId, deletedAt: null, ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}), ...(request.query.type ? { type: String(request.query.type) } : {}) }, include: { items: { include: { product: true, lot: true } }, performedBy: { select: { id: true, name: true } } }, orderBy: { occurredAt: 'desc' } }); return response.json({ generatedAt: new Date().toISOString(), count: movements.length, movements }); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.get('/api/reports/audit', authenticate, requireRole('ADMIN', 'MANAGER', 'AUDITOR'), async (request, response) => {
  try { const unitId = requireUnit(request); return response.json(await prisma.auditLog.findMany({ where: { unitId }, orderBy: { occurredAt: 'desc' }, take: Math.min(Number(request.query.limit) || 100, 500) })); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.use((error, _request, response, _next) => errorResponse(response, 500, error.message || 'Erro interno'));

if (process.env.NODE_ENV !== 'test') app.listen(port, () => console.log(`ALMX API listening on port ${port}`));
export { app };