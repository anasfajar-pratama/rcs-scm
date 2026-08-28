<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Opportunity extends Model
{
    protected $fillable = [
        'code', 'customer_id', 'title', 'stage', 'expected_value',
        'probability', 'expected_close_date', 'notes', 'created_by',
    ];

    protected $casts = [
        'expected_value' => 'decimal:2',
        'expected_close_date' => 'date',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(OpportunityLine::class);
    }
}
