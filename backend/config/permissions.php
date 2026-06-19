<?php

use App\Enums\UserRole;

return [
    'roles' => [
        UserRole::SUPER_ADMIN->value => [
            'label' => 'Siêu quản trị',
            'permissions' => ['*'],
        ],
        UserRole::ADMIN->value => [
            'label' => 'Quản trị viên',
            'permissions' => [
                'seasons.*', 'tournaments.*', 'teams.*', 'players.*',
                'matches.*', 'standings.*', 'news.*', 'gallery.*',
                'sponsors.*', 'settings.*', 'import_export.*', 'backups.*',
                'audit_logs.view', 'recycle_bin.*', 'dashboard.view',
            ],
        ],
        UserRole::ORGANIZER->value => [
            'label' => 'Ban tổ chức',
            'permissions' => [
                'seasons.view', 'tournaments.*', 'teams.*', 'players.*',
                'matches.*', 'standings.*', 'import_export.*', 'dashboard.view',
            ],
        ],
        UserRole::SCOREKEEPER->value => [
            'label' => 'Ghi bàn',
            'permissions' => [
                'matches.view', 'matches.update_score', 'match_events.*',
                'standings.view', 'dashboard.view',
            ],
        ],
        UserRole::MC->value => [
            'label' => 'MC / Bình luận viên',
            'permissions' => [
                'matches.view', 'livestream.*', 'dashboard.view',
            ],
        ],
        UserRole::MEDIA->value => [
            'label' => 'Truyền thông',
            'permissions' => [
                'news.*', 'gallery.*', 'videos.*', 'ai.content',
            ],
        ],
        UserRole::EDITOR->value => [
            'label' => 'Biên tập',
            'permissions' => [
                'news.*', 'pages.*', 'gallery.view', 'ai.content',
            ],
        ],
        UserRole::VIEWER->value => [
            'label' => 'Người xem',
            'permissions' => [
                'seasons.view', 'tournaments.view', 'teams.view',
                'players.view', 'matches.view', 'standings.view',
                'news.view', 'gallery.view', 'sponsors.view',
            ],
        ],
    ],

    'recycle_bin' => [
        'retention_days' => (int) env('RECYCLE_BIN_RETENTION_DAYS', 30),
        'soft_delete_models' => [
            \App\Models\News::class,
            \App\Models\Album::class,
            \App\Models\GalleryImage::class,
            \App\Models\Video::class,
            \App\Models\Team::class,
            \App\Models\Player::class,
            \App\Models\Tournament::class,
            \App\Models\Season::class,
        ],
    ],
];
