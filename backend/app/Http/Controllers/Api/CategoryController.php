<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends BaseMasterController
{
    protected string $modelClass = Category::class;
    protected bool $hasCode = false;
    protected array $searchable = ['name'];

    protected function rules(Request $request, ?Model $model = null): array
    {
        $cat = $model ?? $request->route('category');

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable', 'string', 'max:255',
                Rule::unique('categories', 'slug')->ignore($cat?->id),
            ],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepareValidated(array $data): array
    {
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);

        return $data;
    }
}
