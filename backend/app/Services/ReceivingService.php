<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\PurchaseOrder;
use App\Models\PurchaseReturn;
use App\Models\Receiving;
use App\Models\ReceivingLine;
use Illuminate\Support\Facades\DB;

class ReceivingService
{
    public function __construct(
        private StockService $stockService,
        private DocumentNumberService $numbers,
    ) {
    }

    public function create(array $data): Receiving
    {
        return DB::transaction(function () use ($data) {
            $receiving = Receiving::create([
                'receiving_no' => $this->numbers->generate('RCV', 'receivings', 'receiving_no'),
                'po_id' => $data['po_id'],
                'warehouse_id' => $data['warehouse_id'],
                'received_date' => $data['received_date'] ?? now()->toDateString(),
                'status' => 'draft',
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['lines'] as $line) {
                $receiving->lines()->create([
                    'po_line_id' => $line['po_line_id'],
                    'product_id' => $line['product_id'],
                    'qty_received' => $line['qty_received'],
                    'lot_no' => $line['lot_no'] ?? null,
                    'mfg_date' => $line['mfg_date'] ?? null,
                    'expiry_date' => $line['expiry_date'] ?? null,
                ]);
            }

            return $receiving;
        });
    }

    public function post(Receiving $receiving): void
    {
        if ($receiving->status !== 'draft') {
            throw new \DomainException('Receiving harus berstatus draft.');
        }

        DB::transaction(function () use ($receiving) {
            foreach ($receiving->lines as $line) {
                $batch = $this->findOrCreateBatch($line);

                $this->stockService->increase(
                    $receiving->warehouse_id,
                    $line->product_id,
                    $batch->id,
                    (float) $line->qty_received,
                    'receiving',
                    'receiving',
                    $receiving->id,
                    $receiving->receiving_no,
                    'Penerimaan dari PO ' . $receiving->po->po_no,
                );

                $line->update(['batch_id' => $batch->id]);

                // Update PO line qty_received
                $poLine = $line->poLine;
                $poLine->update(['qty_received' => (float) $poLine->qty_received + (float) $line->qty_received]);

                // Update PO status
                $po = $receiving->po;
                $totalQty = (float) $po->lines()->sum('qty');
                $totalReceived = (float) $po->lines()->sum('qty_received');
                if ($totalReceived >= $totalQty) {
                    $po->update(['status' => 'received']);
                } else {
                    $po->update(['status' => 'partially_received']);
                }
            }

            $receiving->update(['status' => 'posted']);
        });
    }

    public function createReturn(array $data): PurchaseReturn
    {
        return DB::transaction(function () use ($data) {
            $return = PurchaseReturn::create([
                'return_no' => $this->numbers->generate('RET', 'purchase_returns', 'return_no'),
                'receiving_id' => $data['receiving_id'] ?? null,
                'supplier_id' => $data['supplier_id'],
                'status' => 'draft',
                'reason' => $data['reason'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['lines'] as $line) {
                $return->lines()->create([
                    'product_id' => $line['product_id'],
                    'batch_id' => $line['batch_id'] ?? null,
                    'qty' => $line['qty'],
                    'reason' => $line['reason'] ?? null,
                ]);
            }

            return $return;
        });
    }

    public function postReturn(PurchaseReturn $return): void
    {
        if ($return->status !== 'draft') {
            throw new \DomainException('Return harus berstatus draft.');
        }

        DB::transaction(function () use ($return) {
            $return->load('receiving');
            $warehouseId = $return->receiving?->warehouse_id ?? 1;

            foreach ($return->lines as $line) {
                $this->stockService->decrease(
                    $warehouseId,
                    $line->product_id,
                    $line->batch_id,
                    (float) $line->qty,
                    'return',
                    'purchase_return',
                    $return->id,
                    $return->return_no,
                    $line->reason,
                );
            }

            $return->update(['status' => 'posted']);
        });
    }

    private function findOrCreateBatch(ReceivingLine $line): Batch
    {
        if ($line->batch_id) {
            return Batch::find($line->batch_id);
        }

        $product = $line->product;
        $lotNo = $line->lot_no ?? 'LOT-' . strtoupper(substr(md5(uniqid()), 0, 8));

        return Batch::updateOrCreate(
            ['product_id' => $product->id, 'lot_no' => $lotNo],
            [
                'mfg_date' => $line->mfg_date,
                'expiry_date' => $line->expiry_date,
                'shelf_life_days' => $product->shelf_life_days,
                'status' => 'available',
                'source_type' => 'receiving',
                'reference_type' => 'receiving',
                'reference_id' => $line->receiving_id,
            ],
        );
    }
}
