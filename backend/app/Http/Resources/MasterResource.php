<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MasterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'slug' => $this->slug,
            'description' => $this->description,
            'type' => $this->type,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'warehouse_id' => $this->warehouse_id,
            'currency' => $this->currency,
            'email' => $this->email,
            'phone' => $this->phone,
            'pic_name' => $this->pic_name,
            'pic_phone' => $this->pic_phone,
        ];
    }
}
