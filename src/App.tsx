import React, { useState } from 'react';
import { ScreenType, Product, Movement, InventoryItem, InvoiceData } from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_MOVEMENTS,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_INVOICE,
} from './data/mockData';
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
  const [currentUnit, setCurrentUnit] = useState('AquaVille Resort - Unidade Principal');
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [estoqueFilter, setEstoqueFilter] = useState('all');
  const [movimentarInitialType, setMovimentarInitialType] = useState<
    'entrada' | 'saida' | 'transferir' | 'ajuste'
  >('saida');
  const [movimentarInitialSku, setMovimentarInitialSku] = useState('QUI-0021');

  // Operational State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [movements, setMovements] = useState<Movement[]>(INITIAL_MOVEMENTS);
  const [inventoryItems, setInventoryItems] =
    useState<InventoryItem[]>(INITIAL_INVENTORY_ITEMS);
  const [invoice, setInvoice] = useState<InvoiceData>(INITIAL_INVOICE);

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

  const handleAddMovement = (newMov: Movement) => {
    setMovements((prev) => [newMov, ...prev]);

    // Update product stock if SKU matches
    setProducts((prev) =>
      prev.map((p) => {
        if (p.sku === newMov.itemSku) {
          const updatedStock = Math.max(0, p.stock + newMov.quantity);
          const newStatus =
            updatedStock <= p.minStock
              ? 'critical'
              : updatedStock <= p.minStock * 1.3
              ? 'warning'
              : 'normal';
          return {
            ...p,
            stock: updatedStock,
            status: newStatus,
          };
        }
        return p;
      })
    );

    setCurrentScreen('dashboard');
  };

  const handleApproveEntries = (totalItems: number) => {
    // Reconcile and add +20 to Cloro and +15 to Desengordurante
    setProducts((prev) =>
      prev.map((p) => {
        if (p.sku === 'QUI-0021') {
          return {
            ...p,
            stock: p.stock + 20,
            status: 'normal',
          };
        }
        if (p.sku === 'QUI-0089') {
          return {
            ...p,
            stock: p.stock + 15,
            status: 'normal',
          };
        }
        return p;
      })
    );

    // Add entry movement record
    const entryMov: Movement = {
      id: `mov-nfe-${Date.now()}`,
      code: '#ENT-9043',
      type: 'entrada',
      date: 'Hoje',
      timeAgo: 'Agora',
      itemSku: 'QUI-0021',
      itemName: 'Cloro Shock 10kg (+ Lote NF 148.921)',
      quantity: 45,
      unit: 'un',
      user: 'Reconciliação OCR Automática',
      department: 'Almoxarifado Geral',
      costCenter: 'C.C. 100 - Suprimentos',
      newBalance: 28,
    };
    setMovements((prev) => [entryMov, ...prev]);

    showToast(
      `NF-e escriturada com sucesso! +${totalItems} volumes incorporados ao estoque físico.`,
      'inventory_2'
    );
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
          setCurrentUnit('AquaVille Resort - Unidade Principal');
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
        onSelectUnit={(unit) => {
          setCurrentUnit(unit);
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
            invoice={invoice}
            onApproveEntries={handleApproveEntries}
            showToast={showToast}
          />
        )}

        {currentScreen === 'movimentar' && (
          <MovimentarScreen
            initialType={movimentarInitialType}
            initialSku={movimentarInitialSku}
            onAddMovement={handleAddMovement}
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
