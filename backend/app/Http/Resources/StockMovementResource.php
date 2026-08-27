<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'warehouse_id' => $this->warehouse_id,
            'warehouse_name' => $this->when($this->relationLoaded('warehouse'), fn () => $this->warehouse?->name),
            'product_id' => $this->product_id,
            'product_name' => $this->when($this->relationLoaded('product'), fn () => $this->product?->name),
            'sku' => $this->when($this->relationLoaded('product'), fn () => $this->product?->sku),
            'batch_id' => $this->batch_id,
            'lot_no' => $this->batch?->lot_no,
            'type' => $this->type,
            'quantity' => $this->quantity,
            'qty_before' => $this->qty_before,
            'qty_after' => $this->qty_after,
            'reference_no' => $this->reference_no,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
