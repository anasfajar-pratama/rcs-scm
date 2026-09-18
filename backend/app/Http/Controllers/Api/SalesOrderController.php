<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesOrder;
use App\Services\SalesService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesOrderController extends Controller
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

        $query = SalesOrder::query()
            ->with('customer', 'warehouse', 'lines.product', 'reservations')
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sales_quotation_id' => ['nullable', 'exists:sales_quotations,id'],
            'customer_id' => ['required', 'exists:customers,id'],
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'order_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $so = DB::transaction(function () use ($validated) {
            $so = SalesOrder::create([
                'so_no' => app(\App\Services\DocumentNumberService::class)->generate('SO', 'sales_orders', 'so_no'),
                'sales_quotation_id' => $validated['sales_quotation_id'] ?? null,
                'customer_id' => $validated['customer_id'],
                'warehouse_id' => $validated['warehouse_id'],
                'order_date' => $validated['order_date'] ?? now()->toDateString(),
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($validated['lines'] as $line) {
                $so->lines()->create([
                    'product_id' => $line['product_id'],
                    'qty' => $line['qty'],
                    'unit_price' => $line['unit_price'],
                    'discount_percent' => $line['discount_percent'] ?? 0,
                    'qty_shipped' => 0,
                ]);
            }

            return $so;
        });

        return $this->success($so->load('customer', 'warehouse', 'lines.product'), 'Sales order dibuat.', 201);
    }

    public function show(SalesOrder $so): JsonResponse
    {
        return $this->success($so->load('customer', 'warehouse', 'lines.product', 'reservations'));
    }

    public function approve(SalesOrder $so): JsonResponse
    {
        if ($so->status !== 'pending') {
            return $this->error('SO harus berstatus pending.', 422);
        }

        try {
            $this->salesService->approveSo($so);
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success($so->fresh()->load('reservations'), 'SO disetujui dan stok direservasi.');
    }

    public function reject(SalesOrder $so): JsonResponse
    {
        if ($so->status !== 'pending') {
            return $this->error('SO harus berstatus pending.', 422);
        }

        $this->salesService->rejectSo($so);

        return $this->success($so->fresh(), 'SO ditolak.');
    }

    public function fulfill(SalesOrder $so): JsonResponse
    {
        if ($so->status !== 'approved') {
            return $this->error('SO harus berstatus approved untuk dikirim.', 422);
        }

        try {
            $this->salesService->fulfillSo($so);
            return $this->success($so->fresh()->load('reservations'), 'SO dikirim, stok berkurang.');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function cancel(SalesOrder $so): JsonResponse
    {
        if ($so->status !== 'pending' && $so->status !== 'approved') {
            return $this->error('SO tidak bisa dibatalkan.', 422);
        }

        try {
            $this->salesService->cancelSo($so);
            return $this->success($so->fresh(), 'SO dibatalkan dan reservasi dilepas.');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
