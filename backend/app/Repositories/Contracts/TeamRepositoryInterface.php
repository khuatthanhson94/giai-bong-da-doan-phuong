<?php

namespace App\Repositories\Contracts;

use App\Models\Team;
use Illuminate\Database\Eloquent\Collection;

interface TeamRepositoryInterface extends BaseRepositoryInterface
{
    public function getByTournament(int $tournamentId): Collection;
}
