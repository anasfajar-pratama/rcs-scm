<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\SupplierQuotation;
use App\Services\PurchaseService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierQuotationController extends Controller
{
    use ApiResponse;

    public function __construct(private PurchaseService $purchaseService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $rfqId = $request->query('rfq_id');

        $query = SupplierQuotation::query()
            ->with('rfq', 'rfqLine.product', 'supplier')
            ->when($rfqId, fn ($q) => $q->where('rfq_id', $rfqId))
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rfq_id' => ['required', 'exists:rfqs,id'],
            'rfq_line_id' => ['required', 'exists:rfq_lines,id'],
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'price' => ['required', 'numeric', 'min:0'],
            'min_order' => ['nullable', 'numeric', 'min:0'],
            'lead_time_days' => ['nullable', 'integer'],
            'valid_until' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $quotation = $this->purchaseService->createQuotation($validated);

        return $this->success($quotation->load('rfqLine.product', 'supplier'), 'Quotation dibuat.', 201);
    }

    public function accept(SupplierQuotation $quotation): JsonResponse
    {
        $this->purchaseService->acceptQuotation($quotation);

        return $this->success($quotation->fresh(), 'Quotation diterima.');
    }

    public function reject(SupplierQuotation $quotation): JsonResponse
    {
        $this->purchaseService->rejectQuotation($quotation);

        return $this->success($quotation->fresh(), 'Quotation ditolak.');
    }

    public function compare(Request $request): JsonResponse
    {
        $validated = $request->validate(['rfq_id' => ['required', 'exists:rfqs,id']]);

        $rfq = \App\Models\Rfq::with('lines.product')->find($validated['rfq_id']);
        $quotations = SupplierQuotation::with('supplier', 'rfqLine.product')
            ->where('rfq_id', $rfq->id)
            ->get()
            ->groupBy('rfq_line_id');

        $comparison = $rfq->lines->map(function ($line) use ($quotations) {
            $quotes = $quotations->get($line->id, collect());
            $cheapest = $quotes->min('price');

            return [
                'rfq_line_id' => $line->id,
                'product' => $line->product->name,
                'qty' => $line->qty,
                'target_price' => $line->target_price,
                'quotations' => $quotes->map(fn ($q) => [
                    'id' => $q->id,
                    'supplier' => $q->supplier->name,
                    'price' => $q->price,
                    'lead_time_days' => $q->lead_time_days,
                    'valid_until' => $q->valid_until?->toDateString(),
                    'is_cheapest' => $q->price == $cheapest,
                ]),
            ];
        });

        return $this->success($comparison);
    }

    public function convertToPo(Request $request, SupplierQuotation $quotation): JsonResponse
    {
        $validated = $request->validate([
            'currency' => ['nullable', 'string', 'max:10'],
            'payment_term' => ['nullable', 'string'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'expected_date' => ['nullable', 'date'],
        ]);

        $po = $this->purchaseService->createPoFromQuotation($quotation, $validated);

        return $this->success($po->load('lines.product', 'supplier'), 'PO dibuat dari quotation.', 201);
    }
}
