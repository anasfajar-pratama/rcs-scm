<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::where('email', 'admin@rcsscm.test')->first();
    }

    public function test_dashboard_summary_returns_kpis(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/dashboard/summary')
            ->assertOk();

        $kpi = $response->json('data.kpi');
        $this->assertArrayHasKey('stock_items', $kpi);
        $this->assertArrayHasKey('stock_value', $kpi);
        $this->assertArrayHasKey('po_open', $kpi);
        $this->assertArrayHasKey('so_open', $kpi);
        $this->assertArrayHasKey('pipeline_value', $kpi);
        $this->assertArrayHasKey('alerts', $response->json('data'));
        $this->assertArrayHasKey('expiring', $response->json('data.alerts'));
        $this->assertArrayHasKey('reorder', $response->json('data.alerts'));
    }

    public function test_report_inventory_returns_rows(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/v1/reports/inventory')
            ->assertOk()
            ->assertJsonStructure(['data' => ['rows', 'total_value']]);
    }

    public function test_report_sales_and_purchasing(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/v1/reports/sales')
            ->assertOk()
            ->assertJsonStructure(['data' => ['rows', 'total_value']]);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/reports/purchasing')
            ->assertOk()
            ->assertJsonStructure(['data' => ['rows', 'total_value']]);
    }

    public function test_report_production_and_pipeline(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/v1/reports/production')
            ->assertOk()
            ->assertJsonStructure(['data' => ['rows']]);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/reports/pipeline')
            ->assertOk()
            ->assertJsonStructure(['data' => ['rows']]);
    }
}
