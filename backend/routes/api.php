<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdjustmentController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\PriceListController;
use App\Http\Controllers\Api\PrController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\PurchaseReturnController;
use App\Http\Controllers\Api\ReceivingController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\RfqController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\StockOpnameController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierQuotationController;
use App\Http\Controllers\Api\TransferController;
use App\Http\Controllers\Api\UnitController;
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
});
