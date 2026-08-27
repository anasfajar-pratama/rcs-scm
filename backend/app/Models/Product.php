<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'sku', 'barcode', 'name', 'type', 'category_id', 'brand_id', 'unit_id',
        'cost', 'sale_price', 'is_active', 'track_batch', 'expiry_required',
        'shelf_life_days', 'reorder_point', 'reorder_quantity', 'safety_stock',
        'image', 'description', 'ingredients',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'track_batch' => 'boolean',
        'expiry_required' => 'boolean',
        'cost' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'shelf_life_days' => 'integer',
        'ingredients' => 'array',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    // BOM: finished good -> component raw materials
    public function bomLines(): HasMany
    {
        return $this->hasMany(ProductBom::class);
    }

    public function components(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_boms', 'product_id', 'component_id')
            ->withPivot('quantity', 'note', 'is_active');
    }

    // where this product is used as a component (raw material)
    public function usedInBoms(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_boms', 'component_id', 'product_id');
    }

    public function priceListLines(): HasMany
    {
        return $this->hasMany(PriceListLine::class);
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(Stock::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }
}
