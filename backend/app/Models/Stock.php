<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stock extends Model
{
    protected $fillable = [
        'warehouse_id', 'product_id', 'batch_id', 'qty_on_hand', 'qty_reserved',
    ];

    protected $casts = [
        'qty_on_hand' => 'float',
        'qty_reserved' => 'float',
    ];

    protected $appends = ['qty_available'];

    public function getQtyAvailableAttribute(): float
    {
        return (float) round((float) $this->qty_on_hand - (float) $this->qty_reserved, 4);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }
}
