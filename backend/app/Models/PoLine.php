<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PoLine extends Model
{
    protected $fillable = [
        'purchase_order_id', 'product_id', 'qty', 'qty_received',
        'price', 'tax', 'discount', 'expected_date',
    ];

    protected $casts = [
        'qty' => 'decimal:4',
        'qty_received' => 'decimal:4',
        'price' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'expected_date' => 'date',
    ];

    public function po(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
