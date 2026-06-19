<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\MatchEventType;
use App\Enums\MatchStatus;
use App\Events\MatchScoreUpdated;
use App\Models\FootballMatch;
use App\Models\MatchEvent;
use App\Models\Player;
use Illuminate\Support\Facades\DB;

class MatchResultService
{
    public function __construct(
        private readonly StandingsCalculatorService $standingsCalculator,
        private readonly LiveScoreService $liveScoreService,
        private readonly AuditLogService $auditLogService
    ) {
    }

    public function updateScore(FootballMatch $match, array $data): FootballMatch
    {
        $match->update([
            'home_score' => $data['home_score'],
            'away_score' => $data['away_score'],
            'home_penalty_score' => $data['home_penalty_score'] ?? null,
            'away_penalty_score' => $data['away_penalty_score'] ?? null,
            'status' => $data['status'] ?? MatchStatus::LIVE,
        ]);

        $this->liveScoreService->broadcastScoreUpdate($match);

        return $match->fresh(['homeTeam', 'awayTeam', 'events']);
    }

    public function addEvent(FootballMatch $match, array $data): MatchEvent
    {
        $event = MatchEvent::query()->create([
            'match_id' => $match->id,
            'team_id' => $data['team_id'],
            'player_id' => $data['player_id'] ?? null,
            'related_player_id' => $data['related_player_id'] ?? null,
            'type' => $data['type'],
            'minute' => $data['minute'] ?? null,
            'extra_minute' => $data['extra_minute'] ?? null,
            'description' => $data['description'] ?? null,
            'metadata' => $data['metadata'] ?? null,
        ]);

        $this->updatePlayerStats($event);
        $this->liveScoreService->broadcastEvent($match, $event);

        return $event;
    }

    public function publishResult(FootballMatch $match, ?int $mvpPlayerId = null): FootballMatch
    {
        return DB::transaction(function () use ($match, $mvpPlayerId) {
            $match->update([
                'status' => MatchStatus::FINISHED,
                'is_published' => true,
                'published_at' => now(),
                'mvp_player_id' => $mvpPlayerId,
            ]);

            if ($mvpPlayerId) {
                MatchEvent::query()->create([
                    'match_id' => $match->id,
                    'team_id' => Player::query()->find($mvpPlayerId)?->team_id,
                    'player_id' => $mvpPlayerId,
                    'type' => MatchEventType::MVP,
                ]);
            }

            $this->standingsCalculator->calculate(
                $match->tournament,
                $match->group
            );

            $this->auditLogService->log(AuditAction::PUBLISH, $match);
            event(new MatchScoreUpdated($match));

            return $match->fresh(['homeTeam', 'awayTeam', 'events', 'mvpPlayer']);
        });
    }

    public function getTopScorers(int $tournamentId, int $limit = 10)
    {
        return Player::query()
            ->whereHas('team', fn ($q) => $q->where('tournament_id', $tournamentId))
            ->orderByDesc('goals')
            ->orderByDesc('assists')
            ->limit($limit)
            ->with('team')
            ->get();
    }

    private function updatePlayerStats(MatchEvent $event): void
    {
        if (! $event->player_id) {
            return;
        }

        $player = Player::query()->find($event->player_id);
        if (! $player) {
            return;
        }

        match ($event->type) {
            MatchEventType::GOAL, MatchEventType::PENALTY_SCORED => $player->increment('goals'),
            MatchEventType::ASSIST => $player->increment('assists'),
            MatchEventType::YELLOW_CARD => $player->increment('yellow_cards'),
            MatchEventType::RED_CARD => $player->increment('red_cards'),
            default => null,
        };

        if ($event->related_player_id && $event->type === MatchEventType::GOAL) {
            Player::query()->where('id', $event->related_player_id)->increment('assists');
        }
    }
}
