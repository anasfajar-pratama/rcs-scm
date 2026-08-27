<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $search = $request->query('search');
        $type = $request->query('type');

        $query = Customer::query()
            ->with('defaultPriceList', 'contacts')
            ->when($search, fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', "%$search%")->orWhere('code', 'like', "%$search%")->orWhere('email', 'like', "%$search%")))
            ->when($type, fn ($q) => $q->where('type', $type))
            ->latest();

        if ($request->boolean('list')) {
            return $this->success(CustomerResource::collection($query->get()));
        }

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($paginator) => CustomerResource::collection($paginator->items()));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateData($request);

        $customer = DB::transaction(function () use ($validated) {
            $customer = Customer::create(array_diff_key($validated, ['contacts' => null]));
            $this->syncContacts($customer, $validated['contacts'] ?? []);
            return $customer;
        });

        return $this->success(new CustomerResource($customer->load('contacts', 'defaultPriceList')), 'Customer berhasil dibuat.', 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        return $this->success(new CustomerResource($customer->load('contacts', 'defaultPriceList')));
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $validated = $this->validateData($request);

        $customer = DB::transaction(function () use ($customer, $validated) {
            $customer->update(array_diff_key($validated, ['contacts' => null]));
            if (array_key_exists('contacts', $validated)) {
                $this->syncContacts($customer, $validated['contacts']);
            }
            return $customer;
        });

        return $this->success(new CustomerResource($customer->load('contacts', 'defaultPriceList')), 'Customer berhasil diperbarui.');
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $customer->delete();

        return $this->success(null, 'Customer berhasil dihapus.');
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:b2b,distributor,retail,affiliate'],
            'default_price_list_id' => ['nullable', 'exists:price_lists,id'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'tax_id' => ['nullable', 'string', 'max:50'],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'billing_address' => ['nullable', 'string'],
            'shipping_address' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'contacts' => ['array'],
            'contacts.*.name' => ['required', 'string', 'max:255'],
            'contacts.*.email' => ['nullable', 'email'],
            'contacts.*.phone' => ['nullable', 'string'],
            'contacts.*.position' => ['nullable', 'string'],
            'contacts.*.is_primary' => ['boolean'],
        ]);
    }

    private function syncContacts(Customer $customer, array $contacts): void
    {
        $customer->contacts()->delete();

        foreach (array_slice($contacts, 0, 20) as $contact) {
            $customer->contacts()->create([
                'name' => $contact['name'],
                'email' => $contact['email'] ?? null,
                'phone' => $contact['phone'] ?? null,
                'position' => $contact['position'] ?? null,
                'is_primary' => $contact['is_primary'] ?? false,
            ]);
        }
    }
}
