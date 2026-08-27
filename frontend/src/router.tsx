import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/product/ProductsPage';
import CategoriesPage from './pages/product/CategoriesPage';
import UnitsPage from './pages/product/UnitsPage';
import BrandsPage from './pages/product/BrandsPage';
import PriceListsPage from './pages/product/PriceListsPage';
import CustomersPage from './pages/crm/CustomersPage';
import SuppliersPage from './pages/purchasing/SuppliersPage';
import WarehousesPage from './pages/inventory/WarehousesPage';
import InventoryPage from './pages/inventory/InventoryPage';
import TransfersPage from './pages/inventory/TransfersPage';
import AdjustmentsPage from './pages/inventory/AdjustmentsPage';
import StockMovementsPage from './pages/inventory/StockMovementsPage';
import StockOpnamePage from './pages/inventory/StockOpnamePage';
import SettingsPage from './pages/SettingsPage';
import CrmPage from './pages/CrmPage';
import PurchasingPage from './pages/PurchasingPage';
import ProductionPage from './pages/ProductionPage';
import ReportsPage from './pages/ReportsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },

          { path: '/crm', element: <CrmPage /> },
          { path: '/crm/customers', element: <CustomersPage /> },

          { path: '/product', element: <ProductsPage /> },
          { path: '/product/categories', element: <CategoriesPage /> },
          { path: '/product/units', element: <UnitsPage /> },
          { path: '/product/brands', element: <BrandsPage /> },
          { path: '/product/price-lists', element: <PriceListsPage /> },

          { path: '/inventory', element: <InventoryPage /> },
          { path: '/inventory/warehouses', element: <WarehousesPage /> },
          { path: '/inventory/transfers', element: <TransfersPage /> },
          { path: '/inventory/adjustments', element: <AdjustmentsPage /> },
          { path: '/inventory/movements', element: <StockMovementsPage /> },
          { path: '/inventory/opname', element: <StockOpnamePage /> },

          { path: '/purchasing', element: <PurchasingPage /> },
          { path: '/purchasing/suppliers', element: <SuppliersPage /> },

          { path: '/production', element: <ProductionPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
