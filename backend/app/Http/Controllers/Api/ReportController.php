<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Customer;
use App\Models\Opportunity;
use App\Models\Product;
use App\Models\ProductionOrder;
use App\Models\PurchaseOrder;
use App\Models\SalesOrder;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ReportController extends Controller
{
    use ApiResponse;

    public function inventory(Request $request): JsonResponse
    {
        $warehouseId = $request->query('warehouse_id');
        $productId = $request->query('product_id');

        $query = Stock::with('product', 'warehouse', 'batch')
            ->whereRaw('(qty_on_hand > 0 OR qty_reserved > 0)')
            ->when($warehouseId, fn ($q) => $q->where('warehouse_id', $warehouseId))
            ->when($productId, fn ($q) => $q->where('product_id', $productId))
            ->get();

        $rows = $query->map(fn ($s) => [
            'sku' => $s->product?->sku,
            'product' => $s->product?->name,
            'warehouse' => $s->warehouse?->name,
            'lot_no' => $s->batch?->lot_no,
            'expiry_date' => $s->batch?->expiry_date?->toDateString(),
            'qty_on_hand' => (float) $s->qty_on_hand,
            'qty_reserved' => (float) $s->qty_reserved,
            'qty_available' => (float) $s->qty_available,
            'unit_cost' => (float) $s->product?->cost,
            'value' => round((float) $s->qty_on_hand * (float) $s->product?->cost, 2),
        ])->values();

        return $this->success([
            'rows' => $rows,
            'total_value' => round($rows->sum('value'), 2),
        ]);
    }

    public function stockMovements(Request $request): JsonResponse
    {
        $from = $request->query('from');
        $to = $request->query('to');
        $type = $request->query('type');

        $query = StockMovement::with('product', 'warehouse')
            ->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to))
            ->when($type, fn ($q) => $q->where('type', $type))
            ->latest()
            ->limit(500)
            ->get();

        $rows = $query->map(fn ($m) => [
            'date' => $m->created_at?->toDateTimeString(),
            'sku' => $m->product?->sku,
            'product' => $m->product?->name,
            'warehouse' => $m->warehouse?->name,
            'type' => $m->type,
            'quantity' => (float) $m->quantity,
            'reference' => $m->reference_no,
            'notes' => $m->notes,
        ])->values();

        return $this->success(['rows' => $rows]);
    }

    public function purchasing(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = PurchaseOrder::with('supplier', 'lines.product')
            ->when($status, fn ($q) => $q->where('status', $status))
            ->latest()
            ->limit(500)
            ->get();

        $rows = $query->map(fn ($po) => [
            'po_no' => $po->po_no,
            'supplier' => $po->supplier?->name,
            'date' => $po->created_at?->toDateString(),
            'status' => $po->status,
            'total' => round($po->lines->sum(fn ($l) => (float) $l->qty * (float) $l->price), 2),
        ])->values();

        return $this->success([
            'rows' => $rows,
            'total_value' => round($rows->sum('total'), 2),
        ]);
    }

    public function sales(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = SalesOrder::with('customer', 'lines.product')
            ->when($status, fn ($q) => $q->where('status', $status))
            ->latest()
            ->limit(500)
            ->get();

        $rows = $query->map(fn ($so) => [
            'so_no' => $so->so_no,
            'customer' => $so->customer?->name,
            'date' => $so->order_date?->toDateString(),
            'status' => $so->status,
            'total' => round($so->lines->sum(fn ($l) => (float) $l->qty * (float) $l->unit_price), 2),
        ])->values();

        return $this->success([
            'rows' => $rows,
            'total_value' => round($rows->sum('total'), 2),
        ]);
    }

    public function production(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = ProductionOrder::with('product', 'warehouse')
            ->when($status, fn ($q) => $q->where('status', $status))
            ->latest()
            ->limit(500)
            ->get();

        $rows = $query->map(fn ($mo) => [
            'po_no' => $mo->po_no,
            'product' => $mo->product?->name,
            'warehouse' => $mo->warehouse?->name,
            'date' => $mo->order_date?->toDateString(),
            'planned_qty' => (float) $mo->planned_qty,
            'produced_qty' => (float) $mo->produced_qty,
            'status' => $mo->status,
        ])->values();

        return $this->success(['rows' => $rows]);
    }

    public function customers(Request $request): JsonResponse
    {
        $rows = Customer::withCount('contacts')
            ->get()
            ->map(fn ($c) => [
                'code' => $c->code,
                'name' => $c->name,
                'type' => $c->type,
                'email' => $c->email,
                'phone' => $c->phone,
                'credit_limit' => (float) $c->credit_limit,
                'contacts_count' => $c->contacts_count,
            ])->values();

        return $this->success(['rows' => $rows]);
    }

    public function pipeline(Request $request): JsonResponse
    {
        $rows = Opportunity::with('customer')
            ->get()
            ->groupBy('stage')
            ->map(fn (Collection $items, string $stage) => [
                'stage' => $stage,
                'count' => $items->count(),
                'value' => round($items->sum('expected_value'), 2),
            ])
            ->values();

        return $this->success(['rows' => $rows]);
    }

    public function expiry(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 90);

        $rows = Batch::with('product')
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', now()->addDays($days))
            ->orderBy('expiry_date', 'asc')
            ->get()
            ->map(fn ($b) => [
                'sku' => $b->product?->sku,
                'product' => $b->product?->name,
                'lot_no' => $b->lot_no,
                'expiry_date' => $b->expiry_date?->toDateString(),
                'status' => $b->status,
                'qty' => (float) $b->product?->stocks()->where('batch_id', $b->id)->sum('qty_on_hand'),
            ])
            ->filter(fn ($r) => $r['qty'] > 0)
            ->values();

        return $this->success(['rows' => $rows]);
    }
}
