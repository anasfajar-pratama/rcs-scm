<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BatchResource;
use App\Models\Batch;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $productId = $request->query('product_id');
        $status = $request->query('status');

        $query = Batch::query()
            ->with('product')
            ->when($productId, fn ($q) => $q->where('product_id', $productId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->orderBy('expiry_date', 'asc')
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => BatchResource::collection($p->items()));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'lot_no' => ['required', 'string', 'max:100'],
            'mfg_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:mfg_date'],
            'shelf_life_days' => ['nullable', 'integer'],
            'status' => ['nullable', 'in:available,expire_soon,expired'],
        ]);

        $validated['source_type'] = 'opening';
        $batch = Batch::create($validated);

        return $this->success(new BatchResource($batch), 'Batch berhasil dibuat.', 201);
    }
}
