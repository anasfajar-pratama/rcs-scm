<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseReturn;
use App\Services\ReceivingService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseReturnController extends Controller
{
    use ApiResponse;

    public function __construct(private ReceivingService $receivingService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $query = PurchaseReturn::query()
            ->with('supplier', 'receiving', 'lines.product', 'lines.batch')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'receiving_id' => ['nullable', 'exists:receivings,id'],
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'reason' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.batch_id' => ['nullable', 'exists:batches,id'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.reason' => ['nullable', 'string'],
        ]);

        $return = $this->receivingService->createReturn($validated);

        return $this->success($return->load('lines.product', 'lines.batch', 'supplier'), 'Return dibuat.', 201);
    }

    public function show(PurchaseReturn $purchaseReturn): JsonResponse
    {
        return $this->success($purchaseReturn->load('lines.product', 'lines.batch', 'supplier', 'receiving'));
    }

    public function post(PurchaseReturn $purchaseReturn): JsonResponse
    {
        try {
            $this->receivingService->postReturn($purchaseReturn);
            return $this->success($purchaseReturn->fresh()->load('lines.product', 'lines.batch', 'supplier'), 'Return diposting.');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
