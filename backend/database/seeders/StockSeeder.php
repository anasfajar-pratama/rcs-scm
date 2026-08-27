<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class StockSeeder extends Seeder
{
    public function run(): void
    {
        $serum = Product::where('sku', 'FG-SERUM-01')->first();
        $toner = Product::where('sku', 'FG-TONER-01')->first();
        $vitC = Product::where('sku', 'RM-VITC-01')->first();
        $aqua = Product::where('sku', 'RM-AQUA-01')->first();
        $bottle = Product::where('sku', 'PKG-BTL-30')->first();
        $wh = Warehouse::where('code', 'WH-CBD')->first();

        if (! $serum || ! $wh) {
            return;
        }

        $stockRows = [
            // [product, lot, mfg(-days), expiry(+days), shelf, qty]
            [$serum, 'LOT-SER-0001', 90, 450, 540, 80],
            [$serum, 'LOT-SER-0002', 20, 520, 540, 150],
            [$toner, 'LOT-TON-0001', 60, 670, 730, 100],
            [$toner, 'LOT-TON-0002', 10, 720, 730, 60],
            [$vitC, 'LOT-VIT-0001', 30, 335, 365, 8],
            [$aqua, null, null, null, null, 500],
            [$bottle, null, null, null, null, 300],
        ];

        foreach ($stockRows as [$product, $lot, $mfgAgo, $expiryIn, $shelf, $qty]) {
            $batch = null;
            if ($lot) {
                $batch = Batch::updateOrCreate(
                    ['product_id' => $product->id, 'lot_no' => $lot],
                    [
                        'mfg_date' => $mfgAgo ? now()->subDays($mfgAgo)->toDateString() : null,
                        'expiry_date' => $expiryIn ? now()->addDays($expiryIn)->toDateString() : null,
                        'shelf_life_days' => $shelf,
                        'status' => 'available',
                        'source_type' => 'receiving',
                    ],
                );
            }

            Stock::updateOrCreate(
                ['warehouse_id' => $wh->id, 'product_id' => $product->id, 'batch_id' => $batch?->id],
                ['qty_on_hand' => $qty, 'qty_reserved' => 0],
            );
        }
    }
}
