<?php

namespace App\Http\Controllers\Api;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierController extends BaseMasterController
{
    protected string $modelClass = Supplier::class;
    protected bool $hasCode = true;
    protected array $searchable = ['name', 'code', 'email'];

    protected function rules(Request $request, ?Model $model = null): array
    {
        $supplier = $model ?? $request->route('supplier');

        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('suppliers', 'code')->ignore($supplier?->id)],
            'name' => ['required', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', Rule::unique('suppliers', 'email')->ignore($supplier?->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'payment_terms' => ['nullable', 'string', 'max:100'],
            'currency' => ['nullable', 'string', 'max:10'],
            'is_active' => ['boolean'],
        ];
    }
}
