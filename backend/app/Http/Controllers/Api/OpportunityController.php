<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Opportunity;
use App\Services\SalesService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OpportunityController extends Controller
{
    use ApiResponse;

    public function __construct(private SalesService $salesService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $search = $request->query('search');
        $stage = $request->query('stage');
        $customerId = $request->query('customer_id');

        $query = Opportunity::query()
            ->with('customer', 'lines.product')
            ->when($search, fn ($q) => $q->where('title', 'like', "%$search%"))
            ->when($stage, fn ($q) => $q->where('stage', $stage))
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->latest();

        if ($request->boolean('list')) {
            return $this->success($query->get());
        }

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'title' => ['required', 'string', 'max:255'],
            'stage' => ['nullable', 'in:prospecting,qualification,proposal,negotiation,won,lost'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'expected_close_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $opportunity = $this->salesService->createOpportunity($validated);

        return $this->success($opportunity->load('customer', 'lines.product'), 'Opportunity dibuat.', 201);
    }

    public function show(Opportunity $opportunity): JsonResponse
    {
        return $this->success($opportunity->load('customer', 'lines.product'));
    }

    public function update(Request $request, Opportunity $opportunity): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'title' => ['required', 'string', 'max:255'],
            'stage' => ['nullable', 'in:prospecting,qualification,proposal,negotiation,won,lost'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'expected_close_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $opportunity = DB::transaction(function () use ($opportunity, $validated) {
            $opportunity->update([
                'customer_id' => $validated['customer_id'],
                'title' => $validated['title'],
                'stage' => $validated['stage'] ?? $opportunity->stage,
                'probability' => $validated['probability'] ?? $opportunity->probability,
                'expected_close_date' => $validated['expected_close_date'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            $opportunity->lines()->delete();
            foreach ($validated['lines'] as $line) {
                $opportunity->lines()->create([
                    'product_id' => $line['product_id'],
                    'qty' => $line['qty'],
                    'unit_price' => $line['unit_price'],
                    'discount_percent' => $line['discount_percent'] ?? 0,
                ]);
            }

            $opportunity->update([
                'expected_value' => collect($validated['lines'])->sum(fn ($line) => $line['qty'] * $line['unit_price']),
            ]);

            return $opportunity;
        });

        return $this->success($opportunity->load('customer', 'lines.product'), 'Opportunity diperbarui.');
    }

    public function destroy(Opportunity $opportunity): JsonResponse
    {
        $opportunity->delete();

        return $this->success(null, 'Opportunity dihapus.');
    }

    public function updateStage(Request $request, Opportunity $opportunity): JsonResponse
    {
        $validated = $request->validate([
            'stage' => ['required', 'in:prospecting,qualification,proposal,negotiation,won,lost'],
        ]);

        $this->salesService->moveOpportunityStage($opportunity, $validated['stage']);

        return $this->success($opportunity->fresh(), 'Stage opportunity diperbarui.');
    }
}
