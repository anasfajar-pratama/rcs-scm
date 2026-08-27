<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReservationLine extends Model
{
    protected $fillable = ['reservation_id', 'product_id', 'batch_id', 'quantity', 'quantity_shipped'];

    protected $casts = [
        'quantity' => 'decimal:4',
        'quantity_shipped' => 'decimal:4',
    ];

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
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
