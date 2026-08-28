<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\Product;
use App\Models\ProductionOrder;
use App\Models\ProductionOrderLine;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

class ProductionService
{
    public function __construct(
        private DocumentNumberService $numbers,
        private StockService $stockService,
    ) {
    }

    /**
     * Create a production order. If lines are not provided, they are derived
     * from the product's active BOM (component * planned_qty).
     */
    public function create(array $data): ProductionOrder
    {
        return DB::transaction(function () use ($data) {
            $order = ProductionOrder::create([
                'po_no' => $this->numbers->generate('MO', 'production_orders', 'po_no'),
                'product_id' => $data['product_id'],
                'planned_qty' => $data['planned_qty'],
                'produced_qty' => 0,
                'warehouse_id' => $data['warehouse_id'],
                'order_date' => $data['order_date'] ?? now()->toDateString(),
                'due_date' => $data['due_date'] ?? null,
                'status' => 'draft',
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            $lines = $data['lines'] ?? $this->bomLinesFor($data['product_id'], $data['planned_qty']);

            foreach ($lines as $line) {
                $order->lines()->create([
                    'component_id' => $line['component_id'],
                    'planned_qty' => $line['planned_qty'],
                    'issued_qty' => 0,
                    'qty_per_unit' => $line['qty_per_unit'] ?? 0,
                ]);
            }

            return $order;
        });
    }

    /**
     * Start production: issue raw materials from the target warehouse.
     * Products with batch tracking are issued FEFO (earliest expiry first).
     * Throws DomainException when stock is insufficient.
     */
    public function start(ProductionOrder $order): void
    {
        if ($order->status !== 'draft') {
            throw new \DomainException('Production order harus berstatus draft.');
        }

        DB::transaction(function () use ($order) {
            foreach ($order->lines as $line) {
                $component = $line->component;

                if ($component->track_batch) {
                    $allocated = $this->stockService->availableBatchesFefo($order->warehouse_id, $line->component_id);
                    $remaining = (float) $line->planned_qty;

                    foreach ($allocated as $stock) {
                        if ($remaining <= 0) {
                            break;
                        }
                        $available = (float) $stock->qty_on_hand - (float) $stock->qty_reserved;
                        if ($available <= 0) {
                            continue;
                        }
                        $take = min($available, $remaining);

                        $this->stockService->decrease(
                            $order->warehouse_id,
                            $line->component_id,
                            $stock->batch_id,
                            $take,
                            'issue',
                            'production_order',
                            $order->id,
                            $order->po_no,
                            'Issue material ' . ($component->name ?? ''),
                        );

                        $remaining -= $take;
                    }

                    if ($remaining > 0) {
                        throw new \DomainException("Stok tidak cukup untuk {$line->component_id}. Kurang {$remaining}.");
                    }
                } else {
                    $this->stockService->decrease(
                        $order->warehouse_id,
                        $line->component_id,
                        null,
                        (float) $line->planned_qty,
                        'issue',
                        'production_order',
                        $order->id,
                        $order->po_no,
                        'Issue material ' . ($component->name ?? ''),
                    );
                }

                $line->update(['issued_qty' => $line->planned_qty]);
            }

            $order->update(['status' => 'in_progress']);
        });
    }

    /**
     * Complete production: create a new finished-good batch and increase stock.
     */
    public function complete(ProductionOrder $order, array $data): void
    {
        if ($order->status !== 'in_progress') {
            throw new \DomainException('Production order harus berstatus in_progress.');
        }

        DB::transaction(function () use ($order, $data) {
            $product = $order->product;
            $lotNo = $data['lot_no'] ?? 'LOT-PROD-' . strtoupper(substr(md5(uniqid()), 0, 8));
            $producedQty = (float) $data['produced_qty'];

            $mfgDate = $data['mfg_date'] ?? now()->toDateString();
            $expiryDate = $data['expiry_date'] ?? ($product->shelf_life_days
                ? now()->addDays($product->shelf_life_days)->toDateString()
                : null);

            $batch = Batch::create([
                'product_id' => $product->id,
                'lot_no' => $lotNo,
                'mfg_date' => $mfgDate,
                'expiry_date' => $expiryDate,
                'shelf_life_days' => $product->shelf_life_days,
                'status' => 'available',
                'source_type' => 'production',
                'reference_type' => 'production_order',
                'reference_id' => $order->id,
                'note' => $data['note'] ?? null,
            ]);

            $this->stockService->increase(
                $order->warehouse_id,
                $product->id,
                $batch->id,
                $producedQty,
                'production',
                'production_order',
                $order->id,
                $order->po_no,
                'Hasil produksi ' . $product->name,
            );

            $order->productionBatches()->create([
                'batch_id' => $batch->id,
                'quantity' => $producedQty,
            ]);

            $order->update([
                'produced_qty' => $producedQty,
                'status' => 'completed',
            ]);
        });
    }

    public function cancel(ProductionOrder $order): void
    {
        if ($order->status === 'completed' || $order->status === 'cancelled') {
            throw new \DomainException('Production order tidak bisa dibatalkan.');
        }

        DB::transaction(function () use ($order) {
            foreach ($order->lines as $line) {
                if ((float) $line->issued_qty <= 0) {
                    continue;
                }

                $movements = StockMovement::where('reference_type', 'production_order')
                    ->where('reference_id', $order->id)
                    ->where('product_id', $line->component_id)
                    ->where('type', 'issue')
                    ->get();

                if ($movements->isEmpty()) {
                    $this->stockService->increase(
                        $order->warehouse_id,
                        $line->component_id,
                        null,
                        (float) $line->issued_qty,
                        'reversal',
                        'production_order',
                        $order->id,
                        $order->po_no,
                        'Kembalikan material (batal produksi)',
                    );
                } else {
                    foreach ($movements as $movement) {
                        $this->stockService->increase(
                            $order->warehouse_id,
                            $line->component_id,
                            $movement->batch_id,
                            abs((float) $movement->quantity),
                            'reversal',
                            'production_order',
                            $order->id,
                            $order->po_no,
                            'Kembalikan material (batal produksi)',
                        );
                    }
                }

                $line->update(['issued_qty' => 0]);
            }

            $order->update(['status' => 'cancelled']);
        });
    }

    /**
     * Derive required material lines from the product's active BOM.
     */
    private function bomLinesFor(int $productId, float $plannedQty): array
    {
        $bom = \App\Models\ProductBom::query()
            ->where('product_id', $productId)
            ->where('is_active', true)
            ->with('component')
            ->get();

        return $bom->map(fn ($b) => [
            'component_id' => $b->component_id,
            'planned_qty' => round($b->quantity * $plannedQty, 4),
            'qty_per_unit' => $b->quantity,
        ])->all();
    }
}
