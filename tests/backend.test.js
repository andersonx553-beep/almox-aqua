import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

process.env.NODE_ENV = 'test';

const { app } = await import('../server.js');
const { prisma } = await import('../server/prisma.js');

test('backend ALMX cobre entidades, estoque, transferência, inventário e NF', async () => {
  const suffix = randomUUID();
  const created = { userIds: [], unitId: null, categoryId: null, productId: null, supplierId: null, lotId: null, warehouseIds: [], locationIds: [], invoiceId: null, inventoryId: null, transferId: null };
  const unit = await prisma.operationalUnit.create({ data: { code: `T-${suffix.slice(0, 10)}`, name: `Test unit ${suffix}` } });
  created.unitId = unit.id;
  const operator = await prisma.user.create({ data: { email: `test-${suffix}@example.test`, name: 'Backend Test Operator', role: 'OPERATOR', defaultUnit: { connect: { id: unit.id } } } });
  created.userIds.push(operator.id);
  await prisma.userUnit.create({ data: { userId: operator.id, unitId: unit.id, role: 'OPERATOR' } });
  const sourceWarehouse = await prisma.warehouse.create({ data: { unitId: unit.id, code: `SRC-${suffix.slice(0, 6)}`, name: 'Test source' } });
  const targetWarehouse = await prisma.warehouse.create({ data: { unitId: unit.id, code: `DST-${suffix.slice(0, 6)}`, name: 'Test target' } });
  created.warehouseIds.push(sourceWarehouse.id, targetWarehouse.id);
  const sourceLocation = await prisma.warehouseLocation.create({ data: { warehouseId: sourceWarehouse.id, code: 'A1', name: 'Test source location' } });
  const targetLocation = await prisma.warehouseLocation.create({ data: { warehouseId: targetWarehouse.id, code: 'B1', name: 'Test target location' } });
  created.locationIds.push(sourceLocation.id, targetLocation.id);
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'content-type': 'application/json', 'x-dev-user-id': operator.id, 'x-unit-id': unit.id };
  const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const body = response.status === 204 ? null : await response.json();
    return { response, body };
  };
  const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });

  try {
    const status = await fetch(`${baseUrl}/api/status`);
    assert.equal(status.status, 200);

    const createdUser = await post('/api/auth/users', { name: `Selected ${suffix}`, email: `selected-${suffix}@example.test` });
    assert.equal(createdUser.response.status, 201);
    created.userIds.push(createdUser.body.user.id);
    const selected = await post('/api/auth/select', { userId: createdUser.body.user.id });
    assert.equal(selected.response.status, 200);

    const category = await post('/api/categories', { code: `CAT-${suffix.slice(0, 8)}`, name: `Test category ${suffix}` });
    assert.equal(category.response.status, 201);
    created.categoryId = category.body.id;
    const supplier = await post('/api/suppliers', { legalName: `Test supplier ${suffix}` });
    assert.equal(supplier.response.status, 201);
    created.supplierId = supplier.body.id;
    const product = await post('/api/products', { sku: `SKU-${suffix.slice(0, 10)}`, name: `Test product ${suffix}`, unit: 'UN', categoryId: created.categoryId, minStock: 0 });
    assert.equal(product.response.status, 201);
    created.productId = product.body.id;
    const lot = await post(`/api/products/${created.productId}/lots`, { lotNumber: `LOT-${suffix.slice(0, 10)}`, supplierId: created.supplierId });
    assert.equal(lot.response.status, 201);
    created.lotId = lot.body.id;
    const lotUpdate = await request(`/api/lots/${created.lotId}`, { method: 'PATCH', body: JSON.stringify({ expirationDate: '2030-01-01T00:00:00.000Z' }) });
    assert.equal(lotUpdate.response.status, 200);

    const entry = await post('/api/stock/movements', { type: 'ENTRY', referenceCode: `TEST-ENTRY-${suffix}`, reason: 'Test entry', warehouseId: sourceWarehouse.id, locationId: sourceLocation.id, items: [{ productId: created.productId, lotId: created.lotId, quantity: 10 }] });
    assert.equal(entry.response.status, 201);
    const idempotent = await post('/api/stock/movements', { type: 'ENTRY', referenceCode: `TEST-ENTRY-RETRY-${suffix}`, reason: 'Test entry retry', warehouseId: sourceWarehouse.id, locationId: sourceLocation.id, idempotencyKey: `IDEMP-${suffix}`, items: [{ productId: created.productId, lotId: created.lotId, quantity: 2 }] });
    assert.equal(idempotent.response.status, 201);
    const idempotentRetry = await post('/api/stock/movements', { type: 'ENTRY', referenceCode: `TEST-ENTRY-RETRY-2-${suffix}`, warehouseId: sourceWarehouse.id, locationId: sourceLocation.id, idempotencyKey: `IDEMP-${suffix}`, items: [{ productId: created.productId, lotId: created.lotId, quantity: 2 }] });
    assert.equal(idempotentRetry.response.status, 201);
    assert.equal(idempotentRetry.body.id, idempotent.body.id);

    const exit = await post('/api/stock/movements', { type: 'EXIT', referenceCode: `TEST-EXIT-${suffix}`, reason: 'Test exit', warehouseId: sourceWarehouse.id, locationId: sourceLocation.id, items: [{ productId: created.productId, lotId: created.lotId, quantity: 4 }] });
    assert.equal(exit.response.status, 201);
    const blockedExit = await post('/api/stock/movements', { type: 'EXIT', referenceCode: `TEST-BLOCKED-${suffix}`, warehouseId: sourceWarehouse.id, locationId: sourceLocation.id, items: [{ productId: created.productId, lotId: created.lotId, quantity: 1000 }] });
    assert.equal(blockedExit.response.status, 400);
    assert.match(blockedExit.body.error, /Saldo insuficiente/);
    const adjustment = await post('/api/stock/movements', { type: 'ADJUSTMENT', referenceCode: `TEST-ADJUST-${suffix}`, reason: 'Test adjustment', warehouseId: sourceWarehouse.id, locationId: sourceLocation.id, items: [{ productId: created.productId, lotId: created.lotId, quantityDelta: 2 }] });
    assert.equal(adjustment.response.status, 201);

    const transfer = await post('/api/transfers', { sourceWarehouseId: sourceWarehouse.id, sourceLocationId: sourceLocation.id, targetWarehouseId: targetWarehouse.id, targetLocationId: targetLocation.id, referenceCode: `TEST-TRANSFER-${suffix}`, idempotencyKey: `TRANSFER-${suffix}`, items: [{ productId: created.productId, lotId: created.lotId, quantity: 3 }] });
    assert.equal(transfer.response.status, 201);
    assert.equal(transfer.body.status, 'COMPLETED');
    const transferRetry = await post('/api/transfers', { sourceWarehouseId: sourceWarehouse.id, sourceLocationId: sourceLocation.id, targetWarehouseId: targetWarehouse.id, targetLocationId: targetLocation.id, referenceCode: `TEST-TRANSFER-RETRY-${suffix}`, idempotencyKey: `TRANSFER-${suffix}`, items: [{ productId: created.productId, lotId: created.lotId, quantity: 3 }] });
    assert.equal(transferRetry.response.status, 201);
    assert.equal(transferRetry.body.id, transfer.body.id);
    created.transferId = transfer.body.id;

    const inventory = await post('/api/inventories', { name: `Test inventory ${suffix}`, warehouseId: sourceWarehouse.id });
    assert.equal(inventory.response.status, 201);
    created.inventoryId = inventory.body.id;
    const inventoryItem = await post(`/api/inventories/${created.inventoryId}/items`, { productId: created.productId, lotId: created.lotId, locationId: sourceLocation.id });
    assert.equal(inventoryItem.response.status, 201);
    const counted = await request(`/api/inventories/${created.inventoryId}/items/${inventoryItem.body.id}`, { method: 'PATCH', body: JSON.stringify({ countedQuantity: Number(inventoryItem.body.expectedQuantity) + 1 }) });
    assert.equal(counted.response.status, 200);
    const finalized = await post(`/api/inventories/${created.inventoryId}/finalize`, {});
    assert.equal(finalized.response.status, 200);
    assert.equal(finalized.body.status, 'CONFIRMED');

    const invoice = await post('/api/invoices', { number: `NF-${suffix}`, origin: 'MANUAL', supplierId: created.supplierId });
    assert.equal(invoice.response.status, 201);
    created.invoiceId = invoice.body.id;
    const invoiceList = await request('/api/invoices');
    assert.equal(invoiceList.response.status, 200);
    assert.ok(invoiceList.body.some((item) => item.id === created.invoiceId));

    const auditor = await prisma.user.create({ data: { email: `auditor-${suffix}@example.test`, name: 'Backend Test Auditor', role: 'AUDITOR', defaultUnit: { connect: { id: unit.id } } } });
    created.userIds.push(auditor.id);
    await prisma.userUnit.create({ data: { userId: auditor.id, unitId: unit.id, role: 'AUDITOR' } });
    const audit = await request('/api/reports/audit', { headers: { 'x-dev-user-id': auditor.id } });
    assert.equal(audit.response.status, 200);
    assert.ok(audit.body.some((item) => item.entityType === 'StockMovement' && item.userId === operator.id));

    const unauthorizedUnit = await prisma.operationalUnit.create({ data: { code: `X-${suffix.slice(0, 10)}`, name: `Unauthorized ${suffix}` } });
    const unauthorized = await request(`/api/units/${unauthorizedUnit.id}/warehouses`);
    assert.equal(unauthorized.response.status, 403);
    await prisma.operationalUnit.delete({ where: { id: unauthorizedUnit.id } });
  } finally {
    server.close();
    const movementIds = (await prisma.stockMovement.findMany({ where: { unitId: created.unitId }, select: { id: true } })).map((item) => item.id);
    await prisma.$transaction(async (tx) => {
      await tx.invoiceDocument.deleteMany({ where: { invoiceId: created.invoiceId || undefined } });
      await tx.ocrRun.deleteMany({ where: { invoiceId: created.invoiceId || undefined } });
      await tx.invoiceItem.deleteMany({ where: { invoiceId: created.invoiceId || undefined } });
      await tx.invoice.deleteMany({ where: { id: created.invoiceId || undefined } });
      await tx.inventoryItem.deleteMany({ where: { inventoryId: created.inventoryId || undefined } });
      await tx.inventory.deleteMany({ where: { id: created.inventoryId || undefined } });
      await tx.stockMovementItem.deleteMany({ where: { movementId: { in: movementIds } } });
      await tx.stockMovement.deleteMany({ where: { id: { in: movementIds } } });
      await tx.transferItem.deleteMany({ where: { transferId: created.transferId || undefined } });
      await tx.transfer.deleteMany({ where: { id: created.transferId || undefined } });
      await tx.stockBalance.deleteMany({ where: { unitId: created.unitId } });
      await tx.auditLog.deleteMany({ where: { OR: [{ unitId: created.unitId }, { userId: { in: created.userIds } }] } });
      await tx.productLot.deleteMany({ where: { productId: created.productId || undefined } });
      await tx.product.deleteMany({ where: { id: created.productId || undefined } });
      await tx.category.deleteMany({ where: { id: created.categoryId || undefined } });
      await tx.supplier.deleteMany({ where: { id: created.supplierId || undefined } });
      await tx.warehouseLocation.deleteMany({ where: { warehouseId: { in: created.warehouseIds } } });
      await tx.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
      await tx.userUnit.deleteMany({ where: { userId: { in: created.userIds } } });
      await tx.user.deleteMany({ where: { id: { in: created.userIds } } });
      await tx.operationalUnit.deleteMany({ where: { id: created.unitId || undefined } });
    });
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
