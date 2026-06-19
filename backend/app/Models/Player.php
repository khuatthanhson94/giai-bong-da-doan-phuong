<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\Recyclable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    use Auditable, Recyclable;

    protected $fillable = [
        'team_id', 'name', 'jersey_number', 'position',
        'date_of_birth', 'avatar', 'is_captain', 'is_active',
        'goals', 'assists', 'yellow_cards', 'red_cards',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'is_captain' => 'boolean',
            'is_active' => 'boolean',
            'jersey_number' => 'integer',
            'goals' => 'integer',
            'assists' => 'integer',
            'yellow_cards' => 'integer',
            'red_cards' => 'integer',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function matchEvents(): HasMany
    {
        return $this->hasMany(MatchEvent::class);
    }
}
