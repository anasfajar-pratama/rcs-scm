<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionOrderLine extends Model
{
    protected $fillable = [
        'production_order_id', 'component_id', 'planned_qty', 'issued_qty', 'qty_per_unit',
    ];

    protected $casts = [
        'planned_qty' => 'decimal:4',
        'issued_qty' => 'decimal:4',
        'qty_per_unit' => 'decimal:4',
    ];

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'component_id');
    }
}
