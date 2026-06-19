<?php

namespace App\Services;

use App\Repositories\Contracts\SeasonRepositoryInterface;
use Illuminate\Support\Str;

class SeasonService
{
    public function __construct(
        private readonly SeasonRepositoryInterface $seasonRepository
    ) {
    }

    public function list(array $filters = [], int $perPage = 15)
    {
        return $this->seasonRepository->paginate($perPage, $filters);
    }

    public function get(int $id)
    {
        return $this->seasonRepository->findOrFail($id, ['tournaments']);
    }

    public function create(array $data)
    {
        return $this->seasonRepository->create($data);
    }

    public function update(int $id, array $data)
    {
        return $this->seasonRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->seasonRepository->delete($id);
    }

    public function getActive()
    {
        return $this->seasonRepository->getActive();
    }
}
