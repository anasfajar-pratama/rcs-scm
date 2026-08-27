<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reservation extends Model
{
    protected $fillable = [
        'reservation_no', 'warehouse_id', 'reservable_type', 'reservable_id',
        'status', 'reserved_date', 'created_by',
    ];

    protected $casts = ['reserved_date' => 'date'];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function reservable()
    {
        return $this->morphTo();
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ReservationLine::class);
    }
}
