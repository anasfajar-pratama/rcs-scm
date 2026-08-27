<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PriceList extends Model
{
    protected $fillable = ['name', 'type', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function lines(): HasMany
    {
        return $this->hasMany(PriceListLine::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'price_list_lines')->withPivot('price');
    }
}
