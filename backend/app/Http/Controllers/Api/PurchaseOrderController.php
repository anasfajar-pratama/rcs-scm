<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Services\PurchaseService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    use ApiResponse;

    public function __construct(private PurchaseService $purchaseService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $query = PurchaseOrder::query()
            ->with('supplier', 'lines.product')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'currency' => ['nullable', 'string', 'max:10'],
            'payment_term' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.price' => ['required', 'numeric', 'min:0'],
            'lines.*.tax' => ['nullable', 'numeric', 'min:0'],
            'lines.*.discount' => ['nullable', 'numeric', 'min:0'],
            'lines.*.expected_date' => ['nullable', 'date'],
        ]);

        $po = DB::transaction(function () use ($validated) {
            $po = PurchaseOrder::create([
                'po_no' => app(\App\Services\DocumentNumberService::class)->generate('PO', 'purchase_orders', 'po_no'),
                'supplier_id' => $validated['supplier_id'],
                'currency' => $validated['currency'] ?? 'IDR',
                'status' => 'pending',
                'payment_term' => $validated['payment_term'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($validated['lines'] as $line) {
                $po->lines()->create([
                    'product_id' => $line['product_id'],
                    'qty' => $line['qty'],
                    'qty_received' => 0,
                    'price' => $line['price'],
                    'tax' => $line['tax'] ?? 0,
                    'discount' => $line['discount'] ?? 0,
                    'expected_date' => $line['expected_date'] ?? null,
                ]);
            }

            return $po;
        });

        return $this->success($po->load('lines.product', 'supplier'), 'PO dibuat.', 201);
    }

    public function show(PurchaseOrder $po): JsonResponse
    {
        return $this->success($po->load('lines.product', 'supplier', 'quotation'));
    }

    public function approve(PurchaseOrder $po): JsonResponse
    {
        if ($po->status !== 'pending') {
            return $this->error('PO harus berstatus pending.', 422);
        }

        $this->purchaseService->approvePo($po);

        return $this->success($po->fresh(), 'PO disetujui.');
    }

    public function reject(PurchaseOrder $po): JsonResponse
    {
        if ($po->status !== 'pending') {
            return $this->error('PO harus berstatus pending.', 422);
        }

        $this->purchaseService->rejectPo($po);

        return $this->success($po->fresh(), 'PO ditolak.');
    }

    public function cancel(PurchaseOrder $po): JsonResponse
    {
        try {
            $this->purchaseService->cancelPo($po);
            return $this->success($po->fresh(), 'PO dibatalkan.');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
