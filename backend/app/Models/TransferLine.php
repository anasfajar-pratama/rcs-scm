<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferLine extends Model
{
    protected $fillable = ['transfer_header_id', 'product_id', 'batch_id', 'quantity'];

    protected $casts = ['quantity' => 'decimal:4'];

    public function transferHeader(): BelongsTo
    {
        return $this->belongsTo(TransferHeader::class, 'transfer_header_id');
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
