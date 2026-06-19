<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Standing extends Model
{
    protected $fillable = [
        'tournament_id', 'tournament_group_id', 'team_id', 'position',
        'played', 'won', 'drawn', 'lost', 'goals_for', 'goals_against',
        'goal_difference', 'points', 'tiebreaker_data', 'computed_at',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'played' => 'integer',
            'won' => 'integer',
            'drawn' => 'integer',
            'lost' => 'integer',
            'goals_for' => 'integer',
            'goals_against' => 'integer',
            'goal_difference' => 'integer',
            'points' => 'integer',
            'tiebreaker_data' => 'array',
            'computed_at' => 'datetime',
        ];
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(TournamentGroup::class, 'tournament_group_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
