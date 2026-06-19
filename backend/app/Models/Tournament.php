<?php

namespace App\Models;

use App\Enums\TournamentFormat;
use App\Traits\Auditable;
use App\Traits\Recyclable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tournament extends Model
{
    use Auditable, Recyclable;

    protected $fillable = [
        'season_id', 'name', 'slug', 'logo', 'banner', 'format',
        'points_config', 'advancement_rules', 'tiebreaker_rules',
        'start_date', 'end_date', 'status', 'wizard_step',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'format' => TournamentFormat::class,
            'points_config' => 'array',
            'advancement_rules' => 'array',
            'tiebreaker_rules' => 'array',
            'start_date' => 'date',
            'end_date' => 'date',
            'wizard_step' => 'integer',
            'is_published' => 'boolean',
        ];
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function groups(): HasMany
    {
        return $this->hasMany(TournamentGroup::class);
    }

    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    public function matches(): HasMany
    {
        return $this->hasMany(FootballMatch::class);
    }

    public function standings(): HasMany
    {
        return $this->hasMany(Standing::class);
    }

    public function defaultPointsConfig(): array
    {
        return $this->points_config ?? [
            'win' => 3,
            'draw' => 1,
            'loss' => 0,
        ];
    }
}
