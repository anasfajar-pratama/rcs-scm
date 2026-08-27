<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PriceListResource;
use App\Models\PriceList;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PriceListController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $search = $request->query('search');

        $query = PriceList::query()
            ->when($search, fn ($q) => $q->where('name', 'like', "%$search%"))
            ->latest();

        if ($request->boolean('list')) {
            return $this->success(PriceListResource::collection($query->get()));
        }

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($paginator) => PriceListResource::collection($paginator->items()));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:default,customer_group,retail,wholesale'],
            'is_active' => ['boolean'],
            'lines' => ['array'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.price' => ['required', 'numeric', 'min:0'],
        ]);

        $priceList = DB::transaction(function () use ($validated) {
            $list = PriceList::create(array_diff_key($validated, ['lines' => null]));
            $this->syncLines($list, $validated['lines'] ?? []);
            return $list;
        });

        return $this->success(new PriceListResource($priceList->load('lines.product')), 'Price list berhasil dibuat.', 201);
    }

    public function show(PriceList $priceList): JsonResponse
    {
        return $this->success(new PriceListResource($priceList->load('lines.product')));
    }

    public function update(Request $request, PriceList $priceList): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:default,customer_group,retail,wholesale'],
            'is_active' => ['boolean'],
            'lines' => ['array'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.price' => ['required', 'numeric', 'min:0'],
        ]);

        $priceList = DB::transaction(function () use ($priceList, $validated) {
            $priceList->update(array_diff_key($validated, ['lines' => null]));
            if (array_key_exists('lines', $validated)) {
                $this->syncLines($priceList, $validated['lines']);
            }
            return $priceList;
        });

        return $this->success(new PriceListResource($priceList->load('lines.product')), 'Price list berhasil diperbarui.');
    }

    public function destroy(PriceList $priceList): JsonResponse
    {
        $priceList->delete();

        return $this->success(null, 'Price list berhasil dihapus.');
    }

    private function syncLines(PriceList $priceList, array $lines): void
    {
        $priceList->lines()->delete();

        $seen = [];
        foreach ($lines as $line) {
            $productId = $line['product_id'];
            if (isset($seen[$productId])) {
                continue;
            }
            $seen[$productId] = true;
            $priceList->lines()->create([
                'product_id' => $productId,
                'price' => $line['price'],
            ]);
        }
    }
}
