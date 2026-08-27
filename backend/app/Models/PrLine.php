<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrLine extends Model
{
    protected $fillable = ['purchase_requisition_id', 'product_id', 'qty', 'preferred_supplier_id', 'estimated_price', 'note'];

    protected $casts = ['qty' => 'decimal:4', 'estimated_price' => 'decimal:2'];

    public function pr(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'purchase_requisition_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function preferredSupplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'preferred_supplier_id');
    }
}
