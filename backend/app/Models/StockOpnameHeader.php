<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockOpnameHeader extends Model
{
    protected $fillable = ['opname_no', 'warehouse_id', 'opname_date', 'status', 'notes', 'created_by'];

    protected $casts = ['opname_date' => 'date'];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(StockOpnameLine::class, 'stock_opname_header_id');
    }
}
