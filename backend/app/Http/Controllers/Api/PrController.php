<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseRequisition;
use App\Services\PurchaseService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrController extends Controller
{
    use ApiResponse;

    public function __construct(private PurchaseService $purchaseService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $query = PurchaseRequisition::query()
            ->with('requestedBy', 'lines.product', 'lines.preferredSupplier')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'department' => ['nullable', 'string'],
            'needed_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.preferred_supplier_id' => ['nullable', 'exists:suppliers,id'],
            'lines.*.estimated_price' => ['nullable', 'numeric', 'min:0'],
            'lines.*.note' => ['nullable', 'string'],
        ]);

        $pr = $this->purchaseService->createPr($validated);

        return $this->success($pr->load('lines.product', 'lines.preferredSupplier', 'requestedBy'), 'PR dibuat.', 201);
    }

    public function show(PurchaseRequisition $pr): JsonResponse
    {
        return $this->success($pr->load('lines.product', 'lines.preferredSupplier', 'requestedBy'));
    }

    public function approve(PurchaseRequisition $pr): JsonResponse
    {
        if ($pr->status !== 'pending') {
            return $this->error('PR harus berstatus pending.', 422);
        }

        $this->purchaseService->approvePr($pr);

        return $this->success($pr->fresh(), 'PR disetujui.');
    }

    public function reject(PurchaseRequisition $pr): JsonResponse
    {
        if ($pr->status !== 'pending') {
            return $this->error('PR harus berstatus pending.', 422);
        }

        $this->purchaseService->rejectPr($pr);

        return $this->success($pr->fresh(), 'PR ditolak.');
    }

    public function suggestions(): JsonResponse
    {
        $alerts = app(\App\Http\Controllers\Api\StockController::class)->alerts();

        return $this->success($alerts->getData(true)['data'] ?? []);
    }
}
