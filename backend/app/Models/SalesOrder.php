<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesOrder extends Model
{
    protected $fillable = [
        'so_no', 'sales_quotation_id', 'customer_id', 'warehouse_id',
        'order_date', 'status', 'notes', 'created_by',
    ];

    protected $casts = [
        'order_date' => 'date',
    ];

    public function salesQuotation(): BelongsTo
    {
        return $this->belongsTo(SalesQuotation::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SalesOrderLine::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'reservable_id')->where('reservable_type', SalesOrder::class);
    }
}
