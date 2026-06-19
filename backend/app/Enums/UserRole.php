<?php

namespace App\Enums;

enum UserRole: string
{
    case SUPER_ADMIN = 'super_admin';
    case ADMIN = 'admin';
    case ORGANIZER = 'organizer';
    case SCOREKEEPER = 'scorekeeper';
    case MC = 'mc';
    case MEDIA = 'media';
    case EDITOR = 'editor';
    case VIEWER = 'viewer';

    public function label(): string
    {
        return match ($this) {
            self::SUPER_ADMIN => 'Siêu quản trị',
            self::ADMIN => 'Quản trị viên',
            self::ORGANIZER => 'Ban tổ chức',
            self::SCOREKEEPER => 'Ghi bàn',
            self::MC => 'MC',
            self::MEDIA => 'Truyền thông',
            self::EDITOR => 'Biên tập',
            self::VIEWER => 'Người xem',
        };
    }
}
