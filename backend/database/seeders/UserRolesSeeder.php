<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserRolesSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'Budi Supervisor',
                'email' => 'supervisor@rcsscm.test',
                'password' => 'password123',
                'role' => 'supervisor',
            ],
            [
                'name' => 'Siti Sales',
                'email' => 'sales@rcsscm.test',
                'password' => 'password123',
                'role' => 'sales',
            ],
            [
                'name' => 'Andi Warehouse',
                'email' => 'warehouse@rcsscm.test',
                'password' => 'password123',
                'role' => 'warehouse',
            ],
            [
                'name' => 'Dewi Purchasing',
                'email' => 'purchasing@rcsscm.test',
                'password' => 'password123',
                'role' => 'purchasing',
            ],
            [
                'name' => 'Rudi Production',
                'email' => 'production@rcsscm.test',
                'password' => 'password123',
                'role' => 'production',
            ],
        ];

        foreach ($users as $userData) {
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => $userData['password'],
                    'is_active' => true,
                ]
            );
            $user->assignRole($userData['role']);
        }
    }
}
