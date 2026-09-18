<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductionOrder;
use App\Services\ProductionService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionOrderController extends Controller
{
    use ApiResponse;

    public function __construct(private ProductionService $productionService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $status = $request->query('status');
        $productId = $request->query('product_id');

        $query = ProductionOrder::query()
            ->with('product', 'warehouse', 'lines.component')
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($productId, fn ($q) => $q->where('product_id', $productId))
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'planned_qty' => ['required', 'numeric', 'gt:0'],
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'order_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['nullable', 'array', 'min:1'],
            'lines.*.component_id' => ['required', 'exists:products,id'],
            'lines.*.planned_qty' => ['required', 'numeric', 'gt:0'],
        ]);

        $order = $this->productionService->create($validated);

        return $this->success($order->load('product', 'warehouse', 'lines.component'), 'Production order dibuat.', 201);
    }

    public function show(ProductionOrder $productionOrder): JsonResponse
    {
        return $this->success($productionOrder->load('product', 'warehouse', 'lines.component', 'productionBatches.batch'));
    }

    public function start(ProductionOrder $productionOrder): JsonResponse
    {
        try {
            $this->productionService->start($productionOrder);
            return $this->success($productionOrder->fresh()->load('lines.component'), 'Produksi dimulai, material di-issue.');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function complete(Request $request, ProductionOrder $productionOrder): JsonResponse
    {
        $validated = $request->validate([
            'produced_qty' => ['required', 'numeric', 'gt:0'],
            'lot_no' => ['nullable', 'string', 'max:100'],
            'mfg_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:mfg_date'],
            'note' => ['nullable', 'string'],
        ]);

        try {
            $this->productionService->complete($productionOrder, $validated);
            return $this->success($productionOrder->fresh()->load('product', 'productionBatches.batch'), 'Produksi selesai, batch dibuat.', 201);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function cancel(ProductionOrder $productionOrder): JsonResponse
    {
        try {
            $this->productionService->cancel($productionOrder);
            return $this->success($productionOrder->fresh(), 'Production order dibatalkan.');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
