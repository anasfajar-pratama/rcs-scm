<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use App\Models\PurchaseRequisition;
use App\Models\Rfq;
use App\Models\SupplierQuotation;
use Illuminate\Support\Facades\DB;

class PurchaseService
{
    public function __construct(
        private DocumentNumberService $numbers,
    ) {
    }

    public function createPr(array $data): PurchaseRequisition
    {
        return DB::transaction(function () use ($data) {
            $pr = PurchaseRequisition::create([
                'pr_no' => $this->numbers->generate('PR', 'purchase_requisitions', 'pr_no'),
                'requested_by' => auth()->id(),
                'department' => $data['department'] ?? null,
                'needed_date' => $data['needed_date'] ?? null,
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['lines'] as $line) {
                $pr->lines()->create([
                    'product_id' => $line['product_id'],
                    'qty' => $line['qty'],
                    'preferred_supplier_id' => $line['preferred_supplier_id'] ?? null,
                    'estimated_price' => $line['estimated_price'] ?? null,
                    'note' => $line['note'] ?? null,
                ]);
            }

            return $pr;
        });
    }

    public function approvePr(PurchaseRequisition $pr): void
    {
        $pr->update(['status' => 'approved']);
    }

    public function rejectPr(PurchaseRequisition $pr): void
    {
        $pr->update(['status' => 'rejected']);
    }

    public function createRfq(array $data): Rfq
    {
        return DB::transaction(function () use ($data) {
            $rfq = Rfq::create([
                'rfq_no' => $this->numbers->generate('RFQ', 'rfqs', 'rfq_no'),
                'pr_id' => $data['pr_id'] ?? null,
                'deadline' => $data['deadline'] ?? null,
                'status' => 'draft',
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['lines'] as $line) {
                $rfq->lines()->create([
                    'product_id' => $line['product_id'],
                    'qty' => $line['qty'],
                    'target_price' => $line['target_price'] ?? null,
                ]);
            }

            if (! empty($data['supplier_ids'])) {
                $rfq->suppliers()->attach($data['supplier_ids']);
            }

            return $rfq;
        });
    }

    public function closeRfq(Rfq $rfq): void
    {
        $rfq->update(['status' => 'closed']);
    }

    public function createQuotation(array $data): SupplierQuotation
    {
        return SupplierQuotation::create([
            'quotation_no' => $this->numbers->generate('QUO', 'supplier_quotations', 'quotation_no'),
            'rfq_id' => $data['rfq_id'],
            'rfq_line_id' => $data['rfq_line_id'],
            'supplier_id' => $data['supplier_id'],
            'price' => $data['price'],
            'min_order' => $data['min_order'] ?? null,
            'lead_time_days' => $data['lead_time_days'] ?? null,
            'valid_until' => $data['valid_until'] ?? null,
            'status' => 'draft',
            'notes' => $data['notes'] ?? null,
        ]);
    }

    public function acceptQuotation(SupplierQuotation $quotation): void
    {
        $quotation->update(['status' => 'accepted']);
    }

    public function rejectQuotation(SupplierQuotation $quotation): void
    {
        $quotation->update(['status' => 'rejected']);
    }

    public function createPoFromQuotation(SupplierQuotation $quotation, array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($quotation, $data) {
            $po = PurchaseOrder::create([
                'po_no' => $this->numbers->generate('PO', 'purchase_orders', 'po_no'),
                'supplier_id' => $quotation->supplier_id,
                'quotation_id' => $quotation->id,
                'currency' => $data['currency'] ?? 'IDR',
                'status' => 'pending',
                'payment_term' => $data['payment_term'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            $rfqLine = $quotation->rfqLine;
            $po->lines()->create([
                'product_id' => $rfqLine->product_id,
                'qty' => $rfqLine->qty,
                'qty_received' => 0,
                'price' => $quotation->price,
                'tax' => $data['tax'] ?? 0,
                'discount' => $data['discount'] ?? 0,
                'expected_date' => $data['expected_date'] ?? null,
            ]);

            return $po;
        });
    }

    public function approvePo(PurchaseOrder $po): void
    {
        $po->update(['status' => 'approved']);
    }

    public function rejectPo(PurchaseOrder $po): void
    {
        $po->update(['status' => 'rejected']);
    }

    public function cancelPo(PurchaseOrder $po): void
    {
        if ($po->status !== 'pending' && $po->status !== 'approved') {
            throw new \DomainException('PO tidak bisa dibatalkan.');
        }
        $po->update(['status' => 'cancelled']);
    }
}
