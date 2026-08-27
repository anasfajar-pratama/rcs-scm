<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierQuotation extends Model
{
    protected $fillable = [
        'quotation_no', 'rfq_id', 'rfq_line_id', 'supplier_id', 'price',
        'min_order', 'lead_time_days', 'valid_until', 'status', 'notes',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'min_order' => 'decimal:4',
        'lead_time_days' => 'integer',
        'valid_until' => 'date',
    ];

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class, 'rfq_id');
    }

    public function rfqLine(): BelongsTo
    {
        return $this->belongsTo(RfqLine::class, 'rfq_line_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
