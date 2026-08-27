<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductBomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'component_id' => $this->component_id,
            'component_name' => $this->when($this->relationLoaded('component'), fn () => $this->component?->name),
            'quantity' => $this->quantity,
            'note' => $this->note,
            'is_active' => $this->is_active,
        ];
    }
}
