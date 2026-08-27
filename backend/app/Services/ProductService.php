<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductBom;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ProductService
{
    public function paginate(?string $search, ?string $type, int $perPage): Builder
    {
        return Product::query()
            ->with('category', 'brand', 'unit')
            ->when($search, fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', "%$search%")->orWhere('sku', 'like', "%$search%")))
            ->when($type, fn ($q) => $q->where('type', $type))
            ->latest();
    }

    public function create(array $data): Product
    {
        return DB::transaction(function () use ($data) {
            $product = Product::create(array_diff_key($data, ['bom' => null]));
            $this->syncBom($product, $data['bom'] ?? []);
            return $product;
        });
    }

    public function update(Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data) {
            $product->update(array_diff_key($data, ['bom' => null]));
            if (array_key_exists('bom', $data)) {
                $this->syncBom($product, $data['bom'] ?? []);
            }
            return $product;
        });
    }

    public function syncBom(Product $product, array $bomLines): void
    {
        $product->bomLines()->delete();

        $seen = [];
        foreach ($bomLines as $line) {
            $componentId = $line['component_id'] ?? null;
            if (! $componentId || isset($seen[$componentId])) {
                continue;
            }
            $seen[$componentId] = true;

            $product->bomLines()->create([
                'component_id' => $componentId,
                'quantity' => $line['quantity'] ?? 1,
                'note' => $line['note'] ?? null,
                'is_active' => $line['is_active'] ?? true,
            ]);
        }
    }
}
