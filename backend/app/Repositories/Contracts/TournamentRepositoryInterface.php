<?php

namespace App\Repositories\Contracts;

use App\Models\Tournament;
use Illuminate\Database\Eloquent\Collection;

interface TournamentRepositoryInterface extends BaseRepositoryInterface
{
    public function findBySlug(string $slug): ?Tournament;

    public function getBySeason(int $seasonId): Collection;
}
