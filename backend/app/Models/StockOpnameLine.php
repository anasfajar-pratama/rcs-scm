<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockOpnameLine extends Model
{
    protected $fillable = ['stock_opname_header_id', 'product_id', 'batch_id', 'qty_system', 'qty_count', 'qty_diff'];

    protected $casts = [
        'qty_system' => 'decimal:4',
        'qty_count' => 'decimal:4',
        'qty_diff' => 'decimal:4',
    ];

    public function stockOpnameHeader(): BelongsTo
    {
        return $this->belongsTo(StockOpnameHeader::class, 'stock_opname_header_id');
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
