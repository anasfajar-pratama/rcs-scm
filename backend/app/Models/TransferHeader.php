<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransferHeader extends Model
{
    protected $fillable = [
        'transfer_no', 'from_warehouse_id', 'to_warehouse_id', 'transfer_date',
        'status', 'notes', 'created_by',
    ];

    protected $casts = ['transfer_date' => 'date'];

    public function fromWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'from_warehouse_id');
    }

    public function toWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'to_warehouse_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(TransferLine::class, 'transfer_header_id');
    }
}
