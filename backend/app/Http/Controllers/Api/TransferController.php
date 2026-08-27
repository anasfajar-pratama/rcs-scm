<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransferResource;
use App\Models\TransferHeader;
use App\Models\TransferLine;
use App\Services\DocumentNumberService;
use App\Services\StockService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransferController extends Controller
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
        $query = TransferHeader::query()
            ->with('fromWarehouse', 'toWarehouse', 'lines.product', 'lines.batch')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => TransferResource::collection($p->items()));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request);

        $transfer = DB::transaction(function () use ($validated) {
            $header = TransferHeader::create([
                'transfer_no' => $this->numbers->generate('TRF', 'transfer_headers', 'transfer_no'),
                'from_warehouse_id' => $validated['from_warehouse_id'],
                'to_warehouse_id' => $validated['to_warehouse_id'],
                'transfer_date' => $validated['transfer_date'] ?? now()->toDateString(),
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($validated['lines'] as $line) {
                $batchId = $line['batch_id'] ?? null;
                if (! $batchId) {
                    $available = $this->stockService->availableBatchesFefo($validated['from_warehouse_id'], $line['product_id']);
                    $batchId = $available->first()?->batch_id;
                }

                $header->lines()->create([
                    'product_id' => $line['product_id'],
                    'batch_id' => $batchId,
                    'quantity' => $line['quantity'],
                ]);
            }

            return $header;
        });

        return $this->success(new TransferResource($transfer->load('lines.product', 'lines.batch', 'fromWarehouse', 'toWarehouse')), 'Transfer berhasil dibuat.', 201);
    }

    public function show(TransferHeader $transfer): JsonResponse
    {
        return $this->success(new TransferResource($transfer->load('lines.product', 'lines.batch', 'fromWarehouse', 'toWarehouse')));
    }

    public function capture(TransferHeader $transfer): JsonResponse
    {
        // Move from "in transit" to "received": debit source, credit destination.
        if ($transfer->status !== 'in_transit') {
            return $this->error('Transfer harus berstatus in_transit untuk diterima.', 422);
        }

        DB::transaction(function () use ($transfer) {
            foreach ($transfer->lines as $line) {
                $this->stockService->increase(
                    $transfer->to_warehouse_id,
                    $line->product_id,
                    $line->batch_id,
                    (float) $line->quantity,
                    'transfer_in',
                    'transfer',
                    $transfer->id,
                    $transfer->transfer_no,
                );
            }

            $transfer->update(['status' => 'received']);
        });

        return $this->success(new TransferResource($transfer->load('lines.product', 'lines.batch', 'fromWarehouse', 'toWarehouse')), 'Transfer diterima.');
    }

    public function transit(TransferHeader $transfer): JsonResponse
    {
        if ($transfer->status !== 'approved') {
            return $this->error('Transfer harus berstatus approved untuk dikirim.', 422);
        }

        DB::transaction(function () use ($transfer) {
            // Debit at departure
            foreach ($transfer->lines as $line) {
                $this->stockService->decrease(
                    $transfer->from_warehouse_id,
                    $line->product_id,
                    $line->batch_id,
                    (float) $line->quantity,
                    'transfer_out',
                    'transfer',
                    $transfer->id,
                    $transfer->transfer_no,
                );
            }
            $transfer->update(['status' => 'in_transit']);
        });

        return $this->success(new TransferResource($transfer->load('lines.product', 'lines.batch', 'fromWarehouse', 'toWarehouse')), 'Transfer dalam perjalanan.');
    }

    public function approve(TransferHeader $transfer): JsonResponse
    {
        if ($transfer->status !== 'pending') {
            return $this->error('Transfer harus berstatus pending.', 422);
        }

        $transfer->update(['status' => 'approved']);

        return $this->success(new TransferResource($transfer->load('lines.product', 'lines.batch', 'fromWarehouse', 'toWarehouse')), 'Transfer disetujui.');
    }

    public function destroy(TransferHeader $transfer): JsonResponse
    {
        if ($transfer->status !== 'pending') {
            return $this->error('Hanya transfer pending yang bisa dihapus.', 422);
        }

        $transfer->delete();

        return $this->success(null, 'Transfer dihapus.');
    }

    private function validate(Request $request): array
    {
        return $request->validate([
            'from_warehouse_id' => ['required', 'exists:warehouses,id', 'different:to_warehouse_id'],
            'to_warehouse_id' => ['required', 'exists:warehouses,id'],
            'transfer_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.batch_id' => ['nullable', 'exists:batches,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
        ]);
    }
}
