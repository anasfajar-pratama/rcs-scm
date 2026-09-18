<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\SalesQuotation;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\DocumentNumberService;
use App\Services\SalesService;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('email', 'admin@rcsscm.test')->first();
        $warehouse = Warehouse::where('code', 'WH-CBD')->first();
        $serum = Product::where('sku', 'FG-SERUM-01')->first();
        $toner = Product::where('sku', 'FG-TONER-01')->first();

        if (! $user || ! $warehouse || ! $serum || ! $toner) {
            return;
        }

        $numbers = app(DocumentNumberService::class);

        // --- Leads ---
        $leads = [
            ['name' => 'Rina Beauty Clinic', 'company' => 'Rina Clinic', 'email' => 'rina@clinic.id', 'phone' => '0812-1111-0001', 'source' => 'social_media', 'status' => 'new'],
            ['name' => 'Toko Kosmetik Halim', 'company' => 'Halim Store', 'email' => 'halim@store.id', 'source' => 'walk_in', 'status' => 'contacted'],
            ['name' => 'Dina Distribusi', 'company' => 'PT Dina Distribusi', 'email' => 'dina@distribusi.id', 'phone' => '0812-1111-0002', 'source' => 'referral', 'status' => 'qualified'],
        ];
        foreach ($leads as $l) {
            if (Lead::where('email', $l['email'])->exists()) {
                continue;
            }
            Lead::create([
                'code' => $numbers->generate('LEAD', 'leads', 'code'),
                'name' => $l['name'],
                'company' => $l['company'],
                'email' => $l['email'],
                'phone' => $l['phone'] ?? null,
                'source' => $l['source'],
                'status' => $l['status'],
                'created_by' => $user->id,
            ]);
        }

        // --- Customers (if not exists from previous runs) ---
        $customers = Customer::all();
        $customer = $customers->first();

        // --- Opportunities ---
        if (Opportunity::count() === 0 && $customer) {
            $opp = Opportunity::create([
                'code' => $numbers->generate('OPP', 'opportunities', 'code'),
                'customer_id' => $customer->id,
                'title' => 'Program Distribusi Serum Q3',
                'stage' => 'negotiation',
                'expected_value' => 5000000,
                'probability' => 70,
                'expected_close_date' => now()->addDays(14)->toDateString(),
                'notes' => 'Diskusi lanjutan dengan tim purchasing.',
                'created_by' => $user->id,
            ]);
            $opp->lines()->create(['product_id' => $serum->id, 'qty' => 40, 'unit_price' => 125000]);
            $opp->lines()->create(['product_id' => $toner->id, 'qty' => 20, 'unit_price' => 85000]);

            $opp2 = Opportunity::create([
                'code' => $numbers->generate('OPP', 'opportunities', 'code'),
                'customer_id' => $customer->id,
                'title' => 'Trial Order Toko Baru',
                'stage' => 'proposal',
                'expected_value' => 1250000,
                'probability' => 40,
                'expected_close_date' => now()->addDays(30)->toDateString(),
                'created_by' => $user->id,
            ]);
            $opp2->lines()->create(['product_id' => $serum->id, 'qty' => 10, 'unit_price' => 125000]);
        }

        // --- Activities ---
        if (Activity::count() === 0) {
            Activity::create([
                'subject' => 'Follow up proposal ke Beauty Store',
                'type' => 'call',
                'due_date' => now()->addDays(1)->toDateString(),
                'status' => 'open',
                'priority' => 'high',
                'related_type' => 'customer',
                'related_id' => $customer?->id,
                'created_by' => $user->id,
            ]);
            Activity::create([
                'subject' => 'Kirim sample serum ke lead Rina',
                'type' => 'task',
                'due_date' => now()->addDays(3)->toDateString(),
                'status' => 'open',
                'priority' => 'medium',
                'created_by' => $user->id,
            ]);
        }

        // --- Sales Quotation + SO (reference data for reports) ---
        if (SalesQuotation::count() === 0 && $customer) {
            $salesService = app(SalesService::class);

            $quotation = $salesService->createQuotation([
                'customer_id' => $customer->id,
                'quotation_date' => now()->subDays(7)->toDateString(),
                'valid_until' => now()->addDays(7)->toDateString(),
                'notes' => 'Penawaran awal.',
                'lines' => [
                    ['product_id' => $serum->id, 'qty' => 5, 'unit_price' => 125000],
                    ['product_id' => $toner->id, 'qty' => 5, 'unit_price' => 85000],
                ],
            ]);
            $salesService->sendQuotation($quotation);
            $salesService->acceptQuotation($quotation);

            $so = $salesService->createSoFromQuotation($quotation, [
                'warehouse_id' => $warehouse->id,
                'order_date' => now()->subDays(2)->toDateString(),
            ]);

            // Approve SO -> reserve stock (FEFO)
            try {
                $salesService->approveSo($so);
            } catch (\DomainException $e) {
                // insufficient stock — leave pending so UAT can see the flow
            }

            // A rejected SO example
            $so2 = SalesOrder::create([
                'so_no' => $numbers->generate('SO', 'sales_orders', 'so_no'),
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouse->id,
                'order_date' => now()->subDays(5)->toDateString(),
                'status' => 'rejected',
                'notes' => 'Contoh SO ditolak.',
                'created_by' => $user->id,
            ]);
            $so2->lines()->create(['product_id' => $serum->id, 'qty' => 3, 'unit_price' => 125000, 'qty_shipped' => 0]);
        }
    }
}
