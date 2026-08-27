<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StockOpnameResource;
use App\Models\Stock;
use App\Models\StockOpnameHeader;
use App\Services\DocumentNumberService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockOpnameController extends Controller
{
    use ApiResponse;

    public function __construct(private DocumentNumberService $numbers)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $query = StockOpnameHeader::query()
            ->with('warehouse', 'lines.product', 'lines.batch')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => StockOpnameResource::collection($p->items()));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateData($request);

        $opname = DB::transaction(function () use ($validated) {
            $header = StockOpnameHeader::create([
                'opname_no' => $this->numbers->generate('OPN', 'stock_opname_headers', 'opname_no'),
                'warehouse_id' => $validated['warehouse_id'],
                'opname_date' => $validated['opname_date'] ?? now()->toDateString(),
                'status' => 'counted',
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            // Snapshot system stock & record user counts
            $lines = [];
            foreach ($validated['lines'] as $line) {
                $stock = Stock::where('warehouse_id', $validated['warehouse_id'])
                    ->where('product_id', $line['product_id'])
                    ->where('batch_id', $line['batch_id'] ?? null)
                    ->first();

                $qtySystem = $stock ? (float) $stock->qty_on_hand : 0;
                $qtyCount = (float) $line['qty_count'];

                $header->lines()->create([
                    'product_id' => $line['product_id'],
                    'batch_id' => $line['batch_id'] ?? null,
                    'qty_system' => $qtySystem,
                    'qty_count' => $qtyCount,
                    'qty_diff' => $qtyCount - $qtySystem,
                ]);
            }

            return $header;
        });

        return $this->success(new StockOpnameResource($opname->load('lines.product', 'lines.batch', 'warehouse')), 'Stock opname dicatat.', 201);
    }

    public function show(StockOpnameHeader $opname): JsonResponse
    {
        return $this->success(new StockOpnameResource($opname->load('lines.product', 'lines.batch', 'warehouse')));
    }

    public function post(StockOpnameHeader $opname): JsonResponse
    {
        if ($opname->status !== 'counted') {
            return $this->error('Opname harus berstatus counted untuk diposting.', 422);
        }

        // Create an adjustment header from the opname diff and post it.
        $adjustment = DB::transaction(function () use ($opname) {
            $goodsGain = $opname->lines->sum('qty_diff');
            $type = $goodsGain >= 0 ? 'gain' : 'loss';

            $adjustHeader = \App\Models\AdjustmentHeader::create([
                'adjustment_no' => $this->numbers->generate('ADJ', 'adjustment_headers', 'adjustment_no'),
                'type' => $type,
                'warehouse_id' => $opname->warehouse_id,
                'adjustment_date' => now()->toDateString(),
                'status' => 'approved',
                'notes' => 'Dari stock opname '.$opname->opname_no,
                'created_by' => auth()->id(),
            ]);

            foreach ($opname->lines as $line) {
                if ((float) $line->qty_diff == 0) {
                    continue;
                }
                $adjustHeader->lines()->create([
                    'product_id' => $line->product_id,
                    'batch_id' => $line->batch_id,
                    'qty_diff' => (float) $line->qty_diff,
                    'reason' => 'Selisih opname',
                ]);
            }

            $opname->update(['status' => 'posted']);

            return $adjustHeader;
        });

        // Apply the adjustment via the same service so movements are recorded.
        app(\App\Services\StockService::class);
        $this->applyAdjustment($adjustment);

        return $this->success(new StockOpnameResource($opname->load('lines.product', 'lines.batch', 'warehouse')), 'Stock opname diposting.');
    }

    private function applyAdjustment(\App\Models\AdjustmentHeader $adjustment): void
    {
        $stockService = app(\App\Services\StockService::class);
        foreach ($adjustment->lines as $line) {
            $diff = (float) $line->qty_diff;
            if ($diff >= 0) {
                $stockService->increase($adjustment->warehouse_id, $line->product_id, $line->batch_id, $diff, 'adjustment', 'adjustment', $adjustment->id, $adjustment->adjustment_no, $line->reason);
            } else {
                $stockService->decrease($adjustment->warehouse_id, $line->product_id, $line->batch_id, abs($diff), 'adjustment', 'adjustment', $adjustment->id, $adjustment->adjustment_no, $line->reason);
            }
        }
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'opname_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.batch_id' => ['nullable', 'exists:batches,id'],
            'lines.*.qty_count' => ['required', 'numeric', 'min:0'],
        ]);
    }
}
