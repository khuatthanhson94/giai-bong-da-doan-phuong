<?php

namespace App\Repositories\Contracts;

use App\Models\Season;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface SeasonRepositoryInterface extends BaseRepositoryInterface
{
    public function getActive(): Collection;

    public function search(string $term, int $perPage = 15): LengthAwarePaginator;
}
