<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')->orderBy('name')->get()->map(fn (Role $role) => [
            'id' => $role->id,
            'name' => $role->name,
            'permissions' => $role->permissions->pluck('name'),
        ]);

        return $this->success($roles);
    }

    public function permissions(): JsonResponse
    {
        return $this->success(\Spatie\Permission\Models\Permission::orderBy('name')->pluck('name'));
    }
}
