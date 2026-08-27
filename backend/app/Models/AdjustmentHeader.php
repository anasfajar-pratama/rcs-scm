<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdjustmentHeader extends Model
{
    protected $fillable = [
        'adjustment_no', 'type', 'warehouse_id', 'adjustment_date',
        'status', 'notes', 'created_by',
    ];

    protected $casts = ['adjustment_date' => 'date'];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(AdjustmentLine::class, 'adjustment_header_id');
    }
}
