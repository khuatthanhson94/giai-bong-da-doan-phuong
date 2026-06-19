<?php

namespace App\Repositories;

use App\Enums\SeasonStatus;
use App\Models\Season;
use App\Repositories\Contracts\SeasonRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class SeasonRepository extends BaseRepository implements SeasonRepositoryInterface
{
    public function __construct(Season $model)
    {
        parent::__construct($model);
    }

    public function getActive(): Collection
    {
        return $this->model->newQuery()
            ->where('status', SeasonStatus::ACTIVE)
            ->orderBy('sort_order')
            ->get();
    }

    public function search(string $term, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->newQuery()
            ->where('name', 'ilike', "%{$term}%")
            ->orWhere('year', 'like', "%{$term}%")
            ->orderByDesc('year')
            ->paginate($perPage);
    }
}
