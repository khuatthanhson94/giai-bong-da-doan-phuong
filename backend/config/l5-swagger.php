<?php

return [
    'default' => env('APP_ENV', 'production'),
    'version' => '1.0.0',
    'title' => 'Giải Bóng Đá API',
    'description' => 'API quản lý giải bóng đá đoàn phường',
    'base' => env('L5_SWAGGER_BASE_PATH', null),
    'routes' => [
        'api' => 'api/documentation',
        'docs' => 'docs',
        'oauth2_callback' => 'api/oauth2-callback',
        'middleware' => [
            'api' => [],
            'asset' => [],
            'docs' => [],
            'oauth2_callback' => [],
        ],
    ],
    'paths' => [
        'docs' => storage_path('api-docs'),
        'annotations' => [
            base_path('app/Http/Controllers/Api'),
        ],
        'excludes' => [],
        'base' => env('L5_SWAGGER_BASE_PATH', null),
    ],
    'generate_always' => env('L5_SWAGGER_GENERATE_ALWAYS', false),
    'proxy' => false,
    'constants' => [
        'L5_SWAGGER_CONST_HOST' => env('L5_SWAGGER_CONST_HOST', 'http://localhost:8000'),
    ],
];
