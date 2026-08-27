<?php

namespace App\Http\Controllers\Api;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BrandController extends BaseMasterController
{
    protected string $modelClass = Brand::class;
    protected bool $hasCode = false;
    protected array $searchable = ['name', 'code'];

    protected function rules(Request $request, ?Model $model = null): array
    {
        $brand = $model ?? $request->route('brand');

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
