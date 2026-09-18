<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockOpnameResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'opname_no' => $this->opname_no,
            'warehouse_id' => $this->warehouse_id,
            'warehouse_name' => $this->whenLoaded('warehouse', fn () => $this->warehouse?->name),
            'opname_date' => $this->opname_date?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'lines' => $this->whenLoaded('lines', fn () => StockOpnameLineResource::collection($this->lines)),
            'created_at' => $this->created_at,
        ];
    }
}
