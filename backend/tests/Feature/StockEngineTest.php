<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockEngineTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected StockService $stockService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::where('email', 'admin@rcsscm.test')->first();
        $this->stockService = app(StockService::class);
    }

    public function test_increase_creates_stock_and_movement(): void
    {
        $product = Product::first();
        $wh = Warehouse::first();

        $stock = $this->stockService->increase($wh->id, $product->id, null, 100, 'receiving');

        $this->assertSame(100.0, (float) $stock->qty_on_hand);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'warehouse_id' => $wh->id,
            'type' => 'receiving',
            'quantity' => 100,
        ]);
    }

    public function test_decrease_without_stock_throws(): void
    {
        $product = Product::first();
        $wh = Warehouse::first();

        $this->expectException(\DomainException::class);
        $this->stockService->decrease($wh->id, $product->id, null, 99999, 'issue');
    }

    public function test_transfer_flow_moves_stock(): void
    {
        $wh1 = Warehouse::where('code', 'WH-CBD')->first();
        $wh2 = Warehouse::where('code', 'WH-2')->first();
        $product = Product::create([
            'sku' => 'RM-TEST-X',
            'name' => 'Bahan Test Transfer',
            'type' => 'raw_material',
            'track_batch' => false,
            'expiry_required' => false,
        ]);

        $stock = $this->stockService->increase($wh1->id, $product->id, null, 300, 'receiving');
        $this->assertSame(300.0, (float) $stock->qty_on_hand);

        // transfer via API
        $transfer = $this->actingAs($this->admin)->postJson('/api/v1/transfers', [
            'from_warehouse_id' => $wh1->id,
            'to_warehouse_id' => $wh2->id,
            'lines' => [['product_id' => $product->id, 'quantity' => 120]],
        ])->assertCreated()->json('data');

        // approve
        $this->actingAs($this->admin)->postJson("/api/v1/transfers/{$transfer['id']}/approve");
        // transit: debits source
        $this->actingAs($this->admin)->postJson("/api/v1/transfers/{$transfer['id']}/transit")->assertOk();

        $this->assertSame(180.0, (float) Stock::where('warehouse_id', $wh1->id)->where('product_id', $product->id)->value('qty_on_hand'));

        // receive: credits destination
        $this->actingAs($this->admin)->postJson("/api/v1/transfers/{$transfer['id']}/receive")->assertOk();

        $this->assertSame(120.0, (float) Stock::where('warehouse_id', $wh2->id)->where('product_id', $product->id)->value('qty_on_hand'));
    }

    public function test_reserve_uses_fefo_and_updates_reserved(): void
    {
        $wh = Warehouse::where('code', 'WH-CBD')->first();
        $product = Product::where('sku', 'FG-SERUM-01')->first();

        $early = Batch::where('product_id', $product->id)->orderBy('expiry_date', 'asc')->first();
        $stock = Stock::where('product_id', $product->id)->where('batch_id', $early->id)->first();

        $allocations = $this->stockService->reserve($wh->id, $product->id, 30, 'RES-TEST');

        $this->assertNotEmpty($allocations);
        $this->assertSame(30.0, (float) Stock::where('batch_id', $early->id)->where('product_id', $product->id)->value('qty_reserved'));
        $this->assertSame($early->id, $allocations[0]['batch_id']);
    }

    public function test_stocks_endpoint_returns_data(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/v1/stocks')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['pagination']]);
    }

    public function test_stocks_alerts_returns_categories(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/v1/stocks/alerts')->assertOk();
        $this->assertArrayHasKey('expiring', $response->json('data'));
        $this->assertArrayHasKey('reorder', $response->json('data'));
    }
}
