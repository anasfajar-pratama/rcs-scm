<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $modules = [
            'users', 'roles', 'permissions', 'audits', 'settings',
            'products', 'categories', 'units', 'brands', 'price-lists', 'bom',
            'warehouses', 'locations', 'stocks', 'stock-movements', 'transfers', 'adjustments', 'reservations', 'stock-opnames',
            'suppliers', 'pr', 'rfq', 'quotations', 'pos', 'receivings', 'purchase-returns',
            'leads', 'customers', 'contacts', 'opportunities', 'activities', 'quotations-sales', 'sales-orders',
            'production-orders', 'batches',
            'reports', 'dashboard',
            'approvals',
        ];

        $actions = ['view-any', 'view', 'create', 'update', 'delete'];

        $permissions = [];
        foreach ($modules as $module) {
            foreach ($actions as $action) {
                $permissions[] = $perm = Permission::firstOrCreate(['name' => "$module.$action"]);
            }
        }

        // Supervisor: view-only across all modules
        $supervisorRole = Role::firstOrCreate(['name' => 'supervisor']);
        $supervisorPerms = collect($permissions)->filter(
            fn (Permission $p) => in_array(
                substr($p->name, strpos($p->name, '.') + 1),
                ['view-any', 'view']
            )
        )->pluck('name')->all();
        $supervisorRole->syncPermissions($supervisorPerms);

        $roles = [
            'super-admin' => '*',
            'admin' => '*',
            'sales' => ['leads', 'customers', 'contacts', 'opportunities', 'activities', 'quotations-sales', 'sales-orders', 'products', 'stocks', 'dashboard', 'reports'],
            'warehouse' => ['warehouses', 'locations', 'stocks', 'stock-movements', 'transfers', 'adjustments', 'reservations', 'stock-opnames', 'receivings', 'products', 'batches', 'dashboard'],
            'purchasing' => ['suppliers', 'pr', 'rfq', 'quotations', 'pos', 'receivings', 'purchase-returns', 'products', 'stocks', 'dashboard', 'reports'],
            'production' => ['products', 'bom', 'production-orders', 'batches', 'stocks', 'dashboard'],
        ];

        foreach ($roles as $roleName => $perms) {
            $role = Role::firstOrCreate(['name' => $roleName]);

            if ($perms === '*') {
                $role->syncPermissions($permissions);
                continue;
            }

            $toSync = [];
            foreach ($perms as $perm) {
                $toSync = array_merge($toSync, collect($permissions)->filter(
                    fn (Permission $p) => str_starts_with($p->name, "$perm.")
                )->pluck('name')->all());
            }
            $role->syncPermissions($toSync);
        }
    }
}
