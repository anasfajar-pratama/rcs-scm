<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WarehouseResource;
use App\Models\Warehouse;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarehouseController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $search = $request->query('search');

        $query = Warehouse::query()
            ->with('locations')
            ->when($search, fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', "%$search%")->orWhere('code', 'like', "%$search%")))
            ->latest();

        if ($request->boolean('list')) {
            return $this->success(WarehouseResource::collection($query->get()));
        }

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($paginator) => WarehouseResource::collection($paginator->items()));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateData($request);

        $warehouse = DB::transaction(function () use ($validated) {
            $warehouse = Warehouse::create(array_diff_key($validated, ['locations' => null]));
            $this->syncLocations($warehouse, $validated['locations'] ?? []);
            return $warehouse;
        });

        return $this->success(new WarehouseResource($warehouse->load('locations')), 'Gudang berhasil dibuat.', 201);
    }

    public function show(Warehouse $warehouse): JsonResponse
    {
        return $this->success(new WarehouseResource($warehouse->load('locations')));
    }

    public function update(Request $request, Warehouse $warehouse): JsonResponse
    {
        $validated = $this->validateData($request);

        $warehouse = DB::transaction(function () use ($warehouse, $validated) {
            $warehouse->update(array_diff_key($validated, ['locations' => null]));
            if (array_key_exists('locations', $validated)) {
                $this->syncLocations($warehouse, $validated['locations']);
            }
            return $warehouse;
        });

        return $this->success(new WarehouseResource($warehouse->load('locations')), 'Gudang berhasil diperbarui.');
    }

    public function destroy(Warehouse $warehouse): JsonResponse
    {
        $warehouse->delete();

        return $this->success(null, 'Gudang berhasil dihapus.');
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'locations' => ['array'],
            'locations.*.name' => ['required', 'string', 'max:255'],
            'locations.*.code' => ['nullable', 'string', 'max:50'],
        ]);
    }

    private function syncLocations(Warehouse $warehouse, array $locations): void
    {
        $warehouse->locations()->delete();

        foreach (array_slice($locations, 0, 50) as $location) {
            $warehouse->locations()->create([
                'name' => $location['name'],
                'code' => $location['code'] ?? null,
                'is_active' => true,
            ]);
        }
    }
}
