<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@giaibongda.local',
                'role' => UserRole::SUPER_ADMIN,
            ],
            [
                'name' => 'Admin',
                'email' => 'admin@giaibongda.local',
                'role' => UserRole::ADMIN,
            ],
            [
                'name' => 'Ban Tổ Chức',
                'email' => 'organizer@giaibongda.local',
                'role' => UserRole::ORGANIZER,
            ],
            [
                'name' => 'Ghi Bàn',
                'email' => 'scorekeeper@giaibongda.local',
                'role' => UserRole::SCOREKEEPER,
            ],
            [
                'name' => 'MC',
                'email' => 'mc@giaibongda.local',
                'role' => UserRole::MC,
            ],
            [
                'name' => 'Truyền Thông',
                'email' => 'media@giaibongda.local',
                'role' => UserRole::MEDIA,
            ],
            [
                'name' => 'Biên Tập',
                'email' => 'editor@giaibongda.local',
                'role' => UserRole::EDITOR,
            ],
            [
                'name' => 'Người Xem',
                'email' => 'viewer@giaibongda.local',
                'role' => UserRole::VIEWER,
            ],
        ];

        foreach ($users as $userData) {
            User::query()->updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => Hash::make('password'),
                    'role' => $userData['role'],
                    'is_active' => true,
                ]
            );
        }
    }
}
