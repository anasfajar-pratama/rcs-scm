<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StockResource;
use App\Models\Batch;
use App\Models\Product;
use App\Models\Stock;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $warehouseId = $request->query('warehouse_id');
        $productId = $request->query('product_id');

        $query = Stock::query()
            ->with('warehouse', 'product', 'batch')
            ->when($warehouseId, fn ($q) => $q->where('warehouse_id', $warehouseId))
            ->when($productId, fn ($q) => $q->where('product_id', $productId))
            ->whereRaw('(qty_on_hand > 0 OR qty_reserved > 0)')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => StockResource::collection($p->items()));
    }

    public function summary(): JsonResponse
    {
        $totals = [
            'products' => Product::count(),
            'in_stock' => (float) Stock::sum('qty_on_hand'),
            'reserved' => (float) Stock::sum('qty_reserved'),
        ];

        return $this->success($totals);
    }

    public function alerts(): JsonResponse
    {
        $warningDays = (int) (config('app') ? (new \App\Services\SettingService())->get('reorder.expiry_warning_days', 30) : 30);

        // Expiry alerts
        $expireFrom = now()->addDays($warningDays)->toDateString();
        $expiring = Stock::with('product', 'batch')
            ->whereHas('batch', fn ($q) => $q->where('expiry_date', '<=', $expireFrom))
            ->where('qty_on_hand', '>', 0)
            ->with(['product', 'batch'])
            ->get()
            ->map(fn ($s) => [
                'product' => $s->product?->name,
                'sku' => $s->product?->sku,
                'lot_no' => $s->batch?->lot_no,
                'expiry_date' => $s->batch?->expiry_date?->toDateString(),
                'status' => $s->batch?->status,
                'qty' => (float) $s->qty_on_hand,
            ]);

        // Reorder point alerts
        $reorder = Product::with(['unit'])
            ->where('is_active', true)
            ->whereNotNull('reorder_point')
            ->get()
            ->map(function (Product $p) {
                $qty = (float) $p->stocks()->sum('qty_on_hand') - (float) $p->stocks()->sum('qty_reserved');
                return [
                    'product' => $p->name,
                    'sku' => $p->sku,
                    'reorder_point' => (float) $p->reorder_point,
                    'reorder_quantity' => (float) $p->reorder_quantity,
                    'current' => $qty,
                    'below' => $qty <= (float) $p->reorder_point,
                ];
            })
            ->filter(fn ($r) => $r['below'])
            ->values();

        return $this->success([
            'expiring' => $expiring,
            'reorder' => $reorder,
        ]);
    }
}
