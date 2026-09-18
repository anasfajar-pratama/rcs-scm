<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Customer;
use App\Models\Opportunity;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\SalesOrder;
use App\Models\Stock;
use App\Models\Supplier;
use App\Services\SettingService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function summary(): JsonResponse
    {
        $warningDays = (int) (new SettingService())->get('reorder.expiry_warning_days', 30);

        $expiringSoon = Stock::with('product', 'batch')
            ->whereHas('batch', fn ($q) => $q->where('expiry_date', '<=', now()->addDays($warningDays))->where('expiry_date', '>=', now()))
            ->where('qty_on_hand', '>', 0)
            ->get()
            ->map(fn ($s) => [
                'product' => $s->product?->name,
                'sku' => $s->product?->sku,
                'lot_no' => $s->batch?->lot_no,
                'expiry_date' => $s->batch?->expiry_date?->toDateString(),
                'qty' => (float) $s->qty_on_hand,
            ])
            ->sortBy('expiry_date')
            ->take(5)
            ->values();

        $reorder = Product::with(['unit'])
            ->where('is_active', true)
            ->whereNotNull('reorder_point')
            ->get()
            ->filter(function (Product $p) {
                $qty = (float) $p->stocks()->sum('qty_on_hand') - (float) $p->stocks()->sum('qty_reserved');
                return $qty <= (float) $p->reorder_point;
            })
            ->map(fn (Product $p) => [
                'product' => $p->name,
                'sku' => $p->sku,
                'current' => (float) $p->stocks()->sum('qty_on_hand') - (float) $p->stocks()->sum('qty_reserved'),
                'reorder_point' => (float) $p->reorder_point,
            ])
            ->take(5)
            ->values();

        return $this->success([
            'kpi' => [
                'stock_items' => (int) Stock::whereRaw('(qty_on_hand > 0 OR qty_reserved > 0)')->count(),
                'stock_value' => (float) Stock::with('product')->get()->sum(fn ($s) => (float) $s->qty_on_hand * (float) $s->product?->cost),
                'po_open' => (int) PurchaseOrder::whereIn('status', ['pending', 'approved'])->count(),
                'so_open' => (int) SalesOrder::whereIn('status', ['pending', 'approved'])->count(),
                'customers' => (int) Customer::count(),
                'suppliers' => (int) Supplier::count(),
                'pipeline_value' => (float) Opportunity::whereNotIn('stage', ['won', 'lost'])->sum('expected_value'),
                'opportunities' => (int) Opportunity::whereNotIn('stage', ['won', 'lost'])->count(),
            ],
            'alerts' => [
                'expiring' => $expiringSoon,
                'reorder' => $reorder,
            ],
        ]);
    }
}
