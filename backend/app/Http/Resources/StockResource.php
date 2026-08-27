<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'warehouse_id' => $this->warehouse_id,
            'warehouse_name' => $this->when($this->relationLoaded('warehouse'), fn () => $this->warehouse?->name),
            'product_id' => $this->product_id,
            'product' => $this->when($this->relationLoaded('product'), fn () => $this->product),
            'batch_id' => $this->batch_id,
            'batch' => $this->when($this->relationLoaded('batch'), fn () => new BatchResource($this->batch)),
            'lot_no' => $this->batch?->lot_no,
            'expiry_date' => $this->batch?->expiry_date?->toDateString(),
            'batch_status' => $this->batch?->status,
            'qty_on_hand' => $this->qty_on_hand,
            'qty_reserved' => $this->qty_reserved,
            'qty_available' => $this->qty_available,
        ];
    }
}
