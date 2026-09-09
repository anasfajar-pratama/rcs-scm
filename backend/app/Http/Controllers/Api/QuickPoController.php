<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\SupplierProductPrice;
use App\Services\DocumentNumberService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuickPoController extends Controller
{
    use ApiResponse;

    /**
     * Buat PO langsung dari daftar harga & MOQ supplier (bypass RFQ/Quotation).
     * Baris terpilih dikelompokkan per supplier -> 1 PO per supplier.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'exists:supplier_product_prices,id'],
            'items.*.qty' => ['required', 'numeric', 'gt:0'],
            'payment_term' => ['nullable', 'string'],
            'expected_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $prices = SupplierProductPrice::with('product')
            ->whereIn('id', collect($validated['items'])->pluck('id'))
            ->get()
            ->keyBy('id');

        // Validasi MOQ: qty pesanan tidak boleh di bawah MOQ supplier.
        foreach ($validated['items'] as $item) {
            $price = $prices[$item['id']];
            if ($price->moq !== null && (float) $item['qty'] < (float) $price->moq) {
                return $this->error(
                    "Qty {$price->product?->name} ({$item['qty']}) di bawah MOQ {$price->moq}.",
                    422,
                );
            }
        }

        $grouped = collect($validated['items'])->groupBy(fn ($item) => $prices[$item['id']]->supplier_id);

        $pos = DB::transaction(function () use ($grouped, $prices, $validated) {
            $created = [];

            foreach ($grouped as $supplierId => $items) {
                $po = PurchaseOrder::create([
                    'po_no' => app(DocumentNumberService::class)->generate('PO', 'purchase_orders', 'po_no'),
                    'supplier_id' => $supplierId,
                    'currency' => 'IDR',
                    'status' => 'pending',
                    'payment_term' => $validated['payment_term'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                    'created_by' => auth()->id(),
                ]);

                foreach ($items as $item) {
                    $price = $prices[$item['id']];
                    $po->lines()->create([
                        'product_id' => $price->product_id,
                        'qty' => $item['qty'],
                        'qty_received' => 0,
                        'price' => $price->price,
                        'tax' => 0,
                        'discount' => 0,
                        'expected_date' => $validated['expected_date'] ?? null,
                    ]);
                }

                $created[] = $po->load('supplier', 'lines.product');
            }

            return $created;
        });

        return $this->success(['pos' => $pos], 'Berhasil membuat '.count($pos).' PO.', 201);
    }
}