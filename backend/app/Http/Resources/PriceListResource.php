<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PriceListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'is_active' => $this->is_active,
            'lines' => $this->whenLoaded('lines', fn () => PriceListLineResource::collection($this->lines)),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
