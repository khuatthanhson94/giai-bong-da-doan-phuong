<?php

namespace App\Repositories;

use App\Models\Tournament;
use App\Repositories\Contracts\TournamentRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class TournamentRepository extends BaseRepository implements TournamentRepositoryInterface
{
    public function __construct(Tournament $model)
    {
        parent::__construct($model);
    }

    public function findBySlug(string $slug): ?Tournament
    {
        return $this->model->newQuery()
            ->with(['season', 'groups.teams', 'teams'])
            ->where('slug', $slug)
            ->first();
    }

    public function getBySeason(int $seasonId): Collection
    {
        return $this->model->newQuery()
            ->where('season_id', $seasonId)
            ->orderBy('name')
            ->get();
    }
}
