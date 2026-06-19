<?php

namespace App\Services;

use App\Events\MatchScoreUpdated;
use App\Models\FootballMatch;
use App\Models\MatchEvent;

class LiveScoreService
{
    public function broadcastScoreUpdate(FootballMatch $match): void
    {
        event(new MatchScoreUpdated($match));
    }

    public function broadcastEvent(FootballMatch $match, MatchEvent $event): void
    {
        event(new MatchScoreUpdated($match->load('events')));
    }

    public function getLiveMatches(int $tournamentId = null)
    {
        $query = FootballMatch::query()
            ->with(['homeTeam', 'awayTeam', 'events.player', 'livestreamConfig'])
            ->where('status', 'live');

        if ($tournamentId) {
            $query->where('tournament_id', $tournamentId);
        }

        return $query->get();
    }
}
