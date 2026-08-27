<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'lot_no' => $this->lot_no,
            'mfg_date' => $this->mfg_date?->toDateString(),
            'expiry_date' => $this->expiry_date?->toDateString(),
            'shelf_life_days' => $this->shelf_life_days,
            'status' => $this->status,
            'source_type' => $this->source_type,
        ];
    }
}
