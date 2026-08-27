<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransferLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $this->when($this->relationLoaded('product'), fn () => $this->product?->name),
            'batch_id' => $this->batch_id,
            'lot_no' => $this->batch?->lot_no,
            'quantity' => $this->quantity,
        ];
    }
}
