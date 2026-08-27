<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'name' => $this->name,
            'type' => $this->type,
            'category_id' => $this->category_id,
            'brand_id' => $this->brand_id,
            'unit_id' => $this->unit_id,
            'category_name' => $this->category?->name,
            'brand_name' => $this->brand?->name,
            'unit_name' => $this->unit?->name,
            'cost' => $this->cost,
            'sale_price' => $this->sale_price,
            'is_active' => $this->is_active,
            'track_batch' => $this->track_batch,
            'expiry_required' => $this->expiry_required,
            'shelf_life_days' => $this->shelf_life_days,
            'reorder_point' => $this->reorder_point,
            'reorder_quantity' => $this->reorder_quantity,
            'safety_stock' => $this->safety_stock,
            'image' => $this->image,
            'description' => $this->description,
            'ingredients' => $this->ingredients,
            'bom' => $this->whenLoaded('bomLines', fn () => ProductBomResource::collection($this->bomLines)),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
