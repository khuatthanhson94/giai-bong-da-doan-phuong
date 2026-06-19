<?php

namespace App\Repositories;

use App\Models\Team;
use App\Repositories\Contracts\TeamRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class TeamRepository extends BaseRepository implements TeamRepositoryInterface
{
    public function __construct(Team $model)
    {
        parent::__construct($model);
    }

    public function getByTournament(int $tournamentId): Collection
    {
        return $this->model->newQuery()
            ->with('players')
            ->where('tournament_id', $tournamentId)
            ->orderBy('seed')
            ->orderBy('name')
            ->get();
    }
}
