<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplierProductPrice;
use App\Traits\ApiResponse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierProductPriceController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $search = $request->query('search');
        $supplierId = $request->query('supplier_id');
        $type = $request->query('type');
        $isList = $request->boolean('list');

        $query = SupplierProductPrice::query()
            ->with('supplier', 'product.unit')
            ->when($search, fn ($q) => $q->where(fn ($q) => $q
                ->whereHas('supplier', fn ($q) => $q->where('name', 'like', "%$search%"))
                ->orWhereHas('product', fn ($q) => $q->where('name', 'like', "%$search%")->orWhere('sku', 'like', "%$search%"))))
            ->when($supplierId, fn ($q) => $q->where('supplier_id', $supplierId))
            ->when($type, fn ($q) => $q->whereHas('product', fn ($q) => $q->where('type', $type)))
            ->latest();

        $paginator = $query->paginate($perPage);
        $rows = $paginator->getCollection()->map(fn (SupplierProductPrice $row) => $this->format($row));

        if ($isList) {
            return $this->success($rows->values());
        }

        return $this->successPagination($paginator, 'OK', fn () => $rows);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules($request));
        $row = SupplierProductPrice::create($validated);

        return $this->success($this->format($row->load('supplier', 'product.unit')), 'Harga supplier berhasil ditambahkan.', 201);
    }

    public function update(Request $request, SupplierProductPrice $supplierProductPrice): JsonResponse
    {
        $validated = $request->validate($this->rules($request, $supplierProductPrice));
        $supplierProductPrice->update($validated);

        return $this->success($this->format($supplierProductPrice->fresh('supplier', 'product.unit')), 'Harga supplier berhasil diperbarui.');
    }

    public function destroy(SupplierProductPrice $supplierProductPrice): JsonResponse
    {
        $supplierProductPrice->delete();

        return $this->success(null, 'Harga supplier berhasil dihapus.');
    }

    protected function rules(Request $request, ?SupplierProductPrice $model = null): array
    {
        return [
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'product_id' => [
                'required',
                'exists:products,id',
                Rule::unique('supplier_product_prices', 'product_id')
                    ->where(fn ($q) => $q->where('supplier_id', $request->input('supplier_id')))
                    ->ignore($model?->id),
            ],
            'price' => ['required', 'numeric', 'min:0'],
            'moq' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    protected function format(SupplierProductPrice $row): array
    {
        return [
            'id' => $row->id,
            'supplier_id' => $row->supplier_id,
            'supplier_name' => $row->supplier?->name,
            'product_id' => $row->product_id,
            'product_name' => $row->product?->name,
            'sku' => $row->product?->sku,
            'type' => $row->product?->type,
            'unit_name' => $row->product?->unit?->name,
            'price' => (float) $row->price,
            'moq' => $row->moq === null ? null : (float) $row->moq,
            'is_active' => (bool) $row->is_active,
        ];
    }
}