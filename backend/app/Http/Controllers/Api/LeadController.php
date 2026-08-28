<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\SalesService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    use ApiResponse;

    public function __construct(private SalesService $salesService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $search = $request->query('search');
        $status = $request->query('status');

        $query = Lead::query()
            ->when($search, fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', "%$search%")->orWhere('email', 'like', "%$search%")->orWhere('company', 'like', "%$search%")))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->latest();

        if ($request->boolean('list')) {
            return $this->success($query->get());
        }

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'source' => ['nullable', 'in:walk_in,referral,website,social_media,event,other'],
            'notes' => ['nullable', 'string'],
        ]);

        $lead = $this->salesService->createLead($validated);

        return $this->success($lead, 'Lead dibuat.', 201);
    }

    public function show(Lead $lead): JsonResponse
    {
        return $this->success($lead);
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'source' => ['nullable', 'in:walk_in,referral,website,social_media,event,other'],
            'notes' => ['nullable', 'string'],
        ]);

        $lead->update($validated);

        return $this->success($lead, 'Lead diperbarui.');
    }

    public function destroy(Lead $lead): JsonResponse
    {
        $lead->delete();

        return $this->success(null, 'Lead dihapus.');
    }

    public function updateStatus(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:contacted,qualified,lost'],
        ]);

        if ($lead->status === 'converted') {
            return $this->error('Lead sudah converted, tidak bisa ubah status.', 422);
        }

        $this->salesService->updateLeadStatus($lead, $validated['status']);

        return $this->success($lead->fresh(), 'Status lead diperbarui.');
    }

    public function convert(Request $request, Lead $lead): JsonResponse
    {
        if ($lead->status !== 'qualified') {
            return $this->error('Hanya lead berstatus qualified yang bisa dikonversi.', 422);
        }

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'in:b2b,distributor,retail,affiliate'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $customer = $this->salesService->convertLeadToCustomer($lead, $validated);

        return $this->success($customer->load('contacts'), 'Lead dikonversi menjadi customer.', 201);
    }
}
