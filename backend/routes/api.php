<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdjustmentController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\OpportunityController;
use App\Http\Controllers\Api\PriceListController;
use App\Http\Controllers\Api\PrController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductionOrderController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\PurchaseReturnController;
use App\Http\Controllers\Api\ReceivingController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\RfqController;
use App\Http\Controllers\Api\SalesOrderController;
use App\Http\Controllers\Api\SalesQuotationController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\StockOpnameController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierQuotationController;
use App\Http\Controllers\Api\TransferController;
use App\Http\Controllers\Api\UnitController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::apiResource('products', ProductController::class);

    Route::apiResource('categories', CategoryController::class)->parameters(['categories' => 'category']);
    Route::apiResource('units', UnitController::class)->parameters(['units' => 'unit']);
    Route::apiResource('brands', BrandController::class)->parameters(['brands' => 'brand']);
    Route::apiResource('price-lists', PriceListController::class)->parameters(['price-lists' => 'priceList']);

    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('suppliers', SupplierController::class)->parameters(['suppliers' => 'supplier']);
    Route::apiResource('warehouses', WarehouseController::class);
    Route::apiResource('locations', LocationController::class)->parameters(['locations' => 'location']);

    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);
    Route::get('/settings/{key}', [SettingController::class, 'show']);

    // Inventory
    Route::get('/stocks', [StockController::class, 'index']);
    Route::get('/stocks/summary', [StockController::class, 'summary']);
    Route::get('/stocks/alerts', [StockController::class, 'alerts']);
    Route::get('/stock-movements', [StockMovementController::class, 'index']);
    Route::get('/batches', [BatchController::class, 'index']);
    Route::post('/batches', [BatchController::class, 'store']);

    Route::get('/transfers', [TransferController::class, 'index']);
    Route::post('/transfers', [TransferController::class, 'store']);
    Route::get('/transfers/{transfer}', [TransferController::class, 'show']);
    Route::post('/transfers/{transfer}/approve', [TransferController::class, 'approve']);
    Route::post('/transfers/{transfer}/transit', [TransferController::class, 'transit']);
    Route::post('/transfers/{transfer}/receive', [TransferController::class, 'capture']);
    Route::delete('/transfers/{transfer}', [TransferController::class, 'destroy']);

    Route::get('/adjustments', [AdjustmentController::class, 'index']);
    Route::post('/adjustments', [AdjustmentController::class, 'store']);
    Route::get('/adjustments/{adjustment}', [AdjustmentController::class, 'show']);
    Route::post('/adjustments/{adjustment}/approve', [AdjustmentController::class, 'approve']);
    Route::post('/adjustments/{adjustment}/reject', [AdjustmentController::class, 'reject']);
    Route::delete('/adjustments/{adjustment}', [AdjustmentController::class, 'destroy']);

    Route::get('/reservations', [ReservationController::class, 'index']);
    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::get('/reservations/{reservation}', [ReservationController::class, 'show']);
    Route::post('/reservations/{reservation}/release', [ReservationController::class, 'release']);

    Route::get('/stock-opnames', [StockOpnameController::class, 'index']);
    Route::post('/stock-opnames', [StockOpnameController::class, 'store']);
    Route::get('/stock-opnames/{opname}', [StockOpnameController::class, 'show']);
    Route::post('/stock-opnames/{opname}/post', [StockOpnameController::class, 'post']);

    // Purchasing
    Route::get('/pr/suggestions', [PrController::class, 'suggestions']);
    Route::get('/pr', [PrController::class, 'index']);
    Route::post('/pr', [PrController::class, 'store']);
    Route::get('/pr/{pr}', [PrController::class, 'show']);
    Route::post('/pr/{pr}/approve', [PrController::class, 'approve']);
    Route::post('/pr/{pr}/reject', [PrController::class, 'reject']);

    Route::get('/rfqs', [RfqController::class, 'index']);
    Route::post('/rfqs', [RfqController::class, 'store']);
    Route::get('/rfqs/{rfq}', [RfqController::class, 'show']);
    Route::post('/rfqs/{rfq}/close', [RfqController::class, 'close']);
    Route::post('/rfqs/{rfq}/suppliers', [RfqController::class, 'addSuppliers']);

    Route::get('/supplier-quotations', [SupplierQuotationController::class, 'index']);
    Route::post('/supplier-quotations', [SupplierQuotationController::class, 'store']);
    Route::post('/supplier-quotations/{quotation}/accept', [SupplierQuotationController::class, 'accept']);
    Route::post('/supplier-quotations/{quotation}/reject', [SupplierQuotationController::class, 'reject']);
    Route::post('/quotations/compare', [SupplierQuotationController::class, 'compare']);
    Route::post('/quotations/{quotation}/convert-to-po', [SupplierQuotationController::class, 'convertToPo']);

    Route::get('/pos', [PurchaseOrderController::class, 'index']);
    Route::post('/pos', [PurchaseOrderController::class, 'store']);
    Route::get('/pos/{po}', [PurchaseOrderController::class, 'show']);
    Route::post('/pos/{po}/approve', [PurchaseOrderController::class, 'approve']);
    Route::post('/pos/{po}/reject', [PurchaseOrderController::class, 'reject']);
    Route::post('/pos/{po}/cancel', [PurchaseOrderController::class, 'cancel']);

    Route::get('/receivings', [ReceivingController::class, 'index']);
    Route::post('/receivings', [ReceivingController::class, 'store']);
    Route::get('/receivings/{receiving}', [ReceivingController::class, 'show']);
    Route::post('/receivings/{receiving}/post', [ReceivingController::class, 'post']);

    Route::get('/purchase-returns', [PurchaseReturnController::class, 'index']);
    Route::post('/purchase-returns', [PurchaseReturnController::class, 'store']);
    Route::get('/purchase-returns/{purchaseReturn}', [PurchaseReturnController::class, 'show']);
    Route::post('/purchase-returns/{purchaseReturn}/post', [PurchaseReturnController::class, 'post']);

    // CRM
    Route::get('/leads', [LeadController::class, 'index']);
    Route::post('/leads', [LeadController::class, 'store']);
    Route::get('/leads/{lead}', [LeadController::class, 'show']);
    Route::put('/leads/{lead}', [LeadController::class, 'update']);
    Route::delete('/leads/{lead}', [LeadController::class, 'destroy']);
    Route::post('/leads/{lead}/status', [LeadController::class, 'updateStatus']);
    Route::post('/leads/{lead}/convert', [LeadController::class, 'convert']);

    Route::get('/opportunities', [OpportunityController::class, 'index']);
    Route::post('/opportunities', [OpportunityController::class, 'store']);
    Route::get('/opportunities/{opportunity}', [OpportunityController::class, 'show']);
    Route::put('/opportunities/{opportunity}', [OpportunityController::class, 'update']);
    Route::delete('/opportunities/{opportunity}', [OpportunityController::class, 'destroy']);
    Route::post('/opportunities/{opportunity}/stage', [OpportunityController::class, 'updateStage']);

    Route::get('/activities', [ActivityController::class, 'index']);
    Route::post('/activities', [ActivityController::class, 'store']);
    Route::get('/activities/{activity}', [ActivityController::class, 'show']);
    Route::put('/activities/{activity}', [ActivityController::class, 'update']);
    Route::delete('/activities/{activity}', [ActivityController::class, 'destroy']);
    Route::post('/activities/{activity}/done', [ActivityController::class, 'markDone']);

    Route::get('/sales-quotations', [SalesQuotationController::class, 'index']);
    Route::post('/sales-quotations', [SalesQuotationController::class, 'store']);
    Route::get('/sales-quotations/{quotation}', [SalesQuotationController::class, 'show']);
    Route::put('/sales-quotations/{quotation}', [SalesQuotationController::class, 'update']);
    Route::delete('/sales-quotations/{quotation}', [SalesQuotationController::class, 'destroy']);
    Route::post('/sales-quotations/{quotation}/send', [SalesQuotationController::class, 'send']);
    Route::post('/sales-quotations/{quotation}/accept', [SalesQuotationController::class, 'accept']);
    Route::post('/sales-quotations/{quotation}/reject', [SalesQuotationController::class, 'reject']);
    Route::post('/sales-quotations/{quotation}/convert-to-so', [SalesQuotationController::class, 'convertToSo']);

    Route::get('/sales-orders', [SalesOrderController::class, 'index']);
    Route::post('/sales-orders', [SalesOrderController::class, 'store']);
    Route::get('/sales-orders/{so}', [SalesOrderController::class, 'show']);
    Route::post('/sales-orders/{so}/approve', [SalesOrderController::class, 'approve']);
    Route::post('/sales-orders/{so}/reject', [SalesOrderController::class, 'reject']);
    Route::post('/sales-orders/{so}/fulfill', [SalesOrderController::class, 'fulfill']);
    Route::post('/sales-orders/{so}/cancel', [SalesOrderController::class, 'cancel']);

    // Production
    Route::get('/production-orders', [ProductionOrderController::class, 'index']);
    Route::post('/production-orders', [ProductionOrderController::class, 'store']);
    Route::get('/production-orders/{productionOrder}', [ProductionOrderController::class, 'show']);
    Route::post('/production-orders/{productionOrder}/start', [ProductionOrderController::class, 'start']);
    Route::post('/production-orders/{productionOrder}/complete', [ProductionOrderController::class, 'complete']);
    Route::post('/production-orders/{productionOrder}/cancel', [ProductionOrderController::class, 'cancel']);

    // Dashboard & Reports
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/reports/inventory', [ReportController::class, 'inventory']);
    Route::get('/reports/stock-movements', [ReportController::class, 'stockMovements']);
    Route::get('/reports/purchasing', [ReportController::class, 'purchasing']);
    Route::get('/reports/sales', [ReportController::class, 'sales']);
    Route::get('/reports/production', [ReportController::class, 'production']);
    Route::get('/reports/customers', [ReportController::class, 'customers']);
    Route::get('/reports/pipeline', [ReportController::class, 'pipeline']);
    Route::get('/reports/expiry', [ReportController::class, 'expiry']);

    // System
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

    Route::get('/roles', [RoleController::class, 'index']);
    Route::get('/permissions', [RoleController::class, 'permissions']);
});
