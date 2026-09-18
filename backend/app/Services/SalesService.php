<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Reservation;
use App\Models\SalesOrder;
use App\Models\SalesQuotation;
use Illuminate\Support\Facades\DB;

class SalesService
{
    public function __construct(
        private DocumentNumberService $numbers,
        private StockService $stockService,
    ) {
    }

    public function createLead(array $data): Lead
    {
        return DB::transaction(function () use ($data) {
            return Lead::create([
                'code' => $this->numbers->generate('LEAD', 'leads', 'code'),
                'name' => $data['name'],
                'company' => $data['company'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'source' => $data['source'] ?? 'walk_in',
                'status' => 'new',
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);
        });
    }

    public function updateLeadStatus(Lead $lead, string $status): void
    {
        $lead->update(['status' => $status]);
    }

    public function convertLeadToCustomer(Lead $lead, array $data): Customer
    {
        return DB::transaction(function () use ($lead, $data) {
            $customer = Customer::create([
                'code' => $this->numbers->generate('CUS', 'customers', 'code'),
                'name' => $data['name'] ?? $lead->name,
                'type' => $data['type'] ?? 'b2b',
                'email' => $data['email'] ?? $lead->email,
                'phone' => $data['phone'] ?? $lead->phone,
                'is_active' => true,
            ]);

            $lead->update(['status' => 'converted']);

            return $customer;
        });
    }

    public function createOpportunity(array $data): Opportunity
    {
        return DB::transaction(function () use ($data) {
            $lines = $data['lines'] ?? [];
            $expectedValue = collect($lines)->sum(fn ($line) => $line['qty'] * $line['unit_price']);

            $opportunity = Opportunity::create([
                'code' => $this->numbers->generate('OPP', 'opportunities', 'code'),
                'customer_id' => $data['customer_id'],
                'title' => $data['title'],
                'stage' => $data['stage'] ?? 'prospecting',
                'expected_value' => $expectedValue,
                'probability' => $data['probability'] ?? 10,
                'expected_close_date' => $data['expected_close_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($lines as $line) {
                $opportunity->lines()->create([
                    'product_id' => $line['product_id'],
                    'qty' => $line['qty'],
                    'unit_price' => $line['unit_price'],
                    'discount_percent' => $line['discount_percent'] ?? 0,
                ]);
            }

            return $opportunity;
        });
    }

    public function moveOpportunityStage(Opportunity $opportunity, string $stage): void
    {
        $opportunity->update(['stage' => $stage]);
    }

    public function createQuotation(array $data): SalesQuotation
    {
        return DB::transaction(function () use ($data) {
            $quotation = SalesQuotation::create([
                'quotation_no' => $this->numbers->generate('SQ', 'sales_quotations', 'quotation_no'),
                'customer_id' => $data['customer_id'],
                'quotation_date' => $data['quotation_date'] ?? now()->toDateString(),
                'valid_until' => $data['valid_until'] ?? null,
                'currency' => $data['currency'] ?? 'IDR',
                'status' => 'draft',
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['lines'] as $line) {
                $quotation->lines()->create([
                    'product_id' => $line['product_id'],
                    'qty' => $line['qty'],
                    'unit_price' => $line['unit_price'],
                    'discount_percent' => $line['discount_percent'] ?? 0,
                ]);
            }

            return $quotation;
        });
    }

    public function sendQuotation(SalesQuotation $quotation): void
    {
        $quotation->update(['status' => 'sent']);
    }

    public function acceptQuotation(SalesQuotation $quotation): void
    {
        $quotation->update(['status' => 'accepted']);
    }

    public function rejectQuotation(SalesQuotation $quotation): void
    {
        $quotation->update(['status' => 'rejected']);
    }

    public function createSoFromQuotation(SalesQuotation $quotation, array $data): SalesOrder
    {
        return DB::transaction(function () use ($quotation, $data) {
            $so = SalesOrder::create([
                'so_no' => $this->numbers->generate('SO', 'sales_orders', 'so_no'),
                'sales_quotation_id' => $quotation->id,
                'customer_id' => $quotation->customer_id,
                'warehouse_id' => $data['warehouse_id'],
                'order_date' => $data['order_date'] ?? now()->toDateString(),
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($quotation->lines as $line) {
                $so->lines()->create([
                    'product_id' => $line->product_id,
                    'qty' => $line->qty,
                    'unit_price' => $line->unit_price,
                    'discount_percent' => $line->discount_percent,
                    'qty_shipped' => 0,
                ]);
            }

            $quotation->update(['status' => 'converted']);

            return $so;
        });
    }

    /**
     * Approve SO: create a polymorphic reservation (reservable = SalesOrder)
     * and reserve stock by FEFO in the same transaction.
     */
    public function approveSo(SalesOrder $so): void
    {
        DB::transaction(function () use ($so) {
            $reservation = Reservation::create([
                'reservation_no' => $this->numbers->generate('RES', 'reservations', 'reservation_no'),
                'warehouse_id' => $so->warehouse_id,
                'reservable_type' => SalesOrder::class,
                'reservable_id' => $so->id,
                'status' => 'reserved',
                'reserved_date' => now()->toDateString(),
                'created_by' => auth()->id(),
            ]);

            foreach ($so->lines as $line) {
                $allocated = $this->stockService->reserve(
                    $so->warehouse_id,
                    $line->product_id,
                    (float) $line->qty,
                    $reservation->reservation_no,
                    $reservation->id,
                );

                $first = $allocated[0] ?? null;

                $reservation->lines()->create([
                    'product_id' => $line->product_id,
                    'batch_id' => $first['batch_id'] ?? null,
                    'quantity' => $line->qty,
                    'quantity_shipped' => 0,
                ]);
            }

            $so->update(['status' => 'approved']);
        });
    }

    public function rejectSo(SalesOrder $so): void
    {
        $so->update(['status' => 'rejected']);
    }

    public function cancelSo(SalesOrder $so): void
    {
        DB::transaction(function () use ($so) {
            foreach ($so->reservations as $reservation) {
                if ($reservation->status === 'reserved' || $reservation->status === 'partially_shipped') {
                    $this->stockService->release($reservation);
                    $reservation->update(['status' => 'released']);
                }
            }

            $so->update(['status' => 'cancelled']);
        });
    }
}
