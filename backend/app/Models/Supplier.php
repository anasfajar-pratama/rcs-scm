<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = [
        'code', 'name', 'tax_id', 'email', 'phone', 'address',
        'payment_terms', 'currency', 'is_active',
    ];

    protected $casts = ['is_active' => 'boolean'];
}
