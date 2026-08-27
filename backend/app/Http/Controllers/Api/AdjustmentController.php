<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdjustmentResource;
use App\Models\AdjustmentHeader;
use App\Models\AdjustmentLine;
use App\Services\DocumentNumberService;
use App\Services\StockService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdjustmentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private StockService $stockService,
        private DocumentNumberService $numbers,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $query = AdjustmentHeader::query()
            ->with('warehouse', 'lines.product', 'lines.batch')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => AdjustmentResource::collection($p->items()));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateData($request);

        $adjustment = DB::transaction(function () use ($validated) {
            $header = AdjustmentHeader::create([
                'adjustment_no' => $this->numbers->generate('ADJ', 'adjustment_headers', 'adjustment_no'),
                'type' => $validated['type'],
                'warehouse_id' => $validated['warehouse_id'],
                'adjustment_date' => $validated['adjustment_date'] ?? now()->toDateString(),
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($validated['lines'] as $line) {
                $header->lines()->create([
                    'product_id' => $line['product_id'],
                    'batch_id' => $line['batch_id'] ?? null,
                    'qty_diff' => $line['qty_diff'],
                    'reason' => $line['reason'] ?? null,
                ]);
            }

            return $header;
        });

        return $this->success(new AdjustmentResource($adjustment->load('lines.product', 'lines.batch', 'warehouse')), 'Adjustment dibuat (menunggu approval).', 201);
    }

    public function show(AdjustmentHeader $adjustment): JsonResponse
    {
        return $this->success(new AdjustmentResource($adjustment->load('lines.product', 'lines.batch', 'warehouse')));
    }

    public function approve(AdjustmentHeader $adjustment): JsonResponse
    {
        if ($adjustment->status !== 'pending') {
            return $this->error('Adjustment harus berstatus pending.', 422);
        }

        DB::transaction(function () use ($adjustment) {
            foreach ($adjustment->lines as $line) {
                $diff = (float) $line->qty_diff;
                if ($diff >= 0) {
                    $this->stockService->increase(
                        $adjustment->warehouse_id,
                        $line->product_id,
                        $line->batch_id,
                        $diff,
                        'adjustment',
                        'adjustment',
                        $adjustment->id,
                        $adjustment->adjustment_no,
                        $line->reason,
                    );
                } else {
                    $this->stockService->decrease(
                        $adjustment->warehouse_id,
                        $line->product_id,
                        $line->batch_id,
                        abs($diff),
                        'adjustment',
                        'adjustment',
                        $adjustment->id,
                        $adjustment->adjustment_no,
                        $line->reason,
                    );
                }
            }
            $adjustment->update(['status' => 'approved']);
        });

        return $this->success(new AdjustmentResource($adjustment->load('lines.product', 'lines.batch', 'warehouse')), 'Adjustment disetujui & stok diperbarui.');
    }

    public function reject(AdjustmentHeader $adjustment): JsonResponse
    {
        if ($adjustment->status !== 'pending') {
            return $this->error('Adjustment harus berstatus pending.', 422);
        }

        $adjustment->update(['status' => 'rejected']);

        return $this->success(new AdjustmentResource($adjustment->load('lines.product', 'lines.batch', 'warehouse')), 'Adjustment ditolak.');
    }

    public function destroy(AdjustmentHeader $adjustment): JsonResponse
    {
        if ($adjustment->status !== 'pending') {
            return $this->error('Hanya adjustment pending yang bisa dihapus.', 422);
        }

        $adjustment->delete();

        return $this->success(null, 'Adjustment dihapus.');
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'type' => ['required', 'in:gain,loss'],
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'adjustment_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.batch_id' => ['nullable', 'exists:batches,id'],
            'lines.*.qty_diff' => ['required', 'numeric', 'not_in:0'],
            'lines.*.reason' => ['nullable', 'string'],
        ]);
    }
}
