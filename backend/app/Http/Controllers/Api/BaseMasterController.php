<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MasterResource;
use App\Traits\ApiResponse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

abstract class BaseMasterController extends Controller
{
    use ApiResponse;

    protected string $modelClass;
    protected string $resourceClass = MasterResource::class;
    protected array $searchable = ['name', 'code'];

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $search = $request->query('search');
        $isList = $request->boolean('list');

        $query = ($this->modelClass)::query()
            ->when($search, function ($q) use ($search) {
                $q->where(function ($q) use ($search) {
                    foreach ($this->searchable as $col) {
                        $q->orWhere($col, 'like', "%$search%");
                    }
                });
            })
            ->latest();

        if ($isList) {
            return $this->success(MasterResource::collection($query->get()));
        }

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($paginator) => MasterResource::collection($paginator->items()));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->prepareValidated($request->validate($this->rules($request)));
        $model = ($this->modelClass)::create($validated);

        return $this->success(new MasterResource($model), 'Data berhasil dibuat.', 201);
    }

    public function show(Request $request): JsonResponse
    {
        $model = $this->resolveModel($request);

        return $this->success(new MasterResource($model));
    }

    public function update(Request $request): JsonResponse
    {
        $model = $this->resolveModel($request);
        $validated = $this->prepareValidated($request->validate($this->rules($request, $model)));
        $model->update($validated);

        return $this->success(new MasterResource($model), 'Data berhasil diperbarui.');
    }

    public function destroy(Request $request): JsonResponse
    {
        $model = $this->resolveModel($request);
        $model->delete();

        return $this->success(null, 'Data berhasil dihapus.');
    }

    protected function resolveModel(Request $request): Model
    {
        $param = Str::camel(Str::singular(class_basename($this->modelClass)));

        return $this->modelClass::findOrFail($request->route($param));
    }

    abstract protected function rules(Request $request, ?Model $model = null): array;

    protected function prepareValidated(array $data): array
    {
        return $data;
    }
}
