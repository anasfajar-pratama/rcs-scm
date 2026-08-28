<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\Stock;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::where('email', 'admin@rcsscm.test')->first();
    }

    public function test_lead_create_update_status_and_convert(): void
    {
        $lead = $this->actingAs($this->admin)
            ->postJson('/api/v1/leads', [
                'name' => 'Dina Marketing',
                'company' => 'PT Dina Cosmetics',
                'email' => 'dina@example.com',
                'source' => 'referral',
            ])
            ->assertCreated()
            ->json('data');

        $this->assertEquals('new', $lead['status']);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/leads/{$lead['id']}/status", ['status' => 'contacted'])
            ->assertOk()
            ->assertJsonPath('data.status', 'contacted');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/leads/{$lead['id']}/status", ['status' => 'qualified'])
            ->assertOk();

        $converted = $this->actingAs($this->admin)
            ->postJson("/api/v1/leads/{$lead['id']}/convert", ['type' => 'b2b'])
            ->assertCreated()
            ->json('data');

        $this->assertArrayHasKey('id', $converted);
        $this->assertEquals('Dina Marketing', $converted['name']);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/leads/{$lead['id']}")
            ->assertOk()
            ->assertJsonPath('data.status', 'converted');
    }

    public function test_opportunity_create_and_stage_move(): void
    {
        $customer = Customer::first();
        $product = Product::first();

        $opportunity = $this->actingAs($this->admin)
            ->postJson('/api/v1/opportunities', [
                'customer_id' => $customer->id,
                'title' => 'Deal Distributor Q4',
                'probability' => 30,
                'lines' => [
                    ['product_id' => $product->id, 'qty' => 10, 'unit_price' => 125000],
                    ['product_id' => $product->id, 'qty' => 5, 'unit_price' => 100000],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->assertEquals('prospecting', $opportunity['stage']);
        $this->assertEquals(1750000, (float) $opportunity['expected_value']);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/opportunities/{$opportunity['id']}/stage", ['stage' => 'negotiation'])
            ->assertOk()
            ->assertJsonPath('data.stage', 'negotiation');
    }

    public function test_activity_crud_and_done(): void
    {
        $customer = Customer::first();

        $activity = $this->actingAs($this->admin)
            ->postJson('/api/v1/activities', [
                'subject' => 'Follow up proposal',
                'type' => 'call',
                'priority' => 'high',
                'related_type' => 'customer',
                'related_id' => $customer->id,
            ])
            ->assertCreated()
            ->json('data');

        $this->assertEquals('open', $activity['status']);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/activities/{$activity['id']}/done")
            ->assertOk()
            ->assertJsonPath('data.status', 'done');

        $this->actingAs($this->admin)
            ->getJson('/api/v1/activities?status=done')
            ->assertOk()
            ->assertJsonPath('data.0.subject', 'Follow up proposal');
    }

    public function test_quotation_to_sales_order_flow(): void
    {
        $customer = Customer::first();
        $product = Product::first();
        $warehouse = Warehouse::first();

        $quotation = $this->actingAs($this->admin)
            ->postJson('/api/v1/sales-quotations', [
                'customer_id' => $customer->id,
                'valid_until' => now()->addDays(14)->toDateString(),
                'lines' => [
                    ['product_id' => $product->id, 'qty' => 10, 'unit_price' => 125000],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->assertEquals('draft', $quotation['status']);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/sales-quotations/{$quotation['id']}/send")
            ->assertOk()
            ->assertJsonPath('data.status', 'sent');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/sales-quotations/{$quotation['id']}/accept")
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted');

        $so = $this->actingAs($this->admin)
            ->postJson("/api/v1/sales-quotations/{$quotation['id']}/convert-to-so", [
                'warehouse_id' => $warehouse->id,
            ])
            ->assertCreated()
            ->json('data');

        $this->assertEquals('pending', $so['status']);

        // Approve -> should create reservation and reserve stock
        $this->actingAs($this->admin)
            ->postJson("/api/v1/sales-orders/{$so['id']}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $soModel = SalesOrder::with('reservations.lines')->find($so['id']);
        $this->assertNotNull($soModel->reservations);
        $this->assertEquals('reserved', $soModel->reservations->first()->status);
        $this->assertSame(SalesOrder::class, $soModel->reservations->first()->reservable_type);
        $this->assertEquals($so['id'], $soModel->reservations->first()->reservable_id);

        $stock = Stock::where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->where('batch_id', $soModel->reservations->first()->lines->first()->batch_id)
            ->first();

        $this->assertNotNull($stock);
        $this->assertEquals(10, (float) $stock->qty_reserved);
    }

    public function test_so_approve_fails_when_stock_insufficient(): void
    {
        $customer = Customer::first();
        $product = Product::first();
        $warehouse = Warehouse::first();

        $so = $this->actingAs($this->admin)
            ->postJson('/api/v1/sales-orders', [
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouse->id,
                'lines' => [
                    ['product_id' => $product->id, 'qty' => 99999, 'unit_price' => 125000],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/sales-orders/{$so['id']}/approve")
            ->assertStatus(422);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/sales-orders/{$so['id']}")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_so_cancel_releases_reservation(): void
    {
        $customer = Customer::first();
        $product = Product::first();
        $warehouse = Warehouse::first();

        $so = $this->actingAs($this->admin)
            ->postJson('/api/v1/sales-orders', [
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouse->id,
                'lines' => [
                    ['product_id' => $product->id, 'qty' => 10, 'unit_price' => 125000],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/sales-orders/{$so['id']}/approve")
            ->assertOk();

        $stockBefore = Stock::where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->whereRaw('qty_reserved > 0')
            ->first();
        $this->assertNotNull($stockBefore);
        $this->assertEquals(10, (float) $stockBefore->qty_reserved);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/sales-orders/{$so['id']}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $stockAfter = Stock::where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->where('batch_id', $stockBefore->batch_id)
            ->first();

        $this->assertEquals(0, (float) $stockAfter->qty_reserved);
    }

    public function test_so_fulfill_decreases_stock_and_marks_fulfilled(): void
    {
        $customer = Customer::first();
        $product = Product::first();
        $warehouse = Warehouse::first();

        $so = $this->actingAs($this->admin)
            ->postJson('/api/v1/sales-orders', [
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouse->id,
                'lines' => [
                    ['product_id' => $product->id, 'qty' => 5, 'unit_price' => 125000],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/sales-orders/{$so['id']}/approve")
            ->assertOk();

        $stockBefore = Stock::where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->whereRaw('qty_reserved > 0')
            ->first();
        $this->assertNotNull($stockBefore);
        $qtyOnHandBefore = (float) $stockBefore->qty_on_hand;

        $this->actingAs($this->admin)
            ->postJson("/api/v1/sales-orders/{$so['id']}/fulfill")
            ->assertOk()
            ->assertJsonPath('data.status', 'fulfilled');

        $stockAfter = Stock::where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->where('batch_id', $stockBefore->batch_id)
            ->first();

        $this->assertEquals($qtyOnHandBefore - 5, (float) $stockAfter->qty_on_hand);
        $this->assertEquals(0, (float) $stockAfter->qty_reserved);
    }
}
