<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionOrder extends Model
{
    protected $fillable = [
        'po_no', 'product_id', 'planned_qty', 'produced_qty', 'warehouse_id',
        'order_date', 'due_date', 'status', 'notes', 'created_by',
    ];

    protected $casts = [
        'planned_qty' => 'decimal:4',
        'produced_qty' => 'decimal:4',
        'order_date' => 'date',
        'due_date' => 'date',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ProductionOrderLine::class);
    }

    public function productionBatches(): HasMany
    {
        return $this->hasMany(ProductionBatch::class);
    }
}
