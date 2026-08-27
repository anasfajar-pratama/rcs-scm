<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    protected $fillable = [
        'warehouse_id', 'product_id', 'batch_id', 'type', 'quantity',
        'qty_before', 'qty_after', 'reference_type', 'reference_id',
        'reference_no', 'notes', 'created_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'qty_before' => 'decimal:4',
        'qty_after' => 'decimal:4',
    ];

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
