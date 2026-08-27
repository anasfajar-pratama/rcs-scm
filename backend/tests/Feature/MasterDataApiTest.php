<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterDataApiTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::where('email', 'admin@rcsscm.test')->first();
    }

    public function test_login_and_auth_me(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@rcsscm.test',
            'password' => 'password',
        ]);

        $response->assertOk()->assertJsonStructure(['success', 'data' => ['access_token', 'user']]);

        $this->withToken($response->json('data.access_token'))
            ->getJson('/api/v1/auth/me')
            ->assertOk();
    }

    public function test_products_pagination_returns_names(): void
    {
        $products = Product::all();
        $this->assertGreaterThan(0, $products->count());

        $first = Product::with('unit')->orderBy('id')->first();

        $this->actingAs($this->admin)
            ->getJson('/api/v1/products?list=1')
            ->assertOk()
            ->assertJsonPath('data.0.unit_name', $first->unit?->name)
            ->assertJsonStructure(['data' => [['sku', 'name', 'type', 'unit_id', 'category_name']]]);
    }

    public function test_product_detail_has_bom(): void
    {
        $product = Product::where('type', 'finished_good')->first();

        $this->actingAs($this->admin)
            ->getJson("/api/v1/products/{$product->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => ['bom', 'shelf_life_days', 'expiry_required']]);
    }

    public function test_category_create_generates_slug(): void
    {
        $category = $this->actingAs($this->admin)
            ->postJson('/api/v1/categories', ['name' => 'Masker'])
            ->assertCreated();

        $this->assertSame('masker', Category::find($category->json('data.id'))->slug);
    }

    public function test_customer_with_contacts(): void
    {
        $customer = $this->actingAs($this->admin)
            ->postJson('/api/v1/customers', [
                'code' => 'CUS-TEST',
                'name' => 'Toko Sehat',
                'type' => 'retail',
                'contacts' => [
                    ['name' => 'Ani', 'position' => 'Owner', 'is_primary' => true],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame('Toko Sehat', $customer['name']);
        $this->assertCount(1, $customer['contacts']);
    }

    public function test_unauthenticated_is_rejected(): void
    {
        $this->getJson('/api/v1/products')->assertUnauthorized();
    }
}
