<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LivestreamConfig extends Model
{
    protected $fillable = [
        'match_id', 'platform', 'stream_url', 'embed_code',
        'is_active', 'started_at', 'ended_at', 'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'settings' => 'array',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }
}
