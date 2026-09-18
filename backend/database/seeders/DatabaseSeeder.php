<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            AdminUserSeeder::class,
            UserRolesSeeder::class,
            MasterDataSeeder::class,
            StockSeeder::class,
            PurchasingSeeder::class,
        ]);

        // Demo data (UAT). Disable in tests via SEED_DEMO=false.
        if (env('SEED_DEMO', true)) {
            $this->call(DemoSeeder::class);
        }
    }
}
