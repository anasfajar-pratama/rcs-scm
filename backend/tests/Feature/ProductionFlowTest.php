<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductionFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::where('email', 'admin@rcsscm.test')->first();
    }

    public function test_production_order_auto_bom_and_flow(): void
    {
        $serum = Product::where('sku', 'FG-SERUM-01')->first();
        $warehouse = Warehouse::where('code', 'WH-CBD')->first();
        $this->assertNotNull($serum);

        $stockBefore = Stock::where('warehouse_id', $warehouse->id)
            ->where('product_id', $serum->id)
            ->first();
        $this->assertNotNull($stockBefore);

        // Create MO with qty 1 -> BOM (VitC 5/unit, Aqua 70/unit, Bottle 1/unit)
        $mo = $this->actingAs($this->admin)
            ->postJson('/api/v1/production-orders', [
                'product_id' => $serum->id,
                'planned_qty' => 1,
                'warehouse_id' => $warehouse->id,
            ])
            ->assertCreated()
            ->json('data');

        $this->assertEquals('draft', $mo['status']);
        $this->assertCount(3, $mo['lines']);
        $this->assertEquals(5, (float) collect($mo['lines'])->firstWhere('component_id', Product::where('sku', 'RM-VITC-01')->first()->id)['planned_qty']);

        // Start -> issue material
        $this->actingAs($this->admin)
            ->postJson("/api/v1/production-orders/{$mo['id']}/start")
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        // Complete -> output finished good batch
        $completed = $this->actingAs($this->admin)
            ->postJson("/api/v1/production-orders/{$mo['id']}/complete", [
                'produced_qty' => 1,
                'lot_no' => 'LOT-PROD-TEST',
            ])
            ->assertCreated()
            ->json('data');

        $this->assertEquals('completed', $completed['status']);
        $this->assertEquals('LOT-PROD-TEST', $completed['production_batches'][0]['lot_no'] ?? $completed['production_batches'][0]['batch']['lot_no']);

        // Verify stock increased for finished good
        $stockAfter = Stock::where('warehouse_id', $warehouse->id)
            ->where('product_id', $serum->id)
            ->where('batch_id', $completed['production_batches'][0]['batch_id'])
            ->first();

        $this->assertNotNull($stockAfter);
        $this->assertEquals(1, (float) $stockAfter->qty_on_hand);
    }

    public function test_production_start_fails_when_material_insufficient(): void
    {
        $serum = Product::where('sku', 'FG-SERUM-01')->first();
        $warehouse = Warehouse::where('code', 'WH-CBD')->first();

        $mo = $this->actingAs($this->admin)
            ->postJson('/api/v1/production-orders', [
                'product_id' => $serum->id,
                'planned_qty' => 99999,
                'warehouse_id' => $warehouse->id,
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/production-orders/{$mo['id']}/start")
            ->assertStatus(422);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/production-orders/{$mo['id']}")
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');
    }

    public function test_production_cancel_restores_material(): void
    {
        $serum = Product::where('sku', 'FG-SERUM-01')->first();
        $vitC = Product::where('sku', 'RM-VITC-01')->first();
        $warehouse = Warehouse::where('code', 'WH-CBD')->first();

        $vitCStockBefore = Stock::where('warehouse_id', $warehouse->id)
            ->where('product_id', $vitC->id)
            ->first();
        $this->assertNotNull($vitCStockBefore);

        $mo = $this->actingAs($this->admin)
            ->postJson('/api/v1/production-orders', [
                'product_id' => $serum->id,
                'planned_qty' => 1,
                'warehouse_id' => $warehouse->id,
            ])
            ->assertCreated()
            ->json('data');

        // Start issues material
        $this->actingAs($this->admin)
            ->postJson("/api/v1/production-orders/{$mo['id']}/start")
            ->assertOk();

        $vitCStockAfterStart = Stock::where('warehouse_id', $warehouse->id)
            ->where('product_id', $vitC->id)
            ->first();
        $this->assertEquals((float) $vitCStockBefore->qty_on_hand - 5, (float) $vitCStockAfterStart->qty_on_hand);

        // Cancel restores material
        $this->actingAs($this->admin)
            ->postJson("/api/v1/production-orders/{$mo['id']}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $vitCStockAfterCancel = Stock::where('warehouse_id', $warehouse->id)
            ->where('product_id', $vitC->id)
            ->get();
        $this->assertEquals((float) $vitCStockBefore->qty_on_hand, (float) $vitCStockAfterCancel->sum('qty_on_hand'));
    }
}
