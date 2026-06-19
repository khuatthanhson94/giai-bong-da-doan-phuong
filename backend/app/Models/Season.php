<?php

namespace App\Models;

use App\Enums\SeasonStatus;
use App\Traits\Auditable;
use App\Traits\Recyclable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Season extends Model
{
    use Auditable, Recyclable;

    protected $fillable = [
        'name', 'year', 'logo', 'banner', 'description',
        'status', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'status' => SeasonStatus::class,
            'year' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function tournaments(): HasMany
    {
        return $this->hasMany(Tournament::class);
    }

    public function news(): HasMany
    {
        return $this->hasMany(News::class);
    }
}
