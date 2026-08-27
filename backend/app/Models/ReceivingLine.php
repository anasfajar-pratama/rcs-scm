<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReceivingLine extends Model
{
    protected $fillable = [
        'receiving_id', 'po_line_id', 'product_id', 'qty_received',
        'lot_no', 'mfg_date', 'expiry_date', 'batch_id',
    ];

    protected $casts = [
        'qty_received' => 'decimal:4',
        'mfg_date' => 'date',
        'expiry_date' => 'date',
    ];

    public function receiving(): BelongsTo
    {
        return $this->belongsTo(Receiving::class, 'receiving_id');
    }

    public function poLine(): BelongsTo
    {
        return $this->belongsTo(PoLine::class, 'po_line_id');
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
