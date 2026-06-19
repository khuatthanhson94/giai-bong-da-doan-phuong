<?php

namespace App\Events;

use App\Models\FootballMatch;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchScoreUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public FootballMatch $match)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('match.' . $this->match->id),
            new Channel('tournament.' . $this->match->tournament_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'score.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'match_id' => $this->match->id,
            'home_score' => $this->match->home_score,
            'away_score' => $this->match->away_score,
            'status' => $this->match->status->value,
            'home_team' => $this->match->homeTeam?->name,
            'away_team' => $this->match->awayTeam?->name,
        ];
    }
}
