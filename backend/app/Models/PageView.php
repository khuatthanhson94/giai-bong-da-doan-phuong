<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PageView extends Model
{
    protected $fillable = [
        'page_type', 'page_id', 'url', 'ip_address',
        'user_agent', 'referrer', 'session_id', 'viewed_at',
    ];

    protected function casts(): array
    {
        return [
            'page_id' => 'integer',
            'viewed_at' => 'datetime',
        ];
    }
}
