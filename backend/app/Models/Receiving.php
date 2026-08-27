<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Receiving extends Model
{
    protected $fillable = [
        'receiving_no', 'po_id', 'warehouse_id', 'received_date',
        'status', 'notes', 'created_by',
    ];

    protected $casts = ['received_date' => 'date'];

    public function po(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ReceivingLine::class, 'receiving_id');
    }
}
