<?php

namespace App\Listeners;

use App\Events\MatchScoreUpdated;
use Illuminate\Support\Facades\Log;

class BroadcastMatchScore
{
    public function handle(MatchScoreUpdated $event): void
    {
        Log::info('Live score broadcast', [
            'match_id' => $event->match->id,
            'score' => "{$event->match->home_score}-{$event->match->away_score}",
        ]);
    }
}
