<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TournamentGroup extends Model
{
    protected $fillable = [
        'tournament_id', 'name', 'code', 'sort_order', 'teams_to_advance',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'teams_to_advance' => 'integer',
        ];
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'group_team')
            ->withPivot(['seed', 'ranking', 'sort_order'])
            ->withTimestamps();
    }

    public function matches(): HasMany
    {
        return $this->hasMany(FootballMatch::class);
    }

    public function standings(): HasMany
    {
        return $this->hasMany(Standing::class);
    }
}
