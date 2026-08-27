<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'type' => $this->type,
            'default_price_list_id' => $this->default_price_list_id,
            'default_price_list' => $this->whenLoaded('defaultPriceList', fn () => $this->defaultPriceList?->name),
            'email' => $this->email,
            'phone' => $this->phone,
            'tax_id' => $this->tax_id,
            'credit_limit' => $this->credit_limit,
            'billing_address' => $this->billing_address,
            'shipping_address' => $this->shipping_address,
            'is_active' => $this->is_active,
            'contacts' => $this->whenLoaded('contacts', fn () => ContactResource::collection($this->contacts)),
            'created_at' => $this->created_at,
        ];
    }
}
