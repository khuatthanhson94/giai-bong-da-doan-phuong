<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class RecycleBin extends Model
{
    protected $table = 'recycle_bin';

    protected $fillable = [
        'recyclable_type', 'recyclable_id', 'deleted_by',
        'deleted_at', 'expires_at', 'snapshot',
    ];

    protected function casts(): array
    {
        return [
            'deleted_at' => 'datetime',
            'expires_at' => 'datetime',
            'snapshot' => 'array',
        ];
    }

    public function recyclable(): MorphTo
    {
        return $this->morphTo();
    }

    public function deletedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
