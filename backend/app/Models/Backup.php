<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Backup extends Model
{
    protected $fillable = [
        'created_by', 'filename', 'disk', 'path',
        'size', 'type', 'status', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
