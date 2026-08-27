<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequisition;
use App\Models\Rfq;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class PurchasingSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('email', 'admin@rcsscm.test')->first();
        $supplier = Supplier::where('code', 'SUP-001')->first();
        $vitC = Product::where('sku', 'RM-VITC-01')->first();
        $wh = Warehouse::where('code', 'WH-CBD')->first();

        if (! $user || ! $supplier || ! $vitC || ! $wh) {
            return;
        }

        // Create a sample PR
        $pr = PurchaseRequisition::create([
            'pr_no' => 'PR-20260827-00001',
            'requested_by' => $user->id,
            'department' => 'Production',
            'needed_date' => now()->addDays(7)->toDateString(),
            'status' => 'approved',
            'notes' => 'Kebutuhan produksi minggu depan',
        ]);

        $pr->lines()->create([
            'product_id' => $vitC->id,
            'qty' => 20,
            'preferred_supplier_id' => $supplier->id,
            'estimated_price' => 150000,
            'note' => 'Vitamin C untuk produksi serum',
        ]);

        // Create a sample RFQ
        $rfq = Rfq::create([
            'rfq_no' => 'RFQ-20260827-00001',
            'pr_id' => $pr->id,
            'deadline' => now()->addDays(5)->toDateString(),
            'status' => 'closed',
            'notes' => 'RFQ untuk Vitamin C',
            'created_by' => $user->id,
        ]);

        $rfqLine = $rfq->lines()->create([
            'product_id' => $vitC->id,
            'qty' => 20,
            'target_price' => 145000,
        ]);

        $rfq->suppliers()->attach([$supplier->id]);

        // Create a sample PO
        $po = PurchaseOrder::create([
            'po_no' => 'PO-20260827-00001',
            'supplier_id' => $supplier->id,
            'currency' => 'IDR',
            'status' => 'approved',
            'payment_term' => 'Net 30',
            'notes' => 'PO dari RFQ',
            'created_by' => $user->id,
        ]);

        $poLine = $po->lines()->create([
            'product_id' => $vitC->id,
            'qty' => 20,
            'qty_received' => 0,
            'price' => 148000,
            'tax' => 11,
            'discount' => 0,
            'expected_date' => now()->addDays(10)->toDateString(),
        ]);
    }
}
