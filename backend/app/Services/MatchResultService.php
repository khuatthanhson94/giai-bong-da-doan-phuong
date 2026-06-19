<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\MatchEventType;
use App\Enums\MatchStatus;
use App\Events\MatchScoreUpdated;
use App\Models\FootballMatch;
use App\Models\MatchEvent;
use App\Models\Player;
use App\Models\Standing;
use Carbon\Carbon;
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

            if ($match->tournament_group_id) {
                $this->standingsCalculator->calculate(
                    $match->tournament,
                    $match->group
                );
            }

            // ---------- AUTOMATIC PROGRESSION FOR KNOCKOUT STAGE ----------
            $matchNotes = $match->notes ?? '';
            preg_match('/KO_ID:\s*(\w+)/', $matchNotes, $koMatches);
            $bracketMatchId = isset($koMatches[1]) ? $koMatches[1] : null;

            if ($bracketMatchId) {
                $configRow = DB::table('site_settings')->where('key', 'knockout_bracket_config')->first();
                if ($configRow) {
                    $config = json_decode($configRow->value, true);
                    $scoreA = $match->home_score ?? 0;
                    $scoreB = $match->away_score ?? 0;

                    $winnerTeamId = null;
                    if ($scoreA > $scoreB) {
                        $winnerTeamId = $match->home_team_id;
                    } elseif ($scoreB > $scoreA) {
                        $winnerTeamId = $match->away_team_id;
                    } else {
                        // Penalty score tie-breaker
                        $penA = $match->home_penalty_score ?? 0;
                        $penB = $match->away_penalty_score ?? 0;
                        if ($penA > $penB) {
                            $winnerTeamId = $match->home_team_id;
                        } elseif ($penB > $penA) {
                            $winnerTeamId = $match->away_team_id;
                        } else {
                            $winnerTeamId = $match->home_team_id;
                        }
                    }

                    $getWinnerOfBracketMatch = function ($bracketId) {
                        $matchRow = FootballMatch::where('is_published', true)
                            ->where('status', MatchStatus::FINISHED)
                            ->where('notes', 'LIKE', "%KO_ID: {$bracketId}%")
                            ->first();
                        if (!$matchRow) return null;

                        $sA = $matchRow->home_score ?? 0;
                        $sB = $matchRow->away_score ?? 0;
                        if ($sA > $sB) return $matchRow->home_team_id;
                        if ($sB > $sA) return $matchRow->away_team_id;

                        $pA = $matchRow->home_penalty_score ?? 0;
                        $pB = $matchRow->away_penalty_score ?? 0;
                        if ($pA > $pB) return $matchRow->home_team_id;
                        if ($pB > $pA) return $matchRow->away_team_id;

                        return $matchRow->home_team_id;
                    };

                    $resolveTeamInPublish = function ($source) use ($match) {
                        if ($source['type'] === 'team') {
                            return (int) $source['teamId'];
                        }
                        if ($source['type'] === 'rank') {
                            $groupId = (int) $source['groupId'];
                            $rank = (int) $source['rank'];
                            $standing = Standing::where('tournament_id', $match->tournament_id)
                                ->where('tournament_group_id', $groupId)
                                ->orderBy('position')
                                ->skip($rank - 1)
                                ->first();
                            return $standing ? $standing->team_id : null;
                        }
                        return null;
                    };

                    $nextRounds = isset($config['nextRounds']) ? $config['nextRounds'] : [];
                    foreach ($nextRounds as $r) {
                        foreach ($r['matches'] as $m) {
                            $isHomeDep = $m['home']['type'] === 'winner' && $m['home']['matchId'] === $bracketMatchId;
                            $isAwayDep = $m['away']['type'] === 'winner' && $m['away']['matchId'] === $bracketMatchId;

                            if ($isHomeDep || $isAwayDep) {
                                // Find if the next match already exists
                                $existingNextMatch = FootballMatch::where('bracket_position', $r['round'])
                                    ->where('notes', 'LIKE', "%KO_ID: {$m['id']}%")
                                    ->first();

                                if ($existingNextMatch) {
                                    if ($isHomeDep) {
                                        $existingNextMatch->update(['home_team_id' => $winnerTeamId]);
                                    } else {
                                        $existingNextMatch->update(['away_team_id' => $winnerTeamId]);
                                    }
                                } else {
                                    // Resolve both team IDs
                                    $teamAId = null;
                                    $teamBId = null;

                                    if ($m['home']['type'] === 'winner') {
                                        if ($m['home']['matchId'] === $bracketMatchId) {
                                            $teamAId = $winnerTeamId;
                                        } else {
                                            $teamAId = $getWinnerOfBracketMatch($m['home']['matchId']);
                                        }
                                    } else {
                                        $teamAId = $resolveTeamInPublish($m['home']);
                                    }

                                    if ($m['away']['type'] === 'winner') {
                                        if ($m['away']['matchId'] === $bracketMatchId) {
                                            $teamBId = $winnerTeamId;
                                        } else {
                                            $teamBId = $getWinnerOfBracketMatch($m['away']['matchId']);
                                        }
                                    } else {
                                        $teamBId = $resolveTeamInPublish($m['away']);
                                    }

                                    if ($teamAId !== null && $teamBId !== null) {
                                        $nextNotes = "KO_ID: {$m['id']}" . (isset($m['notes']) && $m['notes'] ? ' | ' . $m['notes'] : '');

                                        $roundName = $r['round'];
                                        $roundNum = 1;
                                        if (stripos($roundName, 'semi') !== false) {
                                            $roundNum = 2;
                                        } elseif (stripos($roundName, 'quarter') !== false) {
                                            $roundNum = 3;
                                        }

                                        FootballMatch::create([
                                            'tournament_id' => $match->tournament_id,
                                            'home_team_id' => $teamAId,
                                            'away_team_id' => $teamBId,
                                            'round' => $roundNum,
                                            'bracket_position' => $roundName,
                                            'venue' => $m['venue'] ?? 'Sân bóng Phường',
                                            'scheduled_at' => isset($m['match_date']) && $m['match_date']
                                                ? Carbon::parse($m['match_date'] . ' ' . ($m['match_time'] ?? '08:00'))
                                                : null,
                                            'status' => 'scheduled',
                                            'notes' => $nextNotes,
                                            'is_published' => false,
                                        ]);
                                    }
                                }
                            }
                        }
                    }
                }
            }

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
