<?php

namespace App\Models;

use App\Enums\SponsorTier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sponsor extends Model
{
    protected $fillable = [
        'season_id', 'tournament_id', 'name', 'logo',
        'website_url', 'tier', 'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'tier' => SponsorTier::class,
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }
}
