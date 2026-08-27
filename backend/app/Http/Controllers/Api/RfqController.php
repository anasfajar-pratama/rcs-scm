<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rfq;
use App\Services\PurchaseService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RfqController extends Controller
{
    use ApiResponse;

    public function __construct(private PurchaseService $purchaseService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $query = Rfq::query()
            ->with('pr', 'lines.product', 'suppliers')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pr_id' => ['nullable', 'exists:purchase_requisitions,id'],
            'deadline' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.target_price' => ['nullable', 'numeric', 'min:0'],
            'supplier_ids' => ['nullable', 'array'],
            'supplier_ids.*' => ['exists:suppliers,id'],
        ]);

        $rfq = $this->purchaseService->createRfq($validated);

        return $this->success($rfq->load('lines.product', 'suppliers'), 'RFQ dibuat.', 201);
    }

    public function show(Rfq $rfq): JsonResponse
    {
        return $this->success($rfq->load('lines.product', 'suppliers', 'pr'));
    }

    public function close(Rfq $rfq): JsonResponse
    {
        $this->purchaseService->closeRfq($rfq);

        return $this->success($rfq->fresh(), 'RFQ ditutup.');
    }

    public function addSuppliers(Request $request, Rfq $rfq): JsonResponse
    {
        $validated = $request->validate([
            'supplier_ids' => ['required', 'array'],
            'supplier_ids.*' => ['exists:suppliers,id'],
        ]);

        $rfq->suppliers()->attach($validated['supplier_ids']);

        return $this->success($rfq->load('suppliers'), 'Supplier ditambahkan.');
    }
}
