<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\Reservation;
use App\Models\ReservationLine;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class StockService
{
    /**
     * Increment (increase) on-hand qty for a warehouse/product/batch and record a movement.
     * Returns the resulting Stock row.
     */
    public function increase(
        int $warehouseId,
        int $productId,
        ?int $batchId,
        float $quantity,
        string $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $referenceNo = null,
        ?string $notes = null,
    ): Stock {
        if ($quantity <= 0) {
            return $this->findOrCreate($warehouseId, $productId, $batchId);
        }

        return DB::transaction(function () use ($warehouseId, $productId, $batchId, $quantity, $type, $referenceType, $referenceId, $referenceNo, $notes) {
            $stock = $this->findOrCreate($warehouseId, $productId, $batchId);
            $before = (float) $stock->qty_on_hand;
            $stock->qty_on_hand = $before + $quantity;
            $stock->save();

            $this->recordMovement($stock, $type, +$quantity, $before, (float) $stock->qty_on_hand, $referenceType, $referenceId, $referenceNo, $notes);

            return $stock->fresh();
        });
    }

    /**
     * Decrease on-hand qty (physical issue). Throws if not enough available (after reservation).
     * Uses qty_available (on_hand - reserved) as the cap.
     */
    public function decrease(
        int $warehouseId,
        int $productId,
        ?int $batchId,
        float $quantity,
        string $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $referenceNo = null,
        ?string $notes = null,
    ): Stock {
        if ($quantity <= 0) {
            return $this->findOrCreate($warehouseId, $productId, $batchId);
        }

        return DB::transaction(function () use ($warehouseId, $productId, $batchId, $quantity, $type, $referenceType, $referenceId, $referenceNo, $notes) {
            $stock = $this->findOrCreate($warehouseId, $productId, $batchId);
            $available = (float) $stock->qty_on_hand - (float) $stock->qty_reserved;

            if ($available < $quantity) {
                throw new \DomainException("Stok tidak cukup untuk {$productId} di gudang {$warehouseId}.");
            }

            $before = (float) $stock->qty_on_hand;
            $stock->qty_on_hand = $before - $quantity;
            $stock->save();

            $this->recordMovement($stock, $type, -$quantity, $before, (float) $stock->qty_on_hand, $referenceType, $referenceId, $referenceNo, $notes);

            return $stock->fresh();
        });
    }

    /**
     * Reserve (increase reserved qty). Falls back across batches by FEFO.
     * Returns which (batch, qty) allocations were made.
     */
    public function reserve(
        int $warehouseId,
        int $productId,
        float $quantity,
        string $reservationNo,
        ?int $reservationId = null,
    ): array {
        if ($quantity <= 0) {
            return [];
        }

        return DB::transaction(function () use ($warehouseId, $productId, $quantity, $reservationNo, $reservationId) {
            // Prefer specified batch if provided via reservation lines, else FEFO. Here we allocate across batches by FEFO.
            $allocated = [];
            $remaining = $quantity;

            $stocks = $this->availableBatchesFefo($warehouseId, $productId);

            foreach ($stocks as $stock) {
                if ($remaining <= 0) {
                    break;
                }
                $available = (float) $stock->qty_on_hand - (float) $stock->qty_reserved;
                if ($available <= 0) {
                    continue;
                }
                $take = min($available, $remaining);
                $stock->qty_reserved = (float) $stock->qty_reserved + $take;
                $stock->save();

                $this->recordMovement($stock, 'reservation', $take, (float) $stock->qty_on_hand, (float) $stock->qty_on_hand, 'reservation', $reservationId, $reservationNo, 'Reservasi stok');

                $allocated[] = ['batch_id' => $stock->batch_id, 'quantity' => $take];
                $remaining -= $take;
            }

            if ($remaining > 0) {
                throw new \DomainException("Stok tidak cukup. Kurang {$remaining} untuk {$productId}.");
            }

            return $allocated;
        });
    }

    public function release(Reservation $reservation): void
    {
        DB::transaction(function () use ($reservation) {
            foreach ($reservation->lines as $line) {
                if (! $line->batch_id) {
                    continue;
                }
                $stock = Stock::where('warehouse_id', $reservation->warehouse_id)
                    ->where('product_id', $line->product_id)
                    ->where('batch_id', $line->batch_id)
                    ->first();

                if (! $stock) {
                    continue;
                }
                $stock->qty_reserved = max(0, (float) $stock->qty_reserved - (float) $line->quantity);
                $stock->save();

                $this->recordMovement($stock, 'release', (float) $line->quantity, (float) $stock->qty_on_hand, (float) $stock->qty_on_hand, 'reservation', $reservation->id, $reservation->reservation_no, 'Rilis reservasi');
            }
        });
    }

    /**
     * Allocate on-hand stock for a shipment, decrementing actual qty.
     */
    public function allocateForShipment(Reservation $reservation, float $quantity): void
    {
        DB::transaction(function () use ($reservation, $quantity) {
            $remaining = $quantity;
            foreach ($reservation->lines as $line) {
                if ($remaining <= 0) {
                    break;
                }
                if (! $line->batch_id) {
                    continue;
                }
                $available = (float) $line->quantity - (float) $line->quantity_shipped;
                if ($available <= 0) {
                    continue;
                }
                $take = min($available, $remaining);

                $this->decrease(
                    $reservation->warehouse_id,
                    $line->product_id,
                    $line->batch_id,
                    $take,
                    'issue',
                    'reservation',
                    $reservation->id,
                    $reservation->reservation_no,
                    'Pengiriman dari reservasi',
                );

                $line->quantity_shipped = (float) $line->quantity_shipped + $take;
                $line->save();
                $remaining -= $take;
            }

            if ($remaining > 0) {
                throw new \DomainException('Stok tidak cukup untuk dikirim.');
            }
        });
    }

    /**
     * Find stock rows available (qty_available > 0) ordered by FEFO (earliest expiry first).
     */
    public function availableBatchesFefo(int $warehouseId, int $productId): Collection
    {
        return Stock::with('batch')
            ->where('stocks.warehouse_id', $warehouseId)
            ->where('stocks.product_id', $productId)
            ->whereRaw('(qty_on_hand - qty_reserved) > 0')
            ->join('batches', 'batches.id', '=', 'stocks.batch_id')
            ->orderBy('batches.expiry_date', 'asc')
            ->orderBy('batches.id', 'asc')
            ->select('stocks.*')
            ->get();
    }

    public function findOrCreate(int $warehouseId, int $productId, ?int $batchId): Stock
    {
        return Stock::firstOrCreate(
            ['warehouse_id' => $warehouseId, 'product_id' => $productId, 'batch_id' => $batchId],
            ['qty_on_hand' => 0, 'qty_reserved' => 0],
        );
    }

    protected function recordMovement(
        Stock $stock,
        string $type,
        float $quantity,
        float $before,
        float $after,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $referenceNo = null,
        ?string $notes = null,
    ): void {
        $movement = StockMovement::create([
            'warehouse_id' => $stock->warehouse_id,
            'product_id' => $stock->product_id,
            'batch_id' => $stock->batch_id,
            'type' => $type,
            'quantity' => $quantity,
            'qty_before' => $before,
            'qty_after' => $after,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'reference_no' => $referenceNo,
            'notes' => $notes,
            'created_by' => auth()->id(),
        ]);

        $movement->save();
    }
}
