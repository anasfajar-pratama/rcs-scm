<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdjustmentLine extends Model
{
    protected $fillable = ['adjustment_header_id', 'product_id', 'batch_id', 'qty_diff', 'reason'];

    protected $casts = ['qty_diff' => 'decimal:4'];

    public function adjustmentHeader(): BelongsTo
    {
        return $this->belongsTo(AdjustmentHeader::class, 'adjustment_header_id');
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
