<?php

namespace App\Http\Controllers\Api;

use App\Models\Location;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocationController extends BaseMasterController
{
    protected string $modelClass = Location::class;
    protected bool $hasCode = false;
    protected array $searchable = ['name'];

    protected function rules(Request $request, ?Model $model = null): array
    {
        $location = $model ?? $request->route('location');

        return [
            'warehouse_id' => ['nullable', 'exists:warehouses,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'is_active' => ['boolean'],
        ];
    }
}
