<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdjustmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'adjustment_no' => $this->adjustment_no,
            'type' => $this->type,
            'warehouse_id' => $this->warehouse_id,
            'warehouse_name' => $this->whenLoaded('warehouse', fn () => $this->warehouse?->name),
            'adjustment_date' => $this->adjustment_date?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'lines' => $this->whenLoaded('lines', fn () => AdjustmentLineResource::collection($this->lines)),
            'created_at' => $this->created_at,
        ];
    }
}
