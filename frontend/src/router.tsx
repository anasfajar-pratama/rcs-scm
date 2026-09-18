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
import LeadsPage from './pages/crm/LeadsPage';
import OpportunitiesPage from './pages/crm/OpportunitiesPage';
import ActivitiesPage from './pages/crm/ActivitiesPage';
import QuotationsPage from './pages/crm/QuotationsPage';
import SalesOrdersPage from './pages/crm/SalesOrdersPage';
import SuppliersPage from './pages/purchasing/SuppliersPage';
import PrPage from './pages/purchasing/PrPage';
import RfqPage from './pages/purchasing/RfqPage';
import QuotationPage from './pages/purchasing/QuotationPage';
import PoPage from './pages/purchasing/PoPage';
import ReceivingPage from './pages/purchasing/ReceivingPage';
import PurchaseReturnPage from './pages/purchasing/PurchaseReturnPage';
import WarehousesPage from './pages/inventory/WarehousesPage';
import InventoryPage from './pages/inventory/InventoryPage';
import TransfersPage from './pages/inventory/TransfersPage';
import AdjustmentsPage from './pages/inventory/AdjustmentsPage';
import StockMovementsPage from './pages/inventory/StockMovementsPage';
import StockOpnamePage from './pages/inventory/StockOpnamePage';
import ReservationsPage from './pages/inventory/ReservationsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/system/UsersPage';
import CrmPage from './pages/CrmPage';
import PurchasingPage from './pages/PurchasingPage';
import ProductionPage from './pages/ProductionPage';
import ProductionOrdersPage from './pages/production/ProductionOrdersPage';
import BatchesPage from './pages/production/BatchesPage';
import ReportsPage from './pages/ReportsPage';
import NotFoundPage from './pages/NotFoundPage';

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
          { path: '/crm/leads', element: <LeadsPage /> },
          { path: '/crm/opportunities', element: <OpportunitiesPage /> },
          { path: '/crm/activities', element: <ActivitiesPage /> },
          { path: '/crm/quotations', element: <QuotationsPage /> },
          { path: '/crm/sales-orders', element: <SalesOrdersPage /> },
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
          { path: '/inventory/reservations', element: <ReservationsPage /> },

          { path: '/purchasing', element: <PurchasingPage /> },
          { path: '/purchasing/suppliers', element: <SuppliersPage /> },
          { path: '/purchasing/pr', element: <PrPage /> },
          { path: '/purchasing/rfq', element: <RfqPage /> },
          { path: '/purchasing/quotation', element: <QuotationPage /> },
          { path: '/purchasing/po', element: <PoPage /> },
          { path: '/purchasing/receiving', element: <ReceivingPage /> },
          { path: '/purchasing/return', element: <PurchaseReturnPage /> },

          { path: '/production', element: <ProductionPage /> },
          { path: '/production/orders', element: <ProductionOrdersPage /> },
          { path: '/production/batches', element: <BatchesPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
