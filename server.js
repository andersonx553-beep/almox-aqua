import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './server/prisma.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const jwtSecret = process.env.JWT_SECRET;
const sessionDays = 30;

app.use(express.json({ limit: '2mb' }));

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const errorResponse = (response, status, message) => response.status(status).json({ error: message });
const requireJwtSecret = () => {
  if (!jwtSecret) throw new Error('JWT_SECRET não configurado');
  return jwtSecret;
};
const asDecimal = (value, field) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${field} inválido`);
  return number;
};

async function createSession(user) {
  const token = jwt.sign({ sub: user.id }, requireJwtSecret(), { expiresIn: `${sessionDays}d` });
  const decoded = jwt.decode(token);
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(decoded.exp * 1000),
    },
  });
  return token;
}

async function authenticate(request, response, next) {
  if (process.env.NODE_ENV !== 'production') {
    const devUserId = request.headers['x-dev-user-id'];
    if (devUserId) {
      const user = await prisma.user.findUnique({
        where: { id: String(devUserId) },
        include: { memberships: true, defaultUnit: true },
      });
      if (user?.status === 'ACTIVE') {
        request.auth = { user, devMode: true };
        return next();
      }
    }
  }
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return errorResponse(response, 401, 'Autenticação necessária');
  try {
    const payload = jwt.verify(token, requireJwtSecret());
    const session = await prisma.session.findFirst({
      where: { tokenHash: hashToken(token), userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { include: { memberships: true, defaultUnit: true } } },
    });
    if (!session || session.user.status !== 'ACTIVE') return errorResponse(response, 401, 'Sessão inválida');
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
    request.auth = { token, session, user: session.user };
    return next();
  } catch {
    return errorResponse(response, 401, 'Sessão inválida');
  }
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

async function createMovementTransaction(tx, { unitId, type, referenceCode, reason, warehouseId, locationId, items, invoiceId = null, inventoryId = null, transferId = null, transferLeg = null, idempotencyKey = null, userId, requestId = null }) {
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
  const movement = await tx.stockMovement.create({ data: { unitId, type, referenceCode: String(referenceCode), reason: reason || null, invoiceId, inventoryId, transferId, transferLeg, performedById: userId, idempotencyKey, occurredAt: new Date() } });
  for (const item of items) {
    const quantity = asDecimal(item.quantity ?? item.quantityDelta, 'quantity');
    if (!Number.isFinite(quantity) || quantity === 0) throw new Error('A quantidade deve ser diferente de zero');
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
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, email: true, role: true, defaultUnitId: true },
    orderBy: { name: 'asc' },
  });
  return response.json(users);
});

app.post('/api/auth/users', async (request, response) => {
  try {
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
    const user = await prisma.user.findFirst({
      where: { id: String(request.body.userId || ''), status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true, defaultUnitId: true },
    });
    if (!user) return errorResponse(response, 404, 'Usuário não encontrado');
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', result: 'SUCCESS', entityType: 'User', entityId: user.id, metadata: { mode: 'user-selection' } } });
    return response.json({ user, developmentMode: true });
  } catch (error) {
    return errorResponse(response, 400, error.message);
  }
});

app.get('/api/units', authenticate, async (_request, response) => response.json(await prisma.operationalUnit.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })));
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
app.get('/api/units/:unitId/warehouses', authenticate, async (request, response) => response.json(await prisma.warehouse.findMany({ where: { unitId: request.params.unitId, isActive: true }, include: { locations: true }, orderBy: { name: 'asc' } })));
app.post('/api/units/:unitId/warehouses', authenticate, async (request, response) => {
  try {
    const unitId = request.params.unitId;
    if (unitId !== request.auth.user.defaultUnitId && request.auth.user.role !== 'ADMIN') return errorResponse(response, 403, 'Usuário sem acesso à unidade');
    const code = String(request.body.code || '').trim().toUpperCase();
    const name = String(request.body.name || '').trim();
    if (!code || !name) return errorResponse(response, 400, 'Código e nome do depósito são obrigatórios');
    return response.status(201).json(await prisma.warehouse.create({ data: { unitId, code, name, address: request.body.address || null } }));
  } catch (error) { return errorResponse(response, 400, error.message); }
});
app.post('/api/warehouses/:warehouseId/locations', authenticate, async (request, response) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: request.params.warehouseId } });
    if (!warehouse || (warehouse.unitId !== request.auth.user.defaultUnitId && request.auth.user.role !== 'ADMIN')) return errorResponse(response, 403, 'Depósito inválido');
    const code = String(request.body.code || '').trim().toUpperCase();
    const name = String(request.body.name || '').trim();
    if (!code || !name) return errorResponse(response, 400, 'Código e nome da localização são obrigatórios');
    return response.status(201).json(await prisma.warehouseLocation.create({ data: { warehouseId: warehouse.id, code, name } }));
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/auth/login', async (request, response) => {
  try {
    const email = String(request.body.email || '').trim().toLowerCase();
    const password = String(request.body.password || '');
    if (!email || !password) return errorResponse(response, 400, 'E-mail e senha são obrigatórios');
    const user = await prisma.user.findUnique({ where: { email }, include: { memberships: true, defaultUnit: true } });
    if (!user || user.status !== 'ACTIVE' || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return errorResponse(response, 401, 'Credenciais inválidas');
    }
    const token = await createSession(user);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: user.id, unitId: user.defaultUnitId, action: 'LOGIN', result: 'SUCCESS', entityType: 'User', entityId: user.id } });
    return response.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, defaultUnitId: user.defaultUnitId } });
  } catch (error) {
    return errorResponse(response, 500, error.message);
  }
});

app.post('/api/auth/logout', authenticate, async (request, response) => {
  if (request.auth.devMode) return response.status(204).end();
  await prisma.session.update({ where: { id: request.auth.session.id }, data: { revokedAt: new Date() } });
  await prisma.auditLog.create({ data: { userId: request.auth.user.id, unitId: request.auth.user.defaultUnitId, action: 'LOGOUT', result: 'SUCCESS', entityType: 'Session', entityId: request.auth.session.id } });
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
    const product = await prisma.product.create({ data: { sku: String(data.sku), barcode: data.barcode || null, name: String(data.name), description: data.description || null, unit: String(data.unit), categoryId: String(data.categoryId), minStock: asDecimal(data.minStock || 0, 'minStock'), maxStock: data.maxStock == null ? null : asDecimal(data.maxStock, 'maxStock'), reorderPoint: data.reorderPoint == null ? null : asDecimal(data.reorderPoint, 'reorderPoint'), imageUrl: data.imageUrl || null, technicalSpecs: data.technicalSpecs || null } });
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
    return response.status(201).json(await prisma.productLot.create({ data: { productId: request.params.id, lotNumber, supplierId: request.body.supplierId || null, expirationDate: request.body.expirationDate ? new Date(request.body.expirationDate) : null, manufactureDate: request.body.manufactureDate ? new Date(request.body.manufactureDate) : null } }));
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

app.post('/api/inventories', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const unitId = requireUnit(request);
    if (!request.body.warehouseId || !request.body.name) return errorResponse(response, 400, 'Nome e depósito são obrigatórios');
    const warehouse = await prisma.warehouse.findFirst({ where: { id: request.body.warehouseId, unitId, isActive: true } });
    if (!warehouse) return errorResponse(response, 400, 'Depósito inválido');
    const inventory = await prisma.inventory.create({ data: { unitId, warehouseId: warehouse.id, name: String(request.body.name).trim(), responsibleId: request.auth.user.id, status: 'DRAFT' } });
    await prisma.auditLog.create({ data: { userId: request.auth.user.id, unitId, action: 'CREATE', result: 'SUCCESS', entityType: 'Inventory', entityId: inventory.id } });
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
  return response.json(inventory);
});

app.post('/api/inventories/:id/items', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const inventory = await prisma.inventory.findUnique({ where: { id: request.params.id } });
    if (!inventory || !['DRAFT', 'IN_PROGRESS'].includes(inventory.status)) return errorResponse(response, 400, 'Inventário não está aberto');
    const location = await prisma.warehouseLocation.findFirst({ where: { id: request.body.locationId, warehouseId: inventory.warehouseId, isActive: true } });
    if (!location) return errorResponse(response, 400, 'Localização inválida');
    const lot = await prisma.productLot.findFirst({ where: { id: request.body.lotId, productId: request.body.productId } });
    if (!lot) return errorResponse(response, 400, 'Lote inválido para o produto');
    const balance = await prisma.stockBalance.findUnique({ where: { unitId_productId_warehouseId_lotId_locationId: { unitId: inventory.unitId, productId: request.body.productId, warehouseId: inventory.warehouseId, lotId: lot.id, locationId: location.id } } });
    const item = await prisma.inventoryItem.create({ data: { inventoryId: inventory.id, warehouseId: inventory.warehouseId, productId: request.body.productId, lotId: lot.id, locationId: location.id, locationSnapshot: location.name, expectedQuantity: balance?.quantityOnHand || 0 } });
    await prisma.inventory.update({ where: { id: inventory.id }, data: { status: 'IN_PROGRESS', startedAt: inventory.startedAt || new Date() } });
    return response.status(201).json(item);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.patch('/api/inventories/:id/items/:itemId', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: request.params.itemId, inventoryId: request.params.id }, include: { inventory: true } });
    if (!item || !['DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(item.inventory.status)) return errorResponse(response, 404, 'Item de inventário não encontrado');
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
    const invoice = await prisma.invoice.create({ data: { unitId, supplierId: request.body.supplierId || null, number: String(request.body.number), series: String(request.body.series || '0'), accessKey: request.body.accessKey || null, issueDate: request.body.issueDate ? new Date(request.body.issueDate) : null, receivedAt: request.body.receivedAt ? new Date(request.body.receivedAt) : null, totalValue: request.body.totalValue == null ? null : asDecimal(request.body.totalValue, 'totalValue'), origin: request.body.origin } });
    await prisma.auditLog.create({ data: { userId: request.auth.user.id, unitId, action: 'CREATE', result: 'SUCCESS', entityType: 'Invoice', entityId: invoice.id } });
    return response.status(201).json(invoice);
  } catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/invoices/:id/items', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: request.params.id } });
    if (!invoice || invoice.processingStatus === 'CONFIRMED') return errorResponse(response, 400, 'Nota não pode receber itens');
    const item = await prisma.invoiceItem.create({ data: { invoiceId: invoice.id, productId: request.body.productId || null, lotId: request.body.lotId || null, description: String(request.body.description), supplierSku: request.body.supplierSku || null, unit: String(request.body.unit), quantity: asDecimal(request.body.quantity, 'quantity'), unitPrice: asDecimal(request.body.unitPrice, 'unitPrice'), totalPrice: asDecimal(request.body.totalPrice, 'totalPrice'), matchStatus: request.body.matchStatus || 'PENDING', confidence: request.body.confidence == null ? null : asDecimal(request.body.confidence, 'confidence') } });
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
  try { const document = await prisma.invoiceDocument.create({ data: { invoiceId: request.params.id, fileName: String(request.body.fileName), mediaType: String(request.body.mediaType), storageKey: String(request.body.storageKey), checksum: request.body.checksum || null } }); return response.status(201).json(document); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.post('/api/invoices/:id/ocr-runs', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try { const run = await prisma.ocrRun.create({ data: { invoiceId: request.params.id, requestedById: request.auth.user.id, status: 'QUEUED', provider: request.body.provider || null, model: request.body.model || null } }); await prisma.invoice.update({ where: { id: request.params.id }, data: { processingStatus: 'OCR_PROCESSING' } }); return response.status(201).json(run); }
  catch (error) { return errorResponse(response, 400, error.message); }
});

app.patch('/api/ocr-runs/:id/review', authenticate, requireRole('ADMIN', 'MANAGER', 'OPERATOR'), async (request, response) => {
  try { const run = await prisma.ocrRun.update({ where: { id: request.params.id }, data: { status: 'REVIEWED', reviewedById: request.auth.user.id, reviewedAt: new Date(), completedAt: request.body.completedAt ? new Date(request.body.completedAt) : new Date(), confidence: request.body.confidence == null ? null : asDecimal(request.body.confidence, 'confidence'), rawOutput: request.body.rawOutput || undefined } }); await prisma.invoice.update({ where: { id: run.invoiceId }, data: { processingStatus: 'UNDER_REVIEW' } }); return response.json(run); }
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