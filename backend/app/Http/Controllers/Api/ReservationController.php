<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BatchResource;
use App\Http\Resources\StockMovementResource;
use App\Http\Resources\TransferResource;
use App\Models\AdjustmentHeader;
use App\Models\Batch;
use App\Models\Reservation;
use App\Models\ReservationLine;
use App\Models\StockMovement;
use App\Models\TransferHeader;
use App\Services\DocumentNumberService;
use App\Services\StockService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
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
        $query = Reservation::query()
            ->with('lines.product', 'lines.batch', 'warehouse')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.batch_id' => ['nullable', 'exists:batches,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
        ]);

        $reservation = DB::transaction(function () use ($validated) {
            $reservation = Reservation::create([
                'reservation_no' => $this->numbers->generate('RES', 'reservations', 'reservation_no'),
                'warehouse_id' => $validated['warehouse_id'],
                'status' => 'reserved',
                'reserved_date' => now()->toDateString(),
                'created_by' => auth()->id(),
            ]);

            foreach ($validated['lines'] as $line) {
                $allocated = $this->stockService->reserve(
                    $validated['warehouse_id'],
                    $line['product_id'],
                    (float) $line['quantity'],
                    $reservation->reservation_no,
                    $reservation->id,
                );

                $batchId = $line['batch_id'] ?? null;
                if (! $batchId && count($allocated)) {
                    $batchId = $allocated[0]['batch_id'];
                }

                $reservation->lines()->create([
                    'product_id' => $line['product_id'],
                    'batch_id' => $batchId,
                    'quantity' => $line['quantity'],
                ]);
            }

            return $reservation;
        });

        return $this->success(new TransferResource($reservation), 'Reservasi dibuat.', 201);
    }

    public function release(Reservation $reservation): JsonResponse
    {
        $this->stockService->release($reservation);
        $reservation->update(['status' => 'released']);

        return $this->success(null, 'Reservasi dilepas.');
    }

    public function show(Reservation $reservation): JsonResponse
    {
        return $this->success($reservation->load('lines.product', 'lines.batch', 'warehouse'));
    }
}
