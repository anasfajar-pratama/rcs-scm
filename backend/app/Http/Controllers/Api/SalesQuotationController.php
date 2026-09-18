<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesQuotation;
use App\Services\SalesService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesQuotationController extends Controller
{
    use ApiResponse;

    public function __construct(private SalesService $salesService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $status = $request->query('status');
        $customerId = $request->query('customer_id');

        $query = SalesQuotation::query()
            ->with('customer', 'lines.product')
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'quotation_date' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'max:10'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $quotation = $this->salesService->createQuotation($validated);

        return $this->success($quotation->load('customer', 'lines.product'), 'Sales quotation dibuat.', 201);
    }

    public function show(SalesQuotation $quotation): JsonResponse
    {
        return $this->success($quotation->load('customer', 'lines.product'));
    }

    public function update(Request $request, SalesQuotation $quotation): JsonResponse
    {
        if ($quotation->status !== 'draft') {
            return $this->error('Hanya quotation draft yang bisa diubah.', 422);
        }

        $validated = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'quotation_date' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'max:10'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $quotation = \Illuminate\Support\Facades\DB::transaction(function () use ($quotation, $validated) {
            $quotation->update([
                'customer_id' => $validated['customer_id'],
                'quotation_date' => $validated['quotation_date'] ?? now()->toDateString(),
                'valid_until' => $validated['valid_until'] ?? null,
                'currency' => $validated['currency'] ?? 'IDR',
                'notes' => $validated['notes'] ?? null,
            ]);

            $quotation->lines()->delete();
            foreach ($validated['lines'] as $line) {
                $quotation->lines()->create([
                    'product_id' => $line['product_id'],
                    'qty' => $line['qty'],
                    'unit_price' => $line['unit_price'],
                    'discount_percent' => $line['discount_percent'] ?? 0,
                ]);
            }

            return $quotation;
        });

        return $this->success($quotation->load('customer', 'lines.product'), 'Sales quotation diperbarui.');
    }

    public function destroy(SalesQuotation $quotation): JsonResponse
    {
        if ($quotation->status !== 'draft') {
            return $this->error('Hanya quotation draft yang bisa dihapus.', 422);
        }

        $quotation->delete();

        return $this->success(null, 'Sales quotation dihapus.');
    }

    public function send(SalesQuotation $quotation): JsonResponse
    {
        if ($quotation->status !== 'draft') {
            return $this->error('Hanya quotation draft yang bisa dikirim.', 422);
        }

        $this->salesService->sendQuotation($quotation);

        return $this->success($quotation->fresh(), 'Quotation dikirim.');
    }

    public function accept(SalesQuotation $quotation): JsonResponse
    {
        if ($quotation->status !== 'sent') {
            return $this->error('Hanya quotation sent yang bisa diterima.', 422);
        }

        $this->salesService->acceptQuotation($quotation);

        return $this->success($quotation->fresh(), 'Quotation diterima.');
    }

    public function reject(SalesQuotation $quotation): JsonResponse
    {
        if ($quotation->status !== 'sent') {
            return $this->error('Hanya quotation sent yang bisa ditolak.', 422);
        }

        $this->salesService->rejectQuotation($quotation);

        return $this->success($quotation->fresh(), 'Quotation ditolak.');
    }

    public function convertToSo(Request $request, SalesQuotation $quotation): JsonResponse
    {
        if ($quotation->status !== 'accepted') {
            return $this->error('Hanya quotation accepted yang bisa dikonversi ke SO.', 422);
        }

        $validated = $request->validate([
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'order_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $so = $this->salesService->createSoFromQuotation($quotation, $validated);

        return $this->success($so->load('customer', 'warehouse', 'lines.product'), 'Sales order dibuat dari quotation.', 201);
    }
}
