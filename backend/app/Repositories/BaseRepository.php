<?php

namespace App\Repositories;

use App\Repositories\Contracts\BaseRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

abstract class BaseRepository implements BaseRepositoryInterface
{
    public function __construct(protected Model $model)
    {
    }

    public function all(array $columns = ['*']): Collection
    {
        return $this->model->newQuery()->get($columns);
    }

    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = $this->model->newQuery();
        $this->applyFilters($query, $filters);

        return $query->paginate($perPage);
    }

    public function find(int $id, array $relations = []): ?Model
    {
        return $this->model->newQuery()->with($relations)->find($id);
    }

    public function findOrFail(int $id, array $relations = []): Model
    {
        return $this->model->newQuery()->with($relations)->findOrFail($id);
    }

    public function create(array $data): Model
    {
        return $this->model->newQuery()->create($data);
    }

    public function update(int $id, array $data): Model
    {
        $record = $this->findOrFail($id);
        $record->update($data);

        return $record->fresh();
    }

    public function delete(int $id): bool
    {
        return (bool) $this->findOrFail($id)->delete();
    }

    public function restore(int $id): bool
    {
        if (! in_array(SoftDeletes::class, class_uses_recursive($this->model))) {
            return false;
        }

        return (bool) $this->model->newQuery()->onlyTrashed()->findOrFail($id)->restore();
    }

    protected function applyFilters($query, array $filters): void
    {
        foreach ($filters as $field => $value) {
            if ($value !== null && $value !== '') {
                $query->where($field, $value);
            }
        }
    }
}
