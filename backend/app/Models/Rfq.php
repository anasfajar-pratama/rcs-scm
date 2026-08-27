<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rfq extends Model
{
    protected $fillable = ['rfq_no', 'pr_id', 'deadline', 'status', 'notes', 'created_by'];

    protected $casts = ['deadline' => 'date'];

    public function pr(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'pr_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(RfqLine::class, 'rfq_id');
    }

    public function suppliers(): BelongsToMany
    {
        return $this->belongsToMany(Supplier::class, 'rfq_suppliers')->withTimestamps();
    }
}
