<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransferResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transfer_no' => $this->transfer_no,
            'from_warehouse_id' => $this->from_warehouse_id,
            'from_warehouse' => $this->whenLoaded('fromWarehouse', fn () => $this->fromWarehouse?->name),
            'to_warehouse_id' => $this->to_warehouse_id,
            'to_warehouse' => $this->whenLoaded('toWarehouse', fn () => $this->toWarehouse?->name),
            'transfer_date' => $this->transfer_date?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'lines' => $this->whenLoaded('lines', fn () => TransferLineResource::collection($this->lines)),
            'created_at' => $this->created_at,
        ];
    }
}
