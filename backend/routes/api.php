<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdjustmentController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\PriceListController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\StockOpnameController;
use App\Http\Controllers\Api\SupplierController;
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
});
