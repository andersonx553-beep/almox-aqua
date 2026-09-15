import React, { useEffect, useState } from 'react';
import { ScreenType, Product, Movement, InventoryItem } from './types';
import { api } from './api';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardScreen } from './components/DashboardScreen';
import { EstoqueScreen } from './components/EstoqueScreen';
import { OcrScreen } from './components/OcrScreen';
import { MovimentarScreen } from './components/MovimentarScreen';
import { InventarioScreen } from './components/InventarioScreen';
import { RelatoriosScreen } from './components/RelatoriosScreen';
import { LoginScreen } from './components/LoginScreen';
import { Toast } from './components/Toast';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUnit, setCurrentUnit] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [estoqueFilter, setEstoqueFilter] = useState('all');
  const [movimentarInitialType, setMovimentarInitialType] = useState<
    'entrada' | 'saida' | 'transferir' | 'ajuste'
  >('saida');
  const [movimentarInitialSku, setMovimentarInitialSku] = useState('QUI-0021');

  // Operational State
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Toast Notification System
  const [toast, setToast] = useState<{
    message: string | null;
    icon?: string;
    type?: 'success' | 'info' | 'warning' | 'error';
  }>({ message: null });

  const showToast = (
    message: string,
    icon: string = 'check_circle',
    type: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => {
    setToast({ message, icon, type });
    setTimeout(() => {
      setToast({ message: null });
    }, 3500);
  };

  const refreshData = async () => {
    const [rawProducts, balances, rawMovements, rawInventories, rawUnits] = await Promise.all([
      api.getProducts(), api.getBalances(), api.getMovements(), api.getInventories(), api.getUnits(), api.getCategories(), api.getSuppliers(),
    ]);
    const balanceByProduct = new Map<string, any>();
    balances.forEach((balance) => { if (!balanceByProduct.has(balance.productId)) balanceByProduct.set(balance.productId, balance); });
    setProducts(rawProducts.map((product) => {
      const balance = balanceByProduct.get(product.id);
      const stock = balance ? Number(balance.quantityOnHand) : 0;
      const minStock = Number(product.minStock || 0);
      const maxStock = Number(product.maxStock || Math.max(minStock, stock, 1));
      return { ...product, category: String(product.category?.code || '').toLowerCase() as Product['category'], categoryLabel: product.category?.name || 'Sem categoria', status: stock <= minStock ? 'critical' : stock <= minStock * 1.3 ? 'warning' : 'normal', stock, minStock, maxStock, unit: product.unit, location: balance?.location?.name || 'Sem localização', lot: balance?.lot?.lotNumber || 'Sem lote', lotId: balance?.lotId, warehouseId: balance?.warehouseId, locationId: balance?.locationId, lotExpiration: balance?.lot?.expirationDate ? new Date(balance.lot.expirationDate).toLocaleDateString('pt-BR') : 'Não informado', costPrice: Number(balance?.lot?.unitCost || 0), supplier: 'Não informado', imageUrl: product.imageUrl || '', imageAlt: product.name, icon: 'inventory_2', weeklyConsumption: [], technicalSpecs: product.technicalSpecs || '' };
    }));
    setMovements(rawMovements.flatMap((movement) => movement.items?.map((item: any) => ({ id: movement.id, code: movement.referenceCode, type: movement.type === 'ENTRY' ? 'entrada' : movement.type === 'EXIT' ? 'saida' : 'ajuste', date: new Date(movement.occurredAt).toLocaleDateString('pt-BR'), timeAgo: new Date(movement.occurredAt).toLocaleTimeString('pt-BR'), itemSku: item.product?.sku || item.productId, itemName: item.product?.name || '', quantity: Number(item.quantityDelta), unit: item.unit, user: movement.performedBy?.name || '', department: movement.department || '', costCenter: movement.costCenter || '', newBalance: Number(item.balanceAfter || 0) })) || []));
    const inventory = rawInventories[0];
    setInventoryItems((inventory?.items || []).map((item: any) => { const expected = Number(item.expectedQuantity); const counted = item.countedQuantity == null ? expected : Number(item.countedQuantity); const difference = counted - expected; return { id: item.id, sku: item.product?.sku || item.productId, name: item.product?.name || '', location: item.locationSnapshot || item.locationId, systemStock: expected, physicalCount: counted, unit: item.product?.unit || '', discrepancyType: difference < 0 ? 'shortage' : difference > 0 ? 'surplus' : 'none', discrepancyQty: difference, financialImpact: 0, imageUrl: item.product?.imageUrl || '', imageAlt: item.product?.name || '', lotNumber: item.lot?.lotNumber }; }));
    setUnits(rawUnits);
    const unit = rawUnits.find((item) => item.id === localStorage.getItem('almx.unitId')) || rawUnits[0];
    if (unit) { setCurrentUnit(unit.name); localStorage.setItem('almx.unitId', unit.id); }
  };

  useEffect(() => { if (isAuthenticated) refreshData().catch((error) => showToast(error.message, 'error', 'error')); }, [isAuthenticated]);

  const handleNavigate = (screen: ScreenType, initialAction?: string) => {
    if (screen === 'estoque' && initialAction) {
      setEstoqueFilter(initialAction);
    } else if (screen === 'estoque') {
      setEstoqueFilter('all');
    }

    if (screen === 'movimentar' && initialAction) {
      setMovimentarInitialType(
        initialAction as 'entrada' | 'saida' | 'transferir' | 'ajuste'
      );
    }

    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddMovement = async (newMov: Movement) => {
    if (newMov.type === 'transferir') {
      showToast('Transferência exige seleção de origem e destino.', 'info', 'info');
      return;
    }
    const product = products.find((item) => item.sku === newMov.itemSku);
    if (!product?.lotId || !product.warehouseId || !product.locationId) {
      showToast('Produto sem lote/localização disponível para movimentação.', 'error', 'error');
      return;
    }
    try {
      await api.createMovement({ type: newMov.type === 'entrada' ? 'ENTRY' : newMov.type === 'saida' ? 'EXIT' : 'ADJUSTMENT', referenceCode: newMov.code, reason: newMov.costCenter || 'Movimentação manual', warehouseId: product.warehouseId, locationId: product.locationId, items: [{ productId: product.id, lotId: product.lotId, quantity: Math.abs(newMov.quantity), quantityDelta: newMov.quantity }] });
      await refreshData();
      setCurrentScreen('dashboard');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao registrar movimentação.', 'error', 'error'); }
  };

  const handleApproveEntries = (totalItems: number) => {
    refreshData().catch((error) => showToast(error.message, 'error', 'error'));
    showToast(`NF-e escriturada com sucesso! ${totalItems} itens incorporados ao estoque físico.`, 'inventory_2');
    setCurrentScreen('dashboard');
  };

  const handleApproveAudit = () => {
    showToast(
      'Auditoria de Inventário Q4 homologada! Saldos e lançamentos contábeis ajustados.',
      'fact_check'
    );
    setCurrentScreen('dashboard');
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUnit(user.defaultUnitId || '');
          setCurrentUserName(user.name);
          setIsAuthenticated(true);
          showToast(`Operador ${user.name} identificado no ALMX.`, 'verified');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#edf4ff]/40 text-[#001d32] font-sans antialiased selection:bg-[#00616a]/15 selection:text-[#00616a]">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        icon={toast.icon}
        type={toast.type}
        onClose={() => setToast({ message: null })}
      />

      {/* Global Top App Bar */}
      <Header
        currentScreen={currentScreen}
        selectedUnit={currentUnit}
        currentUnit={currentUnit}
        userName={currentUserName}
        units={units}
        onSelectUnit={(unit) => {
          setCurrentUnit(unit);
          const selected = units.find((item) => item.name === unit);
          if (selected) localStorage.setItem('almx.unitId', selected.id);
          showToast(`Unidade alterada para: ${unit}`, 'apartment');
        }}
        onSwitchUnit={(unit) => {
          setCurrentUnit(unit);
          showToast(`Unidade alterada para: ${unit}`, 'apartment');
        }}
        onNavigate={handleNavigate}
        onLogout={() => {
          setIsAuthenticated(false);
          localStorage.removeItem('almx.userId');
          localStorage.removeItem('almx.userName');
          localStorage.removeItem('almx.unitId');
          showToast('Sessão encerrada com segurança.', 'logout');
        }}
        onNotificationClick={() => {
          showToast('14 itens com alerta de estoque mínimo e 3 NFs pendentes.', 'notifications');
        }}
      />

      {/* Primary Dynamic View Routing */}
      <main className="min-h-[calc(100vh-140px)] animate-in fade-in duration-200">
        {currentScreen === 'dashboard' && (
          <DashboardScreen
            movements={movements}
            products={products}
            onNavigate={handleNavigate}
            onSelectCategoryFilter={(cat) => {
              setEstoqueFilter(cat);
              setCurrentScreen('estoque');
            }}
          />
        )}

        {currentScreen === 'estoque' && (
          <EstoqueScreen
            products={products}
            initialFilter={estoqueFilter}
            onNavigateToMovimentar={(sku, type) => {
              setMovimentarInitialSku(sku);
              setMovimentarInitialType(type);
              setCurrentScreen('movimentar');
            }}
            showToast={showToast}
          />
        )}

        {currentScreen === 'ocr' && (
          <OcrScreen
            onApproveEntries={handleApproveEntries}
            showToast={showToast}
          />
        )}

        {currentScreen === 'movimentar' && (
          <MovimentarScreen
            initialType={movimentarInitialType}
            initialSku={movimentarInitialSku}
            onAddMovement={handleAddMovement}
            product={products.find((product) => product.sku === movimentarInitialSku)}
            onCancel={() => setCurrentScreen('dashboard')}
            showToast={showToast}
          />
        )}

        {currentScreen === 'inventario' && (
          <InventarioScreen
            items={inventoryItems}
            showToast={showToast}
            onApproveAudit={handleApproveAudit}
          />
        )}

        {currentScreen === 'relatorios' && (
          <RelatoriosScreen
            products={products}
            movements={movements}
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}
      </main>

      {/* Global Fixed Bottom Navigation Bar */}
      <Navigation
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        onSelectScreen={handleNavigate}
      />
    </div>
  );
}
