<?php

namespace App\Models;

use App\Enums\MatchStatus;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class FootballMatch extends Model
{
    use Auditable;

    protected $table = 'matches';

    protected $fillable = [
        'tournament_id', 'tournament_group_id', 'home_team_id', 'away_team_id',
        'round', 'matchday', 'bracket_position', 'venue', 'scheduled_at',
        'status', 'home_score', 'away_score', 'home_penalty_score',
        'away_penalty_score', 'mvp_player_id', 'is_published',
        'published_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => MatchStatus::class,
            'scheduled_at' => 'datetime',
            'published_at' => 'datetime',
            'round' => 'integer',
            'matchday' => 'integer',
            'home_score' => 'integer',
            'away_score' => 'integer',
            'home_penalty_score' => 'integer',
            'away_penalty_score' => 'integer',
            'is_published' => 'boolean',
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

    public function homeTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'home_team_id');
    }

    public function awayTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'away_team_id');
    }

    public function mvpPlayer(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'mvp_player_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(MatchEvent::class, 'match_id');
    }

    public function livestreamConfig(): HasOne
    {
        return $this->hasOne(LivestreamConfig::class, 'match_id');
    }

    public function isFinished(): bool
    {
        return $this->status === MatchStatus::FINISHED;
    }
}
