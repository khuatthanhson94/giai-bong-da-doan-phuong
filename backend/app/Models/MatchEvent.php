<?php

namespace App\Models;

use App\Enums\MatchEventType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchEvent extends Model
{
    protected $fillable = [
        'match_id', 'team_id', 'player_id', 'related_player_id',
        'type', 'minute', 'extra_minute', 'description', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'type' => MatchEventType::class,
            'minute' => 'integer',
            'extra_minute' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function relatedPlayer(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'related_player_id');
    }
}
