<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\Recyclable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    use Auditable, Recyclable;

    protected $fillable = [
        'tournament_id', 'name', 'short_name', 'logo',
        'primary_color', 'secondary_color', 'coach_name',
        'contact_phone', 'seed', 'ranking',
    ];

    protected function casts(): array
    {
        return [
            'seed' => 'integer',
            'ranking' => 'integer',
        ];
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function players(): HasMany
    {
        return $this->hasMany(Player::class);
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(TournamentGroup::class, 'group_team')
            ->withPivot(['seed', 'ranking', 'sort_order'])
            ->withTimestamps();
    }

    public function homeMatches(): HasMany
    {
        return $this->hasMany(FootballMatch::class, 'home_team_id');
    }

    public function awayMatches(): HasMany
    {
        return $this->hasMany(FootballMatch::class, 'away_team_id');
    }
}
