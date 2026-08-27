<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Receiving;
use App\Services\ReceivingService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReceivingController extends Controller
{
    use ApiResponse;

    public function __construct(private ReceivingService $receivingService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $query = Receiving::query()
            ->with('po', 'warehouse', 'lines.product', 'lines.batch')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'po_id' => ['required', 'exists:purchase_orders,id'],
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'received_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.po_line_id' => ['required', 'exists:po_lines,id'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.qty_received' => ['required', 'numeric', 'gt:0'],
            'lines.*.lot_no' => ['nullable', 'string'],
            'lines.*.mfg_date' => ['nullable', 'date'],
            'lines.*.expiry_date' => ['nullable', 'date'],
        ]);

        $receiving = $this->receivingService->create($validated);

        return $this->success($receiving->load('lines.product', 'lines.batch', 'po', 'warehouse'), 'Receiving dibuat.', 201);
    }

    public function show(Receiving $receiving): JsonResponse
    {
        return $this->success($receiving->load('lines.product', 'lines.batch', 'po', 'warehouse'));
    }

    public function post(Receiving $receiving): JsonResponse
    {
        try {
            $this->receivingService->post($receiving);
            return $this->success($receiving->fresh()->load('lines.product', 'lines.batch', 'po', 'warehouse'), 'Receiving diposting.');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
