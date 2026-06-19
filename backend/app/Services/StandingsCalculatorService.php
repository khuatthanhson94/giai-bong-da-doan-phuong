<?php

namespace App\Services;

use App\Enums\MatchStatus;
use App\Models\FootballMatch;
use App\Models\Standing;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\TournamentGroup;
use Illuminate\Support\Collection;

class StandingsCalculatorService
{
    /** Thứ tự tiebreaker mặc định */
    private array $defaultTiebreakers = [
        'points',
        'goal_difference',
        'goals_for',
        'head_to_head',
        'fair_play',
    ];

    public function calculate(Tournament $tournament, ?TournamentGroup $group = null): Collection
    {
        $teams = $group
            ? $group->teams
            : $tournament->teams;

        $pointsConfig = $tournament->defaultPointsConfig();
        $tiebreakers = $tournament->tiebreaker_rules ?? $this->defaultTiebreakers;

        $stats = [];
        foreach ($teams as $team) {
            $stats[$team->id] = $this->initStats($team);
        }

        $matches = FootballMatch::query()
            ->where('tournament_id', $tournament->id)
            ->when($group, fn ($q) => $q->where('tournament_group_id', $group->id))
            ->where('status', MatchStatus::FINISHED)
            ->where('is_published', true)
            ->get();

        foreach ($matches as $match) {
            $this->applyMatchResult($stats, $match, $pointsConfig);
        }

        $ranked = $this->rankTeams($stats, $tiebreakers, $matches);
        $this->persistStandings($tournament, $group, $ranked);

        return collect($ranked);
    }

    private function initStats(Team $team): array
    {
        return [
            'team' => $team,
            'team_id' => $team->id,
            'played' => 0,
            'won' => 0,
            'drawn' => 0,
            'lost' => 0,
            'goals_for' => 0,
            'goals_against' => 0,
            'goal_difference' => 0,
            'points' => 0,
            'yellow_cards' => 0,
            'red_cards' => 0,
        ];
    }

    private function applyMatchResult(array &$stats, FootballMatch $match, array $pointsConfig): void
    {
        $homeId = $match->home_team_id;
        $awayId = $match->away_team_id;

        if (! isset($stats[$homeId], $stats[$awayId])) {
            return;
        }

        $homeScore = (int) $match->home_score;
        $awayScore = (int) $match->away_score;

        $stats[$homeId]['played']++;
        $stats[$awayId]['played']++;
        $stats[$homeId]['goals_for'] += $homeScore;
        $stats[$homeId]['goals_against'] += $awayScore;
        $stats[$awayId]['goals_for'] += $awayScore;
        $stats[$awayId]['goals_against'] += $homeScore;

        if ($homeScore > $awayScore) {
            $stats[$homeId]['won']++;
            $stats[$awayId]['lost']++;
            $stats[$homeId]['points'] += $pointsConfig['win'];
            $stats[$awayId]['points'] += $pointsConfig['loss'];
        } elseif ($homeScore < $awayScore) {
            $stats[$awayId]['won']++;
            $stats[$homeId]['lost']++;
            $stats[$awayId]['points'] += $pointsConfig['win'];
            $stats[$homeId]['points'] += $pointsConfig['loss'];
        } else {
            $stats[$homeId]['drawn']++;
            $stats[$awayId]['drawn']++;
            $stats[$homeId]['points'] += $pointsConfig['draw'];
            $stats[$awayId]['points'] += $pointsConfig['draw'];
        }

        $stats[$homeId]['goal_difference'] = $stats[$homeId]['goals_for'] - $stats[$homeId]['goals_against'];
        $stats[$awayId]['goal_difference'] = $stats[$awayId]['goals_for'] - $stats[$awayId]['goals_against'];
    }

    private function rankTeams(array $stats, array $tiebreakers, Collection $matches): array
    {
        $teams = array_values($stats);

        usort($teams, function ($a, $b) use ($tiebreakers, $matches) {
            foreach ($tiebreakers as $rule) {
                $cmp = match ($rule) {
                    'points' => $b['points'] <=> $a['points'],
                    'goal_difference' => $b['goal_difference'] <=> $a['goal_difference'],
                    'goals_for' => $b['goals_for'] <=> $a['goals_for'],
                    'head_to_head' => $this->compareHeadToHead($a, $b, $matches),
                    'fair_play' => ($a['yellow_cards'] + $a['red_cards'] * 3) <=> ($b['yellow_cards'] + $b['red_cards'] * 3),
                    default => 0,
                };

                if ($cmp !== 0) {
                    return $cmp;
                }
            }

            return strcmp($a['team']->name, $b['team']->name);
        });

        foreach ($teams as $index => &$row) {
            $row['position'] = $index + 1;
        }

        return $teams;
    }

    private function compareHeadToHead(array $a, array $b, Collection $matches): int
    {
        $h2h = $matches->filter(function ($m) use ($a, $b) {
            $ids = [$m->home_team_id, $m->away_team_id];

            return in_array($a['team_id'], $ids, true) && in_array($b['team_id'], $ids, true);
        });

        $pointsA = 0;
        $pointsB = 0;

        foreach ($h2h as $match) {
            $home = (int) $match->home_score;
            $away = (int) $match->away_score;

            if ($match->home_team_id === $a['team_id']) {
                if ($home > $away) {
                    $pointsA += 3;
                } elseif ($home === $away) {
                    $pointsA += 1;
                    $pointsB += 1;
                } else {
                    $pointsB += 3;
                }
            } else {
                if ($away > $home) {
                    $pointsA += 3;
                } elseif ($home === $away) {
                    $pointsA += 1;
                    $pointsB += 1;
                } else {
                    $pointsB += 3;
                }
            }
        }

        return $pointsB <=> $pointsA;
    }

    private function persistStandings(Tournament $tournament, ?TournamentGroup $group, array $ranked): void
    {
        foreach ($ranked as $row) {
            Standing::query()->updateOrCreate(
                [
                    'tournament_id' => $tournament->id,
                    'tournament_group_id' => $group?->id,
                    'team_id' => $row['team_id'],
                ],
                [
                    'position' => $row['position'],
                    'played' => $row['played'],
                    'won' => $row['won'],
                    'drawn' => $row['drawn'],
                    'lost' => $row['lost'],
                    'goals_for' => $row['goals_for'],
                    'goals_against' => $row['goals_against'],
                    'goal_difference' => $row['goal_difference'],
                    'points' => $row['points'],
                    'tiebreaker_data' => ['rules' => $tournament->tiebreaker_rules],
                    'computed_at' => now(),
                ]
            );
        }
    }
}
