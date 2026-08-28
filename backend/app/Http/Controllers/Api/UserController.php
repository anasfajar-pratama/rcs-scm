<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $search = $request->query('search');

        $query = User::query()
            ->with('roles')
            ->when($search, fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', "%$search%")->orWhere('email', 'like', "%$search%")))
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => UserResource::collection($p->items()));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string', 'exists:roles,name'],
            'is_active' => ['boolean'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        if (! empty($validated['roles'])) {
            $user->syncRoles($validated['roles']);
        }

        return $this->success(new UserResource($user->load('roles')), 'User dibuat.', 201);
    }

    public function show(User $user): JsonResponse
    {
        return $this->success(new UserResource($user->load('roles', 'permissions')));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'unique:users,email,' . $user->id],
            'password' => ['nullable', 'string', 'min:6'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string', 'exists:roles,name'],
            'is_active' => ['boolean'],
        ]);

        $data = array_filter([
            'name' => $validated['name'] ?? null,
            'email' => $validated['email'] ?? null,
            'is_active' => $validated['is_active'] ?? null,
        ], fn ($v) => $v !== null);

        if (! empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        if (array_key_exists('roles', $validated)) {
            $user->syncRoles($validated['roles'] ?? []);
        }

        return $this->success(new UserResource($user->fresh()->load('roles')), 'User diperbarui.');
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return $this->error('Tidak bisa menghapus akun sendiri.', 422);
        }

        $user->delete();

        return $this->success(null, 'User dihapus.');
    }
}
