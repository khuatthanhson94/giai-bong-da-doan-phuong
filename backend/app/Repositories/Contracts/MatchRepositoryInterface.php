<?php

namespace App\Repositories\Contracts;

use App\Models\FootballMatch;
use Illuminate\Database\Eloquent\Collection;

interface MatchRepositoryInterface extends BaseRepositoryInterface
{
    public function getByTournament(int $tournamentId, ?int $groupId = null): Collection;

    public function getUpcoming(int $limit = 10): Collection;
}
