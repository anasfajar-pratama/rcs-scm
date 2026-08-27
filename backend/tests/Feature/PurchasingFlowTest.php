<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchasingFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::where('email', 'admin@rcsscm.test')->first();
    }

    public function test_pr_auto_suggest_from_reorder(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/pr/suggestions')
            ->assertOk();

        $data = $response->json('data');
        $this->assertArrayHasKey('expiring', $data);
        $this->assertArrayHasKey('reorder', $data);
    }

    public function test_pr_create_and_approve(): void
    {
        $product = Product::first();

        $response = $this->actingAs($this->admin)
            ->postJson('/api/v1/pr', [
                'department' => 'Production',
                'needed_date' => now()->addDays(7)->toDateString(),
                'lines' => [
                    ['product_id' => $product->id, 'qty' => 10],
                ],
            ])
            ->assertCreated();

        $prId = $response->json('data.id');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/pr/{$prId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');
    }

    public function test_rfq_to_quotation_to_po_flow(): void
    {
        $product = Product::first();
        $supplier = Supplier::first();

        // Create RFQ
        $rfq = $this->actingAs($this->admin)
            ->postJson('/api/v1/rfqs', [
                'deadline' => now()->addDays(5)->toDateString(),
                'lines' => [
                    ['product_id' => $product->id, 'qty' => 10, 'target_price' => 100000],
                ],
                'supplier_ids' => [$supplier->id],
            ])
            ->assertCreated()
            ->json('data');

        // Create quotation
        $quotation = $this->actingAs($this->admin)
            ->postJson('/api/v1/supplier-quotations', [
                'rfq_id' => $rfq['id'],
                'rfq_line_id' => $rfq['lines'][0]['id'],
                'supplier_id' => $supplier->id,
                'price' => 95000,
                'lead_time_days' => 7,
            ])
            ->assertCreated()
            ->json('data');

        // Accept quotation
        $this->actingAs($this->admin)
            ->postJson("/api/v1/supplier-quotations/{$quotation['id']}/accept")
            ->assertOk();

        // Convert to PO
        $po = $this->actingAs($this->admin)
            ->postJson("/api/v1/quotations/{$quotation['id']}/convert-to-po", [
                'currency' => 'IDR',
                'payment_term' => 'Net 30',
            ])
            ->assertCreated()
            ->json('data');

        $this->assertEquals('pending', $po['status']);

        // Approve PO
        $this->actingAs($this->admin)
            ->postJson("/api/v1/pos/{$po['id']}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');
    }

    public function test_receiving_creates_batch_and_increases_stock(): void
    {
        $product = Product::create(['sku' => 'RM-TEST-NEW', 'name' => 'Test Product', 'type' => 'raw_material']);
        $supplier = Supplier::first();
        $warehouse = Warehouse::first();

        // Create PO
        $po = $this->actingAs($this->admin)
            ->postJson('/api/v1/pos', [
                'supplier_id' => $supplier->id,
                'currency' => 'IDR',
                'lines' => [
                    ['product_id' => $product->id, 'qty' => 10, 'price' => 100000],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/pos/{$po['id']}/approve");

        // Create receiving
        $receiving = $this->actingAs($this->admin)
            ->postJson('/api/v1/receivings', [
                'po_id' => $po['id'],
                'warehouse_id' => $warehouse->id,
                'lines' => [
                    [
                        'po_line_id' => $po['lines'][0]['id'],
                        'product_id' => $product->id,
                        'qty_received' => 10,
                        'lot_no' => 'LOT-TEST-001',
                        'mfg_date' => now()->toDateString(),
                        'expiry_date' => now()->addYear()->toDateString(),
                    ],
                ],
            ])
            ->assertCreated()
            ->json('data');

        // Post receiving
        $this->actingAs($this->admin)
            ->postJson("/api/v1/receivings/{$receiving['id']}/post")
            ->assertOk();

        // Verify stock increased
        $stock = \App\Models\Stock::where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->first();

        $this->assertNotNull($stock);
        $this->assertEquals(10, (float) $stock->qty_on_hand);

        // Verify batch created
        $this->assertNotNull($stock->batch_id);
    }

    public function test_purchase_return_decreases_stock(): void
    {
        $this->withoutExceptionHandling();

        $product = Product::create(['sku' => 'RM-TEST-RET', 'name' => 'Test Return Product', 'type' => 'raw_material']);
        $supplier = Supplier::first();
        $warehouse = Warehouse::first();

        // Create and post receiving first
        $po = $this->actingAs($this->admin)
            ->postJson('/api/v1/pos', [
                'supplier_id' => $supplier->id,
                'lines' => [['product_id' => $product->id, 'qty' => 10, 'price' => 100000]],
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->admin)->postJson("/api/v1/pos/{$po['id']}/approve");

        $receiving = $this->actingAs($this->admin)
            ->postJson('/api/v1/receivings', [
                'po_id' => $po['id'],
                'warehouse_id' => $warehouse->id,
                'lines' => [
                    [
                        'po_line_id' => $po['lines'][0]['id'],
                        'product_id' => $product->id,
                        'qty_received' => 10,
                        'lot_no' => 'LOT-RET-001',
                    ],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $postResponse = $this->actingAs($this->admin)->postJson("/api/v1/receivings/{$receiving['id']}/post");
        if ($postResponse->status() !== 200) {
            dump('Receiving post error:', $postResponse->json());
        }
        $postResponse->assertOk();

        // Refresh receiving to get updated batch_id
        $receivingRefreshed = $this->actingAs($this->admin)
            ->getJson("/api/v1/receivings/{$receiving['id']}")
            ->json('data');

        $batchId = $receivingRefreshed['lines'][0]['batch_id'];

        // Create return
        $return = $this->actingAs($this->admin)
            ->postJson('/api/v1/purchase-returns', [
                'receiving_id' => $receiving['id'],
                'supplier_id' => $supplier->id,
                'reason' => 'Produk cacat',
                'lines' => [
                    ['product_id' => $product->id, 'batch_id' => $batchId, 'qty' => 3, 'reason' => 'Cacat'],
                ],
            ])
            ->assertCreated()
            ->json('data');

        // Post return
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/purchase-returns/{$return['id']}/post");

        if ($response->status() !== 200) {
            dump('Return post error:', $response->json());
        }

        $response->assertOk();

        // Verify stock decreased
        $stock = \App\Models\Stock::where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->where('batch_id', $batchId)
            ->first();

        $this->assertEquals(7, (float) $stock->qty_on_hand);
    }
}
