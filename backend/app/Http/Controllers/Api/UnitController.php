<?php

namespace App\Http\Controllers\Api;

use App\Models\Unit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UnitController extends BaseMasterController
{
    protected string $modelClass = Unit::class;
    protected bool $hasCode = true;
    protected array $searchable = ['name', 'code'];

    protected function rules(Request $request, ?Model $model = null): array
    {
        $unit = $model ?? $request->route('unit');

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', Rule::unique('units', 'code')->ignore($unit?->id)],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
