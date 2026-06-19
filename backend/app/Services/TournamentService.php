<?php

namespace App\Services;

use App\Repositories\Contracts\TournamentRepositoryInterface;
use Illuminate\Support\Str;

class TournamentService
{
    public function __construct(
        private readonly TournamentRepositoryInterface $tournamentRepository
    ) {
    }

    public function list(array $filters = [], int $perPage = 15)
    {
        return $this->tournamentRepository->paginate($perPage, $filters);
    }

    public function get(int $id)
    {
        return $this->tournamentRepository->findOrFail($id, [
            'season', 'groups.teams', 'teams.players', 'standings.team',
        ]);
    }

    public function getBySlug(string $slug)
    {
        return $this->tournamentRepository->findBySlug($slug);
    }

    public function create(array $data)
    {
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);

        return $this->tournamentRepository->create($data);
    }

    public function update(int $id, array $data)
    {
        if (isset($data['name']) && ! isset($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        return $this->tournamentRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->tournamentRepository->delete($id);
    }

    public function publish(int $id)
    {
        return $this->tournamentRepository->update($id, [
            'is_published' => true,
            'status' => 'active',
        ]);
    }
}
