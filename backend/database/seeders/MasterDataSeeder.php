<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\PriceList;
use App\Models\PriceListLine;
use App\Models\Product;
use App\Models\ProductBom;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // Units
        $units = [
            ['name' => 'Pcs', 'code' => 'PCS'],
            ['name' => 'Botol', 'code' => 'BTL'],
            ['name' => 'Gram', 'code' => 'G'],
            ['name' => 'Mililiter', 'code' => 'ML'],
            ['name' => 'Tube', 'code' => 'TUBE'],
        ];
        foreach ($units as $u) {
            Unit::firstOrCreate(['code' => $u['code']], $u);
        }

        // Brands
        $brands = [
            ['name' => 'RCS Beauty', 'code' => 'RCSB'],
            ['name' => 'Natura', 'code' => 'NAT'],
        ];
        foreach ($brands as $b) {
            Brand::firstOrCreate(['code' => $b['code']], $b);
        }

        // Categories
        $categories = [
            ['name' => 'Skincare', 'slug' => 'skincare'],
            ['name' => 'Bahan Baku', 'slug' => 'bahan-baku'],
            ['name' => 'Kemasan', 'slug' => 'kemasan'],
        ];
        foreach ($categories as $c) {
            Category::firstOrCreate(['slug' => $c['slug']], $c);
        }

        $unitPcs = Unit::where('code', 'PCS')->first();
        $unitMl = Unit::where('code', 'ML')->first();
        $unitG = Unit::where('code', 'G')->first();
        $unitBotol = Unit::where('code', 'BTL')->first();
        $brandRcs = Brand::where('code', 'RCSB')->first();
        $catSkincare = Category::where('slug', 'skincare')->first();
        $catBahan = Category::where('slug', 'bahan-baku')->first();
        $catKemasan = Category::where('slug', 'kemasan')->first();

        // Finished goods
        $serum = Product::firstOrCreate(['sku' => 'FG-SERUM-01'], [
            'name' => 'Serum Vitamin C',
            'type' => 'finished_good',
            'category_id' => $catSkincare?->id,
            'brand_id' => $brandRcs?->id,
            'unit_id' => $unitBotol?->id,
            'cost' => 45000,
            'sale_price' => 125000,
            'track_batch' => true,
            'expiry_required' => true,
            'shelf_life_days' => 540,
            'reorder_point' => 50,
            'reorder_quantity' => 200,
            'safety_stock' => 20,
        ]);

        $toner = Product::firstOrCreate(['sku' => 'FG-TONER-01'], [
            'name' => 'Toner Hydrating',
            'type' => 'finished_good',
            'category_id' => $catSkincare?->id,
            'brand_id' => $brandRcs?->id,
            'unit_id' => $unitBotol?->id,
            'cost' => 30000,
            'sale_price' => 85000,
            'track_batch' => true,
            'expiry_required' => true,
            'shelf_life_days' => 730,
            'reorder_point' => 40,
            'reorder_quantity' => 150,
            'safety_stock' => 10,
        ]);

        // Raw materials
        $vitC = Product::firstOrCreate(['sku' => 'RM-VITC-01'], [
            'name' => 'Vitamin C Powder',
            'type' => 'raw_material',
            'category_id' => $catBahan?->id,
            'unit_id' => $unitG?->id,
            'cost' => 150000,
            'sale_price' => 0,
            'track_batch' => true,
            'expiry_required' => true,
            'shelf_life_days' => 365,
            'reorder_point' => 5,
            'reorder_quantity' => 20,
            'safety_stock' => 2,
        ]);

        $aqua = Product::firstOrCreate(['sku' => 'RM-AQUA-01'], [
            'name' => 'Aqua Purified',
            'type' => 'raw_material',
            'category_id' => $catBahan?->id,
            'unit_id' => $unitMl?->id,
            'cost' => 5000,
            'sale_price' => 0,
            'track_batch' => false,
            'expiry_required' => false,
        ]);

        $bottle = Product::firstOrCreate(['sku' => 'PKG-BTL-30'], [
            'name' => 'Botol 30ml',
            'type' => 'raw_material',
            'category_id' => $catKemasan?->id,
            'unit_id' => $unitPcs?->id,
            'cost' => 8000,
            'sale_price' => 0,
            'track_batch' => false,
            'expiry_required' => false,
        ]);

        // BOM for Serum
        ProductBom::firstOrCreate(
            ['product_id' => $serum->id, 'component_id' => $vitC->id],
            ['quantity' => 5],
        );
        ProductBom::firstOrCreate(
            ['product_id' => $serum->id, 'component_id' => $aqua->id],
            ['quantity' => 70],
        );
        ProductBom::firstOrCreate(
            ['product_id' => $serum->id, 'component_id' => $bottle->id],
            ['quantity' => 1],
        );

        // Warehouses
        $wh1 = Warehouse::firstOrCreate(['code' => 'WH-CBD'], [
            'name' => 'Gudang Utama',
            'address' => 'Jakarta',
        ]);
        $wh1->locations()->firstOrCreate(['name' => 'Rak A'], ['code' => 'A']);
        $wh1->locations()->firstOrCreate(['name' => 'Rak B'], ['code' => 'B']);

        Warehouse::firstOrCreate(['code' => 'WH-2'], [
            'name' => 'Gudang Bandung',
            'address' => 'Bandung',
        ]);

        // Price lists
        $listDefault = PriceList::firstOrCreate(['name' => 'Harga Default', 'type' => 'default']);
        PriceListLine::firstOrCreate(['price_list_id' => $listDefault->id, 'product_id' => $serum->id], ['price' => 125000]);
        PriceListLine::firstOrCreate(['price_list_id' => $listDefault->id, 'product_id' => $toner->id], ['price' => 85000]);

        $listDist = PriceList::firstOrCreate(['name' => 'Harga Distributor', 'type' => 'customer_group']);
        PriceListLine::firstOrCreate(['price_list_id' => $listDist->id, 'product_id' => $serum->id], ['price' => 95000]);
        PriceListLine::firstOrCreate(['price_list_id' => $listDist->id, 'product_id' => $toner->id], ['price' => 65000]);

        // Suppliers
        Supplier::firstOrCreate(['code' => 'SUP-001'], [
            'name' => 'PT Kimia Nusantara',
            'email' => 'sales@kimianusantara.co.id',
            'phone' => '021-5551234',
            'payment_terms' => '30 hari',
            'currency' => 'IDR',
        ]);
        Supplier::firstOrCreate(['code' => 'SUP-002'], [
            'name' => 'PT Pakindo',
            'email' => 'order@pakindo.co.id',
            'phone' => '022-5554321',
            'payment_terms' => 'Net 30',
            'currency' => 'IDR',
        ]);

        // Customers
        $c = Customer::firstOrCreate(['code' => 'CUS-001'], [
            'name' => 'Beauty Store Jakarta',
            'type' => 'b2b',
            'default_price_list_id' => $listDist->id,
            'email' => 'buyer@beautystore.id',
            'phone' => '0812-0001-0001',
            'credit_limit' => 50000000,
            'billing_address' => 'Jl. Sudirman No.1, Jakarta',
            'is_active' => true,
        ]);
        $c->contacts()->firstOrCreate(['name' => 'Budi Santoso', 'email' => 'budi@beautystore.id', 'position' => 'Purchasing'], ['is_primary' => true]);

        Customer::firstOrCreate(['code' => 'CUS-002'], [
            'name' => 'Distributor Cirebon',
            'type' => 'distributor',
            'email' => 'admin@dist.cirebon.id',
            'phone' => '0812-0002-0002',
            'is_active' => true,
        ]);

        // Settings
        $settings = [
            ['key' => 'company.name', 'value' => 'PT RCS Skincare', 'group' => 'general'],
            ['key' => 'company.address', 'value' => 'Jl. Raya Industri, Tangerang', 'group' => 'general'],
            ['key' => 'company.currency', 'value' => 'IDR', 'group' => 'general'],
            ['key' => 'reorder.expiry_warning_days', 'value' => '30', 'group' => 'inventory'],
            ['key' => 'doc.pr_prefix', 'value' => 'PR', 'group' => 'documents'],
            ['key' => 'doc.po_prefix', 'value' => 'PO', 'group' => 'documents'],
            ['key' => 'doc.so_prefix', 'value' => 'SO', 'group' => 'documents'],
        ];
        foreach ($settings as $s) {
            Setting::updateOrCreate(['key' => $s['key']], $s);
        }
    }
}
