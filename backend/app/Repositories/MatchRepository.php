<?php

namespace App\Repositories;

use App\Enums\MatchStatus;
use App\Models\FootballMatch;
use App\Repositories\Contracts\MatchRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class MatchRepository extends BaseRepository implements MatchRepositoryInterface
{
    public function __construct(FootballMatch $model)
    {
        parent::__construct($model);
    }

    public function getByTournament(int $tournamentId, ?int $groupId = null): Collection
    {
        $query = $this->model->newQuery()
            ->with(['homeTeam', 'awayTeam', 'group'])
            ->where('tournament_id', $tournamentId)
            ->orderBy('scheduled_at')
            ->orderBy('round');

        if ($groupId) {
            $query->where('tournament_group_id', $groupId);
        }

        return $query->get();
    }

    public function getUpcoming(int $limit = 10): Collection
    {
        return $this->model->newQuery()
            ->with(['homeTeam', 'awayTeam', 'tournament'])
            ->whereIn('status', [MatchStatus::SCHEDULED, MatchStatus::LIVE])
            ->where('scheduled_at', '>=', now())
            ->orderBy('scheduled_at')
            ->limit($limit)
            ->get();
    }
}
